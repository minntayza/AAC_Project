import React, { useState, useEffect } from 'react';
import { Volume2, Trash2, ArrowLeft, Settings, Plus, Play } from 'lucide-react';
import { cards } from './data';
import type { AACCard, Category } from './data';
import './index.css';

function App() {
  const [selectedCards, setSelectedCards] = useState<AACCard[]>([]);
  const [availableCards, setAvailableCards] = useState<AACCard[]>([]);
  const [parentMode, setParentMode] = useState(false);
  const [previewText, setPreviewText] = useState('');

  // Initial state: show subjects and shortcuts/emergencies
  useEffect(() => {
    if (selectedCards.length === 0) {
      setAvailableCards(cards.filter(c => 
        c.category === 'subject' || c.category === 'shortcut' || c.category === 'emergency'
      ));
    }
  }, [selectedCards]);

  // Update preview text whenever selected cards change
  useEffect(() => {
    const text = selectedCards.map(c => c.burmese).join(' ');
    setPreviewText(text);
  }, [selectedCards]);

  const handleCardClick = (card: AACCard) => {
    // If it's a shortcut or emergency, it might just replace the sentence or speak immediately
    if (card.category === 'shortcut' || card.category === 'emergency') {
      setSelectedCards([card]);
      setAvailableCards([]); // End of sentence
      return;
    }

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    if (card.nextCategories && card.nextCategories.length > 0) {
      const nextOptions = cards.filter(c => card.nextCategories?.includes(c.category));
      setAvailableCards(nextOptions);
    } else {
      // If no next category, maybe it's the end of a sentence
      setAvailableCards([]);
    }
  };

  const handleClear = () => {
    setSelectedCards([]);
  };

  const handleBack = () => {
    if (selectedCards.length > 0) {
      const newSelected = selectedCards.slice(0, -1);
      setSelectedCards(newSelected);
      
      // Determine what to show next based on the last card now
      if (newSelected.length === 0) {
        setAvailableCards(cards.filter(c => 
          c.category === 'subject' || c.category === 'shortcut' || c.category === 'emergency'
        ));
      } else {
        const lastCard = newSelected[newSelected.length - 1];
        if (lastCard.nextCategories) {
          setAvailableCards(cards.filter(c => lastCard.nextCategories?.includes(c.category)));
        } else {
          setAvailableCards([]);
        }
      }
    }
  };

  const handleSpeak = () => {
    if (!previewText) return;
    
    // In a real app, we'd use a TTS engine that supports Burmese.
    // For now, we use the Web Speech API as a placeholder, though Burmese support varies by OS/browser.
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(previewText);
      utterance.lang = 'my-MM'; // Myanmar (Burmese)
      
      // Optional: Log english representation to console
      const englishSentence = selectedCards.map(c => c.englishMeaning).join(' ');
      console.log(`Speaking (Burmese): ${previewText}`);
      console.log(`Internal (English): ${englishSentence}`);
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-Speech not supported in this browser.");
    }
  };

  if (parentMode) {
    return (
      <div className="app-container">
        <div className="builder-bar" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <h1>Parent / Teacher Mode</h1>
          <button className="btn btn-secondary" onClick={() => setParentMode(false)}>Exit</button>
        </div>
        
        <div className="main-content">
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <button className="btn btn-primary"><Plus size={20}/> Add New Card</button>
            <button className="btn btn-secondary"><Settings size={20}/> Settings</button>
          </div>
          
          <div className="card-grid">
             {cards.map(card => (
               <div key={card.id} className={`aac-card category-${card.category}`} style={{ opacity: 0.8 }}>
                 <div className="card-emoji">{card.emoji}</div>
                 <div className="card-text">{card.burmese}</div>
                 <div style={{ fontSize: '0.8rem', color: '#666', marginTop: 'auto' }}>{card.englishMeaning}</div>
               </div>
             ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Hidden Parent Mode Toggle */}
      <button 
        style={{ position: 'fixed', bottom: 10, right: 10, opacity: 0.1, border: 'none', background: 'none' }}
        onClick={() => setParentMode(true)}
        aria-label="Parent Mode"
      >
        <Settings size={24} />
      </button>

      <div className="builder-bar">
        <div className="builder-content">
          
          <div className="sentence-display">
            {selectedCards.length === 0 ? (
              <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>ပုံရွေးပါ (Choose cards)</span>
            ) : (
              selectedCards.map((card, index) => (
                <div key={index} className={`selected-card-chip category-${card.category}`}>
                  <span>{card.emoji}</span>
                  <span>{card.burmese}</span>
                </div>
              ))
            )}
          </div>
          
          <div className="builder-actions">
            {selectedCards.length > 0 && (
              <button className="btn btn-secondary" onClick={handleBack} aria-label="Back">
                <ArrowLeft size={24} />
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleClear} aria-label="Clear">
              <Trash2 size={24} color="#dc3545" />
            </button>
            <button className="btn btn-primary" onClick={handleSpeak} disabled={selectedCards.length === 0}>
              <Volume2 size={24} />
              <span>ပြောမည် (Speak)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="main-content">
        {/* Render Available Cards by Category logically */}
        
        {availableCards.some(c => c.category === 'subject') && (
          <>
            <h2 className="section-title">၁။ ဘယ်သူလဲ? (Who?)</h2>
            <div className="card-grid">
              {availableCards.filter(c => c.category === 'subject').map(card => (
                <button key={card.id} className="aac-card category-subject" onClick={() => handleCardClick(card)}>
                  <div className="card-emoji">{card.emoji}</div>
                  <div className="card-text">{card.burmese}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {availableCards.some(c => c.category === 'verb') && (
          <>
            <h2 className="section-title">၂။ ဘာလုပ်မလဲ? (Action / Feeling)</h2>
            <div className="card-grid">
              {availableCards.filter(c => c.category === 'verb').map(card => (
                <button key={card.id} className="aac-card category-verb" onClick={() => handleCardClick(card)}>
                  <div className="card-emoji">{card.emoji}</div>
                  <div className="card-text">{card.burmese}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {availableCards.some(c => c.category === 'object') && (
          <>
            <h2 className="section-title">၃။ ဘာလဲ? (What?)</h2>
            <div className="card-grid">
              {availableCards.filter(c => c.category === 'object').map(card => (
                <button key={card.id} className="aac-card category-object" onClick={() => handleCardClick(card)}>
                  <div className="card-emoji">{card.emoji}</div>
                  <div className="card-text">{card.burmese}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {availableCards.some(c => c.category === 'shortcut') && (
          <>
            <h2 className="section-title" style={{ marginTop: '24px' }}>အမြန်ပြောရန် (Shortcuts)</h2>
            <div className="card-grid">
              {availableCards.filter(c => c.category === 'shortcut').map(card => (
                <button key={card.id} className="aac-card category-shortcut" onClick={() => handleCardClick(card)}>
                  <div className="card-emoji">{card.emoji}</div>
                  <div className="card-text">{card.burmese}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {availableCards.some(c => c.category === 'emergency') && (
          <>
            <h2 className="section-title" style={{ marginTop: '24px', color: '#dc3545' }}>အရေးပေါ် (Emergency)</h2>
            <div className="card-grid">
              {availableCards.filter(c => c.category === 'emergency').map(card => (
                <button key={card.id} className="aac-card category-emergency" onClick={() => handleCardClick(card)}>
                  <div className="card-emoji">{card.emoji}</div>
                  <div className="card-text">{card.burmese}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {availableCards.length === 0 && selectedCards.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
            <h2>စာကြောင်း ပြီးပါပြီ (Sentence Complete)</h2>
            <p>အပေါ်က 'ပြောမည်' ကို နှိပ်ပါ (Tap Speak above)</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
