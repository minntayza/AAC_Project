import { useState, useEffect, useCallback } from 'react';
import { Settings } from 'lucide-react';
import { getCategories, getIcons, textToSpeech, type Category, type Icon } from './api';
import { iconToCard, SHORTCUT_CARDS, EMERGENCY_CARDS, type AACCard, type ShortcutCard } from './data';
import type { Screen } from './types';
import { SentenceBuilder } from './components/SentenceBuilder';
import { CardGrid } from './components/CardGrid';
import { BottomNav } from './components/BottomNav';
import { CategoryTabs } from './components/CategoryTabs';
import { FeelingsScreen } from './components/FeelingsScreen';
import { ParentModal } from './components/ParentModal';
import { ParentMode } from './components/ParentMode';
import './index.css';

function App() {
  const [screen, setScreen] = useState<Screen>('board');
  const [categories, setCategories] = useState<Category[]>([]);
  const [iconsByCategory, setIconsByCategory] = useState<Record<string, Icon[]>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<(AACCard | ShortcutCard)[]>([]);
  const [parentMode, setParentMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  // Parent gate state
  const [showGateModal, setShowGateModal] = useState(false);
  const [mathA, setMathA] = useState(0);
  const [mathB, setMathB] = useState(0);
  const [mathInput, setMathInput] = useState('');
  const [mathError, setMathError] = useState('');

  // Fetch categories + icons on mount
  useEffect(() => {
    (async () => {
      try {
        const cats = await getCategories();
        setCategories(cats);

        const all: Record<string, Icon[]> = {};
        for (const cat of cats) {
          all[cat.id] = await getIcons(cat.id);
        }
        setIconsByCategory(all);

        // Default to first non-feelings category
        const first = cats.find((c) => c.id !== 'feelings');
        if (first) setActiveCategory(first.id);
      } catch (e) {
        console.error('Failed to load data', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Build card list for active category
  const boardCards = useCallback((): (AACCard | ShortcutCard)[] => {
    if (!activeCategory) return [];
    const icons = iconsByCategory[activeCategory] ?? [];
    const cat = categories.find((c) => c.id === activeCategory);
    const mapped: AACCard[] = icons.map((icon) => iconToCard(icon, activeCategory));

    // Subject/verb categories: only grammar cards
    if (cat?.id === 'people' || cat?.id === 'actions') return mapped;

    // Object categories: also show shortcuts + emergencies
    return [...mapped, ...SHORTCUT_CARDS, ...EMERGENCY_CARDS];
  }, [activeCategory, categories, iconsByCategory]);

  // ── Card interaction ──
  const handleCardClick = (card: AACCard | ShortcutCard) => {
    if ('nextCategories' in card) {
      // Grammar card — add to sentence (no auto-switch)
      setSelectedCards((prev) => [...prev, card]);
    } else {
      // Shortcut / emergency — replace and speak immediately
      setSelectedCards([card]);
      speakText(card.burmese);
    }
  };

  // Remove a specific chip from the sentence (tap-to-undo)
  const handleChipRemove = (index: number) => {
    setSelectedCards((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Parent gate ──
  const openGate = () => {
    setMathA(Math.floor(Math.random() * 10) + 1);
    setMathB(Math.floor(Math.random() * 10) + 1);
    setMathInput('');
    setMathError('');
    setShowGateModal(true);
  };

  const handleMathInput = (value: string) => {
    setMathInput(value);
    if (mathError) setMathError('');
  };

  const handleUnlock = () => {
    const answer = parseInt(mathInput, 10);
    if (answer === mathA + mathB) {
      setShowGateModal(false);
      setParentMode(true);
    } else {
      setMathError('အဖြေမှားပါတယ်။ ထပ်ကြိုးစားပါ။ (Wrong answer, try again)');
    }
  };

  // ── Sentence actions ──
  const handleClear = () => setSelectedCards([]);
  const handleBack = () => setSelectedCards((prev) => prev.slice(0, -1));

  const handleSpeak = () => {
    const text = selectedCards.map((c) => c.burmese).join(' ');
    if (!text) return;
    speakText(text);
  };

  const speakText = async (text: string) => {
    setSpeaking(true);
    try {
      const res = await textToSpeech(text);
      if (res.headers.get('content-type')?.includes('audio/mpeg')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => setSpeaking(false);
        audio.play();
      } else {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'my';
        u.onend = () => setSpeaking(false);
        speechSynthesis.speak(u);
      }
    } catch {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'my';
      u.onend = () => setSpeaking(false);
      speechSynthesis.speak(u);
    }
  };

  // ── Parent mode screen ──
  if (parentMode) {
    return (
      <div className="app-container">
        <ParentMode
          categories={categories}
          iconsByCategory={iconsByCategory}
          loading={loading}
          onExit={() => setParentMode(false)}
        />
      </div>
    );
  }

  // ── Feelings screen ──
  if (screen === 'feelings') {
    return (
      <div className="app-container">
        <FeelingsScreen
          icons={iconsByCategory['feelings'] ?? []}
          onBack={() => setScreen('board')}
          speakText={speakText}
        />
        <BottomNav screen={screen} onScreenChange={setScreen} />
      </div>
    );
  }

  // ── Main board screen ──
  return (
    <div className="app-container">
      {/* Caregiver Gate — subtle gear top-left */}
      <button className="hidden-parent-icon" onClick={openGate} aria-label="Parent mode">
        <Settings size={18} />
      </button>

      {/* Sentence Builder */}
      <SentenceBuilder
        selectedCards={selectedCards}
        speaking={speaking}
        onBack={handleBack}
        onClear={handleClear}
        onSpeak={handleSpeak}
        onChipRemove={handleChipRemove}
      />

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      {/* Card Grid */}
      <div className="main-content">
        <CardGrid
          cards={boardCards()}
          loading={loading}
          onCardClick={handleCardClick}
          emptyMessage="No cards in this category"
        />
      </div>

      {/* Bottom Navigation */}
      <BottomNav screen={screen} onScreenChange={setScreen} />

      {/* Parent Gate Modal */}
      {showGateModal && (
        <ParentModal
          mathA={mathA}
          mathB={mathB}
          mathInput={mathInput}
          mathError={mathError}
          onInputChange={handleMathInput}
          onUnlock={handleUnlock}
          onClose={() => setShowGateModal(false)}
        />
      )}
    </div>
  );
}

export default App;
