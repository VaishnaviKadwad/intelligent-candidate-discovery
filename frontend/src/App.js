import React, { useState } from 'react';

function App() {
  // 1. Core State Definitions
  const [jdText, setJdText] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 2. The Fetch API Trigger Function
  const handleFindCandidates = async (e) => {
    e.preventDefault(); // Prevents page reload on form submit
    if (!jdText.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: jdText }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err.message);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  // 3. User Interface View Layout
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '10px', marginBottom: '30px' }}>
        <h1 style={{ color: '#333' }}>Intelligent Candidate Discovery</h1>
        <p style={{ color: '#666' }}>Paste a job description below to rank matching talent instantly.</p>
      </header>

      <main>
        {/* Job Description Submission Box */}
        <form onSubmit={handleFindCandidates} style={{ marginBottom: '30px' }}>
          <label htmlFor="jd" style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>
            Job Description / Requirements:
          </label>
          <textarea
            id="jd"
            rows="8"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Type or paste the target job requirements here..."
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '14px', resize: 'vertical' }}
          />
          <button
            type="submit"
            disabled={loading || !jdText.trim()}
            style={{ marginTop: '12px', padding: '12px 24px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', opacity: loading || !jdText.trim() ? 0.6 : 1 }}
          >
            {loading ? 'Analyzing Candidates...' : 'Discover & Rank Candidates'}
          </button>
        </form>

        {/* Dynamic Error Messaging Display */}
        {error && (
          <div style={{ padding: '12px', backgroundColor: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', borderRadius: '6px', marginBottom: '20px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Candidate Ranking Results List View */}
        <section>
          <h2 style={{ color: '#444', marginBottom: '15px' }}>Ranked Matches</h2>
          {candidates.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic' }}>No candidate matching analysis run yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {candidates.map((candidate, idx) => (
                <div key={idx} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b' }}>{candidate.name || `Candidate #${idx + 1}`}</h3>
                    <span style={{ padding: '4px 10px', backgroundColor: '#dcfce7', color: '#14532d', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
                      {candidate.final_score ? `${(candidate.final_score * 100).toFixed(0)}% Match` : 'N/A'}
                    </span>
                  </div>
                  {candidate.title && <p style={{ margin: '0 0 8px 0', color: '#475569', fontWeight: '500' }}>{candidate.title}</p>}
                  {candidate.reasoning && (
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                      <strong>Fit Analysis:</strong> {candidate.reasoning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
