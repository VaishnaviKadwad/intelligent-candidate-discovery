---
title: Intelligent Candidate Discovery
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---
# Intelligent Candidate Discovery

An AI-powered recruiter that semantically ranks candidates against a job description using multi-factor scoring.

---
## Sandbox (Live Demo)
👉 **Click here to run the live application:** [https://huggingface.co/spaces/VaishnaviKadwad/intelligent-candidate-discovery](https://huggingface.co/spaces/VaishnaviKadwad/intelligent-candidate-discovery)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Frontend (Port 3000)                  │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │   JDInput     │  │  CandidateCard │  │       ScoreBar         │  │
│  │  (textarea)   │  │ (name, score,  │  │ (skill / experience /  │  │
│  │  + submit)   │  │  skills, bars) │  │  behavioral bars)      │  │
│  └──────┬───────┘  └───────┬────────┘  └────────────────────────┘  │
│         │                  ▲                                        │
│         │        HTTP POST /rank  (JSON)                            │
│         └──────────────────┼────────────────────────────────────────┘
│                            │
┌────────────────────────────┼────────────────────────────────────────┐
│                    FastAPI  │Backend  (Port 8000)                    │
│  ┌─────────────────────────┴──────────────────────────────┐         │
│  │                    main.py                              │         │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │         │
│  │  │ /health  │  │/candidates│  │  /rank   │  │CORS    │ │         │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┘ │         │
│  └───────┼──────────────┼─────────────┼───────────────────┘         │
│          │              │             │                              │
│  ┌───────▼──────────────▼─────────────▼───────────────────┐         │
│  │                scoring_engine.py                         │         │
│  │  ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │         │
│  │  │ Skill Match  │ │Experience│ │ Career   │ │Behav.  │ │         │
│  │  │ (semantic or │ │Relevance │ │Trajectory│ │Signals │ │         │
│  │  │  keyword)    │ │          │ │          │ │        │ │         │
│  │  └──────────────┘ └──────────┘ └──────────┘ └────────┘ │         │
│  └─────────────────────────┬───────────────────────────────┘         │
│                            │                                         │
│  ┌─────────────────────────▼───────────────────────────────┐         │
│  │  semantic_matcher.py           jd_parser.py             │         │
│  │  (sentence-transformers        (regex + keyword         │         │
│  │   + cosine similarity)          JD extraction)          │         │
│  └─────────────────────────┬───────────────────────────────┘         │
│                            │                                         │
│  ┌─────────────────────────▼───────────────────────────────┐         │
│  │  database.py (SQLite)       ┌────────────────────────┐  │         │
│  │  ┌──────────────────────┐   │  data/candidates.json  │  │         │
│  │  │  candidates TABLE    │◄──│  (25 mock profiles)    │  │         │
│  │  └──────────────────────┘   └────────────────────────┘  │         │
│  └──────────────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
intelligent-candidate-discovery/
├── backend/
│   ├── main.py                 # FastAPI app — entry point
│   ├── models.py               # Pydantic request/response schemas
│   ├── jd_parser.py            # Regex-based JD understanding
│   ├── semantic_matcher.py     # sentence-transformers embedding + cosine sim
│   ├── scoring_engine.py       # Multi-factor weighted scoring
│   ├── database.py             # SQLite persistence layer
│   ├── requirements.txt
│   └── data/
│       ├── candidates.json     # 25 mock candidate profiles
│       └── config.yaml         # Scoring weights configuration
├── frontend/
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── App.js / App.css    # Main dashboard
│       └── components/
│           ├── JDInput.js      # JD text area + sample JD button
│           ├── CandidateCard.js# Candidate result card
│           └── ScoreBar.js     # Animated score bar
├── tests/
│   └── test_ranker.py          # 12 unit / integration tests
└── README.md
```

---

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
python main.py
```

The server starts on **http://localhost:8000**. The sentence-transformers model downloads on first run (offline afterwards).

### Frontend

```bash
cd frontend
npm install
npm start
```

The dev server starts on **http://localhost:3000** and proxies API calls to port 8000.

### Tests

```bash
cd tests
pip install pytest httpx   # if not already installed
pytest test_ranker.py -v
```

---

## API Documentation

### `GET /health`

