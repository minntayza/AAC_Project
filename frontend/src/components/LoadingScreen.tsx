import { useState, useEffect } from 'react';
import '../styles/LoadingScreen.css';

interface LoadingScreenProps {
  isLoading: boolean;
}

export function LoadingScreen({ isLoading }: LoadingScreenProps) {
  const [showContent, setShowContent] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      // Fade out after app loads
      const timer = setTimeout(() => setShowContent(false), 300);
      return () => clearTimeout(timer);
    }
    setShowContent(true);
  }, [isLoading]);

  if (!showContent) return null;

  return (
    <div className={`loading-screen ${isLoading ? 'active' : 'fade-out'}`}>
      {/* Animated Background Gradient */}
      <div className="loading-background">
        <div className="gradient-blob blob-1"></div>
        <div className="gradient-blob blob-2"></div>
        <div className="gradient-blob blob-3"></div>
      </div>

      {/* Main Loading Container */}
      <div className="loading-container">
        {/* Bouncing Characters */}
        <div className="bouncing-chars">
          <div className="bounce-char char-1">🌟</div>
          <div className="bounce-char char-2">🎨</div>
          <div className="bounce-char char-3">🎭</div>
          <div className="bounce-char char-4">🎪</div>
          <div className="bounce-char char-5">🎯</div>
        </div>

        {/* Main Animation Circle */}
        <div className="loading-circle-container">
          <div className="loading-circle spinning">
            <div className="circle-dot dot-1"></div>
            <div className="circle-dot dot-2"></div>
            <div className="circle-dot dot-3"></div>
          </div>
          
          {/* Center Icon */}
          <div className="center-icon pulsing">
            <span className="icon-emoji">💬</span>
          </div>
        </div>

        {/* Loading Text with Animation */}
        <div className="loading-text">
          <h1 className="loading-title">🎉 အားလုံးအဆင်ပြေပြီ! 🎉</h1>
          <p className="loading-subtitle">Getting Ready for Fun...</p>
        </div>

        {/* Animated Progress Bar */}
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
          <p className="progress-text">Loading...</p>
        </div>

        {/* Floating Particles */}
        <div className="particles">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`}></div>
          ))}
        </div>
      </div>

      {/* Bottom Encouraging Text */}
      <div className="loading-footer">
        <p className="footer-text">✨ ကလေးချစ်သော ကမ္ဘာမှ ကောင်းကင်သို့ ၎င်း... ✨</p>
      </div>
    </div>
  );
}
