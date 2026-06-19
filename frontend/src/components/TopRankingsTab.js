import React, { useState, useMemo } from 'react';
import CandidateCard from './CandidateCard';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

const TEMPLATES = {
  ml: `Senior Machine Learning Engineer

We are looking for a Senior Machine Learning Engineer to join our AI team. You will design, train, and deploy ML models at scale, collaborating with product and infrastructure teams.

Requirements:
- 5+ years of experience in machine learning and deep learning
- Strong proficiency in Python, PyTorch, and TensorFlow
- Hands-on experience with NLP, transformer models, and LLMs
- Kubernetes, Docker, and MLOps for model deployment
- Excellent problem-solving and cross-functional communication skills

Preferred: Experience with RAG systems, LangChain, and vector databases.`,
  fullstack: `Full Stack Developer

We are looking for a Full Stack Developer to build modern web applications. You will own features from database schema to user interface.

Requirements:
- 4+ years experience in full stack web development
- Strong JavaScript/TypeScript skills with React or Vue.js
- Backend experience with Node.js, Python, or Go
- SQL and NoSQL database design (PostgreSQL, MongoDB)
- REST API design and GraphQL experience
- Familiarity with CI/CD pipelines and cloud services (AWS/GCP)

Preferred: Experience with Next.js, Docker, and microservices architecture.`,
  data: `Data Scientist

We are looking for a Data Scientist to derive insights from complex datasets and build predictive models.

Requirements:
- 3+ years experience in data science or analytics
- Strong Python and SQL proficiency
- Experience with machine learning frameworks (scikit-learn, XGBoost)
- Statistical analysis, hypothesis testing, and experiment design
- Data visualization using Tableau, Matplotlib, or similar tools
- Familiarity with big data tools (Spark, Airflow)

Preferred: Experience with deep learning, NLP, or recommendation systems.`,
  security: `Security Engineer

We are looking for a Security Engineer to protect our infrastructure and applications.

Requirements:
- 5+ years experience in cybersecurity or related field
- Deep knowledge of network security, penetration testing, and vulnerability assessment
- Experience with cloud security (AWS/Azure/GCP)
- Proficiency in Python or Go for security tooling
- SIEM, SOAR, and incident response experience
- Security compliance frameworks (SOC2, ISO 27001, HIPAA)

Preferred: CISSP, CEH, or OSCP certifications.`,
  mobile: `Mobile Developer

We are looking for a Mobile Developer to build cross-platform mobile applications.

Requirements:
- 3+ years experience in mobile development
- Strong skills in React Native, Flutter, or native iOS/Android
- Experience with RESTful APIs and GraphQL
- Understanding of mobile UI/UX best practices
- App store deployment and CI/CD for mobile
- Performance optimization and offline-first architecture

Preferred: Experience with Firebase, push notifications, and real-time features.`,
};

const ANIMATION_STEPS = [
  { icon: '🔍', text: 'Parsing job requirements...' },
  { icon: '🧠', text: 'Computing semantic similarity...' },
  { icon: '📊', text: 'Integrating behavioral signals...' },
  { icon: '🏆', text: 'Generating final rankings...' },
];

function exportCSV(candidates) {
  const rows = [['Rank', 'Name', 'Title', 'Final Score', 'Skill Match', 'Experience', 'Behavioral', 'Matched Skills']];
  candidates.forEach((c, i) => {
    rows.push([i + 1, c.name || '', c.title || '', c.final_score, c.skill_match_pct, c.experience_score, c.behavioral_score, (c.matched_skills || []).join('; ')]);
  });
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `candidate_rankings_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function copyShareSummary(candidates) {
  const top3 = candidates.slice(0, 3);
  const lines = [
    'Top 3 candidates ranked by TalentAI',
    `Generated: ${new Date().toLocaleString()}`,
    '',
  ];
  top3.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.name || 'Unknown'} — ${c.final_score}% match`);
  });
  lines.push('', 'Powered by TalentAI Engine v1.0');
  navigator.clipboard.writeText(lines.join('\n'));
}

