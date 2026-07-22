import type { Category, Icon } from '../api';

interface ParentModeProps {
  categories: Category[];
  iconsByCategory: Record<string, Icon[]>;
  loading: boolean;
  onExit: () => void;
}

export function ParentMode({ categories, iconsByCategory, loading, onExit }: ParentModeProps) {
  return (
    <>
      <div className="builder-bar" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.2rem' }}>Parent / Teacher Mode</h1>
        <button className="btn btn-icon-only" onClick={onExit}>Exit</button>
      </div>
      <div className="main-content">
        {loading && <p style={{ textAlign: 'center', marginTop: 40 }}>Loading...</p>}
        {categories.map((cat) => (
          <div key={cat.id}>
            <h2 className="section-title">{cat.name_my} ({cat.name_en})</h2>
            <div className="card-grid">
              {(iconsByCategory[cat.id] ?? []).map((icon) => (
                <div key={icon.id} className="aac-card" style={{ opacity: 0.8, backgroundColor: cat.color + '30' }}>
                  <span className="card-emoji">{icon.image_url}</span>
                  <span className="card-text">{icon.label_my}</span>
                  <span className="card-label-en">{icon.label_en}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
