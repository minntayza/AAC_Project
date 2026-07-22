import { Volume2, Trash2, ArrowLeft } from 'lucide-react';
import type { AACCard, ShortcutCard } from '../data';

interface SentenceBuilderProps {
  selectedCards: (AACCard | ShortcutCard)[];
  speaking: boolean;
  onBack: () => void;
  onClear: () => void;
  onSpeak: () => void;
  onChipRemove: (index: number) => void;
}

/** Derive CSS category class for any card type. */
function chipClass(card: AACCard | ShortcutCard): string {
  if ('nextCategories' in card) return (card as AACCard).category;
  return 'shortcut';
}

export function SentenceBuilder({
  selectedCards,
  speaking,
  onBack,
  onClear,
  onSpeak,
  onChipRemove,
}: SentenceBuilderProps) {
  const hasCards = selectedCards.length > 0;

  return (
    <div className="builder-bar" role="region" aria-label="Sentence builder">
      <div className="sentence-display">
        {!hasCards ? (
          <span className="sentence-placeholder">
            <span className="placeholder-icon">👆</span>
            ပုံရွေးပါ — Choose cards
          </span>
        ) : (
          selectedCards.map((card, index) => (
            <button
              key={`${card.id}-${index}`}
              className={`selected-card-chip category-${chipClass(card)}`}
              onClick={() => onChipRemove(index)}
              title={`Remove ${card.burmese}`}
              aria-label={`Remove ${card.burmese}`}
            >
              <span className="chip-emoji">{card.emoji}</span>
              <span>{card.burmese}</span>
              <span className="chip-remove">✕</span>
            </button>
          ))
        )}
      </div>

      <div className="builder-actions">
        {hasCards && (
          <>
            <button className="btn btn-icon-only" onClick={onBack} aria-label="Remove last card" title="နောက်သို့">
              <ArrowLeft size={20} />
            </button>
            <button className="btn btn-icon-only" onClick={onClear} aria-label="Clear all" title="ဖျက်မည်">
              <Trash2 size={20} color="#EF4444" />
            </button>
          </>
        )}
        <button
          className={`btn btn-speak${hasCards && !speaking ? ' has-cards' : ''}`}
          onClick={onSpeak}
          disabled={!hasCards || speaking}
          aria-label={speaking ? 'Speaking' : 'Speak sentence'}
        >
          <Volume2 size={24} />
          <span>{speaking ? 'ပြောနေသည်...' : 'ပြောမည်'}</span>
        </button>
      </div>
    </div>
  );
}
