import type { Screen } from '../types';

interface BottomNavProps {
  screen: Screen;
  onScreenChange: (s: Screen) => void;
}

const NAV_ITEMS: { key: Screen; emoji: string; label: string }[] = [
  { key: 'board', emoji: '🖼️', label: 'Board' },
  { key: 'feelings', emoji: '😊', label: 'Feelings' },
];

export function BottomNav({ screen, onScreenChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          className={`nav-item${screen === item.key ? ' active' : ''}`}
          onClick={() => onScreenChange(item.key)}
          aria-current={screen === item.key ? 'page' : undefined}
        >
          <span className="nav-icon">{item.emoji}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
