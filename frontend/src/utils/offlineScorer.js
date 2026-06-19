export function weightedScore(candidate, jdSkills, jdText) {
  const textLower = jdText ? jdText.toLowerCase() : '';

  const skillOverlap = jdSkills.filter((s) =>
    candidate.skills.some((cs) => cs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(cs.toLowerCase()))
  ).length;

  const skillScore = jdSkills.length > 0 ? skillOverlap / jdSkills.length : 0;

  const titleWords = (candidate.current_title || candidate.title || '').toLowerCase().split(/\s+/);
  const titleMatch = titleWords.filter((w) => textLower.includes(w)).length / Math.max(titleWords.length, 1);

  const expNorm = Math.min((candidate.experience_years || 0) / 15, 1);

  const githubNorm = Math.min((candidate.github_activity_score || 0) / 100, 1);

  const finalScore = skillScore * 0.45 + titleMatch * 0.25 + expNorm * 0.2 + githubNorm * 0.1;

  const matchedSkills = jdSkills.filter((s) =>
    candidate.skills.some((cs) => cs.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(cs.toLowerCase()))
  );

  return {
    candidate_id: candidate.id,
    name: candidate.name,
    title: candidate.current_title || candidate.title || '',
    final_score: Math.round(finalScore * 1000) / 10,
    skill_match_pct: Math.round(skillScore * 1000) / 10,
    experience_score: Math.round(expNorm * 1000) / 10,
    behavioral_score: Math.round(githubNorm * 1000) / 10,
    reasoning: `Matched ${skillOverlap} skills; ${candidate.experience_years || 0}yrs experience`,
    matched_skills: matchedSkills,
  };
}

export function extractSkillsFromText(text) {
  const techKeywords = [
    'python', 'java', 'javascript', 'typescript', 'react', 'node', 'sql', 'kubernetes',
    'docker', 'aws', 'gcp', 'azure', 'tensorflow', 'pytorch', 'git', 'rest', 'api',
    'graphql', 'html', 'css', 'c++', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
    'terraform', 'ansible', 'jenkins', 'kafka', 'spark', 'hadoop', 'redis', 'mongodb',
    'postgresql', 'mysql', 'linux', 'agile', 'scrum', 'ci/cd', 'mlops', 'nlp',
    'machine learning', 'deep learning', 'data science', 'analytics', 'ml',
    'computer vision', 'nlp', 'llm', 'rag', 'langchain',
  ];
  const lower = text.toLowerCase();
  return [...new Set(techKeywords.filter((kw) => lower.includes(kw)))];
}
