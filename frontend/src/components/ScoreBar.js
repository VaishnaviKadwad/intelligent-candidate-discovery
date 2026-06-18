import React from 'react';

function ScoreBar({ label, value, color }) {
  const clamped = Math.min(Math.max(value, 0), 100);
  return (
    <div className="score-bar-row">
      <span className="label">{label}</span>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
      <span className="bar-value">{clamped.toFixed(0)}%</span>
    </div>
  );
}

export default ScoreBar;
