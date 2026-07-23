import React, { useState, useEffect } from 'react';
import { Volume2, Trash2, ArrowLeft, RotateCcw, Lock, X, Play, BookOpen, Menu, Gamepad2, Settings, Zap, ShoppingBag, Hash, Navigation, MapPin } from 'lucide-react';
import AuraAACSensor from './components/AuraAACSensor';
import {
  numberCards,
  directionCards,
  CATEGORY_ROLE,
} from './data';
import type { AACCard } from './data';
import { textToSpeech, saveSentence, getCustomCards, getCategories, getIcons, rephraseSentence, logEmotion, type CustomCardData, type IconData } from './api';
import { AuthModal } from './components/AuthModal';
import { ParentPortal } from './components/ParentPortal';
import { ConcentrationGame } from './components/ConcentrationGame';
import './index.css';

type Screen3Category = 'objects' | 'numbers' | 'directions' | 'locations' | 'body_parts' | 'feelings' | 'activities';

// Burmese digit helper
const toBurmeseDigits = (num: number): string => {
  const burmeseDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
  return num.toString().split('').map(d => burmeseDigits[parseInt(d, 10)] || d).join('');
};

export function App() {
  const [selectedCards, setSelectedCards] = useState<(AACCard & { audioUrl?: string })[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [screen3Category, setScreen3Category] = useState<Screen3Category>('objects');
  const [isSentenceFinished, setIsSentenceFinished] = useState(false);
  const [rephrasedText, setRephrasedText] = useState<string | null>(null);

  // Side drawer & game state
  const [showDrawer, setShowDrawer] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [caregiverLoading, setCaregiverLoading] = useState(false);
  const [_detectedEmotion, setDetectedEmotion] = useState<string>('neutral');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Requirement 5 & 6: Unified Card Renderer for Admin DB Cards vs Parent Upload Cards
  const renderCardButton = (
    card: AACCard & { is_admin?: boolean; card_type?: string; imageUrl?: string; image_url?: string; audioUrl?: string }, 
    onClick: () => void
  ) => {
    const isParentPhoto = (card as any).image_url || ((card as any).card_type === 'photo' && card.imageUrl);
    const isAdminPhoto = (card as any).is_admin || (card.imageUrl && !isParentPhoto);

    // Requirement 6: Parent Photo Upload Card (Full card photo with text label overlay)
    if (isParentPhoto) {
      const imgSrc = (card as any).image_url || card.imageUrl;
      return (
        <button 
          key={card.id} 
          className={`aac-card category-${card.category} parent-photo-card`}
          onClick={onClick}
        >
          <img src={imgSrc} alt={card.burmese} className="parent-photo-img" />
          <div className="parent-photo-overlay">{card.burmese}</div>
        </button>
      );
    }

    // Requirement 5: Admin / Standard DB Photo Card (No text description, photo fills card completely)
    if (isAdminPhoto && card.imageUrl) {
      return (
        <button 
          key={card.id} 
          className={`aac-card category-${card.category} admin-card`}
          onClick={onClick}
          title={card.burmese}
        >
          <img src={card.imageUrl} alt={card.burmese} className="full-card-media" />
        </button>
      );
    }

    // Mom's Voice Custom Card (with Audio Play Badge)
    const isMomVoiceCard = card.audioUrl || (card as any).audio_url || (card as any).card_type === 'custom_voice';

    // Standard Emoji / Icon Card with Subcategory color styling
    const subClass = card.subCategory ? `sub-${card.subCategory}` : '';
    return (
      <button 
        key={card.id} 
        className={`aac-card category-${card.category} ${subClass}`}
        onClick={onClick}
        style={isMomVoiceCard ? { border: '2px solid #10B981', position: 'relative' } : {}}
      >
        {card.imageUrl ? (
          <img src={card.imageUrl} alt="" className="card-image" />
        ) : (
          <div className="card-emoji">{card.emoji || (isMomVoiceCard ? '🎙️' : '⭐')}</div>
        )}
        <div className="card-text">{card.burmese}</div>
        {isMomVoiceCard && (
          <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#10B981', color: '#FFF', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
            🔊
          </div>
        )}
      </button>
    );
  };

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
    getCustomCards(currentUser?.id).then(cards => setCustomCards(cards)).catch(() => {});
  }, [parentMode, currentUser?.id]);

  // Fetch icons + categories from Supabase API on mount and parentMode change
  useEffect(() => {
    Promise.all([getCategories(), getIcons()])
      .then(([, icons]) => setApiIcons(icons))
      .catch(() => {});
  }, [parentMode]);

  // Map DB Icon → AACCard (detect URL vs emoji, flag as admin card)
  const mapIconToAAC = (icon: IconData): AACCard & { imageUrl?: string; audioUrl?: string; is_admin?: boolean; category_id?: string } => ({
    id: icon.id,
    burmese: icon.label_my,
    englishMeaning: icon.label_en,
    emoji: icon.image_url && !icon.image_url.startsWith('http') ? icon.image_url : '⭐',
    imageUrl: icon.image_url?.startsWith('http') ? icon.image_url : undefined,
    category: CATEGORY_ROLE[icon.category_id] || (icon.category_id as any) || 'object',
    category_id: icon.category_id,
    is_admin: true,
  });

  // API icons grouped by grammar role
  const getCategoryRole = (catId: string) => CATEGORY_ROLE[catId] || catId;

  const apiByRole = (role: string) =>
    apiIcons
      .filter(icon => getCategoryRole(icon.category_id) === role)
      .map(mapIconToAAC);

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
  const mapCustomToAAC = (c: CustomCardData): AACCard & { audioUrl?: string; image_url?: string; card_type?: string; is_admin?: boolean } => ({
    id: c.id || `custom_${Math.random()}`,
    burmese: c.burmese,
    englishMeaning: c.englishMeaning || c.burmese,
    emoji: c.emoji || (c.image_url ? '📷' : '⭐'),
    category: (c.category as any) || 'object',
    audioUrl: c.audio_url,
    image_url: c.image_url,
    card_type: c.card_type,
    is_admin: false,
  });

  // Helper to remove duplicate cards strictly by normalized Burmese label
  const normalizeBurmese = (text: string) => text ? text.trim().toLowerCase().replace(/[\s\u200B-\u200D\uFEFF\u200C]/g, '') : '';

  const dedupeCards = <T extends { id: string; burmese: string }>(cards: T[]): T[] => {
    const seen = new Set<string>();
    return cards.filter(card => {
      const normLabel = normalizeBurmese(card.burmese) || card.id;
      if (seen.has(normLabel)) {
        return false;
      }
      seen.add(normLabel);
      return true;
    });
  };

  // Dynamic Card Collections (Deduplicated, pulls from DB Photo Cards + Parent Custom Cards)
  const activeSubjects = dedupeCards([
    ...apiByRole('subject'),
    ...customCards.filter(c => c.category === 'subject' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ]);

  const activeVerbs = dedupeCards([
    ...apiByRole('verb'),
    ...customCards.filter(c => c.category === 'verb' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ]);

  const activeObjects = dedupeCards([
    ...apiByRole('object'),
    ...customCards.filter(c => (c.category === 'object' || !c.category) && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ]);

  const activeLocations = dedupeCards([
    ...apiByRole('location'),
    ...customCards.filter(c => c.category === 'location' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ]);

  const activeFeelings = dedupeCards([
    ...apiByRole('feeling'),
    ...customCards.filter(c => c.category === 'feeling' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ]);

  const activeBodyParts = dedupeCards([
    ...apiByRole('body_part'),
    ...customCards.filter(c => c.category === 'body_part' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ]);

  const activeActions = dedupeCards([
    ...apiByRole('action'),
    ...customCards.filter(c => c.category === 'action' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ]);

  const activeShortcuts = dedupeCards([
    ...apiByRole('shortcut'),
    ...customCards.filter(c => (c.category === 'shortcut' || c.card_type === 'custom_voice') && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ]);

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
      setMathError('အဖြေ မှားနေပါသည်');
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
    const cleanText = text.replace(/(\S+)\s*က\s*/g, '$1 ').trim();
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl);
        audio.play();
        return;
      } catch (e) {
        console.warn('Custom audio playback failed, falling back to TTS:', e);
      }
    }

    if (!cleanText) return;
    try {
      const res = await textToSpeech(cleanText);
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
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'my-MM';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Log completed sentence to backend
  const logSentenceToSupabase = (cards: AACCard[]) => {
    if (cards.length === 0) return;
    const text_my = cards.map(c => c.burmese).join(' ').replace(/(\S+)\s*က\s*/g, '$1 ').trim();
    const text_en = cards.map(c => c.englishMeaning).join(' ');
    saveSentence(text_my, text_en, currentUser?.id).catch(err => {
      console.warn('Sentence save skipped:', err);
    });
  };

  const handleCardClick = (card: AACCard & { audioUrl?: string; category_id?: string }) => {
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
      if (card.category === 'action') {
        // Actions (run, play, sleep, etc.) → finish sentence immediately
        logSentenceToSupabase(newSelected);
        setIsSentenceFinished(true);
      } else if (card.category === 'verb') {
        // Verbs → route to context-specific Step 3
        setCurrentStep(3);
        const id = (card.id || '').toLowerCase();
        const eng = (card.englishMeaning || '').toLowerCase();
        const bur = card.burmese || '';

        if (eng.includes('eat') || bur.includes('စား') || id === 'eat') {
          setScreen3Category('objects'); // food items
        } else if (eng.includes('drink') || bur.includes('သောက်') || id === 'drink') {
          setScreen3Category('objects'); // drinks/food
        } else if (eng.includes('go') || bur.includes('သွား') || id === 'go') {
          setScreen3Category('locations');
        } else {
          // Other verbs/choices → activities or objects
          setScreen3Category('activities');
        }
      } else {
        // Fallback for unknown category
        logSentenceToSupabase(newSelected);
        setIsSentenceFinished(true);
      }
    } else if (currentStep === 3) {
      logSentenceToSupabase(newSelected);
      setIsSentenceFinished(true);
    }
  };

  const handleClear = () => {
    setSelectedCards([]);
    setCurrentStep(1);
    setScreen3Category('objects');
    setIsSentenceFinished(false);
    setRephrasedText(null);
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

  const sanitizeNoKa = (text: string) => text.replace(/(\S+)\s*က\s*/g, '$1 ').trim();

  const handleSpeakSentence = async () => {
    if (selectedCards.length === 0) return;
    setIsSpeaking(true);
    const rawText = sanitizeNoKa(selectedCards.map(c => c.burmese).join(' '));
    let speakText_ = rawText;
    try {
      const { rephrased } = await rephraseSentence(rawText);
      if (rephrased && rephrased !== rawText) {
        speakText_ = sanitizeNoKa(rephrased);
        setRephrasedText(speakText_);
      } else {
        setRephrasedText(null);
      }
    } catch (e) {
      console.warn('Rephrase failed, using original:', e);
      setRephrasedText(null);
    }
    speakText(speakText_);
    logSentenceToSupabase(selectedCards);
    setIsSentenceFinished(true);
    setIsSpeaking(false);
  };

  const activeActivities = dedupeCards([
    ...apiByRole('verb'),
    ...apiByRole('action'),
    ...customCards.filter(c => (c.category === 'verb' || c.category === 'action' || (c as any).subCategory === 'activity') && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ]);

  const activeNumbers = dedupeCards([
    ...apiByRole('number'),
    ...numberCards,
    ...customCards.filter(c => c.category === 'number' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ]);

  const activeDirections = dedupeCards([
    ...apiByRole('direction'),
    ...directionCards,
    ...customCards.filter(c => c.category === 'direction' && c.card_type !== 'story_1min').map(mapCustomToAAC)
  ]);

  const handleStartOver = () => {
    handleClear();
  };

  const getContextObjects = (): (AACCard & { audioUrl?: string; imageUrl?: string; is_admin?: boolean })[] => {
    const selectedVerb = selectedCards.find(c => c.category === 'verb');
    if (!selectedVerb) return activeObjects;

    const verbId = (selectedVerb.id || '').toLowerCase();
    const verbEng = (selectedVerb.englishMeaning || '').toLowerCase();
    const verbBur = selectedVerb.burmese || '';

    const isEat = verbId === 'eat' || verbEng.includes('eat') || verbBur.includes('စား');
    const isDrink = verbId === 'drink' || verbEng.includes('drink') || verbBur.includes('သောက်');
    const isGo = verbId === 'go' || verbEng.includes('go') || verbBur.includes('သွား');

    if (isEat || isDrink) {
      return dedupeCards(
        apiIcons
          .filter(icon => icon.category_id === 'food')
          .map(mapIconToAAC)
      );
    }

    if (isGo) {
      return activeLocations;
    }

    // Fallback to screen3Category pills
    if (screen3Category === 'activities') return activeActivities;
    if (screen3Category === 'locations') return activeLocations;
    if (screen3Category === 'body_parts') return activeBodyParts;
    if (screen3Category === 'feelings') return activeFeelings;
    if (screen3Category === 'numbers') return activeNumbers;
    if (screen3Category === 'directions') return activeDirections;
    return activeObjects;
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

  if (showGame) {
    return (
      <ConcentrationGame onBack={() => setShowGame(false)} />
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

      {/* Side Drawer Overlay */}
      {showDrawer && (
        <div className="drawer-overlay" onClick={() => setShowDrawer(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2 className="drawer-title">မီနူး</h2>
              <button className="drawer-close-btn" onClick={() => setShowDrawer(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="drawer-content">
              <button
                className="drawer-item drawer-game-item"
                onClick={() => { setShowDrawer(false); setShowGame(true); }}
              >
                <span className="drawer-item-icon game-icon-bounce"><Gamepad2 size={20} /></span>
                <div className="drawer-item-text">
                  <span className="drawer-item-label">မှတ်ဉာဏ်ကစားပွဲ</span>
                  <span className="drawer-item-sublabel">တိရစ္ဆာန် မှတ်ဉာဏ်ကစားပွဲ</span>
                </div>
              </button>
              <button
                className="drawer-item"
                onClick={() => {
                  setShowDrawer(false);
                  setCaregiverLoading(true);
                  setTimeout(() => {
                    setCaregiverLoading(false);
                    handleOpenParentModal();
                  }, 1200);
                }}
              >
                <span className="drawer-item-icon"><Settings size={20} /></span>
                <div className="drawer-item-text">
                  <span className="drawer-item-label">မိဘ/ဆရာမ ပြင်ဆင်ရန်</span>
                  <span className="drawer-item-sublabel">မိဘ/ဆရာမ ပြင်ဆင်ရန်</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caregiver Loading Overlay */}
      {caregiverLoading && (
        <div className="caregiver-loading-overlay">
          <div className="caregiver-loading-spinner">
            <div className="spinner-ring"></div>
                <span className="spinner-icon"><Settings size={20} /></span>
          </div>
          <p className="caregiver-loading-text">ဝင်ရောက်နေပါသည်...</p>
        </div>
      )}

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

            <h2 className="portal-title">မိဘ/ဆရာမ ပြင်ဆင်ရန် နေရာ</h2>
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
                ပြင်ဆင်ရန် ဝင်မည်
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
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1F2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={24} color="#667eea" /> မေမေ့ ၁ မိနစ် ပုံပြင်များ
              </h2>
              <button onClick={() => setShowStoriesModal(false)} style={{ border: 'none', background: '#F3F4F6', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
            </div>

            {storyCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#667eea' }}>
                <div style={{ fontSize: '3rem', marginBottom: '8px' }}><BookOpen size={48} /></div>
                <p style={{ fontWeight: '700', color: '#1F2937' }}>မေမေ့ပုံပြင်များ မရှိသေးပါ</p>
                <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>မိဘထိန်းချုပ်ခန်းမှ ၁ မိနစ် ပုံပြင်များ အသံသွင်း၍ ထည့်သွင်းနိုင်ပါသည်</p>
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
                      borderRadius: '16px', border: playingStoryId === story.id ? '2px solid #667eea' : '2px solid rgba(102, 126, 234, 0.12)',
                      background: playingStoryId === story.id ? '#F5F3FF' : '#FFFFFF', cursor: 'pointer', textAlign: 'left',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ fontSize: '2rem' }}>{story.emoji || <BookOpen size={28} />}</div>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1F2937' }}>{story.burmese}</div>
                        <div style={{ fontSize: '0.78rem', color: '#667eea' }}>{story.englishMeaning}</div>
                      </div>
                    </div>

                    <div style={{ width: '40px', height: '40px', background: 'rgba(102, 126, 234, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667eea' }}>
                      <Play size={20} fill="#667eea" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowStoriesModal(false)}
              style={{ marginTop: '20px', width: '100%', padding: '12px', borderRadius: '14px', background: '#F5F3FF', color: '#667eea', border: '2px solid rgba(102, 126, 234, 0.15)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem' }}
            >
              ပိတ်မည်
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="app-header">
        <div className="app-title-area">
          <button
            className="hamburger-btn"
            onClick={() => setShowDrawer(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <AuraAACSensor onEmotionChange={(emotion) => {
            setDetectedEmotion(emotion);
            logEmotion(emotion).catch(() => {});
            if (emotion === 'distressed') {
              setScreen3Category('feelings');
            } else if (emotion === 'happy') {
              setScreen3Category('activities');
            }
          }} />
        </div>

        {/* Step Navigation Pills */}
        {!isSentenceFinished && (
          <div className="step-indicator" style={{ marginLeft: 'auto' }}>
            <button 
              className={`step-pill ${currentStep === 1 ? 'active' : ''}`}
              onClick={() => setCurrentStep(1)}
            >
              ၁။ ဘယ်သူလဲဟင်
            </button>
              <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>&#8594;</span>
            <button 
              className={`step-pill ${currentStep === 2 ? 'active' : ''}`}
              onClick={() => { if (selectedCards.length >= 1) setCurrentStep(2); }}
              disabled={selectedCards.length < 1}
            >
              ၂။ ဘာလုပ်ချင်လဲ
            </button>
              <span style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>&#8594;</span>
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
                <span>ပုံလေးတွေ နှိပ်ပြီး ပြောကြည့်ရအောင်</span>
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
              disabled={selectedCards.length === 0 || isSpeaking}
              style={{ minWidth: '100px', position: 'relative' }}
            >
              {isSpeaking ? (
                <>
                  <span className="speak-spinner"></span>
                  <span>ခဏစောင့်ပါ...</span>
                </>
              ) : (
                <>
                  <Volume2 size={22} />
                  <span>ပြောမယ်</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="main-content">

        {/* COMPLETE SENTENCE SCREEN VIEW WITH HORIZONTAL CARDS */}
        {isSentenceFinished ? (
          <div className="complete-sentence-view">

            {/* Render selected cards horizontally without description text or borders */}
            <div className="complete-sentence-cards-horizontal">
              {selectedCards.map((card, index) => (
                <div key={`complete-${index}`} className="complete-card-clean">
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt="" className="complete-card-img" />
                  ) : (
                    <div className="complete-card-emoji">{card.emoji || '⭐'}</div>
                  )}
                </div>
              ))}
            </div>

            {rephrasedText && (
              <div className="rephrase-banner">
                <span className="rephrase-icon"><Lock size={18} /></span>
                <span>ပြောမည့်စာကြောင်း: {rephrasedText}</span>
              </div>
            )}

            <div className="complete-actions">
              <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '1.15rem' }} onClick={handleSpeakSentence}>
                <Volume2 size={22} />
                <span>ပြန်ပြောမယ်</span>
              </button>
              
              <button className="btn-start-over" onClick={handleStartOver}>
                <RotateCcw size={22} />
                <span>အစက ပြန်စမယ်</span>
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
                      <span>၁။ ဘယ်သူလဲဟင်?</span>
                    </h2>
                  </div>
                  <div className="card-grid">
                    {activeSubjects.map(card => renderCardButton(card, () => handleCardClick(card)))}
                  </div>
                </div>

                {/* Grid 2: Daily Shortcuts & Mom's Voice / Stories */}
                <div style={{ marginTop: '16px' }}>
                  <div className="section-header">
                    <h2 className="section-title">
                      <span>ခဏခဏ ပြောတာတွေ</span>
                    </h2>
                  </div>
                  <div className="card-grid">
                    {/* Mom's Bedtime Stories Folder Card */}
                    <button 
                      className="aac-card category-shortcut" 
                      style={{ background: 'rgba(250, 204, 21, 0.12)', border: '1.5px solid rgba(250, 204, 21, 0.3)' }}
                      onClick={() => setShowStoriesModal(true)}
                    >
                      <div className="card-emoji"><BookOpen size={28} /></div>
                      <div className="card-text" style={{ color: '#facc15', fontWeight: 800 }}>မေမေ့ပုံပြင်များ</div>
                    </button>

                    {activeShortcuts.map(card => renderCardButton(card, () => handleCardClick(card)))}
                  </div>
                </div>
              </>
            )}

            {/* SCREEN 2: Actions & Modals */}
            {currentStep === 2 && (
              <div>
                <div className="section-header">
                  <h2 className="section-title">
                    <span>၂။ ဘာလုပ်ချင်လဲ / ဘယ်လိုနေလဲ?</span>
                  </h2>
                </div>
                <div className="card-grid">
                  {[...activeVerbs, ...activeActions].map(card => renderCardButton(card, () => handleCardClick(card)))}
                </div>
              </div>
            )}

            {/* SCREEN 3: Object / Activity / Quantity / Direction / Location Selection */}
            {currentStep === 3 && (
              <>
                <div className="section-header">
                  <h2 className="section-title">
                    <span>
                      ၃။ {selectedVerbCard ? selectedVerbCard.burmese : ''}
                    </span>
                  </h2>
                  {screen3Category === 'activities' && (
                    <span className="section-badge">
                      လှုပ်ရှားမှု ရွေးရအောင်
                    </span>
                  )}
                  {screen3Category === 'locations' && (
                    <span className="section-badge">
                      ဘယ်နေရာမှာလဲ ပြောရအောင်
                    </span>
                  )}
                  {screen3Category === 'numbers' && (
                    <span className="section-badge">
                      ပမာဏနဲ့ ဂဏန်းလေး ရွေးရအောင်
                    </span>
                  )}
                  {screen3Category === 'objects' && (selectedVerbCard?.id === 'v1' || selectedVerbCard?.id === 'v2') && (
                    <span className="section-badge">
                      မုန့်/ပစ္စည်း ပြီးရင် ပမာဏမေးပါမည်
                    </span>
                  )}
                  {screen3Category === 'feelings' && (
                    <span className="section-badge">
                      ခံစားချက်/အခြေအနေ ရွေးရအောင်
                    </span>
                  )}
                </div>

                {/* Requirement 3: Compact Category Pill Bar for Step 3 */}
                <div className="category-pill-bar">
                  <button 
                    type="button"
                    className={`category-pill ${screen3Category === 'activities' ? 'active' : ''}`}
                    onClick={() => setScreen3Category('activities')}
                  >
                    <span><Zap size={16} /></span>
                    <span>လှုပ်ရှားမှုများ</span>
                  </button>

                  <button 
                    type="button"
                    className={`category-pill ${screen3Category === 'objects' ? 'active' : ''}`}
                    onClick={() => setScreen3Category('objects')}
                  >
                    <span><ShoppingBag size={16} /></span>
                    <span>အရာဝတ္ထုနဲ့ မုန့်</span>
                  </button>

                  <button 
                    type="button"
                    className={`category-pill ${screen3Category === 'numbers' ? 'active' : ''}`}
                    onClick={() => setScreen3Category('numbers')}
                  >
                    <span><Hash size={16} /></span>
                    <span>ပမာဏနဲ့ ဂဏန်း</span>
                  </button>

                  <button 
                    type="button"
                    className={`category-pill ${screen3Category === 'directions' ? 'active' : ''}`}
                    onClick={() => setScreen3Category('directions')}
                  >
                    <span><Navigation size={16} /></span>
                    <span>လမ်းကြောင်း</span>
                  </button>

                  <button 
                    type="button"
                    className={`category-pill ${screen3Category === 'locations' ? 'active' : ''}`}
                    onClick={() => setScreen3Category('locations')}
                  >
                    <span><MapPin size={16} /></span>
                    <span>နေရာ</span>
                  </button>
                </div>

                {/* Render Selected Grid Category */}
                {screen3Category === 'activities' && (
                  <div className="card-grid">
                    {activeActivities.map(card => renderCardButton(card, () => handleCardClick(card)))}
                  </div>
                )}

                {screen3Category === 'objects' && (
                  <div className="card-grid">
                    {contextObjects.map(card => renderCardButton(card, () => handleCardClick(card)))}
                  </div>
                )}

                {screen3Category === 'body_parts' && (
                  <div className="card-grid">
                    {activeBodyParts.map(card => renderCardButton(card, () => handleCardClick(card)))}
                  </div>
                )}

                {screen3Category === 'feelings' && (
                  <div className="card-grid">
                    {activeFeelings.map(card => renderCardButton(card, () => handleCardClick(card)))}
                  </div>
                )}

                {screen3Category === 'numbers' && (
                  <div className="card-grid">
                    {activeNumbers.map(card => renderCardButton(card, () => handleCardClick(card)))}
                  </div>
                )}

                {screen3Category === 'directions' && (
                  <div className="card-grid">
                    {activeDirections.map(card => renderCardButton(card, () => handleCardClick(card)))}
                  </div>
                )}

                {screen3Category === 'locations' && (
                  <div className="card-grid">
                    {activeLocations.map(card => renderCardButton(card, () => handleCardClick(card)))}
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
