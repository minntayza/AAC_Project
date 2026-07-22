import type { Icon } from '../api';

interface FeelingsScreenProps {
  icons: Icon[];
  onBack: () => void;
  speakText: (text: string) => void;
}

export function FeelingsScreen({ icons, onBack, speakText }: FeelingsScreenProps) {
  return (
    <>
      <div className="builder-bar" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.3rem' }}>😊 ခံစားချက်များ (Feelings)</h1>
        <button className="btn btn-icon-only" onClick={onBack}>←</button>
      </div>
      <div className="main-content">
        {!icons.length ? (
          <div className="empty-state">
            <span className="empty-emoji">😌</span>
            <p className="empty-text">No feelings cards available</p>
          </div>
        ) : (
          <div className="card-grid">
            {icons.map((icon) => (
              <button
                key={icon.id}
                className="aac-card category-object"
                onClick={() => speakText(icon.label_my)}
                aria-label={`${icon.label_my} — ${icon.label_en}`}
              >
                <span className="card-emoji">{icon.image_url}</span>
                <span className="card-text">{icon.label_my}</span>
                <span className="card-label-en">{icon.label_en}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
