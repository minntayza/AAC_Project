import { SkeletonGrid } from './SkeletonCard';
import type { AACCard, ShortcutCard } from '../data';

interface CardGridProps {
  cards: (AACCard | ShortcutCard)[];
  loading: boolean;
  onCardClick: (card: AACCard | ShortcutCard) => void;
  emptyMessage?: string;
}

/** Derive CSS category class for any card type. */
function cardClass(card: AACCard | ShortcutCard): string {
  if ('nextCategories' in card) return (card as AACCard).category;
  return 'shortcut';
}

export function CardGrid({ cards, loading, onCardClick, emptyMessage }: CardGridProps) {
  if (loading) {
    return (
      <div className="card-grid" aria-label="Loading cards">
        <SkeletonGrid count={8} />
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="empty-state" role="status">
        <span className="empty-emoji">📭</span>
        <p className="empty-text">{emptyMessage ?? 'No cards yet'}</p>
      </div>
    );
  }

  return (
    <div className="card-grid" role="list" aria-label="Communication cards">
      {cards.map((card) => (
        <button
          key={card.id}
          className={`aac-card category-${cardClass(card)}`}
          onClick={() => onCardClick(card)}
          role="listitem"
          aria-label={`${card.burmese} — ${card.englishMeaning}`}
        >
          <span className="card-emoji">{card.emoji}</span>
          <span className="card-text">{card.burmese}</span>
        </button>
      ))}
    </div>
  );
}
