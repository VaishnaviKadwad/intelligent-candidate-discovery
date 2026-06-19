// offlineScorer.js — Robust offline candidate ranking engine

// Normalize any candidate object to a standard shape
function normalizeCandidate(c, index) {
  const skills = parseSkills(
    c.skills || c.Skills || c.skill_set || c.technologies ||
    c.tech_stack || c.Skillset || c.skillset || ""
  );

  const experience = parseExperience(
    c.years_experience ?? c.experience ?? c.exp ??
    c.Years_Experience ?? c.yrs_exp ?? c.Experience ?? 0
  );

  const behavioral = parseFloat(
    c.github_activity_score ?? c.activity_score ??
    c.behavioral_score ?? c.github_score ?? 50
  );

  return {
    id: c.id || c.ID || index + 1,
    name: c.name || c.Name || c.full_name || c.candidate_name || `Candidate ${index + 1}`,
    title: c.current_title || c.title || c.job_title || c.designation || c.Title || "No title",
    skills,
    experience,
    behavioral: isNaN(behavioral) ? 50 : behavioral,
    raw: c
  };
}

function parseSkills(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(s => String(s).trim().toLowerCase()).filter(Boolean);
  if (typeof val === "string") {
    // handles: "Python, FastAPI, ML" or "Python|FastAPI" or "Python;FastAPI"
    return val.split(/[,|;\/\n]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

function parseExperience(val) {
  if (val === null || val === undefined || val === "") return 0;
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 0 : num;
}

function experienceScore(years) {
  if (years >= 12) return 100;
  if (years >= 8)  return 75;
  if (years >= 5)  return 50;
  if (years >= 2)  return 30;
  if (years >= 1)  return 15;
  return 5;
}

function extractJDKeywords(jd) {
  if (!jd || jd.trim() === "") return [];
  const stopWords = new Set([
    "the","and","for","with","that","this","have","from","they",
    "will","been","more","when","your","what","which","their",
    "about","would","there","could","other","into","some","than",
    "then","these","those","were","also","must","should","can",
    "required","experience","looking","candidate","role","team",
    "work","using","use","etc","good","strong","well","ability"
  ]);
  return [...new Set(
    jd.toLowerCase()
      .replace(/[^a-z0-9\s\+\#\.]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  )];
}

function skillMatchScore(candidateSkills, jdKeywords) {
  if (!jdKeywords.length || !candidateSkills.length) return { score: 0, matched: [] };

  const matched = candidateSkills.filter(skill =>
    jdKeywords.some(kw =>
      skill.includes(kw) || kw.includes(skill) ||
      levenshteinClose(skill, kw)
    )
  );

  const score = Math.round((matched.length / Math.max(candidateSkills.length, jdKeywords.length * 0.3)) * 100);
  return { score: Math.min(score, 100), matched };
}

// Simple fuzzy match for short strings (e.g. "js" vs "javascript")
function levenshteinClose(a, b) {
  if (a.length < 2 || b.length < 2) return false;
  if (a.length > 12 || b.length > 12) return false;
  if (Math.abs(a.length - b.length) > 3) return false;
  let common = 0;
  for (const ch of a) if (b.includes(ch)) common++;
  return common / Math.max(a.length, b.length) > 0.7;
}

function generateReasoning(candidate, rank, skillResult, expScore, behavScore) {
  const top3 = skillResult.matched.slice(0, 3).join(", ") || "general skills";
  const expLabel = candidate.experience >= 8 ? "strongly" : candidate.experience >= 4 ? "moderately" : "partially";
  const behavNote = candidate.behavioral > 70
    ? "High activity signals an active, passionate engineer."
    : candidate.behavioral > 40
    ? "Moderate engagement noted in behavioral signals."
    : "Limited public activity — may prefer enterprise environments.";

  return `${candidate.name} ranked #${rank} because they matched ${skillResult.matched.length} required skills` +
    (top3 ? ` including ${top3}` : "") +
    `. Their ${candidate.experience} years of experience aligns ${expLabel} with the role. ${behavNote}`;
}

// Main export — rank candidates against a JD
export function rankCandidates(rawCandidates, jobDescription = "") {
  const jdKeywords = extractJDKeywords(jobDescription);
  const hasJD = jdKeywords.length > 0;

  const scored = rawCandidates.map((raw, i) => {
    const c = normalizeCandidate(raw, i);
    const skillResult = skillMatchScore(c.skills, jdKeywords);
    const expScore = experienceScore(c.experience);
    const behavScore = Math.min(c.behavioral, 100);

    // Weights: skill 50%, experience 30%, behavioral 20%
    // If no JD provided, redistribute: experience 60%, behavioral 40%
    const finalScore = hasJD
      ? Math.round(skillResult.score * 0.5 + expScore * 0.3 + behavScore * 0.2)
      : Math.round(expScore * 0.6 + behavScore * 0.4);

    return {
      ...c,
      skill_match: skillResult.score,
      experience_score: expScore,
      behavioral_score: behavScore,
      final_score: finalScore,
      matched_skills: skillResult.matched,
      reasoning: "",  // filled after sorting
      _skillResult: skillResult,
      _expScore: expScore,
      _behavScore: behavScore
    };
  });

  // Sort descending
  scored.sort((a, b) => b.final_score - a.final_score);

  // Add rank + reasoning after sort
  return scored.map((c, i) => ({
    ...c,
    rank: i + 1,
    reasoning: generateReasoning(c, i + 1, c._skillResult, c._expScore, c._behavScore)
  }));
}

// Parse uploaded file content into candidate array
export async function parseUploadedFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const text = await file.text();

  if (ext === "json") {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : data.candidates || data.data || Object.values(data);
  }

  if (ext === "csv") {
    const { default: Papa } = await import("papaparse");
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    return result.data;
  }

  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(text, { type: "binary" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws);
  }

  // .txt or .pdf text — treat as JD, not candidates
  return [];
}
