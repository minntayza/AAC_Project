import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Activity, Sparkles, RefreshCw, Volume2, MessageSquare, Award, Clock } from 'lucide-react';
import { getSentenceAnalytics, textToSpeech, type SentenceAnalyticsData } from '../api';

interface AnalyticsBoardProps {
  userId?: string;
  childNickname?: string;
}

export const AnalyticsBoard: React.FC<AnalyticsBoardProps> = ({ userId, childNickname }) => {
  const [analytics, setAnalytics] = useState<SentenceAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportTab, setReportTab] = useState<'top_sentences' | 'top_words' | 'daily_logs' | 'weekly_logs'>('top_sentences');

  const fetchAnalytics = () => {
    setLoading(true);
    getSentenceAnalytics(userId)
      .then(data => setAnalytics(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
    const timer = setInterval(() => {
      getSentenceAnalytics(userId)
        .then(data => setAnalytics(data))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [userId]);

  const speakSentence = async (text: string) => {
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
    } catch (e) {}

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'my-MM';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#FFF', borderRadius: '20px', padding: '40px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B' }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 12px', color: '#2563EB' }} />
        <p style={{ fontWeight: 700 }}>အချက်အလက်များ တွက်ချက်နေပါသည် (Loading Analytics...)</p>
      </div>
    );
  }

  const currentData = analytics ? (analytics[activeFilter] || {}) : {};
  const dataEntries = Object.entries(currentData);
  const maxVal = Math.max(...dataEntries.map(([, val]) => val), 1);

  const categoryEntries = analytics ? Object.entries(analytics.categories || {}) : [];
  const maxCatVal = Math.max(...categoryEntries.map(([, val]) => val), 1);

  const topWords = analytics?.top_words || [];
  const topSentences = analytics?.top_sentences || [];
  const dailyReport = analytics?.daily_report || [];
  const weeklyReport = analytics?.weekly_report || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '960px' }}>
      
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '24px', padding: '24px 28px', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(102,126,234,0.2)', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '46px', height: '46px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', boxShadow: '0 4px 12px rgba(255,255,255,0.15)' }}>
            <BarChart3 size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC' }}>
              {childNickname ? `${childNickname} ၏ စကားပြော အချက်အလက်များ` : 'ကလေး၏ စကားပြော သုံးစွဲမှု အချက်အလက် (Analytics Board)'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '2px' }}>
              Real-time Database Activity Log • နေ့စဥ်၊ အပတ်စဉ်၊ လစဉ် စကားပြော အစီရင်ခံစာများ
            </p>
          </div>
        </div>

        <button 
          onClick={fetchAnalytics}
          style={{ padding: '10px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={16} /> Data Refresh
        </button>
      </div>

      {/* Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#FFF', borderRadius: '20px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B' }}>စုစုပေါင်း စာကြောင်း (Total Sentences)</span>
            <div style={{ width: '36px', height: '36px', background: '#EFF6FF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
              <Activity size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0F172A' }}>
            {analytics?.total_sentences || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, marginTop: '4px' }}>
            ✓ Real Database Entries
          </div>
        </div>

        <div style={{ background: '#FFF', borderRadius: '20px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B' }}>အသုံးအများဆုံး စကားလုံး (Top Card Word)</span>
            <div style={{ width: '36px', height: '36px', background: '#FEF3C7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
              <Award size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
            {topWords.length > 0 ? topWords[0].word : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 700, marginTop: '4px' }}>
            {topWords.length > 0 ? `${topWords[0].count} ကြိမ် အသုံးပြုထားသည်` : 'No data yet'}
          </div>
        </div>

        <div style={{ background: '#FFF', borderRadius: '20px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B' }}>အသုံးအများဆုံး စာလုံးအမျိုးအစား (Top Category)</span>
            <div style={{ width: '36px', height: '36px', background: '#DCFCE7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
            {categoryEntries.length > 0 ? categoryEntries.sort((a, b) => b[1] - a[1])[0][0] : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
            Most selected category
          </div>
        </div>
      </div>

      {/* Main Filterable Usage Chart (Daily, Weekly, Monthly) */}
      <div style={{ background: '#FFF', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} color="#2563EB" /> စကားပြော သုံးစွဲမှု ပုံစံများ (Usage Trends)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748B' }}>နေ့စဥ်၊ အပတ်စဉ်၊ လစဉ် စာကြောင်း အရေအတွက် Chart များ</p>
          </div>

          {/* Timeframe Selector Pills */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '12px', padding: '3px' }}>
            <button
              type="button"
              onClick={() => setActiveFilter('daily')}
              style={{ padding: '6px 14px', borderRadius: '10px', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: activeFilter === 'daily' ? '#FFF' : 'transparent', color: activeFilter === 'daily' ? '#2563EB' : '#64748B', boxShadow: activeFilter === 'daily' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
            >
              နေ့စဥ် (Daily)
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('weekly')}
              style={{ padding: '6px 14px', borderRadius: '10px', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: activeFilter === 'weekly' ? '#FFF' : 'transparent', color: activeFilter === 'weekly' ? '#2563EB' : '#64748B', boxShadow: activeFilter === 'weekly' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
            >
              အပတ်စဉ် (Weekly)
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('monthly')}
              style={{ padding: '6px 14px', borderRadius: '10px', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: activeFilter === 'monthly' ? '#FFF' : 'transparent', color: activeFilter === 'monthly' ? '#2563EB' : '#64748B', boxShadow: activeFilter === 'monthly' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
            >
              လစဉ် (Monthly)
            </button>
          </div>
        </div>

        {/* Real Dynamic Bar Chart */}
        {dataEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
            <Activity size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <p style={{ fontWeight: 700 }}>အချက်အလက် စာရင်း မရှိသေးပါ</p>
            <p style={{ fontSize: '0.8rem' }}>ကလေးငယ်မှ စကားပြော အက်ပ်တွင် စာကြောင်းများ စတင် ပြောဆိုပါက ဤနေရာတွင် ရလဒ်များ ချက်ချင်း ပေါ်လာပါမည်</p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', height: '220px', padding: '20px 10px 10px', borderBottom: '2px solid #E2E8F0', overflowX: 'auto' }}>
            {dataEntries.map(([key, count]) => {
              const heightPercent = Math.max((count / maxVal) * 100, 12);
              return (
                <div key={key} style={{ flex: 1, minWidth: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB' }}>{count}</div>
                  <div 
                    style={{ 
                      width: '100%', 
                      maxWidth: '36px', 
                      height: `${heightPercent}%`, 
                      background: 'linear-gradient(180deg, #3B82F6, #1D4ED8)', 
                      borderRadius: '8px 8px 4px 4px',
                      transition: 'height 0.4s ease-out',
                      boxShadow: '0 4px 10px rgba(37,99,235,0.2)'
                    }} 
                  />
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {key.length > 10 ? key.slice(0, 8) : key}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── REAL DATA DETAILED REPORTS & TOP CARDS / SENTENCES SECTION ── */}
      <div style={{ background: '#FFF', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        
        {/* Report Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} color="#2563EB" /> ကလေးငယ်၏ စကားပြော အစီရင်ခံစာများ (Child Speech Reports)
          </h3>

          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '12px', padding: '3px', flexWrap: 'wrap', gap: '2px' }}>
            <button
              type="button"
              onClick={() => setReportTab('top_sentences')}
              style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: reportTab === 'top_sentences' ? '#FFF' : 'transparent', color: reportTab === 'top_sentences' ? '#2563EB' : '#64748B', boxShadow: reportTab === 'top_sentences' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
            >
              အသုံးအများဆုံး စာကြောင်း (Top Sentences)
            </button>

            <button
              type="button"
              onClick={() => setReportTab('top_words')}
              style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: reportTab === 'top_words' ? '#FFF' : 'transparent', color: reportTab === 'top_words' ? '#2563EB' : '#64748B', boxShadow: reportTab === 'top_words' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
            >
              အသုံးအများဆုံး စကားလုံး (Top Words)
            </button>

            <button
              type="button"
              onClick={() => setReportTab('daily_logs')}
              style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: reportTab === 'daily_logs' ? '#FFF' : 'transparent', color: reportTab === 'daily_logs' ? '#2563EB' : '#64748B', boxShadow: reportTab === 'daily_logs' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
            >
              နေ့စဥ် အစီရင်ခံစာ (Daily Logs)
            </button>

            <button
              type="button"
              onClick={() => setReportTab('weekly_logs')}
              style={{ padding: '6px 12px', borderRadius: '10px', border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: reportTab === 'weekly_logs' ? '#FFF' : 'transparent', color: reportTab === 'weekly_logs' ? '#2563EB' : '#64748B', boxShadow: reportTab === 'weekly_logs' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none' }}
            >
              အပတ်စဉ် အစီရင်ခံစာ (Weekly Logs)
            </button>
          </div>
        </div>

        {/* REPORT CONTENT 1: TOP SENTENCES */}
        {reportTab === 'top_sentences' && (
          <div>
            {topSentences.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
                ပြောဆိုထားသော စာကြောင်းများ မရှိသေးပါ (No sentence records found)
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {topSentences.map((item, index) => (
                  <div key={index} style={{ background: '#F8FAFC', borderRadius: '14px', padding: '12px 16px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', background: '#DBEAFE', color: '#1E40AF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                        {index + 1}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
                        {item.sentence}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: '#DCFCE7', color: '#166534' }}>
                        {item.count} ကြိမ်
                      </span>

                      <button 
                        onClick={() => speakSentence(item.sentence)}
                        style={{ border: 'none', background: '#EFF6FF', color: '#2563EB', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                        title="🔊 စကားပြော နားထောင်မည်"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REPORT CONTENT 2: TOP WORDS */}
        {reportTab === 'top_words' && (
          <div>
            {topWords.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
                ပြောဆိုထားသော စကားလုံးများ မရှိသေးပါ
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {topWords.map((item, index) => (
                  <div 
                    key={index}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '16px', 
                      background: 'linear-gradient(135deg, #FEF08A, #FDE047)', border: '1px solid #FACC15', color: '#854D0E', 
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)' 
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{item.word}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#FFF', padding: '2px 8px', borderRadius: '12px', color: '#1E293B' }}>
                      {item.count} ကြိမ်
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REPORT CONTENT 3: DAILY LOGS */}
        {reportTab === 'daily_logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {dailyReport.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
                နေ့စဥ် အချက်အလက် မရှိသေးပါ
              </p>
            ) : (
              dailyReport.map(dayItem => (
                <div key={dayItem.date} style={{ background: '#F8FAFC', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={16} color="#2563EB" /> {dayItem.date}
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '4px 10px', borderRadius: '12px' }}>
                      ပြောဆိုသည့် စာကြောင်း ({dayItem.count} ခု)
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {dayItem.sentences.map((sent, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', padding: '8px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>
                          💬 {sent.text_my}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#64748B' }}>
                          <Clock size={12} /> {sent.time}
                          <button 
                            onClick={() => speakSentence(sent.text_my)} 
                            style={{ border: 'none', background: 'none', color: '#2563EB', cursor: 'pointer' }}
                          >
                            <Volume2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* REPORT CONTENT 4: WEEKLY LOGS */}
        {reportTab === 'weekly_logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {weeklyReport.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
                အပတ်စဉ် အချက်အလက် မရှိသေးပါ
              </p>
            ) : (
              weeklyReport.map(weekItem => (
                <div key={weekItem.week} style={{ background: '#F8FAFC', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={16} color="#166534" /> {weekItem.week}
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#166534', background: '#DCFCE7', padding: '4px 10px', borderRadius: '12px' }}>
                      စုစုပေါင်း စာကြောင်း ({weekItem.count} ခု)
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {weekItem.sentences.slice(0, 5).map((sent, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', padding: '8px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.88rem' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>
                          💬 {sent.text_my}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {sent.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Vocabulary Categories Chart */}
      <div style={{ background: '#FFF', borderRadius: '20px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="#2563EB" /> စကားလုံး အမျိုးအစားများ အသုံးပြုမှု (Vocabulary Categories)
        </h3>

        {categoryEntries.length === 0 ? (
          <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>အချက်အလက် စာရင်း မရှိသေးပါ</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {categoryEntries.map(([catName, count]) => {
              const widthPercent = Math.max((count / maxCatVal) * 100, 8);
              return (
                <div key={catName}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    <span>{catName}</span>
                    <span style={{ color: '#2563EB' }}>{count} ကြိမ်</span>
                  </div>
                  <div style={{ width: '100%', height: '12px', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${widthPercent}%`, 
                        height: '100%', 
                        background: 'linear-gradient(90deg, #3B82F6, #10B981)', 
                        borderRadius: '6px',
                        transition: 'width 0.4s ease'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
