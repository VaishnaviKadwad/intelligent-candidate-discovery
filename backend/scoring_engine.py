import yaml
import os
import numpy as np
from typing import Any
from models import JDExtracted, Candidate


def load_config(path: str = None) -> dict:
    """Load the scoring configuration YAML from the data/ directory."""
    if path is None:
        path = os.path.join(os.path.dirname(__file__), "data", "config.yaml")
    with open(path) as f:
        return yaml.safe_load(f)


class ScoringEngine:
    """
    Multi-factor scoring model that produces an explainable final score
    for each candidate against a parsed job description.

    The final score is a weighted sum of four sub-scores:

        final = w_skill * skill_match
              + w_exp   * experience_relevance
              + w_career * career_trajectory
              + w_beh   * behavioral_signals

    All weights are read from config.yaml so they can be tuned without code changes.
    Every sub-score returns a float in [0, 1] so reasoning is transparent.
    """

    def __init__(self, config: dict = None, semantic_matcher=None):
        self.config = config or load_config()
        self.weights = self.config["scoring"]["weights"]
        self.semantic = semantic_matcher

    # ------------------------------------------------------------------
    # 1. Skill Match Score
    # ------------------------------------------------------------------
    def compute_skill_match(self, jd: JDExtracted, candidate: Candidate) -> tuple[float, float, list[str]]:
        """
        Compute how well the candidate's skills align with the JD's required skills.

        When the semantic model is loaded, each JD skill is compared against every
        candidate skill via cosine similarity and the best match is kept.  The final
        score is the average similarity across all JD skills.

        When the model is unavailable, a simple Jaccard-like overlap is used instead.

        Returns (raw_score 0..1, percentage 0..100, list_of_matched_skill_names).
        """
        if self.semantic is None or not self.semantic.loaded:
            # Keyword fallback: count overlapping skills.
            jd_set = set(s.lower() for s in jd.required_skills)
            c_set = set(s.lower() for s in candidate.skills)
            matched = list(jd_set & c_set)
            overlap = len(matched)
            score = overlap / max(len(jd_set), 1)
            return score, score * 100, matched

        # Semantic matching: for each JD skill, find the best candidate skill.
        matched_skills = []
        total_sim = 0.0
        for jd_skill in jd.required_skills:
            best_sim = 0.0
            best_cskill = ""
            for c_skill in candidate.skills:
                sim = self.semantic.compute_similarity(jd_skill, c_skill)
                if sim > best_sim:
                    best_sim = sim
                    best_cskill = c_skill
            total_sim += best_sim
            if best_sim > 0.5:                     # only tag meaningfully similar skills
                matched_skills.append(best_cskill)

        avg_sim = total_sim / max(len(jd.required_skills), 1)
        return avg_sim, avg_sim * 100, list(set(matched_skills))

    # ------------------------------------------------------------------
    # 2. Experience Relevance Score
    # ------------------------------------------------------------------
    def compute_experience_score(self, jd: JDExtracted, candidate: Candidate) -> float:
        """
        Combines years-of-experience normalisation with seniority-level alignment.

        - years_norm: candidate years / config.max_expected_years (capped at 1.0)
        - level_match: 1.0 for exact level match, lower for mismatch
        """
        exp_config = self.config["scoring"]["experience"]
        max_years = exp_config["max_expected_years"]
        levels = exp_config["seniority_levels"]

        # Determine the candidate's seniority bucket.
        candidate_level = None
        for level_name, (lo, hi) in levels.items():
            if lo <= candidate.experience_years <= hi:
                candidate_level = level_name
                break
        if candidate_level is None:
            candidate_level = "senior"

        # Level alignment: an exact match scores 1.0; over-qualified slightly less.
        if candidate_level == jd.experience_level:
            level_match = 1.0
        elif candidate_level in ("senior", "lead") and jd.experience_level in ("mid", "junior"):
            level_match = 0.8
        elif candidate_level == "mid" and jd.experience_level == "junior":
            level_match = 0.7
        else:
            level_match = 0.5

        years_norm = min(candidate.experience_years / max_years, 1.0)
        return 0.6 * years_norm + 0.4 * level_match

    # ------------------------------------------------------------------
    # 3. Career Trajectory Score
    # ------------------------------------------------------------------
    def compute_career_trajectory(self, candidate: Candidate) -> float:
        """
        Reward candidates whose job history shows upward progression.

        Each role is assigned a seniority level based on title keywords
        (senior=1, lead=2, principal=3, manager=2, director=3, vp=4, etc.).
        A transition to a higher level counts as a promotion.
        """
        config_ct = self.config["scoring"]["career_trajectory"]
        history = candidate.career_progression
        if len(history) < 2:
            return 0.5  # neutral score for single-role candidates

        # Map title keywords to numeric levels.
        title_keywords = {
            "senior": 1, "lead": 2, "principal": 3, "staff": 3,
            "manager": 2, "director": 3, "vp": 4, "head": 3, "chief": 4,
            "architect": 3
        }
        progression = 0
        for i in range(1, len(history)):
            prev_level = 0
            curr_level = 0
            for kw, level in title_keywords.items():
                if kw in history[i - 1]["title"].lower():
                    prev_level = max(prev_level, level)
                if kw in history[i]["title"].lower():
                    curr_level = max(curr_level, level)
            if curr_level > prev_level:
                progression += 1

        score = config_ct["role_progression_weight"] * (progression / max(len(history) - 1, 1))
        if progression > 0:
            score += config_ct["promotion_bonus"]
        return min(score, 1.0)

    # ------------------------------------------------------------------
    # 4. Behavioral / Activity Score
    # ------------------------------------------------------------------
    def compute_behavioral_score(self, candidate: Candidate) -> float:
        """
        Combine GitHub activity, recency of certifications, and recent role changes
        into a single [0, 1] score.  Weights are read from config.
        """
        config_bh = self.config["scoring"]["behavioral"]
        github = min(candidate.github_activity_score / 100, 1.0)
        certs = min(len(candidate.recent_certifications) / 3, 1.0)
        recent_change = 1.0 if candidate.recent_role_change else 0.0

        score = (
            config_bh["github_weight"] * github +
            config_bh["certification_weight"] * certs +
            config_bh["recent_role_change_weight"] * recent_change
        )
        return min(score, 1.0)

    # ------------------------------------------------------------------
    # 5. Explainable Reasoning
    # ------------------------------------------------------------------
    def generate_reasoning(self, jd: JDExtracted, candidate: Candidate,
                           skill_score: float, exp_score: float, beh_score: float) -> str:
        """
        Build a short, human-readable explanation of why this candidate
        received their score.  This makes the output *explainable* rather
        than a black box.
        """
        parts = []
        # Highlight matched skills.
        matched = [
            s for s in candidate.skills
            if any(
                jd_skill.lower() in s.lower() or s.lower() in jd_skill.lower()
                for jd_skill in jd.required_skills
            )
        ]
        if matched:
            parts.append(f"Matched {len(matched)} key skills: {', '.join(matched[:3])}")
        if exp_score > 0.7:
            parts.append(f"{candidate.experience_years}yrs relevant experience")
        parts.append(f"{candidate.current_title} role fits {jd.experience_level} level")
        if beh_score > 0.6:
            parts.append("strong behavioral signals")

        return "; ".join(parts) if parts else "General alignment with job requirements"

    # ------------------------------------------------------------------
    # 6. Orchestrator
    # ------------------------------------------------------------------
    def score_candidate(self, jd: JDExtracted, candidate: Candidate) -> dict[str, Any]:
        """
        Run all four scoring factors, combine them with configured weights,
        and return a dictionary with every sub-score plus a reason string.

        This dictionary is used directly by the API to build the RankedCandidate response.
        """
        skill_match_raw, skill_match_pct, matched_skills = self.compute_skill_match(jd, candidate)
        exp_score = self.compute_experience_score(jd, candidate)
        career_score = self.compute_career_trajectory(candidate)
        behavioral_score = self.compute_behavioral_score(candidate)

        final_score = (
            self.weights["skill_match"] * skill_match_raw +
            self.weights["experience_relevance"] * exp_score +
            self.weights["career_trajectory"] * career_score +
            self.weights["behavioral_signals"] * behavioral_score
        )

        return {
            "candidate_id": candidate.id,
            "name": candidate.name,
            "title": candidate.current_title,
            "final_score": round(final_score * 100, 1),
            "skill_match_pct": round(skill_match_pct, 1),
            "experience_score": round(exp_score * 100, 1),
            "behavioral_score": round(behavioral_score * 100, 1),
            "career_score": round(career_score * 100, 1),
            "matched_skills": matched_skills,
            "reasoning": self.generate_reasoning(jd, candidate, skill_match_raw, exp_score, behavioral_score)
        }
