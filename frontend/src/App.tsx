import React, { useState } from 'react';
import { Volume2, Trash2, ArrowLeft, Settings, Plus, RotateCcw, Lock, X } from 'lucide-react';
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
  allCards 
} from './data';
import type { AACCard } from './data';
import './index.css';

type Screen3Category = 'objects' | 'numbers' | 'directions' | 'locations' | 'body_parts' | 'feelings';

// Burmese digit helper
const toBurmeseDigits = (num: number): string => {
  const burmeseDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
  return num.toString().split('').map(d => burmeseDigits[parseInt(d, 10)] || d).join('');
};

function App() {
  const [selectedCards, setSelectedCards] = useState<AACCard[]>([]);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [screen3Category, setScreen3Category] = useState<Screen3Category>('objects');
  const [isSentenceFinished, setIsSentenceFinished] = useState(false);
  const [parentMode, setParentMode] = useState(false);

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

  // Generate a random multiplication question (2 to 5)
  const generateMathChallenge = () => {
    const n1 = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, 5
    const n2 = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, 5
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
    // Convert Burmese input digits to english number if needed
    const burmeseDigitMap: Record<string, string> = { '၀':'0', '၁':'1', '၂':'2', '၃':'3', '၄':'4', '၅':'5', '၆':'6', '၇':'7', '၈':'8', '၉':'9' };
    const normalizedInput = cleanInput.split('').map(char => burmeseDigitMap[char] || char).join('');
    
    if (parseInt(normalizedInput, 10) === mathQuestion.answer) {
      setParentMode(true);
      setShowPortalModal(false);
    } else {
      setMathError('အဖြေ မှားနေပါသည် (Incorrect answer, try again!)');
      generateMathChallenge();
    }
  };

  const handleExitParentMode = () => {
    setParentMode(false);
    // Lock again for next access
  };

  // Helper to trigger speech output for Burmese text
  const speakText = (text: string) => {
    if (!text) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'my-MM';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCardClick = (card: AACCard) => {
    if (card.category === 'shortcut' || card.category === 'emergency') {
      setSelectedCards([card]);
      speakText(card.burmese);
      setIsSentenceFinished(true);
      return;
    }

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

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

  const handleSpeakSentence = () => {
    if (selectedCards.length === 0) return;
    const fullText = selectedCards.map(c => c.burmese).join(' ');
    speakText(fullText);
    setIsSentenceFinished(true);
  };

  const handleStartOver = () => {
    handleClear();
  };

  const getContextObjects = (): AACCard[] => {
    const selectedVerb = selectedCards.find(c => c.category === 'verb');
    if (!selectedVerb) return objectCards;

    if (selectedVerb.id === 'v9') {
      return bodyPartCards;
    } else if (selectedVerb.id === 'v3' || selectedVerb.id === 'v4') {
      return feelingCards;
    } else {
      return objectCards;
    }
  };

  const selectedVerbCard = selectedCards.find(c => c.category === 'verb');
  const contextObjects = getContextObjects();

  if (parentMode) {
    return (
      <div className="app-container">
        <div className="app-header">
          <div className="app-title-area">
            <h1 className="app-title-text">မိဘ/ဆရာမ ပြင်ဆင်ရန် နေရာ (Caregiver Portal)</h1>
          </div>
          <button className="btn btn-secondary" onClick={handleExitParentMode}>
            ထွက်မည် (Exit to Child Mode)
          </button>
        </div>

        <div className="main-content">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button className="btn btn-primary"><Plus size={18} /> ကတ်အသစ်ထည့်မည်</button>
            <button className="btn btn-secondary"><Settings size={18} /> ဆက်တင်များ</button>
          </div>

          <h2 className="section-title" style={{ marginBottom: '12px' }}>စုစုပေါင်း ကတ်များ ({allCards.length})</h2>
          <div className="card-grid">
            {allCards.map(card => (
              <div key={card.id} className={`aac-card category-${card.category}`}>
                <div className="card-emoji">{card.emoji}</div>
                <div className="card-text">{card.burmese}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 'auto' }}>
                  {card.englishMeaning}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* REQUIREMENT 2: Hidden Icon on top right corner */}
      <button 
        className="hidden-parent-icon"
        onClick={handleOpenParentModal}
        aria-label="Caregiver Portal"
        title="Caregiver Portal"
      >
        <Settings size={18} />
      </button>

      {/* REQUIREMENT 2: Caregiver Portal Math Question Modal Overlay */}
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
              selectedCards.map((card, index) => (
                <div key={`${card.id}-${index}`} className={`selected-card-chip category-${card.category}`}>
                  <span className="chip-emoji">{card.emoji}</span>
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

        {/* REQUIREMENT 1: COMPLETE SENTENCE SCREEN VIEW WITH HORIZONTAL CARDS */}
        {isSentenceFinished ? (
          <div className="complete-sentence-view">
            <div className="celebration-banner">🎉 🌟 👏</div>

            {/* Render selected cards as full AAC cards horizontally */}
            <div className="complete-sentence-cards-horizontal">
              {selectedCards.map((card, index) => (
                <div key={`complete-${index}`} className={`aac-card category-${card.category}`}>
                  <div className="card-emoji">{card.emoji}</div>
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
                    {subjectCards.map(card => (
                      <button 
                        key={card.id} 
                        className="aac-card category-subject" 
                        onClick={() => handleCardClick(card)}
                      >
                        <div className="card-emoji">{card.emoji}</div>
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid 2: Daily Shortcuts */}
                <div style={{ marginTop: '6px' }}>
                  <div className="section-header">
                    <h2 className="section-title">
                      <span>⭐</span>
                      <span>ခဏခဏ ပြောတာတွေ (Daily Shortcuts)</span>
                    </h2>
                  </div>
                  <div className="card-grid">
                    {dailyShortcutCards.map(card => (
                      <button 
                        key={card.id} 
                        className={`aac-card category-${card.category}`}
                        onClick={() => handleCardClick(card)}
                      >
                        <div className="card-emoji">{card.emoji}</div>
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
                  {verbCards.map(card => (
                    <button 
                      key={card.id} 
                      className="aac-card category-verb" 
                      onClick={() => handleCardClick(card)}
                    >
                      <div className="card-emoji">{card.emoji}</div>
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
                        <div className="card-emoji">{card.emoji}</div>
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                )}

                {screen3Category === 'body_parts' && (
                  <div className="card-grid">
                    {bodyPartCards.map(card => (
                      <button 
                        key={card.id} 
                        className={`aac-card category-${card.category}`}
                        onClick={() => handleCardClick(card)}
                      >
                        <div className="card-emoji">{card.emoji}</div>
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                )}

                {screen3Category === 'feelings' && (
                  <div className="card-grid">
                    {feelingCards.map(card => (
                      <button 
                        key={card.id} 
                        className={`aac-card category-${card.category}`}
                        onClick={() => handleCardClick(card)}
                      >
                        <div className="card-emoji">{card.emoji}</div>
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
                        <div className="card-emoji">{card.emoji}</div>
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
                        <div className="card-emoji">{card.emoji}</div>
                        <div className="card-text">{card.burmese}</div>
                      </button>
                    ))}
                  </div>
                )}

                {screen3Category === 'locations' && (
                  <div className="card-grid">
                    {locationCards.map(card => (
                      <button 
                        key={card.id} 
                        className="aac-card category-location" 
                        onClick={() => handleCardClick(card)}
                      >
                        <div className="card-emoji">{card.emoji}</div>
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
