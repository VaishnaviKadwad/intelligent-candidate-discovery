import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import TopRankingsTab from './components/TopRankingsTab';
import UploadRankTab from './components/UploadRankTab';
import ScoreBreakdownTab from './components/ScoreBreakdownTab';
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
  const [fadeKey, setFadeKey] = useState(0);
  const healthChecked = useRef(false);

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
        }
      })
      .catch(() => {
        setIsOffline(true);
        setCheckingHealth(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const handleFindCandidates = async (jdText) => {
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
      setActiveTab('rankings');
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

  return (
    <div className="app">
      {isOffline && (
        <div className="offline-banner">
          <span>Running in offline mode — using local scoring engine</span>
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
            />
          )}
          {activeTab === 'upload' && (
            <UploadRankTab
              isOffline={isOffline}
              backendCandidates={cachedCandidates}
            />
          )}
          {activeTab === 'breakdown' && (
            <ScoreBreakdownTab candidates={candidates} />
          )}
        </div>
      </main>
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
