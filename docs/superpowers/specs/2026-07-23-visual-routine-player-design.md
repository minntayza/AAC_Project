# Visual Routine Player — Design Specification

**Date:** 2026-07-23
**Project:** AAC Web App (Burmese-speaking autistic children)
**Status:** Approved design, ready for implementation planning

---

## 1. Overview

Add a visual routine feature that lets caregivers build step-by-step routines from existing AAC vocabulary, and children play through them one step at a time with celebration on completion.

Visual schedules are a cornerstone autism support intervention — predictable routines reduce anxiety and help children transition between activities.

---

## 2. Architecture

### Data Flow

```
Parent Portal (Routine Builder)
  → POST /api/routines { name, steps: [{ icon_id, label, order }] }
  → Stored in Supabase routines + routine_steps tables

Child App (Play Mode)
  → GET /api/routines → list of routines for this user
  → GET /api/routines/<id>/steps → ordered steps
  → Play through steps one at a time
  → Confetti on completion
```

### Backend APIs (already exist)

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/routines` | List/create routines (auth required) |
| GET | `/api/routines/<id>/steps` | Get routine steps |
| DELETE | `/api/routines/<id>` | Delete routine |

### Files to modify (frontend only)

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Add "My Routines" header button, routine list modal, play mode view |
| `frontend/src/api.ts` | Add `getRoutines()`, `getRoutineSteps()` API functions |
| `frontend/src/data.ts` | Add `Routine` and `RoutineStep` TypeScript interfaces |
| `frontend/src/index.css` | Add CSS for routine list modal, play mode, confetti |
| `frontend/src/components/ParentPortal.tsx` | Add "Routines" tab with routine builder |

---

## 3. Parent Portal — Routine Builder Tab

### Location
New sidebar tab in the existing Parent Portal, between "Story Studio" and "Settings":
- Label: "📋 လုပ်ရိုးလုပ်စဉ် (Routines)"

### States

**Empty state** (no routines yet):
- Friendly message: "လုပ်ရိုးလုပ်စဉ်များ မရှိသေးပါ (No routines yet)"
- Subtitle: "ကလေးငယ်အတွက် နေ့စဉ်လုပ်ရိုးလုပ်စဉ်များ စတင်ဖန်တီးပါ"
- Large "➕ လုပ်ရိုးလုပ်စဉ်အသစ် (Create Routine)" button

**List state** (has routines):
- Each routine as a card showing: name, step count, created date
- Delete button (🗑️) on each card with browser `window.confirm()` dialog in Burmese: "ဤလုပ်ရိုးလုပ်စဉ်ကို ဖျက်ရန် သေချာပါသလား? (Delete this routine?)"
- "➕ Create New Routine" button at top

**Create/Edit flow:**
1. Name input field (Burmese + English encouraged)
2. Steps list — each step has:
   - Icon picker: opens a grid of all available AAC icons (hardcoded + API-fetched + custom cards), grouped by category (subjects, verbs, objects, feelings, locations, body parts, shortcuts, numbers, directions). Each icon shows its emoji/image + Burmese label.
   - Label auto-fills from selected icon's Burmese text, but caregiver can edit it
   - ↑↓ reorder buttons per step
   - ✕ delete step button
   - "➕ Add Step" button at bottom
3. "Save Routine" button → POST to `/api/routines`
4. **Validation:** At least 1 step required, name required

**Error state:**
- API failure → show error banner with retry

**Loading state:**
- Skeleton placeholders while fetching routines

---

## 4. Child-Side Routine Access & Play Mode

### Access Point
A button in the app header bar (same row as step indicator pills):
- "📋 လုပ်ရိုးလုပ်စဉ် (My Routines)"
- Hidden if no routines exist for this user

### Routine List (Modal Overlay)
Same pattern as the existing Mom's Stories modal:
- Title: "📋 လုပ်ရိုးလုပ်စဉ် (My Routines)"
- Tappable cards listing each routine (name only, large touch target)
- **Empty state:** "မေမေ့ကို လုပ်ရိုးလုပ်စဉ် ပြင်ဆင်ခိုင်းပါ (Ask your caregiver to set up a routine)" with friendly illustration
- **Loading state:** Skeleton cards
- **Error state:** "ဝမ်းနည်းပါတယ်... (Sorry, something went wrong)" with retry button

### Play Mode (Step-by-Step Player)
After tapping a routine:

1. Shows first step as a full, centered card:
   - Large 100px+ emoji/icon of the vocabulary card
   - Step label in large Burmese text (28px, bold)
   - English meaning below in smaller text (14px, muted)
   - Big "✅ ပြီးပြီ (Done)" button (min 64px height, rounded, green)
   - Step counter: "၁ / ၅" (Burmese digits)

2. Tapping "Done":
   - Subtle slide-left transition to next step
   - Audio play of step label via existing TTS (optional — could be distracting)
   - Step counter updates

3. **Last step completion:**
   - Confetti animation: pure CSS `@keyframes` using multiple small colored `<div>` elements (gold/yellow/blue/pink circles, 8-12 particles) that fall from top of screen with randomized horizontal drift, lasting ~2 seconds
   - Celebration screen: "🎉 တော်လှပါတယ်! (You did it!)"
   - Two buttons:
     - "🔄 ပြန်လုပ်မယ် (Do Again)" → restart from step 1
     - "📋 လုပ်ရိုးလုပ်စဉ်များ (All Routines)" → back to routine list

4. **Exit:** X button (close icon) in top-right of play mode → back to routine list

**Edge cases:**
- Single-step routine → tapping "Done" immediately shows celebration
- Routine with 0 steps (data integrity error) → show error state, don't crash
- Network failure fetching steps → show retry banner

---

## 5. Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| No routines exist (child view) | Header button hidden |
| No routines exist (caregiver view) | Empty state with "Create first routine" CTA |
| Routine has 0 steps | Don't allow saving. In play mode, show error. |
| API failure (list/delete/create) | Error banner with retry button |
| Rapid tapping "Done" | Debounce: disable button for 500ms after tap |
| Long routine (20+ steps) | All steps visible — no artificial cap |
| Caregiver deletes routine while child is playing | Next step fetch fails → show error, return to list |

---

## 6. Out of Scope

- Time-of-day scheduling (morning vs bedtime routines)
- Timers/countdowns per step
- Drag-and-drop reordering (use ↑↓ buttons for now)
- Routine categories/tags
- Auto-advance (requires timer feature above)

---

## 7. Success Criteria

1. ✅ Caregiver can create a routine with 3+ steps in under 60 seconds
2. ✅ Child can open routine list, tap a routine, and step through it
3. ✅ Confetti animation plays on completion
4. ✅ No errors or crashes in happy path
5. ✅ Empty/error states are informative and non-frustrating
