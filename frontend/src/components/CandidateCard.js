import React, { useState } from 'react';
import ScoreBar from './ScoreBar';

const rankEmojis = ['🥇', '🥈', '🥉'];

function getName(candidate) {
  return candidate.name || candidate.Name || candidate.full_name || candidate.candidate_name || 'Unknown';
}

function getTitle(candidate) {
  return candidate.current_title || candidate.title || candidate.Title || candidate.Current_Title || candidate.job_title || candidate.designation || 'No title';
}

function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase();
}

function generateAIExplanation(candidate, rank) {
  const matchedSkills = candidate.matched_skills || [];
  const allSkills = candidate.all_skills || matchedSkills;
  const totalSkills = allSkills.length || matchedSkills.length || 1;
  const top3 = matchedSkills.slice(0, 3);
  const yearsExp = candidate.experience_score >= 70 ? 8 : candidate.experience_score >= 40 ? 5 : 2;
  const domain = candidate.title || 'the field';

  let alignment = 'partially';
  if (candidate.skill_match_pct > 70) alignment = 'strongly';
  else if (candidate.skill_match_pct > 40) alignment = 'moderately';

  let behavioralNote = '';
  const beh = candidate.behavioral_score || 0;
  if (beh > 70) behavioralNote = 'High engagement signals suggest an active, passionate contributor.';
  else if (beh > 40) behavioralNote = 'Moderate community and activity engagement noted.';
  else behavioralNote = 'Limited public activity — may prefer private or enterprise environments.';

  return `${getName(candidate)} ranked #${rank} because they matched ${matchedSkills.length} of ${totalSkills} required skills including ${top3.join(', ') || 'several relevant areas'}. Their ${yearsExp}+ years of experience in ${domain} aligns ${alignment} with the role. ${behavioralNote}`;
}

export default function CandidateCard({ rank, candidate, showExpand = true, compareMode, isCompareSelected, onCompareToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const name = getName(candidate);
  const title = getTitle(candidate);

  const handleCopy = () => {
    const json = JSON.stringify(candidate, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const aiReasoning = generateAIExplanation(candidate, rank);

  return (
    <div className="candidate-card" style={{ animationDelay: `${(rank || 0) * 100}ms` }}>
      <div className="card-header">
        <div className="card-header-left">
          {compareMode && (
            <input
              type="checkbox"
              className="compare-checkbox"
              checked={!!isCompareSelected}
              onChange={() => onCompareToggle && onCompareToggle(candidate)}
              disabled={!isCompareSelected && compareMode.length >= 3}
            />
          )}
          <span className="rank-badge" style={rank <= 3 ? { background: 'var(--accent)' } : {}}>
            {rank <= 3 ? rankEmojis[rank - 1] : `#${rank}`}
          </span>
          <div className="avatar-initial">{getInitial(name)}</div>
          <div className="name-title">
            <div className="name">{name}</div>
            <div className="title">{title}</div>
          </div>
        </div>
        <div className="card-header-right">
          <div className="final-score">{candidate.final_score}%</div>
          {showExpand && (
            <button className="icon-btn" onClick={() => setExpanded(!expanded)} title={expanded ? 'Collapse' : 'Expand details'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          )}
          <button className="icon-btn" onClick={handleCopy} title={copied ? 'Copied!' : 'Copy candidate JSON'}>
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            )}
          </button>
        </div>
      </div>
      <div className="reasoning">{candidate.reasoning}</div>
      <div className="score-bars">
        <ScoreBar label="Skill Match" value={candidate.skill_match_pct} color="var(--accent)" />
        <ScoreBar label="Experience" value={candidate.experience_score} color="#22c55e" />
        <ScoreBar label="Behavioral" value={candidate.behavioral_score} color="#f59e0b" />
      </div>
      {candidate.matched_skills && candidate.matched_skills.length > 0 && (
        <div className="matched-skills">
          {candidate.matched_skills.map((s, i) => (
            <span key={i} className="skill-tag">{s}</span>
          ))}
        </div>
      )}
      <div className="card-actions-row">
        <button className="ai-reasoning-btn" onClick={() => setAiExpanded(!aiExpanded)}>
          <span>🧠</span> {aiExpanded ? 'Hide' : 'Show'} AI Reasoning
        </button>
      </div>
      {aiExpanded && (
        <div className="ai-reasoning-panel">
          {aiReasoning}
        </div>
      )}
      {expanded && (
        <div className="card-expanded">
          <div className="expanded-section">
            <strong>All Skills:</strong>
            <div className="expanded-skills">
              {candidate.all_skills && candidate.all_skills.length > 0
                ? candidate.all_skills.map((s, i) => <span key={i} className="skill-tag dim">{s}</span>)
                : (candidate.matched_skills || []).map((s, i) => <span key={i} className="skill-tag dim">{s}</span>)
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
