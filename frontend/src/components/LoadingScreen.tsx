import { useState, useEffect } from 'react';
import '../styles/LoadingScreen.css';

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
      {/* Deep Space Starfield */}
      <div className="starfield">
        {[...Array(120)].map((_, i) => (
          <div key={i} className={`sf-star sf-star-${i % 4}`} style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${2 + Math.random() * 4}s`,
            width: `${1 + Math.random() * 3}px`,
            height: `${1 + Math.random() * 3}px`,
          }}></div>
        ))}
      </div>

      {/* Shooting Stars */}
      <div className="shooting-star shooting-star-1"></div>
      <div className="shooting-star shooting-star-2"></div>
      <div className="shooting-star shooting-star-3"></div>

      {/* Deep Nebula Clouds */}
      <div className="deep-nebula deep-nebula-1"></div>
      <div className="deep-nebula deep-nebula-2"></div>
      <div className="deep-nebula deep-nebula-3"></div>

      {/* Main Content */}
      <div className="space-main-content">
        {/* Space Marine Helmet */}
        <div className="marine-helmet">
          <div className="helmet-visor"></div>
          <div className="helmet-glow"></div>
        </div>

        {/* Orbiting Planets */}
        <div className="orbit-ring">
          <div className="orbit-planet orbit-planet-1">🌍</div>
          <div className="orbit-planet orbit-planet-2">🌙</div>
          <div className="orbit-planet orbit-planet-3">⭐</div>
        </div>

        {/* Floating Space Emojis */}
        <div className="space-floaters">
          <span className="floater floater-1">🚀</span>
          <span className="floater floater-2">🛸</span>
          <span className="floater floater-3">🌌</span>
          <span className="floater floater-4">☄️</span>
          <span className="floater floater-5">🔭</span>
        </div>

        {/* Title */}
        <div className="space-title-area">
          <h1 className="space-main-title">🚀 အာကာသ စူးစမ်းရှာဖွေရေး 🚀</h1>
          <p className="space-main-subtitle">Space Adventure Loading...</p>
        </div>

        {/* Progress Bar */}
        <div className="space-progress-wrap">
          <div className="space-progress-track">
            <div className="space-progress-fill"></div>
            <div className="space-progress-glow"></div>
          </div>
          <p className="space-progress-label">Preparing your journey...</p>
        </div>
      </div>

      {/* Bottom Tagline */}
      <div className="space-bottom-tag">
        <p>✨ ကလေးများ ၏ အာကာသ စူးစူးမြတ်မြတ် ခြင်း ✨</p>
      </div>
    </div>
  );
}
