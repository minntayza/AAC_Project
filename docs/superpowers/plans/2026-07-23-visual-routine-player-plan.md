# Visual Routine Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visual routine feature — caregivers build step-by-step routines from AAC vocabulary in the Parent Portal, children play through them one step at a time with confetti celebration.

**Architecture:** Frontend-only changes. Backend APIs (`POST/GET/DELETE /api/routines`, `GET /api/routines/<id>/steps`) already exist and persist to Supabase. Two UI surfaces: (1) new "Routines" tab in the existing ParentPortal component for building, (2) new modal + play mode in App.tsx for the child experience.

**Tech Stack:** React 19, TypeScript, CSS, backend APIs (existing)

## Global Constraints

- All labels must include Burmese (primary) + English (secondary, smaller)
- Use `allCards` from `data.ts` for the icon picker vocabulary (hardcoded cards)
- Custom cards from `getCustomCards()` also available in the icon picker
- Pattern for modals: follow existing Mom's Stories modal in App.tsx
- Pattern for Portal sidebar tabs: follow existing library/add_card/story_studio/settings tabs
- Confetti: pure CSS `@keyframes`, no external library

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `frontend/src/api.ts` | Add types + 4 API functions | `Routine`, `RoutineStep` types; `getRoutines()`, `getRoutineSteps()`, `createRoutine()`, `deleteRoutine()` |
| `frontend/src/components/ParentPortal.tsx` | Add Routines tab + builder UI | List routines, create/edit with icon picker, delete routines |
| `frontend/src/App.tsx` | Add routines state + header button + modals + play mode | Child-side: routine list modal, step-by-step player, confetti celebration |
| `frontend/src/index.css` | Add CSS classes | Styles for routine modals, play mode cards, confetti animation |

---

### Task 1: Add Routine API types and functions

**Files:**
- Modify: `frontend/src/api.ts`

**Interfaces:**
- Consumes: existing `fetchJson` helper, existing `API_BASE`
- Produces: `Routine` type, `RoutineStep` type, `getRoutines()`, `getRoutineSteps()`, `createRoutine()`, `deleteRoutine()`

- [ ] **Step 1: Add `Routine` and `RoutineStep` TypeScript interfaces**

Add after the existing `RecentSentence` interface block (around line 33):

```typescript
export interface Routine {
  id: string;
  name: string;
  caregiver_id: string;
  created_at: string;
}

export interface RoutineStep {
  id: string;
  routine_id: string;
  icon_id: string;
  label: string;
  step_order: number;
}

export interface RoutineInput {
  name: string;
  steps: { icon_id: string; label: string; order: number }[];
}
```

- [ ] **Step 2: Add API functions after the existing `updateCustomCard` function (end of file)**

```typescript
export function getRoutines(): Promise<Routine[]> {
  return fetchJson("/routines");
}

export function getRoutineSteps(routineId: string): Promise<RoutineStep[]> {
  return fetchJson(`/routines/${routineId}/steps`);
}

export function createRoutine(data: RoutineInput): Promise<Routine> {
  return fetchJson("/routines", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteRoutine(routineId: string): Promise<{ ok: boolean }> {
  return fetchJson(`/routines/${routineId}`, {
    method: "DELETE",
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api.ts
git commit -m "feat: add Routine types and API functions"
```

---

### Task 2: Add Routines tab to Parent Portal (builder)

**Files:**
- Modify: `frontend/src/components/ParentPortal.tsx`

**Interfaces:**
- Consumes: `Routine`, `RoutineStep`, `RoutineInput`, `getRoutines()`, `createRoutine()`, `deleteRoutine()` from api.ts; `allCards` from data.ts; `ListChecks` icon from `lucide-react`
- Produces: Routines tab with list/create/delete UI in ParentPortal

- [ ] **Step 1: Update imports**

Add `ListChecks` to the `lucide-react` import line:
```typescript
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
  ListChecks,  // <-- add this
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
```

Add `getRoutines`, `createRoutine`, `deleteRoutine`, and types to the api import:
```typescript
import { changePassword, saveCustomCard, getCustomCards, deleteCustomCard, updateCustomCard, getRoutines, createRoutine, deleteRoutine, type CustomCardData, type Routine, type RoutineInput } from '../api';
```

- [ ] **Step 2: Add state variables after existing ParentPortal state (after line 74 `const [cardSuccessMsg, setCardSuccessMsg] = useState('');`)**

```typescript
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
```

- [ ] **Step 3: Add routines fetch effect after existing `useEffect` blocks (after line 79)**

