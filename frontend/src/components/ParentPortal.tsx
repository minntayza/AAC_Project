import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Mic, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Check, 
  Upload, 
  Square, 
  User, 
  KeyRound, 
  Sparkles, 
  BookOpen, 
  Image as ImageIcon, 
  Smile,
  Volume2,
  ShieldCheck,
  Trash2,
  Edit3,
  ListChecks,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { allCards } from '../data';
import { changePassword, saveCustomCard, getCustomCards, deleteCustomCard, updateCustomCard, getRoutines, createRoutine, deleteRoutine, type CustomCardData, type Routine, type RoutineInput } from '../api';

interface ParentPortalProps {
  user: { id: string; username: string; role: string };
  onExit: () => void;
  onLogout: () => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({ user, onExit, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'add_card' | 'story_studio' | 'routines' | 'settings'>('library');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customCards, setCustomCards] = useState<CustomCardData[]>([]);

  // Editing Card State
  const [editingCard, setEditingCard] = useState<CustomCardData | null>(null);

  // Settings: Change Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Add Card Form State (Option 1 & 2: Emoji or Photo Upload + AI speech or Voice Recorder)
  const [cardCategory, setCardCategory] = useState<string>('object');
  const [cardBurmese, setCardBurmese] = useState('');
  const [cardEnglish, setCardEnglish] = useState('');
  const [cardMediaMode, setCardMediaMode] = useState<'emoji' | 'photo'>('emoji');
  const [cardEmoji, setCardEmoji] = useState('⭐');
  const [cardPhotoUrl, setCardPhotoUrl] = useState('');
  const [cardAudioMode, setCardAudioMode] = useState<'ai_speech' | 'custom_voice'>('ai_speech');
  const [cardAudioUrl, setCardAudioUrl] = useState('');
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Story Studio (Option 3: 1-Minute Story Recording)
  const [storyTitle, setStoryTitle] = useState('');
  const [storyAudioBlob, setStoryAudioBlob] = useState<Blob | null>(null);
  const [storyRecording, setStoryRecording] = useState(false);
  const [storySeconds, setStorySeconds] = useState(0);
  const storyRecorderRef = useRef<MediaRecorder | null>(null);
  const storyChunksRef = useRef<Blob[]>([]);
  const storyTimerRef = useRef<any>(null);

  const [cardSuccessMsg, setCardSuccessMsg] = useState('');

  // Routine Builder State
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(true);
  const [routineError, setRoutineError] = useState('');
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [editingRoutineName, setEditingRoutineName] = useState('');
  const [editingRoutineSteps, setEditingRoutineSteps] = useState<{ icon_id: string; label: string }[]>([]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconPickerCallback, setIconPickerCallback] = useState<null | ((icon: { id: string; label: string }) => void)>(null);
  const [routineMsg, setRoutineMsg] = useState('');

  // Fetch custom cards on mount
  useEffect(() => {
    getCustomCards().then(cards => setCustomCards(cards)).catch(() => {});
  }, []);

  // Fetch routines on mount
  useEffect(() => {
    getRoutines()
      .then(data => setRoutines(data))
      .catch(() => setRoutineError('Failed to load routines'))
      .finally(() => setRoutinesLoading(false));
  }, []);

  // Handle Photo Upload File
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCardPhotoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Voice Recorder Controls (Mom's Voice)
  const startRecordingVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        const reader = new FileReader();
        reader.onloadend = () => {
          setCardAudioUrl(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('မိုက်ခရိုဖုန်း အသုံးပြုခွင့် မရရှိပါ (Microphone access denied)');
    }
  };

  const stopRecordingVoice = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // 1-Minute Story Recorder Controls
  const startStoryRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      storyRecorderRef.current = mediaRecorder;
      storyChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) storyChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(storyChunksRef.current, { type: 'audio/webm' });
        setStoryAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setStoryRecording(true);
      setStorySeconds(0);
      storyTimerRef.current = setInterval(() => {
        setStorySeconds(prev => {
          if (prev >= 60) {
            stopStoryRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      alert('မိုက်ခရိုဖုန်း အသုံးပြုခွင့် မရရှိပါ (Microphone access denied)');
    }
  };

  const stopStoryRecording = () => {
    if (storyRecorderRef.current && storyRecording) {
      storyRecorderRef.current.stop();
      setStoryRecording(false);
      clearInterval(storyTimerRef.current);
    }
  };

  // Delete Card Handler
  const handleDeleteCard = async (cardId?: string) => {
    if (!cardId) return;
    if (window.confirm('ဤကတ်ကို ဖျက်ရန် သေချာပါသလား (Are you sure you want to delete this card?)')) {
      try {
        await deleteCustomCard(cardId);
        setCustomCards(prev => prev.filter(c => c.id !== cardId));
        setCardSuccessMsg('ကတ် ပယ်ဖျက်ပြီးပါပြီ (Card deleted successfully)');
        setTimeout(() => setCardSuccessMsg(''), 3000);
      } catch (err) {
        alert('ကတ် ဖျက်ရန် မအောင်မြင်ပါ (Failed to delete card)');
      }
    }
  };

  // Update Card Submit Handler
  const handleUpdateCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard || !editingCard.id) return;
    try {
      const updated = await updateCustomCard(editingCard.id, editingCard);
      setCustomCards(prev => prev.map(c => c.id === editingCard.id ? updated : c));
      setEditingCard(null);
      setCardSuccessMsg('ကတ် အချက်အလက် ပြင်ဆင်ပြီးပါပြီ (Card updated successfully)');
      setTimeout(() => setCardSuccessMsg(''), 3000);
    } catch (err) {
      alert('ကတ် ပြင်ဆင်မှု မအောင်မြင်ပါ');
    }
  };

  // Save New Card Handler
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardBurmese) return;

    const newCardData: CustomCardData = {
      category: cardCategory,
      burmese: cardBurmese,
      englishMeaning: cardEnglish || cardBurmese,
      emoji: cardMediaMode === 'emoji' ? cardEmoji : '📷',
      image_url: cardMediaMode === 'photo' ? cardPhotoUrl : '',
      audio_url: cardAudioMode === 'custom_voice' ? cardAudioUrl : '',
      card_type: cardAudioMode === 'custom_voice' ? 'custom_voice' : 'ai_speech',
    };

    try {
      const saved = await saveCustomCard(newCardData);
      setCustomCards(prev => [...prev, saved]);
      setCardSuccessMsg('ကတ်အသစ် သိမ်းဆည်းပြီးပါပြီ (New card saved successfully!)');
      // Reset form
      setCardBurmese('');
      setCardEnglish('');
      setCardPhotoUrl('');
      setCardAudioUrl('');
      setRecordedAudioBlob(null);
      setTimeout(() => setCardSuccessMsg(''), 3000);
    } catch (err) {
      alert('ကတ် သိမ်းဆည်းမှု မအောင်မြင်ပါ (Failed to save card)');
    }
  };

