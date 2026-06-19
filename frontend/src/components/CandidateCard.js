import React, { useState } from 'react';
import ScoreBar from './ScoreBar';

const rankEmojis = ['🥇', '🥈', '🥉'];

export default function CandidateCard({ rank, candidate, showExpand = true }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const json = JSON.stringify(candidate, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="candidate-card" style={{ animationDelay: `${(rank || 0) * 60}ms` }}>
      <div className="card-header">
        <div className="card-header-left">
          <span className="rank-badge" style={rank <= 3 ? { background: 'var(--accent)' } : {}}>
            {rank <= 3 ? rankEmojis[rank - 1] : `#${rank}`}
          </span>
          <div className="name-title">
            <div className="name">{candidate.name}</div>
            <div className="title">{candidate.title}</div>
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