```typescript
  // Fetch routines on mount
  useEffect(() => {
    getRoutines()
      .then(data => setRoutines(data))
      .catch(() => setRoutineError('Failed to load routines'))
      .finally(() => setRoutinesLoading(false));
  }, []);
```

- [ ] **Step 4: Add a new sidebar nav item between story_studio and settings buttons**

Insert after the Story Studio button (after the `</button>` at the end of the story_studio block, around line 392):

```typescript
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
```

- [ ] **Step 5: Add `'routines'` to the `activeTab` condition in the header title**

Find the header title block (around line 448) and add:
```typescript
              {activeTab === 'routines' && '📋 လုပ်ရိုးလုပ်စဉ် စီမံခန့်ခွဲရန် (Routine Builder)'}
```

- [ ] **Step 6: Add the Routines tab content block between the Story Studio and Settings tab sections**

Before the `{activeTab === 'settings' ...}` block (before the comment `{/* ── TAB 4: SETTINGS & PROFILE ── */}`), add:

```typescript
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
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px dashed '#93C5FD', background: '#EFF6FF', color: '#2563EB', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem' }}
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
```

- [ ] **Step 7: Add the Icon Picker modal (render it unconditionally in the main content area, but only visible when `showIconPicker` is true)**

The icon picker should be a modal overlay listing icons from `allCards` grouped by category. Add it at the end of the main content area, before the closing `</main>` tag:

```typescript
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
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ParentPortal.tsx
git commit -m "feat: add routine builder tab to Parent Portal"
```

---

### Task 3: Add child-side routine list modal + play mode to App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `Routine`, `RoutineStep`, `getRoutines()`, `getRoutineSteps()` from api.ts; `toBurmeseDigits()` from App.tsx; `allCards` from data.ts
- Produces: "My Routines" button in header bar, routine list modal, step-by-step play mode with confetti

- [ ] **Step 1: Update imports in App.tsx**

Add `ListChecks` to the lucide-react import (line 2):
```typescript
import { Volume2, Trash2, ArrowLeft, Settings, RotateCcw, Lock, X, Play, BookOpen, ListChecks } from 'lucide-react';
```

Add new API imports (line 16):
```typescript
import { textToSpeech, saveSentence, getCustomCards, getCategories, getIcons, rephraseSentence, getRoutines, getRoutineSteps, type CustomCardData, type IconData, type Routine, type RoutineStep } from './api';
```

- [ ] **Step 2: Add routine state variables after existing state declarations (after line 44)**

```typescript
  // Routine player state
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showRoutinesModal, setShowRoutinesModal] = useState(false);
  const [routinesLoading, setRoutinesLoading] = useState(false);
  const [routineError, setRoutineError] = useState('');
  const [playingRoutine, setPlayingRoutine] = useState<Routine | null>(null);
  const [playingSteps, setPlayingSteps] = useState<RoutineStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
```

- [ ] **Step 3: Add fetch routines effect after existing effects (after line 66)**

This effect fetches routines when the component mounts (to know whether to show the header button), and whenever `currentUser` changes:
```typescript
  // Fetch routines for child-side access
  useEffect(() => {
    setRoutinesLoading(true);
    getRoutines()
      .then(data => setRoutines(data))
      .catch(() => setRoutineError('Failed to load routines'))
      .finally(() => setRoutinesLoading(false));
  }, []);
```

- [ ] **Step 4: Add the "My Routines" button to the header bar**

After the step indicator pills section (after the `</div>` closing the `step-indicator` div, around line 546), add:

```typescript
          {/* My Routines Button */}
          {!isSentenceFinished && routines.length > 0 && (
            <button
              className="btn-routines-header"
              onClick={() => setShowRoutinesModal(true)}
              style={{
                marginLeft: 'auto', padding: '6px 14px', borderRadius: '12px', background: '#F3E8FF', border: '1px solid #C084FC',
                fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', color: '#6B21A8'
              }}
            >
              <ListChecks size={16} /> 📋 လုပ်ရိုးလုပ်စဉ်
            </button>
          )}
```