  // Save 1-Minute Story Card Handler
  const handleSaveStoryCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyTitle || !storyAudioBlob) {
      alert('ပုံပြင် ခေါင်းစဉ်နှင့် အသံသွင်းယူမှု လိုအပ်ပါသည် (Title and recording required)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const audioBase64 = reader.result as string;
      const storyCard: CustomCardData = {
        category: 'shortcut',
        burmese: storyTitle,
        englishMeaning: `Mom's 1-Min Story (${storySeconds}s)`,
        emoji: '📖',
        audio_url: audioBase64,
        card_type: 'story_1min',
      };

      try {
        const saved = await saveCustomCard(storyCard);
        setCustomCards(prev => [...prev, saved]);
        setCardSuccessMsg('မေမေ့ပုံပြင်ကတ် သိမ်းဆည်းပြီးပါပြီ (Mom\'s story card saved!)');
        setStoryTitle('');
        setStoryAudioBlob(null);
        setStorySeconds(0);
        setTimeout(() => setCardSuccessMsg(''), 3000);
      } catch (err) {
        alert('ပုံပြင် သိမ်းဆည်းမှု မအောင်မြင်ပါ');
      }
    };
    reader.readAsDataURL(storyAudioBlob);
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'စကားဝှက်သည် အနည်းဆုံး ၈ လုံး ရှိရပါမည် (Password must be at least 8 chars)' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'စကားဝှက်များ တူညီမှုမရှိပါ (Passwords do not match)' });
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(user.id, newPassword);
      setPasswordMsg({ type: 'success', text: 'စကားဝှက် အောင်မြင်စွာ ပြောင်းလဲပြီးပါပြီ (Password updated successfully!)' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'စကားဝှက် ပြောင်းလဲမှု မအောင်မြင်ပါ' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#F8FAFC', color: '#0F172A', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* ── RESPONSIVE SIDEBAR ── */}
      <aside 
        style={{
          width: '260px',
          background: '#0F172A',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 1000,
          transition: 'transform 0.3s ease',
          transform: window.innerWidth < 1024 ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)'
        }}
      >
        {/* Sidebar Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#FFF' }}>Caregiver Portal</div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>မိဘ ထိန်းချုပ်ခန်း</div>
            </div>
          </div>
          {window.innerWidth < 1024 && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* User Badge */}
        <div style={{ margin: '16px 16px 8px', padding: '12px 14px', background: '#1E293B', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: '#3B82F6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800 }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.username}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 600 }}>
              ✓ Logged In ({user.role})
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={() => { setActiveTab('library'); setSidebarOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', border: 'none',
              background: activeTab === 'library' ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : 'transparent',
              color: activeTab === 'library' ? '#FFF' : '#94A3B8', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <LayoutDashboard size={20} />
            ကတ် စာကြည့်တိုက် (Card Library)
          </button>

          <button
            onClick={() => { setActiveTab('add_card'); setSidebarOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', border: 'none',
              background: activeTab === 'add_card' ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : 'transparent',
              color: activeTab === 'add_card' ? '#FFF' : '#94A3B8', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <PlusCircle size={20} />
            ကတ်အသစ် ဖန်တီးမည် (Add Card)
          </button>

          <button
            onClick={() => { setActiveTab('story_studio'); setSidebarOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', border: 'none',
              background: activeTab === 'story_studio' ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : 'transparent',
              color: activeTab === 'story_studio' ? '#FFF' : '#94A3B8', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <BookOpen size={20} />
            မေမေ့ပုံပြင် ၁ မိနစ် (1-Min Story)
          </button>

          <button
            onClick={() => { setActiveTab('routines'); setSidebarOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', border: 'none',
              background: activeTab === 'routines' ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : 'transparent',
              color: activeTab === 'routines' ? '#FFF' : '#94A3B8', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <ListChecks size={20} />
            လုပ်ရိုးလုပ်စဉ် (Routines)
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', border: 'none',
              background: activeTab === 'settings' ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : 'transparent',
              color: activeTab === 'settings' ? '#FFF' : '#94A3B8', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
          >
            <Settings size={20} />
            ဆက်တင် / စကားဝှက် (Settings)
          </button>
        </nav>

        {/* Footer Actions */}
        <div style={{ padding: '16px', borderTop: '1px solid #1E293B', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={onExit}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: '#1E293B', color: '#E2E8F0', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            ကလေးမုဒ် သို့ ပြန်သွားမည် (Child Mode)
          </button>

          <button
            onClick={onLogout}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', color: '#F87171', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <LogOut size={16} />
            ထွက်မည် (Sign Out)
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile Sidebar */}
      {sidebarOpen && window.innerWidth < 1024 && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
        />
      )}

      {/* ── MAIN CONTENT AREA (SCROLLABLE FIX) ── */}
      <main style={{ flex: 1, marginLeft: window.innerWidth >= 1024 ? '260px' : '0', padding: '24px 28px 80px', height: '100vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        
        {/* Top Bar for Mobile Menu Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {window.innerWidth < 1024 && (
              <button 
                onClick={() => setSidebarOpen(true)} 
                style={{ padding: '8px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFF', cursor: 'pointer' }}
              >
                <Menu size={20} />
              </button>
            )}
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
              {activeTab === 'library' && '📁 ကတ် စာကြည့်တိုက် (Card Library)'}
              {activeTab === 'add_card' && '➕ ကတ်အသစ် ဖန်တီးရန် (Custom Card Studio)'}
              {activeTab === 'story_studio' && '📖 မေမေ့ ၁ မိနစ် ပုံပြင် အသံလွှင့်ခန်း (Story Studio)'}
              {activeTab === 'routines' && '📋 လုပ်ရိုးလုပ်စဉ် စီမံခန့်ခွဲရန် (Routine Builder)'}
              {activeTab === 'settings' && '⚙️ ဆက်တင်များနှင့် ပရိုဖိုင် (Settings & Profile)'}
            </h1>
          </div>

          <button onClick={onExit} style={{ padding: '8px 16px', borderRadius: '12px', background: '#E2E8F0', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
            Child Mode ▶
          </button>
        </div>

        {cardSuccessMsg && (
          <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '12px 18px', borderRadius: '14px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={18} /> {cardSuccessMsg}
          </div>
        )}

        {/* ── TAB 1: CARD LIBRARY (WITH EDIT & DELETE ACTIONS) ── */}
        {activeTab === 'library' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
                စုစုပေါင်း ကတ်များ: <b>{allCards.length + customCards.length}</b> (Standard: {allCards.length}, Custom/Mom's: {customCards.length})
              </p>
              <button onClick={() => setActiveTab('add_card')} style={{ padding: '8px 16px', borderRadius: '12px', background: '#2563EB', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusCircle size={16} /> ကတ်အသစ် ထည့်မည်
              </button>
            </div>

            {/* Custom Created Cards with Edit & Delete */}
            {customCards.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#2563EB" /> မိဘများ ဖန်တီးထားသော ကတ်များ (Custom Cards)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>
                  {customCards.map((c) => (
                    <div key={c.id} style={{ background: '#FFF', borderRadius: '16px', padding: '14px', border: '2px solid #93C5FD', boxShadow: '0 4px 12px rgba(37,99,235,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                      
                      {/* Action buttons (Edit & Delete) */}
                      <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => setEditingCard(c)}
                          title="Edit Card"
                          style={{ padding: '4px', borderRadius: '6px', border: 'none', background: '#EFF6FF', color: '#2563EB', cursor: 'pointer' }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(c.id)}
                          title="Delete Card"
                          style={{ padding: '4px', borderRadius: '6px', border: 'none', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {c.image_url ? (
                        <img src={c.image_url} alt={c.burmese} style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '12px', marginTop: '8px' }} />
                      ) : (
                        <div style={{ fontSize: '2.5rem', marginTop: '6px' }}>{c.emoji || '⭐'}</div>
                      )}

                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1E293B', marginTop: '6px' }}>{c.burmese}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{c.englishMeaning}</div>
                      
                      <div style={{ marginTop: '8px', fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: '#F1F5F9', color: '#475569', fontWeight: 700 }}>
                        Category: {c.category}
                      </div>

                      {c.audio_url && (
                        <span style={{ marginTop: '4px', fontSize: '0.68rem', background: '#DCFCE7', color: '#166534', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>
                          🎙️ Mom's Voice
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standard AAC Cards */}
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginBottom: '12px' }}>
              မူလ ကတ်များ (Standard Vocabulary)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
              {allCards.map(c => (
                <div key={c.id} style={{ background: '#FFF', borderRadius: '16px', padding: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.4rem' }}>{c.emoji}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1E293B', marginTop: '6px' }}>{c.burmese}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{c.englishMeaning}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EDIT CARD MODAL DIALOG ── */}
        {editingCard && (
          <div className="modal-overlay" style={{ zIndex: 1200 }}>
            <div className="portal-modal" style={{ maxWidth: '480px', width: '92%', borderRadius: '20px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={20} color="#2563EB" /> ကတ် ပြင်ဆင်ရန် (Edit Card)
                </h3>
                <button onClick={() => setEditingCard(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              <form onSubmit={handleUpdateCardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    မြန်မာ စာသား (Burmese Text)
                  </label>
                  <input
                    type="text"
                    value={editingCard.burmese}
                    onChange={e => setEditingCard({ ...editingCard, burmese: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    English Meaning
                  </label>
                  <input
                    type="text"
                    value={editingCard.englishMeaning}
                    onChange={e => setEditingCard({ ...editingCard, englishMeaning: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    အမျိုးအစား (Category)
                  </label>
                  <select
                    value={editingCard.category}
                    onChange={e => setEditingCard({ ...editingCard, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFF' }}
                  >
                    <option value="subject">Subject (လူများ / အကောင်များ)</option>
                    <option value="verb">Verb (လုပ်ဆောင်ချက် / ကြိယာ)</option>
                    <option value="object">Object (မုန့် / အရာဝတ္ထုများ)</option>
                    <option value="location">Location (နေရာများ)</option>
                    <option value="feeling">Feeling (ခံစားချက်များ)</option>
                    <option value="shortcut">Daily Shortcut</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={editingCard.emoji || ''}
                    onChange={e => setEditingCard({ ...editingCard, emoji: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '1.2rem', textAlign: 'center' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setEditingCard(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: '#E2E8F0', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                    မလုပ်တော့ပါ (Cancel)
                  </button>
                  <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '10px', background: '#2563EB', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                    ပြင်ဆင်မှု သိမ်းမည် (Save)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── TAB 2: ADD NEW CARD (Options 1 & 2) ── */}
        {activeTab === 'add_card' && (
          <div style={{ background: '#FFF', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F0', maxWidth: '640px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', marginBottom: '16px' }}>
              ကတ်အသစ် ဖန်တီးရန် စတူဒီယို (Custom Card Studio)
            </h2>

            <form onSubmit={handleSaveCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Category */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  ၁။ ကတ်အမျိုးအစား ရွေးချယ်ပါ (Select Category)
                </label>
                <select 
                  value={cardCategory} 
                  onChange={e => setCardCategory(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.9rem', background: '#FFF', fontWeight: 700 }}
                >
                  <option value="subject">လူများ / အကောင်များ (Subject / People)</option>
                  <option value="verb">လုပ်ဆောင်ချက် / ကြိယာ (Action / Verb)</option>
                  <option value="object">မုန့် / အရာဝတ္ထုများ (Snacks & Objects)</option>
                  <option value="location">နေရာများ (Places / Locations)</option>
                  <option value="feeling">ခံစားချက်များ (Feelings)</option>
                  <option value="body_part">ခန္ဓာကိုယ် (Body Parts)</option>
                </select>
              </div>

              {/* Burmese Text & English */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    ၂။ မြန်မာစာသား (Burmese Label)
                  </label>
                  <input
                    type="text"
                    placeholder="ဥပမာ - ရေခဲမုန့်"
                    value={cardBurmese}
                    onChange={e => setCardBurmese(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    English Meaning
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ice Cream"
                    value={cardEnglish}
                    onChange={e => setCardEnglish(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* Media Option: Emoji or Photo Upload */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  ၃။ ရုပ်ပုံ သို့မဟုတ် အီမိုဂျီ ရွေးပါ (Media Option)
                </label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCardMediaMode('emoji')}
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #CBD5E1', background: cardMediaMode === 'emoji' ? '#E0F2FE' : '#FFF', color: cardMediaMode === 'emoji' ? '#0369A1' : '#475569', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Smile size={18} /> Emoji (အီမိုဂျီ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardMediaMode('photo')}
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #CBD5E1', background: cardMediaMode === 'photo' ? '#E0F2FE' : '#FFF', color: cardMediaMode === 'photo' ? '#0369A1' : '#475569', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <ImageIcon size={18} /> Photo Upload (ဓာတ်ပုံ)
                  </button>
                </div>

                {cardMediaMode === 'emoji' ? (
                  <input
                    type="text"
                    placeholder="Enter emoji (e.g. 🍦, 🚗, 🧸)"
                    value={cardEmoji}
                    onChange={e => setCardEmoji(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '1.2rem', textAlign: 'center' }}
                  />
                ) : (
                  <div>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} id="photo-upload-input" />
                    <label 
                      htmlFor="photo-upload-input"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', border: '2px dashed #CBD5E1', borderRadius: '14px', cursor: 'pointer', background: '#F8FAFC' }}
                    >
                      <Upload size={24} color="#64748B" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginTop: '6px' }}>
                        {cardPhotoUrl ? 'ဓာတ်ပုံ အဆင်သင့်ဖြစ်ပါပြီ (Change Photo)' : 'မိမိဖုန်း/ကွန်ပျူတာမှ ဓာတ်ပုံ တင်ရန် (Upload Photo)'}
                      </span>
                    </label>
                    {cardPhotoUrl && (
                      <div style={{ marginTop: '10px', textAlign: 'center' }}>
                        <img src={cardPhotoUrl} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', border: '2px solid #2563EB' }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Audio Option: AI Speech vs Custom Voice Recorder */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  ၄။ အသံစနစ် ရွေးချယ်ပါ (Speech Option)
                </label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCardAudioMode('ai_speech')}
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #CBD5E1', background: cardAudioMode === 'ai_speech' ? '#DCFCE7' : '#FFF', color: cardAudioMode === 'ai_speech' ? '#166534' : '#475569', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Volume2 size={18} /> AI Speech (ElevenLabs TTS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardAudioMode('custom_voice')}
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #CBD5E1', background: cardAudioMode === 'custom_voice' ? '#DCFCE7' : '#FFF', color: cardAudioMode === 'custom_voice' ? '#166534' : '#475569', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Mic size={18} /> Mom's Voice (မိခင်အသံသွင်းမည်)
                  </button>
                </div>

                {cardAudioMode === 'custom_voice' && (
                  <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecordingVoice}
                        style={{ padding: '10px 20px', borderRadius: '30px', background: '#EF4444', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}
                      >
                        <Mic size={18} /> မိခင်အသံ သွင်းမည် (Record Mom's Voice)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecordingVoice}
                        style={{ padding: '10px 20px', borderRadius: '30px', background: '#1E293B', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <Square size={18} color="#EF4444" /> ရပ်မည် ({recordingSeconds}s)
                      </button>
                    )}

                    {recordedAudioBlob && (
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <audio src={URL.createObjectURL(recordedAudioBlob)} controls style={{ height: '36px' }} />
                        <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 700 }}>✓ Voice Recorded</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                style={{ marginTop: '10px', width: '100%', padding: '14px', borderRadius: '14px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 6px 16px rgba(37,99,235,0.3)' }}
              >
                ကတ်အသစ် သိမ်းဆည်းမည် (Save Custom Card)
              </button>
            </form>
          </div>
        )}

        {/* ── TAB 3: MOM'S 1-MINUTE STORY STUDIO (Option 3) ── */}
        {activeTab === 'story_studio' && (
          <div style={{ background: '#FFF', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F0', maxWidth: '640px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={22} color="#2563EB" /> မေမေ့ ၁ မိနစ် ပုံပြင် အသံလွှင့်ခန်း (Mom's 1-Min Story Studio)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '20px' }}>
              ကလေးငယ်များ ညအိပ်ရာဝင် သို့မဟုတ် စိတ်ငြိမ်စေရန် မေမေ့အသံဖြင့် ၁ မိနစ်စာ ပုံပြင်ပြောပြပေးသော အသံကတ် ဖန်တီးပါ
            </p>

            <form onSubmit={handleSaveStoryCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  ပုံပြင် ခေါင်းစဉ် (Story Title)
                </label>
                <input
                  type="text"
                  placeholder="ဥပမာ - ရွှေယုန်နဲ့ လိပ် ပုံပြင်"
                  value={storyTitle}
                  onChange={e => setStoryTitle(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
                  required
                />
              </div>

              <div style={{ background: '#F8FAFC', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                {!storyRecording ? (
                  <button
                    type="button"
                    onClick={startStoryRecording}
                    style={{ padding: '14px 28px', borderRadius: '30px', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 6px 18px rgba(239,68,68,0.35)' }}
                  >
                    <Mic size={22} /> ပုံပြင် အသံ စတင်သွင်းမည် (Start 1-Min Story Recording)
                  </button>
                ) : (
                  <div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#EF4444', marginBottom: '10px' }}>
                      🔴 {storySeconds} / 60 စက္ကန့်
                    </div>
                    <button
                      type="button"
                      onClick={stopStoryRecording}
                      style={{ padding: '12px 24px', borderRadius: '30px', background: '#1E293B', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Square size={18} color="#EF4444" /> အသံသွင်းယူမှု ရပ်မည် (Stop)
                    </button>
                  </div>
                )}

                {storyAudioBlob && (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <audio src={URL.createObjectURL(storyAudioBlob)} controls style={{ width: '100%', maxWidth: '360px' }} />
                    <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700 }}>✓ ပုံပြင်အသံ သွင်းယူပြီးပါပြီ ({storySeconds} စက္ကန့်)</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                style={{ width: '100%', padding: '14px', borderRadius: '14px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 6px 16px rgba(37,99,235,0.3)' }}
              >
                မေမေ့ပုံပြင်ကတ် သိမ်းဆည်းမည် (Save Story Card)
              </button>
            </form>
          </div>
        )}

        {/* ── TAB: ROUTINE BUILDER ── */}
        {activeTab === 'routines' && (
          <div style={{ maxWidth: '780px' }}>
            {/* Success/Error messages */}
            {routineMsg && (
              <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534', padding: '12px 18px', borderRadius: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={18} /> {routineMsg}
              </div>
            )}
            {routineError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', padding: '12px 18px', borderRadius: '14px', fontWeight: 700, marginBottom: '16px' }}>
                {routineError}
                <button onClick={() => { setRoutineError(''); getRoutines().then(d => setRoutines(d)).catch(() => setRoutineError('Failed to load')); }} style={{ marginLeft: '12px', padding: '4px 12px', borderRadius: '8px', border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', fontWeight: 700, cursor: 'pointer' }}>
                  Retry
                </button>
              </div>
            )}

            {/* Routine Form (create mode) */}
            {showRoutineForm ? (
              <div style={{ background: '#FFF', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PlusCircle size={20} color="#2563EB" /> လုပ်ရိုးလုပ်စဉ်အသစ် (New Routine)
                  </h3>
                  <button onClick={() => setShowRoutineForm(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
                </div>

                {/* Routine Name */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    လုပ်ရိုးလုပ်စဉ် အမည် (Routine Name)
                  </label>
                  <input
                    type="text"
                    placeholder="ဥပမာ - မနက်ခင်း လုပ်ရိုးလုပ်စဉ် (Morning Routine)"
                    value={editingRoutineName}
                    onChange={e => setEditingRoutineName(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
                  />
                </div>

                {/* Steps List */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                    လုပ်ရိုးလုပ်စဉ် အဆင့်များ (Steps)
                  </label>

                  {editingRoutineSteps.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', background: '#F8FAFC', borderRadius: '12px', border: '2px dashed #E2E8F0', marginBottom: '12px' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '4px' }}>👣</div>
                      <div style={{ fontWeight: 700 }}>အဆင့်များ မရှိသေးပါ (No steps yet)</div>
                      <div style={{ fontSize: '0.8rem' }}>အောက်ပါခလုတ်ကိုနှိပ်၍ အဆင့်များ ထည့်သွင်းပါ</div>
                    </div>
                  )}

                  {editingRoutineSteps.map((step, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '12px', marginBottom: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontWeight: 800, color: '#64748B', minWidth: '24px' }}>{index + 1}.</span>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {(() => {
                          const matchCard = allCards.find(c => c.id === step.icon_id);
                          return matchCard ? (
                            <span style={{ fontSize: '1.6rem' }}>{matchCard.emoji}</span>
                          ) : (
                            <span style={{ fontSize: '1.2rem' }}>⭐</span>
                          );
                        })()}
                        <input
                          type="text"
                          value={step.label}
                          onChange={e => {
                            const newSteps = [...editingRoutineSteps];
                            newSteps[index] = { ...newSteps[index], label: e.target.value };
                            setEditingRoutineSteps(newSteps);
                          }}
                          style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.9rem', fontWeight: 700 }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => {
                            if (index === 0) return;
                            const newSteps = [...editingRoutineSteps];
                            [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
                            setEditingRoutineSteps(newSteps);
                          }}
                          disabled={index === 0}
                          title="Move up"
                          style={{ padding: '4px 6px', borderRadius: '6px', border: 'none', background: index === 0 ? '#F1F5F9' : '#E2E8F0', color: index === 0 ? '#CBD5E1' : '#475569', cursor: index === 0 ? 'not-allowed' : 'pointer' }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (index === editingRoutineSteps.length - 1) return;
                            const newSteps = [...editingRoutineSteps];
                            [newSteps[index + 1], newSteps[index]] = [newSteps[index], newSteps[index + 1]];
                            setEditingRoutineSteps(newSteps);
                          }}
                          disabled={index === editingRoutineSteps.length - 1}
                          title="Move down"
                          style={{ padding: '4px 6px', borderRadius: '6px', border: 'none', background: index === editingRoutineSteps.length - 1 ? '#F1F5F9' : '#E2E8F0', color: index === editingRoutineSteps.length - 1 ? '#CBD5E1' : '#475569', cursor: index === editingRoutineSteps.length - 1 ? 'not-allowed' : 'pointer' }}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          onClick={() => {
                            const newSteps = editingRoutineSteps.filter((_, i) => i !== index);
                            setEditingRoutineSteps(newSteps);
                          }}
                          title="Remove step"
                          style={{ padding: '4px 6px', borderRadius: '6px', border: 'none', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Step button */}
                  <button
                    onClick={() => {
                      setIconPickerCallback(() => (icon: { id: string; label: string }) => {
                        setEditingRoutineSteps(prev => [...prev, { icon_id: icon.id, label: icon.label }]);
                        setShowIconPicker(false);
                      });
                      setShowIconPicker(true);
                    }}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px dashed #93C5FD', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem' }}
                  >
                    <PlusCircle size={18} /> အဆင့်အသစ် ထည့်မည် (Add Step)
                  </button>
                </div>

                {/* Save / Cancel buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setShowRoutineForm(false);
                      setEditingRoutineName('');
                      setEditingRoutineSteps([]);
                    }}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#E2E8F0', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    မလုပ်တော့ပါ (Cancel)
                  </button>
                  <button
                    onClick={async () => {
                      if (!editingRoutineName.trim()) { alert('လုပ်ရိုးလုပ်စဉ် အမည် ထည့်ပါ (Enter a routine name)'); return; }
                      if (editingRoutineSteps.length === 0) { alert('အနည်းဆုံး ၁ ဆင့် ထည့်ပါ (Add at least 1 step)'); return; }
                      try {
                        const newRoutine = await createRoutine({
                          name: editingRoutineName.trim(),
                          steps: editingRoutineSteps.map((s, i) => ({ icon_id: s.icon_id, label: s.label, order: i })),
                        });
                        setRoutines(prev => [newRoutine, ...prev]);
                        setShowRoutineForm(false);
                        setEditingRoutineName('');
                        setEditingRoutineSteps([]);
                        setRoutineMsg('လုပ်ရိုးလုပ်စဉ် သိမ်းဆည်းပြီးပါပြီ (Routine saved!)');
                        setTimeout(() => setRoutineMsg(''), 3000);
                      } catch (err) {
                        alert('သိမ်းဆည်းမှု မအောင်မြင်ပါ (Failed to save)');
                      }
                    }}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#2563EB', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    သိမ်းဆည်းမည် (Save Routine)
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Routines List or Empty State */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
                    {routinesLoading ? 'Loading...' : `လုပ်ရိုးလုပ်စဉ် (${routines.length} ခု)`}
                  </p>
                  <button
                    onClick={() => { setShowRoutineForm(true); setEditingRoutineName(''); setEditingRoutineSteps([]); }}
                    style={{ padding: '10px 18px', borderRadius: '12px', background: '#2563EB', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                  >
                    <PlusCircle size={16} /> လုပ်ရိုးလုပ်စဉ်အသစ် (Create)
                  </button>
                </div>

                {!routinesLoading && routines.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FFF', borderRadius: '20px', border: '2px dashed #E2E8F0' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1E293B', marginBottom: '4px' }}>
                      လုပ်ရိုးလုပ်စဉ်များ မရှိသေးပါ (No routines yet)
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '20px' }}>
                      ကလေးငယ်အတွက် နေ့စဉ်လုပ်ရိုးလုပ်စဉ်များ စတင်ဖန်တီးပါ
                    </p>
                    <button
                      onClick={() => { setShowRoutineForm(true); }}
                      style={{ padding: '14px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFF', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 6px 16px rgba(37,99,235,0.3)' }}
                    >
                      ➕ လုပ်ရိုးလုပ်စဉ်အသစ် (Create Routine)
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {routines.map(r => (
                      <div key={r.id} style={{ background: '#FFF', borderRadius: '16px', padding: '16px 20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B' }}>{r.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                            {new Date(r.created_at).toLocaleDateString()} | Steps: <b>—</b>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('ဤလုပ်ရိုးလုပ်စဉ်ကို ဖျက်ရန် သေချာပါသလား? (Delete this routine?)')) {
                              deleteRoutine(r.id)
                                .then(() => {
                                  setRoutines(prev => prev.filter(x => x.id !== r.id));
                                  setRoutineMsg('လုပ်ရိုးလုပ်စဉ် ပယ်ဖျက်ပြီးပါပြီ (Routine deleted)');
                                  setTimeout(() => setRoutineMsg(''), 3000);
                                })
                                .catch(() => alert('ဖျက်ရန် မအောင်မြင်ပါ'));
                            }
                          }}
                          title="Delete"
                          style={{ padding: '8px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TAB 4: SETTINGS & PROFILE ── */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>
            {/* Profile Info */}
            <div style={{ background: '#FFF', borderRadius: '20px', padding: '20px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} color="#2563EB" /> အသုံးပြုသူ ပရိုဖိုင် (Profile Details)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#475569' }}>
                <div><b>အသုံးပြုသူအမည် (Username):</b> {user.username}</div>
                <div><b>User Role:</b> {user.role}</div>
                <div><b>User ID:</b> <code>{user.id}</code></div>
                <div><b>Login Session:</b> <span style={{ color: '#166534', fontWeight: 700 }}>✓ Remembered (Auto-Saved)</span></div>
              </div>
            </div>

            {/* Change Password Form */}
            <div style={{ background: '#FFF', borderRadius: '20px', padding: '20px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#2563EB" /> စကားဝှက် ပြောင်းလဲရန် (Change Password)
              </h3>

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    စကားဝှက်အသစ် (New Password - Min 8 Chars)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    စကားဝှက်အသစ် အတည်ပြုပါ (Confirm New Password)
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
                    required
                  />
                </div>

                {passwordMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, background: passwordMsg.type === 'success' ? '#DCFCE7' : '#FEF2F2', color: passwordMsg.type === 'success' ? '#166534' : '#DC2626', border: passwordMsg.type === 'success' ? '1px solid #86EFAC' : '1px solid #FCA5A5' }}>
                    {passwordMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={passwordLoading}
                  style={{ padding: '12px', borderRadius: '12px', background: '#2563EB', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  {passwordLoading ? 'လုပ်ဆောင်နေပါသည်...' : 'စကားဝှက် ပြောင်းလဲမည် (Update Password)'}
                </button>
              </form>
            </div>
          </div>
        )}
        {/* ── ICON PICKER MODAL ── */}
        {showIconPicker && (
          <div className="modal-overlay" style={{ zIndex: 1200 }}>
            <div style={{ background: '#FFF', borderRadius: '20px', padding: '24px', maxWidth: '560px', width: '92%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ListChecks size={20} color="#2563EB" /> သင်္ကေတရွေးချယ်ပါ (Pick an Icon)
                </h3>
                <button onClick={() => setShowIconPicker(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              {/* Group icons by category */}
              {(['subject', 'verb', 'object', 'feeling', 'location', 'body_part', 'number', 'direction', 'shortcut'] as const).map(category => {
                const categoryIcons = allCards.filter(c => c.category === category);
                if (categoryIcons.length === 0) return null;
                const categoryLabels: Record<string, string> = {
                  subject: '👤 လူများ (People)', verb: '⚡ လုပ်ဆောင်ချက် (Actions)',
                  object: '🍎 အရာဝတ္ထု (Objects)', feeling: '❤️ ခံစားချက် (Feelings)',
                  location: '🏠 နေရာ (Places)', body_part: '🦶 ခန္ဓာကိုယ် (Body)',
                  number: '🔢 ဂဏန်း (Numbers)', direction: '🧭 လမ်းကြောင်း (Directions)',
                  shortcut: '⭐ အမြန်လမ်း (Shortcuts)'
                };
                return (
                  <div key={category} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {categoryLabels[category]}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '8px' }}>
                      {categoryIcons.map(card => (
                        <button
                          key={card.id}
                          onClick={() => {
                            if (iconPickerCallback) {
                              iconPickerCallback({ id: card.id, label: card.burmese });
                            }
                          }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 6px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#FFF', cursor: 'pointer', transition: 'all 0.15s' }}
                        >
                          <span style={{ fontSize: '1.6rem' }}>{card.emoji}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', marginTop: '2px', textAlign: 'center', lineHeight: 1.2 }}>{card.burmese}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
