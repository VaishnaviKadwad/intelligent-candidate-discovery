import re
from models import JDExtracted


def parse_job_description(text: str) -> JDExtracted:
    """
    Extract structured information from a free-text job description.

    Uses regex patterns and keyword scoring to identify:
      - Primary domain (AI/ML, backend, frontend, etc.)
      - Required experience level (junior, mid, senior, lead)
      - Required technical skills
      - Soft skills mentioned
      - Implicit / bonus requirements

    This function works fully offline with no external API calls.
    """
    text_lower = text.lower()

    # --- Domain Detection ---
    # Score each domain by counting keyword matches in the JD text.
    domain_keywords = {
        "ai/ml": ["machine learning", "deep learning", "nlp", "computer vision", "ai", "artificial intelligence",
                   "neural network", "llm", "ml model", "pytorch", "tensorflow"],
        "backend": ["backend", "server-side", "api", "microservice", "distributed system"],
        "frontend": ["frontend", "ui", "react", "angular", "vue", "web application"],
        "data science": ["data science", "data analysis", "statistics", "analytics", "visualization"],
        "devops": ["devops", "ci/cd", "infrastructure", "terraform", "kubernetes", "sre"],
        "mobile": ["mobile", "ios", "android", "swift", "kotlin", "react native"],
        "security": ["security", "cybersecurity", "penetration", "compliance", "vulnerability"],
        "product": ["product manager", "product strategy", "roadmap", "stakeholder"],
        "engineering management": ["engineering manager", "tech lead", "vp engineering", "director of engineering"],
        "cloud": ["cloud", "aws", "azure", "gcp", "cloud architecture"],
        "data engineering": ["data engineer", "etl", "pipeline", "data warehouse", "spark", "airflow"]
    }

    domain_scores = {}
    for domain, keywords in domain_keywords.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            domain_scores[domain] = score
    primary_domain = max(domain_scores, key=domain_scores.get) if domain_scores else "general"

    # --- Experience Level Detection ---
    # Look for explicit year requirements or seniority keywords.
    experience_patterns = [
        (r"(\d+)[\s-]*\+?\s*years?", int),
        (r"(entry.level|junior|fresher)", lambda x: 0),
        (r"(senior|lead|principal|staff)", lambda x: 6),
        (r"(manager|director|vp|head)", lambda x: 8),
    ]
    experience_level = "mid"
    for pattern, extractor in experience_patterns:
        match = re.search(pattern, text_lower)
        if match:
            val = extractor(match.group(1)) if match.lastindex else extractor(None)
            if val is not None:
                if val <= 2:
                    experience_level = "junior"
                elif val <= 5:
                    experience_level = "mid"
                elif val <= 9:
                    experience_level = "senior"
                else:
                    experience_level = "lead"
                break

    # --- Skill Extraction ---
    # First try to find a bulleted "Requirements" section.
    required_skills = []
    soft_skills_list = []
    implicit_requirements = []

    skill_section = re.search(
        r"(required skills?|requirements?|qualifications?|what you.ll need|we.need)[:\s]*(.*?)(?:\n\n|\n#|$)",
        text_lower + "\n\n", re.DOTALL
    )
    if skill_section:
        content = skill_section.group(2)
        required_skills = [
            s.strip().strip("-*•,.") for s in content.split("\n")
            if s.strip() and not s.strip().startswith(("#", "//"))
        ]
        required_skills = [s for s in required_skills if len(s) > 1]

    # Fallback: scan the whole text for known technology keywords.
    tech_indicators = [
        "python", "java", "javascript", "typescript", "react", "node", "sql", "kubernetes",
        "docker", "aws", "gcp", "azure", "tensorflow", "pytorch", "git", "rest", "api",
        "graphql", "html", "css", "c++", "go", "rust", "ruby", "php", "swift", "kotlin",
        "terraform", "ansible", "jenkins", "kafka", "spark", "hadoop", "redis", "mongodb",
        "postgresql", "mysql", "linux", "agile", "scrum", "ci/cd", "mlops", "nlp",
        "computer vision", "deep learning", "machine learning", "data science", "analytics"
    ]

    # Always supplement with individually recognised tech keywords found anywhere in the text.
    # This ensures that "Strong Python and PyTorch skills" produces ["Python", "PyTorch"].
    for tech in tech_indicators:
        if tech in text_lower:
            required_skills.append(tech.title())

    # Clean up: remove lines that are full sentences rather than skill names.
    cleaned = []
    for s in required_skills:
        s_clean = s.strip().strip("-*•,.")
        # Skip if the line is a long phrase (>4 words) that doesn't start with a tech keyword.
        words = s_clean.split()
        if len(words) > 4 and not any(
            w.lower() in tech_indicators or s_clean.lower().startswith(w.lower())
            for w in words
        ):
            continue
        if len(s_clean) > 1:
            cleaned.append(s_clean)
    required_skills = cleaned

    # --- Soft Skills ---
    soft_indicators = [
        "communication", "teamwork", "leadership", "problem.solving", "analytical",
        "creativity", "adaptability", "collaboration", "mentor", "presentation",
        "interpersonal", "time.management", "critical.thinking", "empathy",
        "conflict.resolution", "decision.making", "negotiation", "ownership"
    ]
    for soft in soft_indicators:
        if re.search(soft.replace(".", r"[.\s-]"), text_lower):
            soft_skills_list.append(soft.replace(".", " ").title())

    # --- Implicit / Bonus Requirements ---
    bonus_indicators = ["bonus", "nice.to.have", "preferred", "plus", "advantage"]
    for bonus in bonus_indicators:
        if bonus in text_lower:
            implicit_requirements.append(
                f"Candidates with additional {bonus} qualifications preferred"
            )

    if "startup" in text_lower or "fast.paced" in text_lower:
        implicit_requirements.append("Thrives in fast-paced environments")

    return JDExtracted(
        required_skills=list(set(required_skills)),
        experience_level=experience_level,
        domain=primary_domain,
        soft_skills=list(set(soft_skills_list)),
        implicit_requirements=implicit_requirements
    )
