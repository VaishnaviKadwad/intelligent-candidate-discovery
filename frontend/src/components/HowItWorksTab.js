import React, { useState } from 'react';

const steps = [
  { icon: '📋', title: 'JD Input', desc: 'Accept free-text or structured job descriptions' },
  { icon: '🔍', title: 'Keyword Extraction', desc: 'Identify required skills, domain, and seniority level' },
  { icon: '🎯', title: 'Skill Matching', desc: 'Compare candidate skills via semantic similarity & keyword overlap' },
  { icon: '📈', title: 'Experience Scoring', desc: 'Evaluate years of experience and domain alignment' },
  { icon: '📊', title: 'Behavioral Signals', desc: 'Normalize GitHub activity, certifications, and recent changes' },
  { icon: '⚖️', title: 'Weighted Sum', desc: 'Combine all signals with configurable importance weights' },
  { icon: '🏆', title: 'Ranked Output', desc: 'Sort by final score and return top-N candidates' },
];

const weightsTable = [
  { signal: 'Skill Match', weight: '50%', method: 'Keyword overlap + semantic similarity (cosine)' },
  { signal: 'Experience', weight: '30%', method: 'Years × seniority level alignment' },
  { signal: 'Behavioral', weight: '20%', method: 'GitHub activity + certifications + recency' },
];

export default function HowItWorksTab() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tab-content">
      <div className="how-section">
        <h2>Scoring Transparency Dashboard</h2>
        <p className="section-desc">Understand exactly how every candidate score is computed.</p>

        <div className="pipeline-flow">
          {steps.map((step, i) => (
            <React.Fragment key={step.title}>
              <div className="pipeline-step">
                <div className="pipeline-icon">{step.icon}</div>
                <div className="pipeline-content">
                  <div className="pipeline-title">{step.title}</div>
                  <div className="pipeline-desc">{step.desc}</div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="pipeline-arrow">
                  <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                    <path d="M10 0v20M4 14l6 6 6-6" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="arrow-line"/>
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="weights-section">
          <h3>Scoring Weights</h3>
          <div className="weights-table-wrapper">
            <table className="weights-table">
              <thead>
                <tr>
                  <th>Signal</th>
                  <th>Weight</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {weightsTable.map((row) => (
                  <tr key={row.signal}>
                    <td className="weight-signal">{row.signal}</td>
                    <td className="weight-value">
                      <div className="weight-bar-wrapper">
                        <div className="weight-bar" style={{ width: row.weight }} />
                        <span>{row.weight}</span>
                      </div>
                    </td>
                    <td className="weight-method">{row.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="why-weights">
            <button className="why-toggle" onClick={() => setExpanded(!expanded)}>
              {expanded ? '▼' : '▶'} Why these weights?
            </button>
            {expanded && (
              <div className="why-content">
                <p>The weights are designed to prioritise <strong>direct skill relevance</strong> (50%) as the strongest predictor of job fit. <strong>Experience</strong> (30%) accounts for depth and seniority alignment, while <strong>Behavioral signals</strong> (20%) capture engagement and growth trajectory — important signals often overlooked in traditional screening.</p>
                <p style={{ marginTop: '0.5rem' }}>All weights are configurable in <code>backend/data/config.yaml</code> without touching any code. Adjust them based on your organisation's hiring philosophy.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
