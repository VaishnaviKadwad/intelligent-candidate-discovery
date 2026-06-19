import React, { useState, useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import EmptyState from './EmptyState';

export default function ScoreBreakdownTab({ candidates }) {
  const [selectedId, setSelectedId] = useState(candidates.length > 0 ? candidates[0].candidate_id : null);

  const selected = useMemo(
    () => candidates.find((c) => c.candidate_id === selectedId),
    [candidates, selectedId]
  );

  const radarData = selected
    ? [
        { metric: 'Skill Match', value: Math.min(selected.skill_match_pct || 0, 100) },
        { metric: 'Experience', value: Math.min(selected.experience_score || 0, 100) },
        { metric: 'Behavioral', value: Math.min(selected.behavioral_score || 0, 100) },
        { metric: 'Career', value: Math.min(selected.career_score || 0, 100) },
      ]
    : [];

  if (candidates.length === 0) return <div className="tab-content"><EmptyState tab="breakdown" /></div>;

  return (
    <div className="tab-content">
      <div className="breakdown-section">
        <h2>Score Breakdown</h2>
        <p className="section-desc">Select a candidate to view their radar chart of the four scoring dimensions.</p>

        <div className="breakdown-controls">
          <label htmlFor="candidate-select">Candidate:</label>
          <select
            id="candidate-select"
            className="sort-select"
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {candidates.map((c) => (
              <option key={c.candidate_id} value={c.candidate_id}>
                {c.name} — {c.final_score}%
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="radar-section">
            <div className="radar-card">
              <h3>{selected.name}</h3>
              <p className="radar-subtitle">{selected.title} — Final Score: {selected.final_score}%</p>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name={selected.name}
                    dataKey="value"
                    stroke="var(--accent)"
                    fill="var(--accent)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text)',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <div className="radar-scores">
                {radarData.map((d) => (
                  <div key={d.metric} className="radar-score-item">
                    <span className="radar-score-label">{d.metric}</span>
                    <span className="radar-score-value">{d.value.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
