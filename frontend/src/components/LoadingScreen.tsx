import { useState, useEffect } from 'react';
import '../styles/LoadingScreen.css';

interface LoadingScreenProps {
  isLoading: boolean;
}

export function LoadingScreen({ isLoading }: LoadingScreenProps) {
  const [showContent, setShowContent] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          const increment = Math.random() * 12 + 3;
          return Math.min(prev + increment, 95);
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      const timer = setTimeout(() => setShowContent(false), 1200);
      return () => clearTimeout(timer);
    }
    setShowContent(true);
  }, [isLoading]);

  if (!showContent) return null;

  return (
    <div className={`loading-screen ${isLoading ? 'active' : 'fade-out'}`}>
      {/* Floating illustrations */}
      <div className="load-illustrations">
        <svg className="load-illust load-illust-1" viewBox="0 0 60 60" fill="none">
          <rect x="5" y="10" width="50" height="40" rx="8" stroke="#667eea" strokeWidth="2.5" fill="rgba(102,126,234,0.08)"/>
          <circle cx="20" cy="28" r="4" fill="#f59e0b"/>
          <circle cx="35" cy="24" r="3" fill="#667eea"/>
          <rect x="14" y="36" width="32" height="3" rx="1.5" fill="#667eea" opacity="0.3"/>
          <rect x="14" y="42" width="20" height="3" rx="1.5" fill="#667eea" opacity="0.2"/>
        </svg>

        <svg className="load-illust load-illust-2" viewBox="0 0 50 50" fill="none">
          <circle cx="25" cy="25" r="20" stroke="#764ba2" strokeWidth="2.5" fill="rgba(118,75,162,0.08)"/>
          <path d="M18 30 L22 22 L30 26 L34 18" stroke="#764ba2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>

        <svg className="load-illust load-illust-3" viewBox="0 0 50 50" fill="none">
          <path d="M10 38 C10 12 40 12 40 38 Z" stroke="#f59e0b" strokeWidth="2.5" fill="rgba(245,158,11,0.08)"/>
          <circle cx="25" cy="30" r="3" fill="#f59e0b"/>
          <circle cx="25" cy="20" r="2" fill="#f59e0b" opacity="0.5"/>
        </svg>

        <svg className="load-illust load-illust-4" viewBox="0 0 50 50" fill="none">
          <rect x="8" y="8" width="34" height="34" rx="6" stroke="#667eea" strokeWidth="2" fill="rgba(102,126,234,0.06)"/>
          <path d="M16 20 L24 12 L32 20" stroke="#667eea" strokeWidth="2" strokeLinecap="round" fill="none"/>
          <rect x="16" y="24" width="18" height="10" rx="2" fill="#667eea" opacity="0.15"/>
        </svg>

        <svg className="load-illust load-illust-5" viewBox="0 0 40 40" fill="none">
          <path d="M20 4 C28 4 36 12 36 20 C36 28 28 36 20 36 C12 36 4 28 4 20 C4 12 12 4 20 4 Z" stroke="#764ba2" strokeWidth="2" fill="rgba(118,75,162,0.06)"/>
          <circle cx="14" cy="18" r="2" fill="#764ba2" opacity="0.5"/>
          <circle cx="26" cy="18" r="2" fill="#764ba2" opacity="0.5"/>
          <path d="M14 26 Q20 30 26 26" stroke="#764ba2" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        </svg>
      </div>

      {/* Floating music notes */}
      <div className="load-notes">
        {['♪', '♫', '♬', '♩', '♪', '♫'].map((note, i) => (
          <span
            key={i}
            className="load-note"
            style={{
              left: `${10 + i * 15}%`,
              animationDelay: `${i * 1.2}s`,
              animationDuration: `${5 + i * 0.8}s`,
            }}
          >{note}</span>
        ))}
      </div>

      {/* Floating particles */}
      <div className="load-particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="load-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
              width: `${3 + Math.random() * 7}px`,
              height: `${3 + Math.random() * 7}px`,
              opacity: 0.15 + Math.random() * 0.25,
            }}
          />
        ))}
      </div>

      {/* Morphing background shapes */}
      <div className="load-shapes">
        <div className="load-shape"></div>
        <div className="load-shape"></div>
        <div className="load-shape"></div>
        <div className="load-shape"></div>
        <div className="load-shape"></div>
        <div className="load-shape"></div>
      </div>

      {/* Main content */}
      <div className="load-center">
        <div className="load-logo">
          <div className="load-logo-icon">
            <div className="sound-waves">
              <div className="sound-ring"></div>
              <div className="sound-ring"></div>
              <div className="sound-ring"></div>
              <div className="sound-ring"></div>
            </div>
            <img src="/assets/logo.png" alt="AAC Logo" className="load-logo-img" />
          </div>
          <div className="load-logo-text">အသံ</div>
          <div className="load-logo-sub">AAC Communication</div>
        </div>
        <div className="load-bar-track">
          <div className="load-bar-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}
