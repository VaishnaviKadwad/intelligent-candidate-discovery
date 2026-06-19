import React from 'react';

export default function EmptyState({ tab = 'rankings' }) {
  if (tab === 'rankings') {
    return (
      <div className="empty-state">
        <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="30" width="120" height="70" rx="8" stroke="var(--border)" strokeWidth="2" fill="var(--surface)" />
          <rect x="35" y="45" width="90" height="6" rx="3" fill="var(--border)" />
          <rect x="35" y="58" width="70" height="6" rx="3" fill="var(--border)" />
          <rect x="35" y="71" width="80" height="6" rx="3" fill="var(--border)" />
          <circle cx="80" cy="90" r="8" fill="var(--accent)" opacity="0.3" />
          <path d="M76 90l3 3 5-6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h3>No candidates ranked yet</h3>
        <p>Enter a job description or upload a file to find matching candidates.</p>
      </div>
    );
  }
  if (tab === 'upload') {
    return (
      <div className="empty-state">
        <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M80 20v50M60 50l20-20 20 20" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="25" y="70" width="110" height="30" rx="6" stroke="var(--border)" strokeWidth="2" fill="var(--surface)" />
          <path d="M50 85h60" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <h3>Upload candidate files</h3>
        <p>Drop .json, .csv, .pdf, or .xlsx files here to rank candidates.</p>
      </div>
    );
  }
  return (
    <div className="empty-state">
      <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="50" r="25" stroke="var(--border)" strokeWidth="2" fill="var(--surface)" />
        <path d="M60 95h40l10-20H50l10 20z" stroke="var(--border)" strokeWidth="2" fill="var(--surface)" />
        <line x1="80" y1="75" x2="80" y2="85" stroke="var(--border)" strokeWidth="2" />
        <line x1="65" y1="50" x2="95" y2="50" stroke="var(--border)" strokeWidth="2" />
        <line x1="80" y1="35" x2="80" y2="65" stroke="var(--border)" strokeWidth="2" />
      </svg>
      <h3>No data to display</h3>
      <p>Rank some candidates first to see their score breakdown.</p>
    </div>
  );
}