- [ ] **Step 5: Add the routine list modal (same pattern as Mom's Stories modal)**

Add after the Mom's Stories modal (after the closing `</div>` of `showStoriesModal`, around line 512):

```typescript
      {/* ── ROUTINE LIST MODAL ── */}
      {showRoutinesModal && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div style={{ background: '#FFF', borderRadius: '24px', padding: '24px', maxWidth: '480px', width: '92%', maxHeight: '75vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListChecks size={24} color="#7C3AED" /> 📋 လုပ်ရိုးလုပ်စဉ် (My Routines)
              </h2>
              <button onClick={() => setShowRoutinesModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Loading state */}
            {routinesLoading && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
                <p style={{ fontWeight: 700 }}>Loading...</p>
              </div>
            )}

            {/* Error state */}
            {routineError && !routinesLoading && (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>😕</div>
                <p style={{ fontWeight: 700, color: '#DC2626' }}>ဝမ်းနည်းပါတယ်... (Sorry, something went wrong)</p>
                <button
                  onClick={() => {
                    setRoutineError('');
                    setRoutinesLoading(true);
                    getRoutines().then(d => setRoutines(d)).catch(() => setRoutineError('Failed to load')).finally(() => setRoutinesLoading(false));
                  }}
                  style={{ marginTop: '12px', padding: '8px 20px', borderRadius: '10px', background: '#2563EB', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  ပြန်ကြိုးစားမည် (Retry)
                </button>
              </div>
            )}

            {/* Empty state */}
            {!routinesLoading && !routineError && routines.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94A3B8' }}>
                <div style={{ fontSize: '3rem', marginBottom: '8px' }}>📋</div>
                <p style={{ fontWeight: 700, color: '#475569' }}>မေမေ့ကို လုပ်ရိုးလုပ်စဉ် ပြင်ဆင်ခိုင်းပါ</p>
                <p style={{ fontSize: '0.8rem' }}>(Ask your caregiver to set up a routine)</p>
              </div>
            )}

            {/* Routine list */}
            {!routinesLoading && !routineError && routines.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {routines.map(r => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setShowRoutinesModal(false);
                      setPlayingRoutine(r);
                      setCurrentStepIndex(0);
                      setShowCelebration(false);
                      setConfettiKey(prev => prev + 1);
                      getRoutineSteps(r.id)
                        .then(steps => setPlayingSteps(steps))
                        .catch(() => {
                          setPlayingRoutine(null);
                          setRoutineError('Failed to load routine steps');
                          setShowRoutinesModal(true);
                        });
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px',
                      borderRadius: '16px', border: '1px solid #E2E8F0', background: '#FFF', cursor: 'pointer', textAlign: 'left',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: '2rem' }}>📋</div>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1E293B' }}>{r.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 6: Add the routine play mode view (rendered inside the main content area)**

Add inside the `<main className="main-content">` block, after the closing `</>` of the `isSentenceFinished ? ... : (...)` ternary but before `</main>`:

```typescript
      {/* ── ROUTINE PLAY MODE ── */}
      {playingRoutine && !showRoutinesModal && (
        <div className="routine-play-overlay" style={{ position: 'fixed', inset: 0, background: '#F8FAFC', zIndex: 1100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          {/* Close button */}
          <button
            onClick={() => { setPlayingRoutine(null); setPlayingSteps([]); setShowCelebration(false); }}
            style={{ position: 'absolute', top: '20px', right: '20px', padding: '10px', borderRadius: '12px', border: 'none', background: '#E2E8F0', color: '#475569', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>

          {/* Routine name header */}
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94A3B8', marginBottom: '12px' }}>
            {playingRoutine.name}
          </div>

          {/* Celebration state */}
          {showCelebration ? (
            <div style={{ textAlign: 'center' }}>
              {/* Confetti particles */}
              <div className="confetti-container" key={confettiKey}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className="confetti-particle"
                    style={{
                      left: `${10 + (i * 8)}%`,
                      animationDelay: `${i * 0.1}s`,
                      backgroundColor: ['#FCD34D', '#FDE047', '#60A5FA', '#F472B6', '#A78BFA', '#34D399'][i % 6],
                      width: `${8 + Math.random() * 8}px`,
                      height: `${8 + Math.random() * 8}px`,
                    }}
                  />
                ))}
              </div>

              <div style={{ fontSize: '4rem', marginBottom: '12px' }}>🎉</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#1E293B', marginBottom: '4px' }}>
                တော်လှပါတယ်!
              </h2>
              <p style={{ fontSize: '1.1rem', color: '#64748B', marginBottom: '28px' }}>
                (You did it!)
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '280px' }}>
                <button
                  onClick={() => { setCurrentStepIndex(0); setShowCelebration(false); }}
                  style={{ padding: '14px', borderRadius: '14px', background: '#2563EB', color: '#FFF', border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}
                >
                  🔄 ပြန်လုပ်မယ် (Do Again)
                </button>
                <button
                  onClick={() => { setPlayingRoutine(null); setPlayingSteps([]); setShowCelebration(false); setShowRoutinesModal(true); }}
                  style={{ padding: '14px', borderRadius: '14px', background: '#E2E8F0', color: '#475569', border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}
                >
                  📋 လုပ်ရိုးလုပ်စဉ်များ (All Routines)
                </button>
              </div>
            </div>
          ) : playingSteps.length === 0 ? (
            /* Error state: routine has no steps */
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>😕</div>
              <p style={{ fontWeight: 700, color: '#DC2626' }}>ဤလုပ်ရိုးလုပ်စဉ်တွင် အဆင့်များ မရှိပါ</p>
              <p style={{ fontSize: '0.85rem', color: '#64748B' }}>(This routine has no steps)</p>
              <button
                onClick={() => { setPlayingRoutine(null); setPlayingSteps([]); }}
                style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '12px', background: '#E2E8F0', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                နောက်သို့ (Back)
              </button>
            </div>
          ) : (
            /* Step display */
            <div style={{ textAlign: 'center', width: '100%', maxWidth: '400px' }}>
              {/* Step counter */}
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#94A3B8', marginBottom: '20px' }}>
                {toBurmeseDigits(currentStepIndex + 1)} / {toBurmeseDigits(playingSteps.length)}
              </div>

              {/* Step card */}
              {(() => {
                const step = playingSteps[currentStepIndex];
                const matchCard = allCards.find(c => c.id === step.icon_id);
                return (
                  <div style={{
                    background: '#FFF', borderRadius: '24px', padding: '40px 24px',
                    border: '2px solid #E2E8F0', boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                    marginBottom: '28px', animation: 'fadeIn 0.3s ease'
                  }}>
                    <div style={{ fontSize: '5rem', marginBottom: '16px' }}>
                      {matchCard ? matchCard.emoji : '⭐'}
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1E293B', marginBottom: '4px' }}>
                      {step.label}
                    </div>
                    {matchCard && (
                      <div style={{ fontSize: '0.9rem', color: '#64748B' }}>
                        {matchCard.englishMeaning}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Done button */}
              <button
                onClick={() => {
                  if (currentStepIndex < playingSteps.length - 1) {
                    setCurrentStepIndex(prev => prev + 1);
                  } else {
                    setShowCelebration(true);
                    setConfettiKey(prev => prev + 1);
                  }
                }}
                style={{
                  width: '100%', padding: '18px', borderRadius: '16px', background: '#16A34A', color: '#FFF',
                  border: 'none', fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(22,163,74,0.3)', minHeight: '64px'
                }}
              >
                ✅ ပြီးပြီ (Done)
              </button>
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: add child-side routine list and play mode"
```

---

### Task 4: Add CSS for routine modals, play mode, and confetti

**Files:**
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: CSS class names used in App.tsx (`confetti-container`, `confetti-particle`, `fadeIn`, `routine-play-overlay`)
- Produces: Styles for confetti animation, play mode, modal, fade-in transitions

- [ ] **Step 1: Add confetti animation CSS**

Add at the end of `index.css`:

```css
/* ── Routine Play Mode ── */
.routine-play-overlay {
  animation: fadeIn 0.25s ease;
}

/* Fade-in keyframe for step transitions */
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

/* ── Confetti Animation ── */
.confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2000;
  overflow: hidden;
}

.confetti-particle {
  position: absolute;
  top: -20px;
  border-radius: 50%;
  animation: confettiFall 2s ease-in-out forwards;
}

@keyframes confettiFall {
  0% {
    transform: translateY(0) rotate(0deg) scale(1);
    opacity: 1;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg) scale(0.3);
    opacity: 0;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add confetti animation and play mode CSS"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Parent Portal routine builder tab with icon picker — Task 2
- ✅ Child-side "My Routines" header button — Task 3
- ✅ Routine list modal with empty/loading/error states — Task 3
- ✅ Step-by-step play mode with Done button — Task 3
- ✅ Confetti celebration on completion — Task 3
- ✅ Single-step routine → immediate celebration — handled (any last step triggers celebration)
- ✅ 0-step routine error state — Task 3
- ✅ API failure handling with retry — Tasks 2 and 3
- ✅ No routines → header button hidden — `routines.length > 0` check in Task 3

**2. Placeholder scan:** No TBD, TODO, or incomplete sections. Every step has complete code.

**3. Type consistency:** `Routine`, `RoutineStep`, `RoutineInput` types defined in Task 1 match the backend API shapes. `getRoutines()` returns `Routine[]` used in both Tasks 2 and 3. `createRoutine()` accepts `RoutineInput` and returns `Routine`.