export default function TopRankingsTab({
  candidates,
  loading,
  error,
  isOffline,
  onFindCandidates,
  jdText,
  setJdText,
  clearResults,
  showToast,
  compareMode,
  onCompareToggle,
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('total');
  const [showExport, setShowExport] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const filtered = useMemo(() => {
    let list = [...candidates];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.matched_skills || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'skill') list.sort((a, b) => b.skill_match_pct - a.skill_match_pct);
    else if (sortBy === 'experience') list.sort((a, b) => b.experience_score - a.experience_score);
    else if (sortBy === 'behavioral') list.sort((a, b) => b.behavioral_score - a.behavioral_score);
    else list.sort((a, b) => b.final_score - a.final_score);
    return list;
  }, [candidates, search, sortBy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jdText.trim()) return;

    setAnimating(true);
    setShowResults(false);
    setAnimStep(0);

    for (let i = 0; i < ANIMATION_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 500));
      setAnimStep(i + 1);
    }

    await new Promise(r => setTimeout(r, 200));
    setAnimating(false);
    setShowResults(true);
    onFindCandidates(jdText.trim());
  };

  const handleTemplate = (key) => {
    setJdText(TEMPLATES[key]);
  };

  return (
    <div className="tab-content">
      <div className="jd-input-section">
        <div className="template-chips">
          <span className="template-label">Quick Templates:</span>
          {Object.entries(TEMPLATES).map(([key, _]) => {
            const labels = { ml: '🧠 ML Engineer', fullstack: '💻 Full Stack Dev', data: '📊 Data Scientist', security: '🔐 Security Engineer', mobile: '📱 Mobile Dev' };
            return (
              <button key={key} className="template-chip" onClick={() => handleTemplate(key)} disabled={loading || animating}>
                {labels[key] || key}
              </button>
            );
          })}
        </div>
        <form onSubmit={handleSubmit}>
          <h2>Job Description</h2>
          <textarea
            placeholder="Paste a job description here..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
          <div className="jd-actions">
            <button type="submit" disabled={loading || animating || !jdText.trim()} className="btn-primary">
              {loading || animating ? <><Spinner size={14} /> Searching...</> : '🔍 Discover & Rank'}
            </button>
          </div>
          {isOffline && <p className="offline-note">Using local keyword scoring engine (offline mode).</p>}
        </form>
      </div>

      {animating && (
        <div className="live-animation">
          <div className="animation-progress-track">
            <div className="animation-progress-fill" style={{ width: `${(animStep / ANIMATION_STEPS.length) * 100}%` }} />
          </div>
          {ANIMATION_STEPS.slice(0, animStep).map((step, i) => (
            <div key={i} className={`animation-step ${i === animStep - 1 ? 'active' : 'done'}`}>
              <span className="step-icon">{step.icon}</span>
              <span className="step-text">{step.text}</span>
              {i === animStep - 1 && <span className="step-spinner"><Spinner size={12} /></span>}
            </div>
          ))}
        </div>
      )}

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
              <div className="export-dropdown">
                <button className="btn-secondary" onClick={() => setShowExport(!showExport)}>
                  📄 Export ▾
                </button>
                {showExport && (
                  <div className="export-menu">
                    <button onClick={() => { window.print(); setShowExport(false); }}>📄 Export as PDF</button>
                    <button onClick={() => { exportCSV(filtered); setShowExport(false); }}>📊 Export as CSV</button>
                    <button onClick={() => { copyShareSummary(filtered); if (showToast) showToast('Share summary copied to clipboard', 'success'); setShowExport(false); }}>🔗 Copy Share Summary</button>
                  </div>
                )}
              </div>
              {clearResults && (
                <button type="button" className="btn-secondary" onClick={clearResults}>
                  Clear Results
                </button>
              )}
            </div>
          </div>
          <div className={`candidate-list ${showResults ? 'results-animate-in' : ''}`}>
            {filtered.map((c, i) => (
              <CandidateCard
                key={c.candidate_id || i}
                rank={i + 1}
                candidate={c}
                compareMode={compareMode}
                isCompareSelected={compareMode.findIndex(c2 => (c2.candidate_id || c2.name) === (c.candidate_id || c.name)) >= 0}
                onCompareToggle={onCompareToggle}
              />
            ))}
          </div>
        </div>
      )}

      {candidates.length === 0 && !loading && !animating && <EmptyState tab="rankings" />}
    </div>
  );
}
