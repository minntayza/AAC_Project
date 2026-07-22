import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Star } from 'lucide-react';

interface CardData {
  id: string;
  animal: string;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG: Record<Difficulty, { pairs: number; label: string; burmese: string }> = {
  easy: { pairs: 4, label: 'Easy', burmese: 'လွယ်' },
  medium: { pairs: 6, label: 'Medium', burmese: 'အလယ်' },
  hard: { pairs: 8, label: 'Hard', burmese: 'ခက်' },
};

const ANIMALS = [
  { animal: 'Cat', emoji: '🐱' },
  { animal: 'Dog', emoji: '🐶' },
  { animal: 'Rabbit', emoji: '🐰' },
  { animal: 'Bear', emoji: '🐻' },
  { animal: 'Frog', emoji: '🐸' },
  { animal: 'Lion', emoji: '🦁' },
  { animal: 'Monkey', emoji: '🐵' },
  { animal: 'Panda', emoji: '🐼' },
  { animal: 'Penguin', emoji: '🐧' },
  { animal: 'Cow', emoji: '🐮' },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateCards(difficulty: Difficulty): CardData[] {
  const count = DIFFICULTY_CONFIG[difficulty].pairs;
  const selected = shuffleArray(ANIMALS).slice(0, count);
  const pairs = selected.flatMap((a, i) => [
    { id: `${i}-a`, animal: a.animal, emoji: a.emoji, isFlipped: false, isMatched: false },
    { id: `${i}-b`, animal: a.animal, emoji: a.emoji, isFlipped: false, isMatched: false },
  ]);
  return shuffleArray(pairs);
}

interface Props {
  onBack: () => void;
}

export function ConcentrationGame({ onBack }: Props) {
  const [screen, setScreen] = useState<'select' | 'preview' | 'playing' | 'won'>('select');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchAnimation, setMatchAnimation] = useState<string | null>(null);
  const [mismatchAnimation, setMismatchAnimation] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    const newCards = generateCards(diff);
    setCards(newCards);
    setFlippedIds([]);
    setMoves(0);
    setTimer(0);
    setMatchAnimation(null);
    setMismatchAnimation(null);
    lockRef.current = false;
    setScreen('preview');

    setTimeout(() => {
      const previewCards = newCards.map(c => ({ ...c, isFlipped: true }));
      setCards(previewCards);
      setTimeout(() => {
        const hiddenCards = newCards.map(c => ({ ...c, isFlipped: false }));
        setCards(hiddenCards);
        setScreen('playing');
      }, 2000);
    }, 400);
  }, []);

  useEffect(() => {
    if (screen === 'playing') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen]);

  useEffect(() => {
    const totalPairs = DIFFICULTY_CONFIG[difficulty].pairs;
    const matchedCount = cards.filter(c => c.isMatched).length / 2;
    if (matchedCount === totalPairs && matchedCount > 0 && screen === 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => setScreen('won'), 800);
    }
  }, [cards, difficulty, screen]);

  const handleCardClick = useCallback((cardId: string) => {
    if (lockRef.current) return;

    const clicked = cards.find(c => c.id === cardId);
    if (!clicked || clicked.isFlipped || clicked.isMatched) return;

    const newCards = cards.map(c => c.id === cardId ? { ...c, isFlipped: true } : c);
    const newFlipped = [...flippedIds, cardId];
    setCards(newCards);

    if (newFlipped.length === 2) {
      lockRef.current = true;
      setMoves(m => m + 1);
      const [firstId, secondId] = newFlipped;
      const first = newCards.find(c => c.id === firstId)!;
      const second = newCards.find(c => c.id === secondId)!;

      if (first.animal === second.animal) {
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
          ));
          setMatchAnimation(firstId);
          setTimeout(() => setMatchAnimation(null), 800);
          setFlippedIds([]);
          lockRef.current = false;
        }, 500);
      } else {
        setTimeout(() => {
          setMismatchAnimation(firstId);
          setMismatchAnimation(secondId);
          setTimeout(() => {
            setCards(prev => prev.map(c =>
              c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
            ));
            setMismatchAnimation(null);
            setFlippedIds([]);
            lockRef.current = false;
          }, 600);
        }, 700);
      }
    } else {
      setFlippedIds(newFlipped);
    }
  }, [cards, flippedIds]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getGridClass = () => {
    const count = cards.length;
    if (count <= 8) return 'game-grid game-grid-4x2';
    if (count <= 12) return 'game-grid game-grid-4x3';
    return 'game-grid game-grid-4x4';
  };

  const renderConfetti = () => (
    <div className="game-confetti-container">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
            backgroundColor: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'][Math.floor(Math.random() * 6)],
          }}
        />
      ))}
    </div>
  );

  // Difficulty selection screen
  if (screen === 'select') {
    return (
      <div className="game-container">
        <button className="game-back-btn" onClick={onBack}>
          <ArrowLeft size={22} />
          <span>ပြန်မည်</span>
        </button>

        <div className="game-select-screen">
          <div className="game-title-emoji">🎮</div>
          <h1 className="game-title">Memory Game</h1>
          <p className="game-subtitle">တိရစ္ဆာန်လေးတွေ ရှာပါ (Find the animals!)</p>

          <div className="difficulty-options">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
              <button
                key={diff}
                className="difficulty-btn"
                onClick={() => startGame(diff)}
              >
                <span className="difficulty-icon">
                  {diff === 'easy' ? '🌟' : diff === 'medium' ? '🌟🌟' : '🌟🌟🌟'}
                </span>
                <span className="difficulty-label">{DIFFICULTY_CONFIG[diff].burmese} ({DIFFICULTY_CONFIG[diff].label})</span>
                <span className="difficulty-desc">
                  {DIFFICULTY_CONFIG[diff].pairs} pairs / {DIFFICULTY_CONFIG[diff].pairs * 2} cards
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Win screen
  if (screen === 'won') {
    return (
      <div className="game-container">
        {renderConfetti()}
        <div className="game-win-screen">
          <div className="win-trophy">
            <Trophy size={64} color="#F59E0B" />
          </div>
          <h1 className="win-title">🎉 သာပြီ! 🎉</h1>
          <p className="win-subtitle">Congratulations!</p>

          <div className="win-stats">
            <div className="win-stat">
              <Star size={20} color="#F59E0B" />
              <span>{moves} moves</span>
            </div>
            <div className="win-stat">
              <span>⏱️</span>
              <span>{formatTime(timer)}</span>
            </div>
          </div>

          <div className="win-actions">
            <button className="game-btn game-btn-primary" onClick={() => startGame(difficulty)}>
              <RotateCcw size={20} />
              <span>ထပ်ကစားမည် (Play Again)</span>
            </button>
            <button className="game-btn game-btn-secondary" onClick={() => setScreen('select')}>
              <span>🔄 Level ပြောင်းမည် (Change Level)</span>
            </button>
            <button className="game-btn game-btn-back" onClick={onBack}>
              <ArrowLeft size={20} />
              <span>ပြန်မည် (Back)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game board
  return (
    <div className="game-container">
      <div className="game-top-bar">
        <button className="game-back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="game-info-bar">
          <span className="game-info-item">
            ⏱️ {formatTime(timer)}
          </span>
          <span className="game-info-item">
            🎯 {moves} moves
          </span>
          <span className="game-info-item">
            ⭐ {cards.filter(c => c.isMatched).length / 2}/{DIFFICULTY_CONFIG[difficulty].pairs}
          </span>
        </div>
        <button className="game-restart-btn" onClick={() => startGame(difficulty)}>
          <RotateCcw size={18} />
        </button>
      </div>

      {screen === 'preview' && (
        <div className="preview-banner">
          <span className="preview-icon">👀</span>
          <span>မှတ်ထားပါ... (Memorize the positions!)</span>
        </div>
      )}

      <div className="game-board">
        <div className={getGridClass()}>
          {cards.map(card => {
            const isRevealed = card.isFlipped || card.isMatched;
            const isMatchAnim = matchAnimation === card.id;
            const isMismatchAnim = mismatchAnimation === card.id;
            return (
              <button
                key={card.id}
                className={`game-card ${isRevealed ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''} ${isMatchAnim ? 'match-anim' : ''} ${isMismatchAnim ? 'mismatch-anim' : ''}`}
                onClick={() => handleCardClick(card.id)}
                disabled={card.isMatched || card.isFlipped || screen === 'preview'}
              >
                <div className="game-card-inner">
                  <div className="game-card-front">
                    <span className="card-back-pattern">❓</span>
                  </div>
                  <div className="game-card-back">
                    <span className="card-animal-emoji">{card.emoji}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
