"""
Intelligent Candidate Discovery — FastAPI Application

Provides three endpoints:
  GET  /health      – service health + model status
  GET  /candidates  – list all candidates
  POST /rank        – rank candidates against a job description

On startup the application:
  1. Loads the sentence-transformers model (with graceful fallback).
  2. Initialises the SQLite database.
  3. Seeds the database from backend/data/candidates.json.
"""

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

# Allow cross-origin requests from the React dev server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances — created once, reused across requests.
semantic_matcher = SemanticMatcher()
config = load_config()
scoring_engine = ScoringEngine(config, semantic_matcher)


def load_candidates_from_json() -> list[Candidate]:
    """Read the mock candidate dataset from the JSON file."""
    json_path = os.path.join(os.path.dirname(__file__), "data", "candidates.json")
    with open(json_path) as f:
        data = json.load(f)
    return [Candidate(**c) for c in data]


@app.on_event("startup")
async def startup():
    """Initialise the semantic model, database, and seed data."""
    semantic_matcher.load_model()
    init_db()
    candidates = load_candidates_from_json()
    seed_candidates(candidates)


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health():
    """Return service health and the number of loaded candidates."""
    return HealthResponse(
        status="healthy",
        model_loaded=semantic_matcher.loaded,
        candidate_count=get_candidate_count(),
    )


@app.get("/candidates")
async def list_candidates():
    """Return every candidate in the database."""
    return get_all_candidates()


@app.post("/rank", response_model=RankResponse)
async def rank_candidates(job_input: JobDescriptionInput, top_n: int = 10):
    """
    Accept a job description, parse it, score every candidate, and return
    the top-N ranked results with sub-score breakdowns and reasoning.
    """
    if not job_input.text.strip():
        raise HTTPException(status_code=400, detail="Job description text is required")

    # Parse the unstructured JD into structured fields.
    jd = parse_job_description(job_input.text)

    # Score every candidate.
    candidates = get_all_candidates()
    if not candidates:
        raise HTTPException(status_code=500, detail="No candidates in database")

    scored = []
    for candidate in candidates:
        result = scoring_engine.score_candidate(jd, candidate)
        scored.append(result)

    # Sort descending by final score and take the top N.
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

# ------------------------------------------------------------------
# Mount Frontend Production Build
# ------------------------------------------------------------------
# Check if frontend production distribution files exist before mounting
if os.path.exists("frontend/dist"):
    # Serve single files like index.html at root
    @app.get("/")
    async def read_index():
        return FileResponse("frontend/dist/index.html")

    # Mount static asset routing (js, css, images)
    app.mount("/", StaticFiles(directory="frontend/dist"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
