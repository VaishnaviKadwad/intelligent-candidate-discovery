import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from models import (
    JobDescriptionInput,
    JDExtracted,
    Candidate,
    RankedCandidate,
    RankResponse,
    HealthResponse,
)
from jd_parser import parse_job_description
from semantic_matcher import SemanticMatcher
from scoring_engine import ScoringEngine, load_config
from database import init_db, seed_candidates, get_all_candidates, get_candidate_count

app = FastAPI(title="Intelligent Candidate Discovery", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

semantic_matcher = SemanticMatcher()
config = load_config()
scoring_engine = ScoringEngine(config, semantic_matcher)

def load_candidates_from_json() -> list[Candidate]:
    json_path = os.path.join(os.path.dirname(__file__), "data", "candidates.json")
    with open(json_path) as f:
        data = json.load(f)
    return [Candidate(**c) for c in data]

@app.on_event("startup")
async def startup():
    semantic_matcher.load_model()
    init_db()
    candidates = load_candidates_from_json()
    seed_candidates(candidates)

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        model_loaded=semantic_matcher.loaded,
        candidate_count=get_candidate_count(),
    )

@app.get("/candidates")
async def list_candidates():
    return get_all_candidates()

@app.post("/rank", response_model=RankResponse)
async def rank_candidates(job_input: JobDescriptionInput, top_n: int = 10):
    if not job_input.text.strip():
        raise HTTPException(status_code=400, detail="Job description text is required")

    jd = parse_job_description(job_input.text)
    candidates = get_all_candidates()
    if not candidates:
        raise HTTPException(status_code=500, detail="No candidates in database")

    scored = []
    for candidate in candidates:
        result = scoring_engine.score_candidate(jd, candidate)
        scored.append(result)

    scored.sort(key=lambda x: x["final_score"], reverse=True)
    top = scored[:top_n]

    ranked = [
        RankedCandidate(
            candidate_id=r["candidate_id"],
            name=r["name"],
            title=r["title"],
            final_score=r["final_score"],
            skill_match_pct=r["skill_match_pct"],
            experience_score=r["experience_score"],
            behavioral_score=r["behavioral_score"],
            reasoning=r["reasoning"],
            matched_skills=r["matched_skills"],
        )
        for r in top
    ]

    return RankResponse(
        job_description=job_input.text,
        candidates=ranked,
    )

if os.path.exists("frontend/dist"):
    @app.get("/")
    async def read_index():
        return FileResponse("frontend/dist/index.html")

    app.mount("/", StaticFiles(directory="frontend/dist"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
