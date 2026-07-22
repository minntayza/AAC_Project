# UI Audit: AAC Communication Board

## Overview

**Project:** Burmese AAC web app for autistic children  
**Audit scope:** React frontend (App.tsx + data.ts + api.ts + index.css)  
**Tested live:** Localhost via Vite dev server (:5173) with Flask backend (:5001)  
**Overall Score:** 12/24

---

## 1. Copywriting — 2/4

| Check | Verdict |
|-------|---------|
| Burmese text correct & natural | ✓ |
| User guidance during emptiness | ✗ — placeholder "ပုံရွေးပါ (Choose cards)" only; no hint of 3-step Subject→Verb→Object flow |
| Error messages human-readable | ✗ — `console.error('Failed to load data', e)` user never sees; silent failure |
| Label consistency | ⚠ Feelings screen heading "😊 ခံစားချက်များ (Feelings)" fine, but "Build" nav tab does nothing |
| Feedback on action | ✗ — Speak triggers TTS with zero visual/audio feedback (no spinner, no success marker) |

**Fixes:**
1. Add empty-state illustration + brief instruction: "နှိပ်ပါ → ရွေးပါ → ပြောမည်" (Tap → Choose → Speak)
2. Surface API errors to user: toast or inline banner in Burmese
3. Speak button needs loading state + "ပြောနေသည်..." (Speaking...) + audio waveform indicator

---

## 2. Visual Design — 2/4

| Check | Verdict |
|-------|---------|
| Visual identity / brand | ✗ — Zero brand personality. Generic Tailwind-style palette |
| Card grid layout | ✓ — Responsive auto-fill grid works well |
| Feelings screen | ✗ — Flat list of emoji buttons with back arrow. No visual warmth, no grouping |
| Parent mode | ✗ — Hidden button at 0.1 opacity overlaps bottom nav, near-impossible to find |
| Nav consistency | ✗ — Bottom nav shows Board/Feelings/Build but "Build" is dead (never switches screen). Feelings hides nav entirely |
| Loading / empty states | ✗ — White screen until API returns; no skeleton, no spinner |

**Key finding:** The app has two visual regimes colliding:
- **Sentence builder view** uses grammar-role colors (yellow=subject, green=verb, blue=object) — all cards in the same role look identical even if from different categories
- **Feelings view** shows flat unstyled buttons  
- **Parent mode** shows category colors from DB but via basic `cat.color + '30'` opacity

No single design language unifies the three views.

**Fixes:**
1. Drop bottom nav. Replace with single-scroll board + persistent feelings tab row
2. Skeleton grid during loading (9 grey card outlines)
3. Parent mode: move to dedicated lock icon in top bar (visible but small), not opacity-0.1 overlay
4. Card design needs characterful illustration-style emoji display, not bare grid

---

## 3. Color — 2/4

| Check | Verdict |
|-------|---------|
| Grammar-role color coding | ✓ — Subject=yellow, verb=green, object=blue helps build sentence |
| Category-specific colors from DB | ✗ — `cat.color` stored in Supabase but never used for cards |
| Warmth / child-friendliness | ✗ — #2563EB primary button, #E2E8F0 secondary — generic, clinical |
| Contrast / readability | ✓ — Good contrast on text |
| CSS variable system | ✓ — Well-organized `:root` vars |

**Critical issue:** The CSS defines 9 category color sets (body_part, feeling, shortcut, emergency, number, direction, location) but `App.tsx` only emits 3 grammar-role classes: `subject`, `verb`, `object`. So shortcut/emergency cards all render as `category-object` (blue) alongside food and body icons. All visual distinction between "I need food", "I feel sick", "I want to go outside" is lost.

**Fixes:**
1. Replace grammar-role coloring with category-level coloring from DB (`cat.color` → card background)
2. Add category icon/pattern overlay (e.g., subtle food icon watermark on all food cards)
3. Soften primary: replace `#2563EB` with warmer accent like `#5B8DEF` or coral
4. Add subtle emoji shadow / border glow for visual depth

---

## 4. Typography — 2/4

| Check | Verdict |
|-------|---------|
| Burmese font | ✓ — Padauk renders well, correct glyphs |
| Type scale | ✗ — Only 2 sizes: card text 1.05rem, emoji 2.2rem. No hierarchy |
| Readability for target user | ⚠ 1.05rem body is small for autistic children who may process visual info slower |
| Pairing quality | ✓ — Padauk (Burmese) + Nunito (English) pair well |
| Feelings screen text | ✗ — English label at 0.8rem, secondary #666 — low contrast, tiny |

**Fixes:**
1. Bump card text to 1.2rem minimum for accessibility
2. Create proper type scale: display (2rem), heading (1.4rem), card (1.2rem), secondary (0.95rem)
3. English subtitle on feelings cards should be 0.9rem minimum with #555 color
4. Sentence builder chips at 1.15rem is correct — keep

---

## 5. Spacing — 2/4

