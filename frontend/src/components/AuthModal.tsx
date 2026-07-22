import React, { useState } from 'react';
import { User, KeyRound, ArrowRight, ShieldCheck, X, HelpCircle, CheckCircle2, AlertCircle, Baby } from 'lucide-react';
import { loginUser, registerUser } from '../api';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: { id: string; username: string; role: string; child_nickname?: string; child_gender?: string; child_birth_year?: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Child Profile Information (Requirement 1)
  const [childNickname, setChildNickname] = useState('');
  const [childGender, setChildGender] = useState('boy');
  const [childBirthYear, setChildBirthYear] = useState('2018');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOAuthGuide, setShowOAuthGuide] = useState(false);

  // Password validation (min 8 chars)
  const isPasswordValid = password.length >= 8;
  const isPasswordMatching = mode === 'login' || password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('စကားဝှက်သည် အနည်းဆုံး ၈ လုံး ရှိရပါမည် (Password must be at least 8 characters)');
      return;
    }

    if (mode === 'register' && !isPasswordMatching) {
      setError('စကားဝှက်များ တူညီမှုမရှိပါ (Passwords do not match)');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await loginUser(username, password);
        onSuccess(user);
      } else {
        const user = await registerUser(
          username, 
          password, 
          'caregiver', 
          childNickname, 
          childGender, 
          childBirthYear
        );
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'ဝင်ရောက်မှု အဆင်မပြေပါ (Authentication failed)');
    } finally {
      setLoading(false);
    }
  };

  const birthYears = Array.from({ length: 15 }, (_, i) => (2012 + i).toString());

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="portal-modal" style={{ maxWidth: '460px', width: '92%', borderRadius: '24px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="portal-modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#FFF', boxShadow: '0 8px 20px rgba(37,99,235,0.3)' }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
            {mode === 'login' ? 'မိဘ/ဆရာမ ဝင်ရောက်ရန် (Caregiver Sign In)' : 'အကောင့်သစ် ပြုလုပ်ရန် (Register)'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
            AAC စကားပြော အက်ပ်၏ မိဘထိန်းချုပ်ခန်း သို့ ဝင်ရောက်ပါ
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '14px', padding: '4px', marginBottom: '20px' }}>
          <button
            type="button"
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: mode === 'login' ? '#FFF' : 'transparent', color: mode === 'login' ? '#1E293B' : '#64748B', boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s' }}
            onClick={() => { setMode('login'); setError(''); }}
          >
            ဝင်ရောက်မည် (Sign In)
          </button>
          <button
            type="button"
            style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: mode === 'register' ? '#FFF' : 'transparent', color: mode === 'register' ? '#1E293B' : '#64748B', boxShadow: mode === 'register' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none', transition: 'all 0.2s' }}
            onClick={() => { setMode('register'); setError(''); }}
          >
            အကောင့်သစ် (Register)
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              အသုံးပြုသူအမည် (Username)
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                className="input-field"
                placeholder="ဥပမာ - mother1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.95rem' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              စကားဝှက် (Password - Min 8 Characters)
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: password ? (isPasswordValid ? '1px solid #22C55E' : '1px solid #EF4444') : '1px solid #CBD5E1', fontSize: '0.95rem' }}
                required
              />
            </div>
            {password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', marginTop: '4px', color: isPasswordValid ? '#166534' : '#DC2626' }}>
                {isPasswordValid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {isPasswordValid ? 'စကားဝှက် အနည်းဆုံး ၈ လုံး ပြည့်မီပါသည်' : `အနည်းဆုံး ၈ လုံး လိုအပ်ပါသည် (${password.length}/8)`}
              </div>
            )}
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                  စကားဝှက် အတည်ပြုပါ (Confirm Password)
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="password"
                    className="input-field"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px', border: confirmPassword ? (isPasswordMatching ? '1px solid #22C55E' : '1px solid #EF4444') : '1px solid #CBD5E1', fontSize: '0.95rem' }}
                    required
                  />
                </div>
              </div>

              {/* REQUIREMENT 1: CHILD PROFILE INFORMATION */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0', marginTop: '4px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Baby size={18} color="#2563EB" /> ကလေးငယ်၏ အချက်အလက် (Child Information)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                      ကလေး၏ အမည်/အမည်ပြောင် (Child Nickname)
                    </label>
                    <input
                      type="text"
                      placeholder="ဥပမာ - ဖိုးလပြည့် / သားသား"
                      value={childNickname}
                      onChange={(e) => setChildNickname(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                        ကျား/မ (Gender)
                      </label>
                      <select
                        value={childGender}
                        onChange={(e) => setChildGender(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem', background: '#FFF' }}
                      >
                        <option value="boy">ကျား (Boy)</option>
                        <option value="girl">မ (Girl)</option>
                        <option value="other">အခြား (Other)</option>
                      </select>
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                        မွေးသက္ကရာဇ် (Birth Year)
                      </label>
                      <select
                        value={childBirthYear}
                        onChange={(e) => setChildBirthYear(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem', background: '#FFF' }}
                      >
                        {birthYears.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 14px', borderRadius: '12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <div>{error}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '14px', borderRadius: '14px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 6px 16px rgba(37,99,235,0.3)', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}
          >
            {loading ? 'လုပ်ဆောင်နေပါသည်...' : (mode === 'login' ? 'ဝင်ရောက်မည် (Sign In)' : 'အကောင့်သစ် ပြုလုပ်မည် (Register)')}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 16px', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }}></div>
          <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>သို့မဟုတ် (OR)</span>
          <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }}></div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={() => setShowOAuthGuide(true)}
          style={{ width: '100%', padding: '12px', borderRadius: '14px', background: '#FFF', border: '1px solid #CBD5E1', color: '#334155', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', transition: 'all 0.2s' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Google အကောင့်ဖြင့် ဝင်ရောက်မည် (Sign in with Google)
        </button>

        {/* OAuth Guide Modal Overlay */}
        {showOAuthGuide && (
          <div className="modal-overlay" style={{ zIndex: 1200 }}>
            <div className="portal-modal" style={{ maxWidth: '480px', width: '92%', borderRadius: '20px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HelpCircle size={20} color="#2563EB" /> Google OAuth Setup Guide
                </h3>
                <button onClick={() => setShowOAuthGuide(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                <p style={{ marginBottom: '10px' }}>
                  To enable live Google OAuth Sign-In with your own Google API Client ID:
                </p>
                <ol style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>Go to <b>Google Cloud Console</b> (console.cloud.google.com).</li>
                  <li>Create a new Project & navigate to <b>APIs & Services → Credentials</b>.</li>
                  <li>Click <b>Create Credentials → OAuth client ID</b> (Web application).</li>
                  <li>Set Authorized Redirect URI to <code>https://your-supabase-id.supabase.co/auth/v1/callback</code>.</li>
                  <li>Copy your <b>Client ID</b> and <b>Client Secret</b> into Supabase Console under <b>Authentication → Providers → Google</b>.</li>
                </ol>
              </div>
              <button
                type="button"
                onClick={() => setShowOAuthGuide(false)}
                style={{ marginTop: '18px', width: '100%', padding: '10px', borderRadius: '12px', background: '#2563EB', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                နားလည်ပါပြီ (Got it)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
