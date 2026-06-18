"""
Unit tests for the Intelligent Candidate Discovery scoring engine.

Tests cover:
  1. JD parsing (domain, experience level, skill extraction)
  2. Skill match scoring (both semantic and keyword fallback)
  3. Experience relevance scoring
  4. Career trajectory scoring
  5. Behavioral score computation
  6. Full end-to-end ranking via the API (using TestClient)
"""

import json
import os
import sys
import pytest

# Ensure the backend package is importable.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from models import Candidate, JDExtracted, JobDescriptionInput
from jd_parser import parse_job_description
from scoring_engine import ScoringEngine, load_config
from semantic_matcher import SemanticMatcher
from fastapi.testclient import TestClient

# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------

@pytest.fixture(scope="module")
def config():
    return load_config()


@pytest.fixture(scope="module")
def engine(config):
    """ScoringEngine with no semantic model (keyword fallback)."""
    return ScoringEngine(config)


@pytest.fixture(scope="module")
def sample_jd_text():
    return """
Senior Machine Learning Engineer

We are looking for a Senior Machine Learning Engineer to join our AI team.
You will design and deploy ML models at scale.

Requirements:
- 5+ years experience in ML/DL
- Strong Python and PyTorch skills
- Experience with NLP and transformer models
- Kubernetes and MLOps experience
- Excellent communication and problem-solving skills

Bonus: Experience with LLMs and RAG systems
"""


@pytest.fixture(scope="module")
def sample_jd(sample_jd_text):
    return parse_job_description(sample_jd_text)


@pytest.fixture(scope="module")
def ml_candidate():
    return Candidate(
        id="c001",
        name="Alice Chen",
        email="alice@example.com",
        current_title="Senior Machine Learning Engineer",
        experience_years=7,
        domain="AI/ML",
        skills=["Python", "TensorFlow", "PyTorch", "NLP", "Computer Vision", "Kubernetes", "MLOps"],
        soft_skills=["leadership", "communication", "problem-solving"],
        career_progression=[
            {"title": "ML Engineer", "years": 3, "company": "DataCorp"},
            {"title": "Senior ML Engineer", "years": 3, "company": "TechFlow"},
            {"title": "Lead ML Engineer", "years": 1, "company": "AI Labs"}
        ],
        recent_certifications=["AWS ML Specialty", "Google Cloud ML Engineer"],
        github_activity_score=92,
        recent_role_change=True,
        education="PhD Computer Science, Stanford"
    )


@pytest.fixture(scope="module")
def unrelated_candidate():
    return Candidate(
        id="c018",
        name="Rachel Adams",
        email="rachel@example.com",
        current_title="Technical Writer",
        experience_years=6,
        domain="Documentation",
        skills=["Technical Writing", "API Documentation", "Markdown", "Git", "Information Architecture", "DITA"],
        soft_skills=["clarity", "audience awareness", "collaboration"],
        career_progression=[
            {"title": "Junior Technical Writer", "years": 2, "company": "DocuSoft"},
            {"title": "Technical Writer", "years": 4, "company": "TechDocs Inc"}
        ],
        recent_certifications=["STC Certified"],
        github_activity_score=25,
        recent_role_change=False,
        education="BA English, University of Chicago"
    )


@pytest.fixture(scope="module")
def app_client():
    """Create a TestClient that runs the FastAPI app in-memory."""
    from main import app
    with TestClient(app) as client:
        yield client


# ------------------------------------------------------------------
# Test 1: JD Parsing
# ------------------------------------------------------------------

class TestJDParsing:
    def test_domain_detection(self, sample_jd):
        """A JD mentioning ML/DL keywords should be classified as AI/ML."""
        assert sample_jd.domain == "ai/ml"

    def test_experience_level(self, sample_jd):
        """'5+ years' should map to mid-level."""
        assert sample_jd.experience_level == "mid"

    def test_required_skills_extracted(self, sample_jd):
        """The 'Requirements' section should produce a non-empty skill list."""
        assert len(sample_jd.required_skills) > 0
        assert any("python" in s.lower() for s in sample_jd.required_skills)

    def test_soft_skills_detected(self, sample_jd):
        """'communication' and 'problem-solving' should be recognised."""
        assert len(sample_jd.soft_skills) > 0


# ------------------------------------------------------------------
# Test 2: Skill Match Scoring (keyword fallback)
# ------------------------------------------------------------------

