function getField(obj, ...keys) {
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined && val !== null) return val;
  }
  return undefined;
}

function normalizeSkills(val) {
  if (Array.isArray(val)) return val.filter(Boolean).map(s => String(s).trim()).filter(s => s);
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(s => s);
  return [];
}

function extractKeywords(text) {
  return (text || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
}

export function weightedScore(candidate, jdText) {
  const jdKeywords = extractKeywords(jdText);
  const skills = normalizeSkills(getField(candidate, 'skills', 'Skills', 'skill_set', 'technologies', 'tech_stack'));
  const name = getField(candidate, 'name', 'Name', 'full_name', 'candidate_name') || 'Unknown';
  const title = getField(candidate, 'current_title', 'title', 'Title', 'Current_Title', 'job_title', 'designation') || '';
  const expRaw = getField(candidate, 'experience_years', 'years_experience', 'experience', 'exp', 'Years_Experience', 'yrs_exp');
  const exp = parseInt(expRaw, 10) || 0;
  const ghRaw = getField(candidate, 'github_activity_score', 'activity_score', 'behavioral_score');
  const gh = parseInt(ghRaw, 10) || 50;

  let matchedSkills = [];
  if (jdKeywords.length > 0 && skills.length > 0) {
    matchedSkills = skills.filter(skill =>
      jdKeywords.some(kw => skill.toLowerCase().includes(kw) || kw.includes(skill.toLowerCase()))
    );
  }

  const skillScore = skills.length > 0 ? (matchedSkills.length / skills.length) * 100 : 0;

  let expScore = 0;
  if (exp <= 5) expScore = 20;
  else if (exp <= 8) expScore = 50;
  else if (exp <= 12) expScore = 75;
  else expScore = 100;

  const behScore = Math.min(Math.max(gh, 0), 100);

  const finalScore = skillScore * 0.50 + expScore * 0.30 + behScore * 0.20;

  const matchedNames = matchedSkills.slice(0, 5);
  const reason = matchedNames.length > 0
    ? `Matched ${matchedSkills.length} skills: ${matchedNames.join(', ')}${matchedSkills.length > 5 ? '...' : ''}`
    : `${exp}yrs experience, ${title || 'No title'}`;

  return {
    candidate_id: candidate.id || candidate.candidate_id || `c_${Math.random().toString(36).slice(2, 8)}`,
    name,
    title,
    final_score: Math.round(finalScore * 10) / 10,
    skill_match_pct: Math.round(skillScore * 10) / 10,
    experience_score: Math.round(expScore * 10) / 10,
    behavioral_score: Math.round(behScore * 10) / 10,
    reasoning: reason,
    matched_skills: matchedSkills,
    all_skills: skills,
  };
}

export function rankCandidates(candidates, jdText) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  return candidates
    .map(c => weightedScore(c, jdText))
    .sort((a, b) => b.final_score - a.final_score);
}

export function extractSkillsFromText(text) {
  const techKeywords = [
    'python', 'java', 'javascript', 'typescript', 'react', 'node', 'sql', 'kubernetes',
    'docker', 'aws', 'gcp', 'azure', 'tensorflow', 'pytorch', 'git', 'rest', 'api',
    'graphql', 'html', 'css', 'c++', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
    'terraform', 'ansible', 'jenkins', 'kafka', 'spark', 'hadoop', 'redis', 'mongodb',
    'postgresql', 'mysql', 'linux', 'agile', 'scrum', 'ci/cd', 'mlops', 'nlp',
    'machine learning', 'deep learning', 'data science', 'analytics', 'ml',
    'computer vision', 'llm', 'rag', 'langchain',
  ];
  const lower = text.toLowerCase();
  return [...new Set(techKeywords.filter((kw) => lower.includes(kw)))];
}
