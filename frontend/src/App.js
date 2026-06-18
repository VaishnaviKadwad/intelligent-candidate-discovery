import React, { useState } from 'react';
import JDInput from './components/JDInput';
import CandidateCard from './components/CandidateCard';
import './App.css';

function App() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFindCandidates = async (jdText) => {
    setLoading(true);
    setError(null);
    // jdText captured for potential future use
    try {
      const res = await fetch('http://localhost:8000/rank', {
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Intelligent Candidate Discovery</h1>
        <p className="subtitle">AI-powered recruiter — semantically rank candidates for any job description</p>
      </header>
      <JDInput onFind={handleFindCandidates} loading={loading} />
      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Analyzing candidates...</div>}
      {candidates.length > 0 && (
        <div className="results">
          <h2>Ranked Candidates ({candidates.length})</h2>
          <div className="candidate-list">
            {candidates.map((c, i) => (
              <CandidateCard key={c.candidate_id} rank={i + 1} candidate={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
