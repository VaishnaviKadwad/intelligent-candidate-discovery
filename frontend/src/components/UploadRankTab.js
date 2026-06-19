import React, { useState, useMemo } from 'react';
import FileDropzone from './FileDropzone';
import CandidateCard from './CandidateCard';
import Spinner from './Spinner';
import EmptyState from './EmptyState';
import { rankCandidates } from '../utils/offlineScorer';

export default function UploadRankTab({ isOffline, backendCandidates, showToast }) {
  const [parsedCandidates, setParsedCandidates] = useState(null);
  const [parsedJD, setParsedJD] = useState(null);
  const [rankedResults, setRankedResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sourceLabel, setSourceLabel] = useState('');
  const [jdText, setJdText] = useState('');

  const handleFileParsed = (result) => {
    setError(null);
    setRankedResults(null);

    if (result.type === 'error') {
      setError(result.message);
      if (showToast) showToast(`Could not parse file — check format: ${result.message}`, 'error');
      return;
    }

    if (result.type === 'candidates') {
      const mapped = result.data.map((c, i) => ({
        id: c.id || `upload_${i}`,
        name: c.name || c.Name || c.full_name || c.candidate_name || `Candidate ${i + 1}`,
        current_title: c.current_title || c.title || c.Title || c.Current_Title || c.job_title || c.designation || '',
        skills: Array.isArray(c.skills)
          ? c.skills
          : typeof c.skills === 'string'
            ? c.skills.split(',').map((s) => s.trim())
            : Array.isArray(c.Skills)
              ? c.Skills
              : typeof c.Skills === 'string'
                ? c.Skills.split(',').map((s) => s.trim())
                : Array.isArray(c.skill_set)
                  ? c.skill_set
                  : typeof c.skill_set === 'string'
                    ? c.skill_set.split(',').map((s) => s.trim())
                    : Array.isArray(c.technologies)
                      ? c.technologies
                      : typeof c.technologies === 'string'
                        ? c.technologies.split(',').map((s) => s.trim())
                        : Array.isArray(c.tech_stack)
                          ? c.tech_stack
                          : typeof c.tech_stack === 'string'
                            ? c.tech_stack.split(',').map((s) => s.trim())
                            : [],
        experience_years: parseInt(c.experience_years || c.years_experience || c.experience || c.exp || c.Years_Experience || c.yrs_exp || 0, 10),
        github_activity_score: parseInt(c.github_activity_score || c.activity_score || c.behavioral_score || 50, 10),
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
      setSourceLabel(`Uploaded ${result.data.length} candidates from ${result.filename || 'file'}`);
      if (showToast) showToast(`Parsed ${result.data.length} candidates from ${result.filename || 'file'}`, 'success');
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

    const jdToUse = jdText || (parsedJD ? parsedJD.text : '');

    if (!isOffline && jdToUse) {
      try {
        const body = parsedCandidates
          ? { text: jdToUse, candidates: parsedCandidates }
          : { text: jdToUse };
        const res = await fetch('http://localhost:8000/rank?top_n=50', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
        // fall through to offline scorer
      }
    }

    const results = rankCandidates(candidatesToRank, jdToUse);
    setRankedResults(results);
    setLoading(false);
  };

  const combined = useMemo(() => {
    return parsedCandidates || backendCandidates || [];
  }, [parsedCandidates, backendCandidates]);

  const clearResults = () => {
    setRankedResults(null);
    setParsedCandidates(null);
    setParsedJD(null);
    setError(null);
    setSourceLabel('');
    setJdText('');
  };

  return (
    <div className="tab-content">
      <div className="upload-section">
        <h2>Upload & Rank Candidates</h2>
        <p className="section-desc">
          Upload a file containing candidate profiles (.json, .csv, .xlsx) or a job description (.pdf).
        </p>

        <div className="upload-jd-input">
          <label>Job Description <span className="field-hint">(required for skill matching)</span></label>
          <textarea
            placeholder="Paste the job requirements here... e.g. Senior Python developer with ML experience"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            rows={4}
          />
          {!jdText.trim() && !parsedJD && (
            <p className="jd-warning">⚠️ Add a job description above for accurate skill matching</p>
          )}
        </div>

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
          </div>
        )}

        {isOffline && (parsedCandidates || parsedJD) && (
          <p className="offline-note">Using local keyword scoring engine (offline mode).</p>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {rankedResults && rankedResults.length > 0 && (
        <div className="results-section">
          <div className="results-toolbar">
            <h2>Ranked Results ({rankedResults.length})</h2>
            <button type="button" className="btn-secondary" onClick={clearResults}>
              Clear Results
            </button>
          </div>
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
