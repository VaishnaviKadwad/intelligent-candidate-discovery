import React, { useState, useMemo } from 'react';
import CandidateCard from './CandidateCard';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

export default function TopRankingsTab({
  candidates,
  loading,
  error,
  isOffline,
  onFindCandidates,
  jdText,
  setJdText,
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('total');

  const filtered = useMemo(() => {
    let list = [...candidates];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.matched_skills || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'skill') list.sort((a, b) => b.skill_match_pct - a.skill_match_pct);
    else if (sortBy === 'experience') list.sort((a, b) => b.experience_score - a.experience_score);
    else if (sortBy === 'behavioral') list.sort((a, b) => b.behavioral_score - a.behavioral_score);
    else list.sort((a, b) => b.final_score - a.final_score);
    return list;
  }, [candidates, search, sortBy]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (jdText.trim()) onFindCandidates(jdText.trim());
  };

  return (
    <div className="tab-content">
      <form className="jd-input-section" onSubmit={handleSubmit}>
        <h2>Job Description</h2>
        <textarea
          placeholder="Paste a job description here..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          disabled={isOffline}
        />
        <div className="jd-actions">
          <button type="submit" disabled={loading || !jdText.trim() || isOffline} className="btn-primary">
            {loading ? <><Spinner size={14} /> Searching...</> : 'Find Candidates'}
          </button>
          <button type="button" onClick={() => setJdText(SAMPLE_JD)} disabled={loading || isOffline} className="btn-secondary">
            Load Sample JD
          </button>
        </div>
        {isOffline && <p className="offline-note">JD ranking unavailable offline. Use Upload & Rank tab.</p>}
      </form>

      {error && <div className="error-banner">{error}</div>}

      {candidates.length > 0 && (
        <div className="results-section">
          <div className="results-toolbar">
            <h2>Ranked Candidates ({filtered.length})</h2>
            <div className="toolbar-controls">
              <input
                type="text"
                className="search-input"
                placeholder="Filter by name or skill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="total">Sort by Total Score</option>
                <option value="skill">Sort by Skill Match</option>
                <option value="experience">Sort by Experience</option>
                <option value="behavioral">Sort by Behavioral</option>
              </select>
            </div>
          </div>
          <div className={`candidate-list ${loading ? 'loading-overlay' : ''}`}>
            {loading && (
              <div className="loading-overlay-inner">
                <Spinner size={32} />
                <p>Analyzing candidates...</p>
              </div>
            )}
            {filtered.map((c, i) => (
              <CandidateCard key={c.candidate_id} rank={i + 1} candidate={c} />
            ))}
          </div>
        </div>
      )}

      {candidates.length === 0 && !loading && <EmptyState tab="rankings" />}
    </div>
  );
}

const SAMPLE_JD = `Senior Machine Learning Engineer

We are looking for a Senior Machine Learning Engineer to join our AI team. You will design and deploy ML models at scale, working closely with product and infrastructure teams.

Requirements:
- 5+ years experience in ML/DL
- Strong Python and PyTorch skills
- Experience with NLP and transformer models
- Kubernetes and MLOps experience
- Excellent communication and problem-solving skills

Bonus: Experience with LLMs and RAG systems`;