| Check | Verdict |
|-------|---------|
| Card grid gap | ✓ — 10px gap, comfortable touch targets |
| Touch target size | ✓ — Cards min 95px, buttons min 40px |
| Bottom nav overlap | ✗ — `position: fixed; bottom: 0` covers last row of cards |
| Padding-bottom on main-content | ✗ — No clearance added for bottom nav height (~70px) |
| Feelings screen padding | ⚠ Tight on left/right |

**Fixes:**
1. Add `padding-bottom: 80px` to `.main-content` so last card row isn't hidden behind nav
2. On mobile (480px), builder bar in column mode needs vertical gap between chips and actions
3. Feelings screen: add 16px horizontal padding to the card grid

---

## 6. Experience Design — 2/4

| Check | Verdict |
|-------|---------|
| Sentence builder flow | ✓ — Subject→Verb→Object auto-advance works correctly |
| Category switching on selection | ✓ — Clicking subject auto-shows verb category |
| Speak TTS | ⚠ Works (API call → MP3 playback) but no loading state |
| Parent mode gate | ✗ — Math-challenge modal exists in CSS but React code uses simple toggle |
| Shortcut/emergency access | ✓ — Always visible in object categories |
| Error recovery | ✗ — API error = white screen; no retry, no fallback |
| Visual feedback on action | ✗ — Card tap animation brief but no haptic/sound feedback |
| Loading state | ✗ — White screen until async fetch completes |

**Critical UX gaps:**

1. **No feedback on Speak** — audio plays but no visual confirmation. Child doesn't know app is "working" during TTS load time (200-500ms).

2. **Parent mode is broken in React** — The HEAD version had a math-challenge modal gate (`showPortalModal` → `handleUnlockPortal`). The current API-fetching `App.tsx` skips this entirely — `setParentMode(true)` directly. Caregiver gate bypassed.

3. **Dead nav tab** — "Build" in bottom nav has no effect. `setScreen('sentences')` is called but nothing handles `screen === 'sentences'`.

4. **No splash/onboarding** — First-visit user sees card grid with no explanation. For autistic children, unexpected complexity can cause anxiety.

5. **Back button in sentence builder** removes last card — but doesn't adjust the category tab. If user removes a verb, the category stays on food instead of going back to actions.

**Fixes:**
1. Add speaking animation + loading spinner on Speak button
2. Restore caregiver math-gate modal from HEAD version
3. Wire Build tab to show sentence history or remove it
4. Add one-time instruction overlay: 3 arrows showing "နှိပ်ပါ → ရွေးပါ → ပြောမည်"
5. Fix back-button category reset logic
6. Add retry button when API load fails instead of silent white screen

---

## Prioritized Fixes

### Immediate (must fix — UX blocking)
| Priority | Fix | Pillar |
|----------|-----|--------|
| P0 | Fix bottom nav content overlap — add `padding-bottom: 80px` | Spacing |
| P0 | Wire Build nav tab or remove it | Experience |
| P0 | Restore caregiver math-gate modal | Experience |
| P1 | Add loading skeleton during API fetch | Visual |
| P1 | Surface API errors to user (toast/banner) | Copywriting |

### Important (quality of life)
| Priority | Fix | Pillar |
|----------|-----|--------|
| P1 | Use DB category colors instead of grammar-role colors on cards | Color |
| P1 | Speak button loading state | Experience |
| P1 | Back button resets category tab correctly | Experience |
| P2 | Bump card text to 1.2rem | Typography |
| P2 | Empty-state guidance image+text | Copywriting |
| P2 | Parent mode: proper lock icon in top bar (not opacity 0.1) | Visual |

### Nice to have
| Priority | Fix | Pillar |
|----------|-----|--------|
| P2 | Warm up color palette for children | Color |
| P2 | One-time onboarding overlay | Experience |
| P3 | Add card category watermark icons | Visual |
| P3 | Skeleton grid (9 grey outlines) during API load | Visual |

---

## Visual Issues (from screenshots)

1. **Card color mismatch** — All food, body, places icons = same blue (`category-object`). In screenshot, water, noodles, head-pain, and home icons all same color.

2. **Feelings screen disconnected** — Feels like a different app. No bottom nav, no sentence builder, just a back button.

3. **Parent mode button** — `opacity: 0.1`, `font-size: 18px`, overlaps bottom nav. Took JS evaluation to trigger it.

4. **😠 rendering** — Angry emoji appears as "gg" text in accessibility tree (😠 may not be supported on this platform). Consider alternative emoji or replace with icon.

---

## Summary

| Pillar | Score | Max |
|--------|-------|-----|
| Copywriting | 2 | 4 |
| Visual Design | 2 | 4 |
| Color | 2 | 4 |
| Typography | 2 | 4 |
| Spacing | 2 | 4 |
| Experience Design | 2 | 4 |
| **Total** | **12** | **24** |

Core app (sentence builder flow, API integration, TTS) is solid. But visual design is generic and functional — no personality, no child-friendly warmth. Three biggest issues:
1. Bottom nav covers content / dead tab
2. No visual feedback on actions
3. Card colors don't distinguish categories
