import React from 'react';
import ScoreBar from './ScoreBar';

function CandidateCard({ rank, candidate }) {
  return (
    <div className="candidate-card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <span className="rank-badge">#{rank}</span>
          <div className="name-title">
            <div className="name">{candidate.name}</div>
            <div className="title">{candidate.title}</div>
          </div>
        </div>
        <div className="final-score">{candidate.final_score}%</div>
      </div>
      <div className="reasoning">{candidate.reasoning}</div>
      <div className="score-bars">
        <ScoreBar label="Skill Match" value={candidate.skill_match_pct} color="#3b82f6" />
        <ScoreBar label="Experience" value={candidate.experience_score} color="#10b981" />
        <ScoreBar label="Behavioral" value={candidate.behavioral_score} color="#f59e0b" />
      </div>
      {candidate.matched_skills && candidate.matched_skills.length > 0 && (
        <div className="matched-skills">
          {candidate.matched_skills.map((s, i) => (
            <span key={i} className="skill-tag">{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default CandidateCard;
