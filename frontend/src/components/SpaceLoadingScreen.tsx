import { useState, useEffect } from 'react';
import '../styles/SpaceLoadingScreen.css';

interface LoadingScreenProps {
  isLoading: boolean;
}

export function LoadingScreen({ isLoading }: LoadingScreenProps) {
  const [showContent, setShowContent] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setShowContent(false), 3500);
      return () => clearTimeout(timer);
    }
    setShowContent(true);
  }, [isLoading]);

  if (!showContent) return null;

  return (
    <div className={`space-loading-screen ${isLoading ? 'active' : 'fade-out'}`}>
      {/* Starfield Background */}
      <div className="starfield">
        {[...Array(150)].map((_, i) => (
          <div key={i} className={`star star-${i % 3}`}></div>
        ))}
      </div>

      {/* Nebula/Galaxy Effects */}
      <div className="nebula nebula-1"></div>
      <div className="nebula nebula-2"></div>
      <div className="nebula nebula-3"></div>

      {/* Main Content Container */}
      <div className="space-loading-container">
        {/* Fun Space Mascot - Alien Buddy */}
        <div className="alien-mascot">
          <div className="alien-head">
            <div className="alien-eyes">
              <div className="alien-eye left-eye"></div>
              <div className="alien-eye right-eye"></div>
            </div>
            <div className="alien-mouth"></div>
          </div>
          <div className="alien-body">
            <div className="alien-arm left-arm"></div>
            <div className="alien-arm right-arm"></div>
          </div>
        </div>

        {/* Puzzle Pieces Flying & Assembling */}
        <div className="puzzle-container">
          <div className="puzzle-piece puzzle-1">🧩</div>
          <div className="puzzle-piece puzzle-2">🧩</div>
          <div className="puzzle-piece puzzle-3">🧩</div>
          <div className="puzzle-piece puzzle-4">🧩</div>
        </div>

        {/* Floating Rockets */}
        <div className="rocket rocket-1">🚀</div>
        <div className="rocket rocket-2">🛸</div>
        <div className="rocket rocket-3">🚀</div>

        {/* Loading Text */}
        <div className="space-loading-text">
          <h1 className="space-title">🚀 အာကာသ အဖြင့် ခရီးတစ်သွားခွင့် 🚀</h1>
          <p className="space-subtitle">Space Adventure Awaits...</p>
        </div>

        {/* Puzzle Assembly Progress */}
        <div className="puzzle-progress">
          <div className="puzzle-progress-bar">
            <div className="puzzle-progress-fill"></div>
          </div>
          <p className="progress-label">Assembling...</p>
        </div>

        {/* Floating Stars */}
        <div className="floating-stars">
          {[...Array(12)].map((_, i) => (
            <div key={i} className={`float-star star-item-${i}`}>⭐</div>
          ))}
        </div>

        {/* Planets Orbiting */}
        <div className="planet-orbit">
          <div className="planet planet-earth">🌍</div>
          <div className="planet planet-moon">🌙</div>
          <div className="planet planet-saturn">🪐</div>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="space-footer">
        <p className="footer-text">✨ ကလေးများ ၏ အာကာသ စူးစူးမြတ်မြတ် ခြင်း ✨</p>
      </div>

      {/* Cosmic Dust Particles */}
      <div className="cosmic-dust">
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`dust-particle dust-${i}`}></div>
        ))}
      </div>
    </div>
  );
}
