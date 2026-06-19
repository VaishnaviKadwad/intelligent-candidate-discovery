// offlineScorer.js — Built for the exact candidate JSON structure

// ─── NORMALIZE: flatten nested candidate object ───────────────────────────────
function normalizeCandidate(c, index) {
  const profile = c.profile || {};
  const signals = c.redrob_signals || {};

  // Name: nested inside profile.anonymized_name
  const name = profile.anonymized_name || c.name || `Candidate ${index + 1}`;

  // Title: nested inside profile.current_title
  const title = profile.current_title || profile.headline || c.title || "No title";

  // Experience: nested inside profile.years_of_experience
  const experience = parseFloat(profile.years_of_experience ?? c.years_of_experience ?? 0) || 0;

  // Skills: array of objects [{name, proficiency, endorsements}] → extract .name strings
  const rawSkills = c.skills || [];
  const skills = rawSkills.map(s =>
    typeof s === "object" ? (s.name || "").toLowerCase().trim() : String(s).toLowerCase().trim()
  ).filter(Boolean);

  // Behavioral: nested inside redrob_signals.github_activity_score (can be -1 = no data)
  const rawBehavioral = signals.github_activity_score ?? c.github_activity_score ?? 50;
  const behavioral = rawBehavioral < 0 ? 30 : Math.min(parseFloat(rawBehavioral) || 30, 100);

  // Bonus signals from redrob_signals
  const profileCompleteness = parseFloat(signals.profile_completeness_score ?? 50);
  const openToWork = signals.open_to_work_flag ? 10 : 0;
  const connectionScore = Math.min((signals.connection_count || 0) / 10, 10);

  // Summary text for keyword matching (extra signal)
  const summary = profile.summary || "";
  const headline = profile.headline || "";

  return {
    id: c.candidate_id || index + 1,
    name,
    title,
    company: profile.current_company || "",
    location: profile.location || "",
    experience,
    skills,
    behavioral,
    profileCompleteness,
    openToWork,
    connectionScore,
    summary,
    headline,
    raw: c
  };
}

// ─── EXPERIENCE SCORING ───────────────────────────────────────────────────────
function experienceScore(years) {
  if (years >= 12) return 100;
  if (years >= 8)  return 80;
  if (years >= 5)  return 60;
  if (years >= 3)  return 40;
  if (years >= 1)  return 20;
  return 5;
}

// ─── JD KEYWORD EXTRACTION ───────────────────────────────────────────────────
function extractJDKeywords(jd) {
  if (!jd || !jd.trim()) return [];
  const stopWords = new Set([
    "the","and","for","with","that","this","have","from","they","will",
    "been","more","when","your","what","which","their","about","would",
    "there","could","other","into","some","than","then","these","those",
    "were","also","must","should","can","required","experience","looking",
    "candidate","role","team","work","using","use","etc","good","strong",
    "well","ability","our","you","who","are","has","its","not","but","all"
  ]);
  return [...new Set(
    jd.toLowerCase()
      .replace(/[^a-z0-9\s\+\#\.\/]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
  )];
}

// ─── SKILL MATCHING ───────────────────────────────────────────────────────────
function skillMatchScore(candidate, jdKeywords) {
  if (!jdKeywords.length) return { score: 0, matched: [] };

  const { skills, summary, headline } = candidate;

  // Match skills array against JD keywords
  const matchedSkills = skills.filter(skill =>
    jdKeywords.some(kw =>
      skill.includes(kw) || kw.includes(skill) ||
      (skill.length > 3 && kw.length > 3 && (
        skill.replace(/[\s\-_]/g, "").includes(kw.replace(/[\s\-_]/g, "")) ||
        kw.replace(/[\s\-_]/g, "").includes(skill.replace(/[\s\-_]/g, ""))
      ))
    )
  );

  // Also check summary/headline for keyword presence (boosts score)
  const textMatches = jdKeywords.filter(kw =>
    summary.toLowerCase().includes(kw) || headline.toLowerCase().includes(kw)
  ).length;

  const skillScore = skills.length > 0
    ? (matchedSkills.length / skills.length) * 100
    : 0;

  // Bonus: up to 20 extra points for keyword presence in summary
  const textBonus = Math.min((textMatches / Math.max(jdKeywords.length, 1)) * 20, 20);

  return {
    score: Math.min(Math.round(skillScore + textBonus), 100),
    matched: matchedSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)) // capitalize
  };
}

// ─── AI REASONING GENERATOR ──────────────────────────────────────────────────
function generateReasoning(c, rank, skillResult, expScore, behavScore) {
  const top3 = skillResult.matched.slice(0, 3).join(", ") || "general domain knowledge";
  const expLabel = c.experience >= 8 ? "strongly" : c.experience >= 4 ? "moderately" : "partially";
  const behavNote = c.behavioral > 70
    ? "Active GitHub presence signals a passionate, hands-on engineer."
    : c.behavioral > 40
    ? "Moderate community engagement noted."
    : "Limited public activity — may prefer enterprise/private environments.";
  const openNote = c.openToWork > 0 ? " Currently open to work." : "";

  return `${c.name} ranked #${rank} with ${skillResult.matched.length} skill matches` +
    (top3 ? ` (${top3})` : "") +
    `. ${c.experience} years of experience aligns ${expLabel} with this role.` +
    ` ${behavNote}${openNote}`;
}

// ─── MAIN EXPORT: rankCandidates ─────────────────────────────────────────────
export function rankCandidates(rawCandidates, jobDescription = "") {
  const jdKeywords = extractJDKeywords(jobDescription);
  const hasJD = jdKeywords.length > 0;

  const scored = rawCandidates.map((raw, i) => {
    const c = normalizeCandidate(raw, i);
    const skillResult = skillMatchScore(c, jdKeywords);
    const expScore = experienceScore(c.experience);
    const behavScore = c.behavioral;

    // Weighted scoring
    // With JD:    skill 50% + experience 30% + behavioral 20%
    // Without JD: experience 50% + behavioral 30% + profile completeness 20%
    const finalScore = hasJD
      ? Math.round(skillResult.score * 0.5 + expScore * 0.3 + behavScore * 0.2)
      : Math.round(expScore * 0.5 + behavScore * 0.3 + c.profileCompleteness * 0.2);

    return {
      ...c,
      skill_match: skillResult.score,
      experience_score: expScore,
      behavioral_score: Math.round(behavScore),
      final_score: finalScore,
      matched_skills: skillResult.matched,
      _skillResult: skillResult,
    };
  });

  // Sort descending by final score
  scored.sort((a, b) => b.final_score - a.final_score);

  // Add rank + reasoning after sort
  return scored.map((c, i) => ({
    ...c,
    rank: i + 1,
    reasoning: generateReasoning(c, i + 1, c._skillResult, c.experience_score, c.behavioral_score)
  }));
}

// ─── FILE PARSER ─────────────────────────────────────────────────────────────
export async function parseUploadedFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "json") {
    const text = await file.text();
    const data = JSON.parse(text);
    // Handle both array and {candidates: [...]} shapes
    return Array.isArray(data) ? data : data.candidates || data.data || Object.values(data);
  }

  if (ext === "csv") {
    const text = await file.text();
    const { default: Papa } = await import("papaparse");
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    return result.data;
  }

  if (ext === "xlsx" || ext === "xls") {
    const arrayBuffer = await file.arrayBuffer();
    const XLSX = await import("xlsx");
    const wb = XLSX.read(arrayBuffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws);
  }

  return [];
}