Returns service status and metadata.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "candidate_count": 25
}
```

---

### `GET /candidates`

Returns every candidate in the database.

**Response:** Array of candidate objects.

---

### `POST /rank`

Ranks candidates against a job description. Returns the top N results with score breakdowns and human-readable reasoning.

**Request:**
```json
{
  "text": "Senior Machine Learning Engineer\n\nWe are looking for..."
}
```

**Query Parameters:**
| Param   | Type | Default | Description          |
|---------|------|---------|----------------------|
| top_n   | int  | 10      | Number of results    |

**Response:**
```json
{
  "job_description": "Senior Machine Learning Engineer\n\n...",
  "candidates": [
    {
      "candidate_id": "c001",
      "name": "Alice Chen",
      "title": "Senior Machine Learning Engineer",
      "final_score": 87.3,
      "skill_match_pct": 72.0,
      "experience_score": 81.0,
      "behavioral_score": 90.0,
      "reasoning": "Matched 3 key skills: PyTorch, NLP, Kubernetes; 7yrs relevant experience; Senior Machine Learning Engineer role fits mid level; strong behavioral signals",
      "matched_skills": ["Python", "PyTorch", "NLP", "Kubernetes"]
    }
  ]
}
```

---

## Scoring Methodology

The final score is a **weighted sum of four independent factors**, each normalised to [0, 1].

### 1. Skill Match (weight: 0.35)

When the sentence-transformers model is loaded, every JD-required skill is compared against every candidate skill using cosine similarity in a 384-dimensional embedding space. This means *"machine learning engineer"* correctly matches *"AI/ML developer"* even though they share no keywords.

When the model is unavailable (offline), a keyword overlap ratio is used instead.

### 2. Experience Relevance (weight: 0.25)

Two components:
- **Years normalised** (60%): `min(years / 15, 1.0)` — caps at 15 years.
- **Level alignment** (40%): Exact seniority match = 1.0, over-qualified = 0.8, under-qualified = 0.5.

Seniority buckets: junior (0–2), mid (3–5), senior (6–9), lead (10–15).

### 3. Career Trajectory (weight: 0.20)

Analyses the candidate's `career_progression` array. Each title is assigned a numeric level based on keywords (senior=1, lead=2, principal=3, manager=2, director=3, vp=4, etc.). Each promotion (level increase) adds to the score. A promotion bonus is applied if any progression exists.

### 4. Behavioral Signals (weight: 0.20)

Three signals, each with configurable sub-weights:
- **GitHub activity** (50%): `min(score / 100, 1.0)`
- **Recent certifications** (30%): `min(count / 3, 1.0)`
- **Recent role change** (20%): 1.0 if `recent_role_change` is true, else 0.0

### 5. Reasoning

Each candidate includes a `reasoning` string built from their strongest factors, so the score is never a black box.

---

## Example `curl` Commands

```bash
# Health check
curl http://localhost:8000/health

# List all candidates
curl http://localhost:8000/candidates | jq .

# Rank candidates (sample JD)
curl -X POST http://localhost:8000/rank?top_n=5 \
  -H "Content-Type: application/json" \
  -d '{"text": "Senior Machine Learning Engineer\n\n5+ years PyTorch and NLP experience required."}' | jq .

# Rank with custom JD
curl -X POST http://localhost:8000/rank?top_n=3 \
  -H "Content-Type: application/json" \
  -d '{"text": "Looking for a Junior Frontend Developer with React and TypeScript skills."}' | jq .
```

---

## Configuration

Scoring weights and thresholds are defined in `backend/data/config.yaml`:

```yaml
scoring:
  weights:
    skill_match: 0.35
    experience_relevance: 0.25
    career_trajectory: 0.20
    behavioral_signals: 0.20
```

Tweak these values without touching any Python code.

---

## Design Decisions

- **Offline-first**: The semantic model downloads once and caches locally. The JP parser uses pure regex. No external API calls are required for the core ranking pipeline.
- **Explainable scoring**: Every sub-score is computed independently and combined linearly. The `reasoning` field makes scores interpretable.
- **Graceful degradation**: If `sentence-transformers` is unavailable, the system falls back to keyword matching without crashing.
- **SQLite persistence**: Candidates are loaded from JSON into SQLite on first start. This enables easy querying and future extension.
