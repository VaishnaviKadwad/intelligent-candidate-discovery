import React, { useState } from 'react';

const SAMPLE_JD = `Senior Machine Learning Engineer

We are looking for a Senior Machine Learning Engineer to join our AI team. You will design and deploy ML models at scale, working closely with product and infrastructure teams.

Requirements:
- 5+ years experience in ML/DL
- Strong Python and PyTorch skills
- Experience with NLP and transformer models
- Kubernetes and MLOps experience
- Excellent communication and problem-solving skills

Bonus: Experience with LLMs and RAG systems`;

function JDInput({ onFind, loading }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) onFind(text.trim());
  };

  const fillSample = () => setText(SAMPLE_JD);

  return (
    <form className="jd-input-section" onSubmit={handleSubmit}>
      <h2>Job Description</h2>
      <textarea
        placeholder="Paste a job description here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" disabled={loading || !text.trim()}>
          {loading ? 'Searching...' : 'Find Candidates'}
        </button>
        <button type="button" onClick={fillSample} disabled={loading}
          style={{ background: '#334155', fontSize: '0.85rem', padding: '0.7rem 1rem' }}>
          Load Sample JD
        </button>
      </div>
    </form>
  );
}

export default JDInput;
