import React, { useState, useEffect, useRef } from 'react';

export default function ScoreBar({ label, value, color }) {
  const [width, setWidth] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setWidth(Math.min(Math.max(value, 0), 100)), 50);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className="score-bar-row" ref={ref}>
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      <span className="score-bar-value">{clamped.toFixed(0)}%</span>
    </div>
  );
}
