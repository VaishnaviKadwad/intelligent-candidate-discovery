import sqlite3
import json
import os
from models import Candidate

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "candidates.db")


def get_connection():
    """Return a new SQLite connection with row factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the candidates table if it does not exist."""
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS candidates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            current_title TEXT NOT NULL,
            experience_years INTEGER,
            domain TEXT,
            skills TEXT,
            soft_skills TEXT,
            career_progression TEXT,
            recent_certifications TEXT,
            github_activity_score INTEGER,
            recent_role_change INTEGER,
            education TEXT
        )
    """)
    conn.commit()
    conn.close()


def seed_candidates(candidates: list[Candidate]):
    """Populate the candidates table with initial data if it is empty."""
    conn = get_connection()
    existing = conn.execute("SELECT COUNT(*) FROM candidates").fetchone()[0]
    if existing > 0:
        conn.close()
        return

    for c in candidates:
        conn.execute("""
            INSERT OR IGNORE INTO candidates
            (id, name, email, current_title, experience_years, domain, skills,
             soft_skills, career_progression, recent_certifications,
             github_activity_score, recent_role_change, education)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c.id, c.name, c.email, c.current_title, c.experience_years, c.domain,
            json.dumps(c.skills), json.dumps(c.soft_skills),
            json.dumps(c.career_progression), json.dumps(c.recent_certifications),
            c.github_activity_score, int(c.recent_role_change), c.education
        ))
    conn.commit()
    conn.close()


def get_all_candidates() -> list[Candidate]:
    """Retrieve every candidate row and return a list of Candidate objects."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM candidates").fetchall()
    conn.close()
    result = []
    for row in rows:
        result.append(Candidate(
            id=row["id"],
            name=row["name"],
            email=row["email"],
            current_title=row["current_title"],
            experience_years=row["experience_years"],
            domain=row["domain"],
            skills=json.loads(row["skills"]),
            soft_skills=json.loads(row["soft_skills"]),
            career_progression=json.loads(row["career_progression"]),
            recent_certifications=json.loads(row["recent_certifications"]),
            github_activity_score=row["github_activity_score"],
            recent_role_change=bool(row["recent_role_change"]),
            education=row["education"]
        ))
    return result


def get_candidate_count() -> int:
    """Return the number of candidates stored in the database."""
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) FROM candidates").fetchone()[0]
    conn.close()
    return count