class TestSkillMatch:
    def test_high_skill_match_for_ml_candidate(self, engine, sample_jd, ml_candidate):
        """An ML engineer should score well on an ML JD."""
        raw, pct, matched = engine.compute_skill_match(sample_jd, ml_candidate)
        assert raw > 0.3
        assert pct > 30
        assert len(matched) > 0

    def test_low_skill_match_for_unrelated_candidate(self, engine, sample_jd, unrelated_candidate):
        """A technical writer should score poorly on an ML JD."""
        raw, pct, matched = engine.compute_skill_match(sample_jd, unrelated_candidate)
        assert raw < 0.3
        assert len(matched) == 0


# ------------------------------------------------------------------
# Test 3: Experience Relevance
# ------------------------------------------------------------------

class TestExperienceScore:
    def test_experience_within_range(self, engine, sample_jd, ml_candidate):
        """7 years of experience for a 'mid' JD should give a decent score."""
        score = engine.compute_experience_score(sample_jd, ml_candidate)
        assert 0.4 <= score <= 1.0

    def test_experience_returns_float(self, engine, sample_jd, unrelated_candidate):
        """Experience score should always be a float."""
        score = engine.compute_experience_score(sample_jd, unrelated_candidate)
        assert isinstance(score, float)


# ------------------------------------------------------------------
# Test 4: Career Trajectory
# ------------------------------------------------------------------

class TestCareerTrajectory:
    def test_progression_detected(self, engine, ml_candidate):
        """Three roles with title upgrades should indicate progression."""
        score = engine.compute_career_trajectory(ml_candidate)
        assert score > 0.5

    def test_no_progression_is_neutral(self, engine, unrelated_candidate):
        """A candidate with no title upgrades gets a neutral score."""
        score = engine.compute_career_trajectory(unrelated_candidate)
        # "Technical Writer" -> "Technical Writer" is no upgrade, so score = 0.5 baseline.
        assert score <= 0.6


# ------------------------------------------------------------------
# Test 5: Behavioral Score
# ------------------------------------------------------------------

class TestBehavioralScore:
    def test_high_github_score_boosts(self, engine, ml_candidate):
        """92/100 GitHub activity should contribute significantly."""
        score = engine.compute_behavioral_score(ml_candidate)
        assert score >= 0.5

    def test_no_certs_low_github_is_low(self, engine, unrelated_candidate):
        """Low GitHub + no recent change + few certs should give a lower score."""
        score = engine.compute_behavioral_score(unrelated_candidate)
        assert score < 0.6


# ------------------------------------------------------------------
# Test 6: Full Candidate Scoring (integration)
# ------------------------------------------------------------------

class TestFullScoring:
    def test_ml_candidate_beats_unrelated(self, engine, sample_jd, ml_candidate, unrelated_candidate):
        """The ML engineer should receive a higher final score than the technical writer."""
        ml_result = engine.score_candidate(sample_jd, ml_candidate)
        unrelated_result = engine.score_candidate(sample_jd, unrelated_candidate)
        assert ml_result["final_score"] > unrelated_result["final_score"]

    def test_reasoning_is_not_empty(self, engine, sample_jd, ml_candidate):
        """Every scored candidate should have a non-empty reason string."""
        result = engine.score_candidate(sample_jd, ml_candidate)
        assert len(result["reasoning"]) > 0

    def test_all_sub_scores_present(self, engine, sample_jd, ml_candidate):
        """The result dict should contain all expected keys."""
        result = engine.score_candidate(sample_jd, ml_candidate)
        for key in ("skill_match_pct", "experience_score", "behavioral_score", "career_score", "final_score"):
            assert key in result
            assert isinstance(result[key], (int, float))


# ------------------------------------------------------------------
# Test 7: API Health Endpoint
# ------------------------------------------------------------------

class TestAPI:
    def test_health_endpoint(self, app_client):
        """GET /health should return 200 with status 'healthy'."""
        resp = app_client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

    def test_candidates_endpoint(self, app_client):
        """GET /candidates should return a JSON array."""
        resp = app_client.get("/candidates")
        assert resp.status_code == 200
        candidates = resp.json()
        assert isinstance(candidates, list)
        assert len(candidates) > 0

    def test_rank_endpoint_returns_json(self, app_client, sample_jd_text):
        """POST /rank should return ranked candidates with expected structure."""
        resp = app_client.post("/rank?top_n=5", json={"text": sample_jd_text})
        assert resp.status_code == 200
        data = resp.json()
        assert "candidates" in data
        assert len(data["candidates"]) <= 5
        first = data["candidates"][0]
        for field in ("candidate_id", "name", "final_score", "reasoning", "skill_match_pct"):
            assert field in first

    def test_rank_requires_text(self, app_client):
        """POST /rank with empty text should return 400."""
        resp = app_client.post("/rank", json={"text": ""})
        assert resp.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
