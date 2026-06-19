import React, { useState, useMemo } from 'react';
import FileDropzone from './FileDropzone';
import CandidateCard from './CandidateCard';
import Spinner from './Spinner';
import EmptyState from './EmptyState';
import { extractSkillsFromText, weightedScore } from '../utils/offlineScorer';

export default function UploadRankTab({ isOffline, backendCandidates }) {
  const [parsedCandidates, setParsedCandidates] = useState(null);
  const [parsedJD, setParsedJD] = useState(null);
  const [rankedResults, setRankedResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sourceLabel, setSourceLabel] = useState('');

  const handleFileParsed = (result) => {
    setError(null);
    setRankedResults(null);

    if (result.type === 'error') {
      setError(result.message);
      return;
    }

    if (result.type === 'candidates') {
      const mapped = result.data.map((c, i) => ({
        id: c.id || `upload_${i}`,
        name: c.name || c.Name || c.candidate_name || `Candidate ${i + 1}`,
        current_title: c.current_title || c.title || c.Title || c.Current_Title || '',
        skills: Array.isArray(c.skills)
          ? c.skills
          : typeof c.skills === 'string'
            ? c.skills.split(',').map((s) => s.trim())
            : c.Skills
              ? c.Skills.split(',').map((s) => s.trim())
              : [],
        experience_years: parseInt(c.experience_years || c.years_experience || c.Experience_Years || 0, 10),
        github_activity_score: parseInt(c.github_activity_score || c.GitHub_Activity_Score || 50, 10),
        domain: c.domain || c.Domain || '',
        soft_skills: Array.isArray(c.soft_skills) ? c.soft_skills : [],
        career_progression: Array.isArray(c.career_progression) ? c.career_progression : [],
        recent_certifications: Array.isArray(c.recent_certifications)
          ? c.recent_certifications
          : typeof c.certifications === 'string'
            ? c.certifications.split(',').map((s) => s.trim())
            : [],
        recent_role_change: Boolean(c.recent_role_change),
        education: c.education || c.Education || '',
      }));
      setParsedCandidates(mapped);
      setParsedJD(null);
      setSourceLabel(`Uploaded ${result.data.length} candidates`);
    } else if (result.type === 'jd') {
      setParsedJD({ text: result.data, filename: result.filename });
      setParsedCandidates(null);
      setSourceLabel(`Extracted text from ${result.filename}`);
    }
  };

  const handleRunRanking = async () => {
    setLoading(true);
    setError(null);

    const candidatesToRank = parsedCandidates || backendCandidates;

    if (!candidatesToRank || candidatesToRank.length === 0) {
      setError('No candidates available to rank.');
      setLoading(false);
      return;
    }

    if (parsedJD && !isOffline) {
      try {
        const res = await fetch('http://localhost:8000/rank?top_n=50', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: parsedJD.text }),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        const enriched = data.candidates.map((c) => ({
          ...c,
          all_skills: (candidatesToRank.find((cc) => cc.id === c.candidate_id) || {}).skills || c.matched_skills || [],
        }));
        setRankedResults(enriched);
        setLoading(false);
        return;
      } catch {
        // Fall through to offline scorer
      }
    }

    const skills = parsedJD
      ? extractSkillsFromText(parsedJD.text)
      : [];
    const results = candidatesToRank.map((c) => {
      const scored = weightedScore(c, skills, parsedJD ? parsedJD.text : '');
      return {
        ...scored,
        all_skills: c.skills || [],
      };
    });
    results.sort((a, b) => b.final_score - a.final_score);
    setRankedResults(results);
    setLoading(false);
  };

  const combined = useMemo(() => {
    return parsedCandidates || backendCandidates || [];
  }, [parsedCandidates, backendCandidates]);

  return (
    <div className="tab-content">
      <div className="upload-section">
        <h2>Upload & Rank Candidates</h2>
        <p className="section-desc">
          Upload a file containing candidate profiles (.json, .csv, .xlsx) or a job description (.pdf).
        </p>

        <FileDropzone onFileParsed={handleFileParsed} accept=".pdf,.csv,.json,.xlsx" />

        {sourceLabel && <div className="source-label">{sourceLabel}</div>}

        {parsedCandidates && (
          <div className="preview-section">
            <h3>Candidate Preview ({parsedCandidates.length} detected)</h3>
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Title</th>
                    <th>Skills</th>
                    <th>Exp</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedCandidates.slice(0, 10).map((c, i) => (
                    <tr key={i}>
                      <td>{c.name}</td>
                      <td>{c.current_title}</td>
                      <td>{(c.skills || []).slice(0, 3).join(', ')}{(c.skills || []).length > 3 ? '...' : ''}</td>
                      <td>{c.experience_years}y</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedCandidates.length > 10 && <p className="preview-more">...and {parsedCandidates.length - 10} more</p>}
            </div>

            <div className="jd-actions" style={{ marginTop: '1rem' }}>
              <button className="btn-primary" onClick={handleRunRanking} disabled={loading}>
                {loading ? <><Spinner size={14} /> Ranking...</> : 'Rank These Candidates'}
              </button>
            </div>
          </div>
        )}

        {parsedJD && (
          <div className="preview-section">
            <h3>JD Preview: {parsedJD.filename}</h3>
            <div className="jd-preview-text">
              {parsedJD.text.substring(0, 500)}{parsedJD.text.length > 500 ? '...' : ''}
            </div>
            <div className="jd-actions" style={{ marginTop: '1rem' }}>
              <button className="btn-primary" onClick={handleRunRanking} disabled={loading}>
                {loading ? <><Spinner size={14} /> Ranking...</> : 'Find Matching Candidates'}
              </button>
            </div>
            {isOffline && <p className="offline-note">Using local scoring engine (offline mode).</p>}
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {rankedResults && rankedResults.length > 0 && (
        <div className="results-section">
          <h2>Ranked Results ({rankedResults.length})</h2>
          <div className="candidate-list">
            {rankedResults.map((c, i) => (
              <CandidateCard key={c.candidate_id || i} rank={i + 1} candidate={c} />
            ))}
          </div>
        </div>
      )}

      {!parsedCandidates && !parsedJD && !rankedResults && <EmptyState tab="upload" />}
    </div>
  );
}
