import React from 'react';

function getName(c) {
  return c.name || c.Name || c.full_name || c.candidate_name || 'Unknown';
}

function getTitle(c) {
  return c.current_title || c.title || c.Title || c.Current_Title || c.job_title || c.designation || '';
}

export default function ComparisonDrawer({ compareList, onClose }) {
  if (!compareList || compareList.length < 2) return null;

  const highest = (key) => Math.max(...compareList.map((c) => c[key] || 0));

  const exportComparison = () => {
    const lines = ['=== Candidate Comparison ===', `Generated: ${new Date().toLocaleString()}`, ''];
    compareList.forEach((c, i) => {
      lines.push(`--- Candidate ${i + 1}: ${getName(c)} ---`);
      lines.push(`  Title: ${getTitle(c)}`);
      lines.push(`  Final Score: ${c.final_score}%`);
      lines.push(`  Skill Match: ${c.skill_match_pct}%`);
      lines.push(`  Experience: ${c.experience_score}%`);
      lines.push(`  Behavioral: ${c.behavioral_score}%`);
      lines.push(`  Matched Skills: ${(c.matched_skills || []).join(', ')}`);
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_comparison.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="comparison-drawer-overlay" onClick={onClose}>
      <div className="comparison-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="comparison-header">
          <h3>Compare Candidates ({compareList.length})</h3>
          <div className="comparison-actions">
            <button className="btn-secondary" onClick={exportComparison}>Export Comparison</button>
            <button className="icon-btn" onClick={onClose} title="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                {compareList.map((c) => (
                  <th key={c.candidate_id || c.name} className={c.final_score === highest('final_score') ? 'winner' : ''}>
                    {getName(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Title', key: '_title', fn: (c) => getTitle(c) },
                { label: 'Final Score', key: 'final_score', pct: true },
                { label: 'Skill Match', key: 'skill_match_pct', pct: true },
                { label: 'Experience', key: 'experience_score', pct: true },
                { label: 'Behavioral', key: 'behavioral_score', pct: true },
                { label: 'Matched Skills', key: '_skills', fn: (c) => (c.matched_skills || []).slice(0, 4).join(', ') },
              ].map((row) => (
                <tr key={row.label}>
                  <td className="metric-label">{row.label}</td>
                  {compareList.map((c) => {
                    const val = row.fn ? row.fn(c) : (row.pct ? `${c[row.key] || 0}%` : c[row.key]);
                    const isWinner = row.key !== '_title' && row.key !== '_skills' && c[row.key] === highest(row.key);
                    return (
                      <td key={c.candidate_id || c.name} className={isWinner ? 'winner' : ''}>
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
