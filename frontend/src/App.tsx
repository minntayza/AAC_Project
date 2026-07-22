import React, { useState, useEffect } from 'react';
import { Volume2, Trash2, ArrowLeft, Settings, RotateCcw, Lock, X, Play, BookOpen } from 'lucide-react';
import {
  subjectCards,
  dailyShortcutCards,
  verbCards,
  objectCards,
  bodyPartCards,
  feelingCards,
  numberCards,
  directionCards,
  locationCards,
  CATEGORY_ROLE,
} from './data';
import type { AACCard } from './data';
import { textToSpeech, saveSentence, getCustomCards, getCategories, getIcons, rephraseSentence, type CustomCardData, type IconData } from './api';
import { AuthModal } from './components/AuthModal';
import { ParentPortal } from './components/ParentPortal';
import './index.css';

type Screen3Category = 'objects' | 'numbers' | 'directions' | 'locations' | 'body_parts' | 'feelings';

// Burmese digit helper
const toBurmeseDigits = (num: number): string => {
  const burmeseDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
  return num.toString().split('').map(d => burmeseDigits[parseInt(d, 10)] || d).join('');
};

export function App() {
  const [selectedCards, setSelectedCards] = useState<(AACCard & { audioUrl?: string })[]>([]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [screen3Category, setScreen3Category] = useState<Screen3Category>('objects');
  const [isSentenceFinished, setIsSentenceFinished] = useState(false);
  const [parentMode, setParentMode] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Custom cards fetched from backend
  const [customCards, setCustomCards] = useState<CustomCardData[]>([]);
  const [showStoriesModal, setShowStoriesModal] = useState(false);
  const [playingStoryId, setPlayingStoryId] = useState<string | null>(null);

  // API-fetched icons from Supabase
  const [apiIcons, setApiIcons] = useState<IconData[]>([]);

  // Caregiver user state (persisted in localStorage)
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role: string } | null>(() => {
    try {
      const saved = localStorage.getItem('aac_caregiver_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Fetch custom cards on mount and whenever exiting parent mode
  useEffect(() => {
    getCustomCards().then(cards => setCustomCards(cards)).catch(() => {});
  }, [parentMode]);

  // Fetch icons + categories from Supabase API on mount and parentMode change
  useEffect(() => {
    Promise.all([getCategories(), getIcons()])
      .then(([, icons]) => setApiIcons(icons))
      .catch(() => {});
  }, [parentMode]);

  // Map DB Icon → AACCard (detect URL vs emoji)
  const mapIconToAAC = (icon: IconData): AACCard & { imageUrl?: string; audioUrl?: string } => ({
    id: icon.id,
    burmese: icon.label_my,
    englishMeaning: icon.label_en,
    emoji: icon.image_url && !icon.image_url.startsWith('http') ? icon.image_url : '⭐',
    imageUrl: icon.image_url?.startsWith('http') ? icon.image_url : undefined,
    category: CATEGORY_ROLE[icon.category_id] || 'object',
  });

  // API icons grouped by grammar role, skip IDs that overlap hardcoded cards
  const hardcodedIds = new Set([
    ...subjectCards, ...verbCards, ...objectCards, ...bodyPartCards,
    ...feelingCards, ...numberCards, ...directionCards, ...locationCards,
  ].map(c => c.id));

  const apiByRole = (role: string) =>
    apiIcons
      .filter(icon => CATEGORY_ROLE[icon.category_id] === role && !hardcodedIds.has(icon.id))
      .map(mapIconToAAC);

  // Render card icon: <img> for URLs, emoji otherwise
  const renderIcon = (card: { emoji?: string; imageUrl?: string }) =>
    card.imageUrl
      ? <img src={card.imageUrl} alt="" className="card-image" />
      : <div className="card-emoji">{card.emoji || '⭐'}</div>;

  // Math challenge state for Caregiver Portal
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [mathQuestion, setMathQuestion] = useState<{ num1: number; num2: number; num1Burmese: string; num2Burmese: string; answer: number }>({
    num1: 2,
    num2: 3,
    num1Burmese: '၂',
    num2Burmese: '၃',
    answer: 6,
  });
  const [mathInput, setMathInput] = useState('');
  const [mathError, setMathError] = useState('');

  // Helper to map custom DB card to AACCard
  const mapCustomToAAC = (c: CustomCardData): AACCard & { audioUrl?: string } => ({
    id: c.id || `custom_${Math.random()}`,
    burmese: c.burmese,
    englishMeaning: c.englishMeaning || c.burmese,
    emoji: c.emoji || (c.image_url ? '📷' : '⭐'),
    category: (c.category as any) || 'object',
    audioUrl: c.audio_url,
  });

  // Dynamic Card Collections (hardcoded + API-fetched + custom)
  const activeSubjects = [
    ...subjectCards,
    ...apiByRole('subject'),
    ...customCards.filter(c => c.category === 'subject' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ];

  const activeVerbs = [
    ...verbCards,
    ...apiByRole('verb'),
    ...customCards.filter(c => c.category === 'verb' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ];

  const activeObjects = [
    ...objectCards,
    ...apiByRole('object'),
    ...customCards.filter(c => (c.category === 'object' || !c.category) && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ];

  const activeLocations = [
    ...locationCards,
    ...apiByRole('location'),
    ...customCards.filter(c => c.category === 'location' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ];

  const activeFeelings = [
    ...feelingCards,
    ...apiByRole('feeling'),
    ...customCards.filter(c => c.category === 'feeling' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ];

  const activeBodyParts = [
    ...bodyPartCards,
    ...apiByRole('body_part'),
    ...customCards.filter(c => c.category === 'body_part' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ];

  const activeShortcuts = [
    ...dailyShortcutCards,
    ...customCards.filter(c => (c.category === 'shortcut' || c.card_type === 'custom_voice') && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ];

  const storyCards = customCards.filter(c => c.card_type === 'story_1min');

  // Generate a random multiplication question (2 to 5)
  const generateMathChallenge = () => {
    const n1 = Math.floor(Math.random() * 4) + 2;
    const n2 = Math.floor(Math.random() * 4) + 2;
    setMathQuestion({
      num1: n1,
      num2: n2,
      num1Burmese: toBurmeseDigits(n1),
      num2Burmese: toBurmeseDigits(n2),
      answer: n1 * n2,
    });
    setMathInput('');
    setMathError('');
  };

  const handleOpenParentModal = () => {
    generateMathChallenge();
    setShowPortalModal(true);
  };

  const handleUnlockPortal = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = mathInput.trim();
    const burmeseDigitMap: Record<string, string> = { '၀':'0', '၁':'1', '၂':'2', '၃':'3', '၄':'4', '၅':'5', '၆':'6', '၇':'7', '၈':'8', '၉':'9' };
    const normalizedInput = cleanInput.split('').map(char => burmeseDigitMap[char] || char).join('');
    
    if (parseInt(normalizedInput, 10) === mathQuestion.answer) {
      setShowPortalModal(false);
      if (currentUser) {
        setParentMode(true);
      } else {
        setShowAuthModal(true);
      }
    } else {
      setMathError('အဖြေ မှားနေပါသည် (Incorrect answer, try again!)');
      generateMathChallenge();
    }
  };

  const handleAuthSuccess = (user: { id: string; username: string; role: string }) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('aac_caregiver_user', JSON.stringify(user));
    } catch {}
    setShowAuthModal(false);
    setParentMode(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('aac_caregiver_user');
    } catch {}
    setParentMode(false);
  };

  const handleExitParentMode = () => {
    setParentMode(false);
  };

  // Trigger speech output via Custom Audio, Backend TTS, or SpeechSynthesis fallback
  const speakText = async (text: string, audioUrl?: string) => {
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        audio.play();
        return;
      } catch (e) {
        console.warn('Custom audio playback failed, falling back to TTS:', e);
      }
    }

    if (!text) return;
    try {
      const res = await textToSpeech(text);
      if (res.ok && res.headers.get('content-type')?.includes('audio/mpeg')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        return;
      }
    } catch (e) {
      console.warn('Backend TTS offline, falling back to browser synthesis:', e);
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'my-MM';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Log completed sentence to backend
  const logSentenceToSupabase = (cards: AACCard[]) => {
    if (cards.length === 0) return;
    const text_my = cards.map(c => c.burmese).join(' ');
    const text_en = cards.map(c => c.englishMeaning).join(' ');
    saveSentence(text_my, text_en).catch(err => {
      console.warn('Sentence save skipped:', err);
    });
  };

  const handleCardClick = (card: AACCard & { audioUrl?: string }) => {
    if (card.category === 'shortcut' || card.category === 'emergency') {
      setSelectedCards([card]);
      speakText(card.burmese, card.audioUrl);
      logSentenceToSupabase([card]);
      setIsSentenceFinished(true);
      return;
    }

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);
    speakText(card.burmese, card.audioUrl);

    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
      if (card.id === 'v10') {
        setScreen3Category('locations');
      } else if (card.id === 'v9') {
        setScreen3Category('body_parts');
      } else if (card.id === 'v3' || card.id === 'v4') {
        setScreen3Category('feelings');
      } else if (card.id === 'v1' || card.id === 'v2') {
        setScreen3Category('objects');
      } else {
        setScreen3Category('objects');
      }
    } else if (currentStep === 3) {
      const selectedVerb = selectedCards.find(c => c.category === 'verb');
      
      if (screen3Category === 'objects' && (selectedVerb?.id === 'v1' || selectedVerb?.id === 'v2')) {
        setScreen3Category('numbers');
      } else if (card.category === 'direction') {
        setScreen3Category('locations');
      } else if (card.category === 'number') {
        setScreen3Category('objects');
      }
    }
  };

  const handleClear = () => {
    setSelectedCards([]);
    setCurrentStep(1);
    setScreen3Category('objects');
    setIsSentenceFinished(false);
  };

  const handleBack = () => {
    if (isSentenceFinished) {
      setIsSentenceFinished(false);
      return;
    }

    if (selectedCards.length > 0) {
      const newSelected = selectedCards.slice(0, -1);
      setSelectedCards(newSelected);

      if (newSelected.length === 0) {
        setCurrentStep(1);
        setScreen3Category('objects');
      } else if (newSelected.length === 1) {
        setCurrentStep(2);
        setScreen3Category('objects');
      } else {
        setCurrentStep(3);
        const lastCard = newSelected[newSelected.length - 1];
        if (lastCard.category === 'direction') {
          setScreen3Category('locations');
        } else if (lastCard.category === 'number') {
          setScreen3Category('objects');
        }
      }
    }
  };

  const handleSpeakSentence = async () => {
    if (selectedCards.length === 0) return;
    const rawText = selectedCards.map(c => c.burmese).join(' ');
    let speakText_ = rawText;
    try {
      const { rephrased } = await rephraseSentence(rawText);
      if (rephrased && rephrased !== rawText) speakText_ = rephrased;
    } catch (e) {
      console.warn('Rephrase failed, using original:', e);
    }
    speakText(speakText_);
    logSentenceToSupabase(selectedCards);
    setIsSentenceFinished(true);
  };

  const handleStartOver = () => {
    handleClear();
  };

  const getContextObjects = (): (AACCard & { audioUrl?: string })[] => {
    const selectedVerb = selectedCards.find(c => c.category === 'verb');
    if (!selectedVerb) return activeObjects;

    if (selectedVerb.id === 'v9') {
      return activeBodyParts;
    } else if (selectedVerb.id === 'v3' || selectedVerb.id === 'v4') {
      return activeFeelings;
    } else {
      return activeObjects;
    }
  };

  const selectedVerbCard = selectedCards.find(c => c.category === 'verb');
  const contextObjects = getContextObjects();

  if (parentMode && currentUser) {
    return (
      <ParentPortal 
        user={currentUser} 
        onExit={handleExitParentMode} 
        onLogout={handleLogout} 
      />
    );
  }

  return (
    <div className="app-container">
      {/* Caregiver Auth Modal Overlay */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Hidden Caregiver Settings Icon on top right */}
      <button 
        className="hidden-parent-icon"
        onClick={handleOpenParentModal}
        aria-label="Caregiver Portal"
        title="Caregiver Portal"
      >
        <Settings size={18} />
      </button>

      {/* Caregiver Portal Math Question Modal Overlay */}
      {showPortalModal && (
        <div className="modal-overlay">
          <div className="portal-modal">
            <button 
              className="portal-modal-close" 
              onClick={() => setShowPortalModal(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="portal-lock-icon">
              <Lock size={28} />
            </div>

            <h2 className="portal-title">မိဘ/ဆရာမ ပြင်ဆင်ရန် နေရာ (Caregiver Portal)</h2>
            <p className="portal-subtitle">ကလေးငယ်များ မတော်တဆ ပြင်ဆင်မှုမပြုနိုင်ရန် အောက်ပါ ပုစ္ဆာကို ဖြေဆိုပါ</p>

            <form onSubmit={handleUnlockPortal} className="portal-math-box">
              <div className="portal-math-question">
                ပုစ္ဆာ: {mathQuestion.num1Burmese} * {mathQuestion.num2Burmese} = ?
              </div>
              <input 
                type="text" 
                className="portal-math-input" 
                placeholder="အဖြေထည့်ပါ..."
                value={mathInput}
                onChange={(e) => setMathInput(e.target.value)}
                autoFocus
              />
              {mathError && <div className="error-hint">{mathError}</div>}
              
              <button type="submit" className="btn-portal-unlock">
                ပြင်ဆင်ရန် ဝင်မည် (Unlock Settings)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MOM'S BEDTIME STORIES MODAL POPUP ── */}
      {showStoriesModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="portal-modal" style={{ maxWidth: '540px', width: '92%', borderRadius: '24px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={24} color="#EAB308" /> မေမေ့ ၁ မိနစ် ပုံပြင်များ (Mom's Stories)
              </h2>
              <button onClick={() => setShowStoriesModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {storyCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📖</div>
                <p style={{ fontWeight: '700' }}>မေမေ့ပုံပြင်များ မရှိသေးပါ</p>
                <p style={{ fontSize: '0.82rem' }}>မိဘထိန်းချုပ်ခန်းမှ ၁ မိနစ် ပုံပြင်များ အသံသွင်း၍ ထည့်သွင်းနိုင်ပါသည်</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto' }}>
                {storyCards.map((story) => (
                  <button
                    key={story.id}
                    onClick={() => {
                      setPlayingStoryId(story.id || null);
                      speakText(story.burmese, story.audio_url);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px',
                      borderRadius: '16px', border: playingStoryId === story.id ? '2px solid #EAB308' : '1px solid #E2E8F0',
                      background: playingStoryId === story.id ? '#FEF9C3' : '#FFF', cursor: 'pointer', textAlign: 'left',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '2rem' }}>{story.emoji || '📖'}</div>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B' }}>{story.burmese}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{story.englishMeaning}</div>
                      </div>
                    </div>

                    <div style={{ width: '40px', height: '40px', background: '#FEF08A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#854D0E' }}>
                      <Play size={20} fill="#854D0E" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowStoriesModal(false)}
              style={{ marginTop: '20px', width: '100%', padding: '12px', borderRadius: '12px', background: '#1E293B', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer' }}
            >
              ပိတ်မည် (Close)
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="app-header">
        <div className="app-title-area">
          <span className="app-title-text" style={{ minWidth: '40px' }}></span>
        </div>

        {/* Step Navigation Pills */}
        {!isSentenceFinished && (
          <div className="step-indicator" style={{ marginLeft: '36px' }}>
            <button 
              className={`step-pill ${currentStep === 1 ? 'active' : ''}`}
              onClick={() => setCurrentStep(1)}
            >
              ၁။ ဘယ်သူလဲဟင်
            </button>
            <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>➔</span>
            <button 
              className={`step-pill ${currentStep === 2 ? 'active' : ''}`}
              onClick={() => { if (selectedCards.length >= 1) setCurrentStep(2); }}
              disabled={selectedCards.length < 1}
            >
              ၂။ ဘာလုပ်ချင်လဲ
            </button>
            <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>➔</span>
            <button 
              className={`step-pill ${currentStep === 3 ? 'active' : ''}`}
              onClick={() => { if (selectedCards.length >= 2) setCurrentStep(3); }}
              disabled={selectedCards.length < 2}
            >
              ၃။ ဘာလေးလဲ
            </button>
          </div>
        )}
      </header>

      {/* Sentence Builder Bar at Top */}
      <div className="builder-bar">
        <div className="builder-content">
          <div className="sentence-display">
            {selectedCards.length === 0 ? (
              <div className="sentence-placeholder">
                <span>✨</span>
                <span>ပုံလေးတွေ နှိပ်ပြီး ပြောကြည့်ရအောင် (Tap pictures to build sentence)</span>
              </div>
            ) : (
              selectedCards.map((card: any, index) => (
                <div key={`${card.id}-${index}`} className={`selected-card-chip category-${card.category}`}>
                  {(card as any).imageUrl ? (
                    <img src={(card as any).imageUrl} alt="" className="chip-image" />
                  ) : (
                    <span className="chip-emoji">{card.emoji}</span>
                  )}
                  <span>{card.burmese}</span>
                </div>
              ))
            )}
          </div>

          <div className="builder-actions">
            {selectedCards.length > 0 && (
              <button className="btn btn-secondary btn-icon-only" onClick={handleBack} aria-label="Back" title="နောက်သို့">
                <ArrowLeft size={20} />
              </button>
            )}
            <button className="btn btn-secondary btn-icon-only" onClick={handleClear} aria-label="Clear" title="ဖျက်မည်">
              <Trash2 size={20} color="#EF4444" />
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSpeakSentence} 
              disabled={selectedCards.length === 0}
            >
              <Volume2 size={22} />
              <span>ပြောမယ်</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="main-content">

        {/* COMPLETE SENTENCE SCREEN VIEW WITH HORIZONTAL CARDS */}
        {isSentenceFinished ? (
          <div className="complete-sentence-view">
            <div className="celebration-banner">🎉 🌟 👏</div>

            {/* Render selected cards as full AAC cards horizontally */}
            <div className="complete-sentence-cards-horizontal">
              {selectedCards.map((card, index) => (
                <div key={`complete-${index}`} className={`aac-card category-${card.category}`}>
                  {renderIcon(card)}
                  <div className="card-text">{card.burmese}</div>
                </div>
              ))}
            </div>

            <div className="complete-actions">
              <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '1.15rem' }} onClick={handleSpeakSentence}>
                <Volume2 size={22} />
                <span>🔊 ပြန်ပြောမယ်</span>
              </button>
              
              <button className="btn-start-over" onClick={handleStartOver}>
                <RotateCcw size={22} />
                <span>🔄 အစက ပြန်စမယ်</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SCREEN 1: Subjects & Daily Shortcuts */}
            {currentStep === 1 && (
              <>
                {/* Grid 1: Subjects */}
                <div>
                  <div className="section-header">
                    <h2 className="section-title">
                      <span>👤</span>
                      <span>၁။ ဘယ်သူလဲဟင်? (Who is it?)</span>
                    </h2>
                  </div>
                  <div className="card-grid">
                    {activeSubjects.map(card => (
                      <button 
                        key={card.id} 
                        className="aac-card category-subject" 
                        onClick={() => handleCardClick(card)}
                      >
                        {renderIcon(card)}
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid 2: Daily Shortcuts & Mom's Voice / Stories */}
                <div style={{ marginTop: '16px' }}>
                  <div className="section-header">
                    <h2 className="section-title">
                      <span>⭐</span>
                      <span>ခဏခဏ ပြောတာတွေ (Daily Shortcuts & Mom's Voice)</span>
                    </h2>
                  </div>
                  <div className="card-grid">
                    {/* Mom's Bedtime Stories Folder Card */}
                    <button 
                      className="aac-card category-shortcut" 
                      style={{ background: 'linear-gradient(135deg, #FEF08A, #FDE047)', border: '2px solid #EAB308' }}
                      onClick={() => setShowStoriesModal(true)}
                    >
                      <div className="card-emoji">📖</div>
                      <div className="card-text" style={{ color: '#854D0E', fontWeight: 800 }}>မေမေ့ပုံပြင်များ</div>
                    </button>

                    {activeShortcuts.map(card => (
                      <button 
                        key={card.id} 
                        className={`aac-card category-${card.category}`}
                        onClick={() => handleCardClick(card)}
                      >
                        {renderIcon(card)}
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* SCREEN 2: Verbs & Modals */}
            {currentStep === 2 && (
              <>
                <div className="section-header">
                  <h2 className="section-title">
                    <span>⚡</span>
                    <span>၂။ ဘာလုပ်ချင်လဲ / ဘယ်လိုနေလဲ? (Actions & Modals)</span>
                  </h2>
                </div>
                <div className="card-grid">
                  {activeVerbs.map(card => (
                    <button 
                      key={card.id} 
                      className="aac-card category-verb" 
                      onClick={() => handleCardClick(card)}
                    >
                      {renderIcon(card)}
                      <div className="card-text">{card.burmese}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* SCREEN 3: Object / Quantity / Direction / Location Selection */}
            {currentStep === 3 && (
              <>
                <div className="section-header">
                  <h2 className="section-title">
                    <span>🎯</span>
                    <span>
                      ၃။ {selectedVerbCard ? selectedVerbCard.burmese : ''} (Details & Objects)
                    </span>
                  </h2>
                  {screen3Category === 'locations' && (
                    <span className="section-badge" style={{ backgroundColor: '#F3E8FF', color: '#9333EA' }}>
                      🧭 ဘယ်နေရာမှာလဲ ပြောရအောင် (Pick Location)
                    </span>
                  )}
                  {screen3Category === 'numbers' && (
                    <span className="section-badge" style={{ backgroundColor: '#CCFBF1', color: '#0D9488' }}>
                      🔢 ပမာဏနဲ့ ဂဏန်းလေး ရွေးရအောင် (Pick Amount/Number)
                    </span>
                  )}
                  {screen3Category === 'objects' && (selectedVerbCard?.id === 'v1' || selectedVerbCard?.id === 'v2') && (
                    <span className="section-badge" style={{ backgroundColor: '#BFDBFE', color: '#1D4ED8' }}>
                      🍎 မုန့်/ပစ္စည်း ပြီးရင် ပမာဏမေးပါမည် (Pick Object)
                    </span>
                  )}
                  {screen3Category === 'feelings' && (
                    <span className="section-badge" style={{ backgroundColor: '#FFEDD5', color: '#C2410C' }}>
                      ❤️ ခံစားချက်/အခြေအနေ ရွေးရအောင် (Pick Feeling)
                    </span>
                  )}
                </div>

                {/* Category Selector Grid Cards */}
                <div className="category-choice-grid">
                  <button 
                    className={`category-choice-card ${screen3Category === 'objects' ? 'active' : ''}`}
                    onClick={() => setScreen3Category('objects')}
                  >
                    <div className="choice-icon">🍎</div>
                    <div>
                      <div className="choice-title">အရာဝတ္ထုနဲ့ မုန့်လေးတွေ</div>
                      <div className="choice-desc">Things & Snacks</div>
                    </div>
                  </button>

                  <button 
                    className={`category-choice-card ${screen3Category === 'numbers' ? 'active' : ''}`}
                    onClick={() => setScreen3Category('numbers')}
                  >
                    <div className="choice-icon">🔢</div>
                    <div>
                      <div className="choice-title">ပမာဏနဲ့ ဂဏန်းလေးတွေ</div>
                      <div className="choice-desc">Amounts & Numbers</div>
                    </div>
                  </button>

                  <button 
                    className={`category-choice-card ${screen3Category === 'directions' ? 'active' : ''}`}
                    onClick={() => setScreen3Category('directions')}
                  >
                    <div className="choice-icon">🧭</div>
                    <div>
                      <div className="choice-title">လမ်းကြောင်းလေးတွေ</div>
                      <div className="choice-desc">Directions</div>
                    </div>
                  </button>

                  <button 
                    className={`category-choice-card ${screen3Category === 'locations' ? 'active' : ''}`}
                    onClick={() => setScreen3Category('locations')}
                  >
                    <div className="choice-icon">🏠</div>
                    <div>
                      <div className="choice-title">နေရာလေးတွေ</div>
                      <div className="choice-desc">Places & Locations</div>
                    </div>
                  </button>
                </div>

                {/* Render Selected Grid Category */}
                {screen3Category === 'objects' && (
                  <div className="card-grid">
                    {contextObjects.map(card => (
                      <button 
                        key={card.id} 
                        className={`aac-card category-${card.category}`}
                        onClick={() => handleCardClick(card)}
                      >
                        {renderIcon(card)}
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                )}

                {screen3Category === 'body_parts' && (
                  <div className="card-grid">
                    {activeBodyParts.map(card => (
                      <button 
                        key={card.id} 
                        className={`aac-card category-${card.category}`}
                        onClick={() => handleCardClick(card)}
                      >
                        {renderIcon(card)}
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                )}

                {screen3Category === 'feelings' && (
                  <div className="card-grid">
                    {activeFeelings.map(card => (
                      <button 
                        key={card.id} 
                        className={`aac-card category-${card.category}`}
                        onClick={() => handleCardClick(card)}
                      >
                        {renderIcon(card)}
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                )}

                {screen3Category === 'numbers' && (
                  <div className="card-grid">
                    {numberCards.map(card => (
                      <button 
                        key={card.id} 
                        className="aac-card category-number" 
                        onClick={() => handleCardClick(card)}
                      >
                        {renderIcon(card)}
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                )}

                {screen3Category === 'directions' && (
                  <div className="card-grid">
                    {directionCards.map(card => (
                      <button 
                        key={card.id} 
                        className="aac-card category-direction" 
                        onClick={() => handleCardClick(card)}
                      >
                        {renderIcon(card)}
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                )}

                {screen3Category === 'locations' && (
                  <div className="card-grid">
                    {activeLocations.map(card => (
                      <button 
                        key={card.id} 
                        className="aac-card category-location" 
                        onClick={() => handleCardClick(card)}
                      >
                        {renderIcon(card)}
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
export default App;
