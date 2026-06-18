from pydantic import BaseModel
from typing import Optional


class JobDescriptionInput(BaseModel):
    """Request body for the /rank endpoint."""
    text: str


class JDExtracted(BaseModel):
    """Structured output from parsing a job description."""
    required_skills: list[str]
    experience_level: str
    domain: str
    soft_skills: list[str]
    implicit_requirements: list[str]


class Candidate(BaseModel):
    """Schema for a candidate profile loaded from the dataset."""
    id: str
    name: str
    email: str
    current_title: str
    experience_years: int
    domain: str
    skills: list[str]
    soft_skills: list[str]
    career_progression: list[dict]
    recent_certifications: list[str]
    github_activity_score: int
    recent_role_change: bool
    education: str


class RankedCandidate(BaseModel):
    """A single candidate with computed scores in the ranked output."""
    candidate_id: str
    name: str
    title: str
    final_score: float
    skill_match_pct: float
    experience_score: float
    behavioral_score: float
    reasoning: str
    matched_skills: list[str]


class RankResponse(BaseModel):
    """Response returned by the /rank endpoint."""
    job_description: str
    candidates: list[RankedCandidate]


class HealthResponse(BaseModel):
    """Response returned by the /health endpoint."""
    status: str
    model_loaded: bool
    candidate_count: int
