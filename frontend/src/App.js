import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import TopRankingsTab from './components/TopRankingsTab';
import UploadRankTab from './components/UploadRankTab';
import ScoreBreakdownTab from './components/ScoreBreakdownTab';
import HowItWorksTab from './components/HowItWorksTab';
import ComparisonDrawer from './components/ComparisonDrawer';
import Toast from './components/Toast';
import './App.css';

function AppInner() {
  const [activeTab, setActiveTab] = useState('rankings');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jdText, setJdText] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(true);
  const [cachedCandidates, setCachedCandidates] = useState([]);
  const [offlineCandidates, setOfflineCandidates] = useState([]);
  const [fadeKey, setFadeKey] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [compareMode, setCompareMode] = useState([]);
  const healthChecked = useRef(false);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    if (healthChecked.current) return;
    healthChecked.current = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    fetch('http://localhost:8000/health', { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeout);
        if (!res.ok) throw new Error('unhealthy');
        return res.json();
      })
      .then(() => {
        setIsOffline(false);
        setCheckingHealth(false);
        return fetch('http://localhost:8000/candidates', { signal: controller.signal });
      })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCachedCandidates(data);
          setOfflineCandidates(data);
        }
      })
      .catch(() => {
        setIsOffline(true);
        setCheckingHealth(false);
        fetch('/candidates.json')
          .then(r => r.json())
          .then(data => {
            if (Array.isArray(data)) {
              setOfflineCandidates(data);
              setCachedCandidates(data);
            }
          })
          .catch(() => {});
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const handleFindCandidates = async (jdText) => {
    if (isOffline) {
      const { rankCandidates } = await import('./utils/offlineScorer');
      const results = rankCandidates(offlineCandidates, jdText);
      const enriched = results.map(c => ({
        ...c,
        all_skills: (offlineCandidates.find(cc => cc.id === c.candidate_id) || {}).skills || c.matched_skills || [],
      }));
      setCandidates(enriched);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: jdText }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      const enriched = (data.candidates || []).map((c) => ({
        ...c,
        all_skills: (cachedCandidates.find((cc) => cc.id === c.candidate_id) || {}).skills || c.matched_skills || [],
      }));
      setCandidates(enriched);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFadeKey((k) => k + 1);
  };

  const clearResults = () => {
    setCandidates([]);
    setError(null);
    setCompareMode([]);
  };

  const handleCompareToggle = (candidate) => {
    setCompareMode(prev => {
      const id = candidate.candidate_id || candidate.name;
      const exists = prev.findIndex(c => (c.candidate_id || c.name) === id);
      if (exists >= 0) return prev.filter((_, i) => i !== exists);
      if (prev.length >= 3) return prev;
      return [...prev, candidate];
    });
  };

  return (
    <div className="app">
      <div className="hero-section">
        <div className="hero-orbs">
          <div className="hero-orb orb-1" /><div className="hero-orb orb-2" /><div className="hero-orb orb-3" />
        </div>
        <div className="hero-content">
          <h1 className="hero-title">TalentAI</h1>
          <p className="hero-subtitle">Intelligent Candidate Discovery Engine</p>
          <div className="hero-tagline">
            <span className="hero-pill"><span className="pill-dot" /> Powered by Semantic AI</span>
            <span className="hero-pill"><span className="pill-dot" /> Multi-Signal Scoring</span>
            <span className="hero-pill"><span className="pill-dot" /> Real-time Ranking</span>
          </div>
          <div className="hero-stats">
            <span className="hero-stat">50 Candidates</span>
            <span className="hero-stat-divider">•</span>
            <span className="hero-stat">4 Scoring Signals</span>
            <span className="hero-stat-divider">•</span>
            <span className="hero-stat">&lt;1s Ranking</span>
          </div>
        </div>
      </div>

      {isOffline && (
        <div className="offline-banner">
          <span>Running offline — results use local keyword scoring (less accurate than semantic AI)</span>
        </div>
      )}

      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isOffline={isOffline}
        checkingHealth={checkingHealth}
      />

      <main className="main-content">
        <div className="tab-panel" key={fadeKey}>
          {activeTab === 'rankings' && (
            <TopRankingsTab
              candidates={candidates}
              loading={loading}
              error={error}
              isOffline={isOffline}
              onFindCandidates={handleFindCandidates}
              jdText={jdText}
              setJdText={setJdText}
              offlineCandidates={offlineCandidates}
              clearResults={clearResults}
              showToast={showToast}
              compareMode={compareMode}
              onCompareToggle={handleCompareToggle}
            />
          )}
          {activeTab === 'upload' && (
            <UploadRankTab
              isOffline={isOffline}
              backendCandidates={cachedCandidates}
              showToast={showToast}
            />
          )}
          {activeTab === 'breakdown' && (
            <ScoreBreakdownTab candidates={candidates} />
          )}
          {activeTab === 'howitworks' && (
            <HowItWorksTab />
          )}
        </div>
      </main>

      {compareMode.length >= 2 && (
        <ComparisonDrawer
          compareList={compareMode}
          onClose={() => setCompareMode([])}
        />
      )}

      <footer className="app-footer">
        <div className="footer-inner">
          <p className="footer-challenge">Built for Data &amp; AI Challenge: Intelligent Candidate Discovery</p>
          <div className="footer-pills">
            <span className="footer-pill">Python</span>
            <span className="footer-pill">FastAPI</span>
            <span className="footer-pill">React</span>
            <span className="footer-pill">Sentence Transformers</span>
            <span className="footer-pill">Cosine Similarity</span>
          </div>
          <p className="footer-powered">Powered by TalentAI Engine v1.0</p>
        </div>
      </footer>

      <Toast toasts={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
