# AAC Web Project — Feature Design & Specification

**Date:** 2026-07-22
**Team Size:** 8 members
**Timeline:** 12 hours (hackathon)
**Base Repo:** [AAC-Web_Project](https://github.com/manavrenjith/AAC-Web_Project)
**Target Audience:** Children with autism (Burmese + English)
**Deployment Target:** Vercel (serverless)

---

## 1. Architecture

### Current (baseline)
Monolithic Flask app, debug-mode server, JSON file storage, heavy PyTorch models (BLIP + mBART, ~2.4GB combined) that cannot deploy on Vercel.

### Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Vercel (Serverless Functions via WSGI Adapter)         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Flask Application                    │   │
│  │                                                    │   │
│  │  ┌──────────────┐  ┌─────────────────────────┐   │   │
│  │  │ Auth Module   │  │ AAC Routes              │   │   │
│  │  │ (login/reg/   │  │ comm board, sentence   │   │   │
│  │  │  logout)      │  │ builder, TTS, STT       │   │   │
│  │  └──────────────┘  └─────────────────────────┘   │   │
│  │                                                    │   │
│  │  ┌──────────────────┐  ┌──────────────────────┐   │   │
│  │  │ AI Module        │  │ Data Layer           │   │   │
│  │  │ (Anthropic API)  │  │ Vercel Blob / JSON  │   │   │
│  │  │ image→capt→trans │  │ + localStorage sync │   │   │
│  │  │ suggestions       │  └──────────────────────┘   │   │
│  │  └──────────────────┘                               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Replace PyTorch/BLIP/mBART with Anthropic API** — a single `mimo-v2.5-pro` call handles image captioning + Burmese translation. Eliminates ~2.4GB of model dependencies.

2. **Vercel WSGI Adapter** — Flask runs inside a serverless function via `vercel/python` runtime with `vercel.json` configuration.

3. **Data Storage** — JSON file persists via Vercel Blob (or a writable `/tmp` for the hackathon MVP). Favorites use localStorage for instant UI feedback with async backend sync.

4. **TTS** — Replace gTTS + Google Translate TTS proxy with **ElevenLabs API**. ElevenLabs has a Burmese voice option ("ထားဝယ်" or standard Burmese) and produces natural, child-friendly speech. Requires `ELEVENLABS_API_KEY` environment variable.

5. **Config** — Move to environment variables (`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `SECRET_KEY`, etc.) via `.env` and `python-dotenv`.

### Parallel Work Breakdown

| Person | Role | Responsibility |
|--------|------|----------------|
| P1-P2 | Frontend (HTML/CSS/JS) | Feelings board, favorites bar, UI redesign |
| P3 | Frontend | Routine builder UI + play mode |
| P4-P5 | Backend (Flask) | Anthropic API integration, sentence suggestions API, recent sentences, password hashing, config cleanup |
| P6 | Design | Color palette, accessibility audit, icon/system illustrations, child-friendly mockups |
| P7 | ML/API | Anthropic SDK setup, prompt engineering, image-to-text endpoint, cost/speed optimization |
| P8 | DevOps | Vercel config, environment variables, deployment scripts, integration testing |

---

## 2. Features

### 2.1 Anthropic API Integration (Flagship)

**Why:** The current codebase uses PyTorch + BLIP (image captioning) + mBART (translation) — over 2GB of models that cannot run on Vercel serverless. Anthropic's Claude handles both tasks in a single API call.

**Implementation:**

- Install `anthropic` Python SDK (`pip install anthropic`)
- New module `ai_module.py` with:
  - `process_image_for_aac(image_bytes: bytes) -> dict` — sends image to Claude with prompt: *"Describe this image in one simple sentence suitable for an autistic child. Then translate that sentence to Burmese. Return JSON with 'english_text' and 'burmese_text' fields."*
  - `suggest_sentences(context: dict) -> list[str]` — sends time of day, recent icons, and optional mood; returns 3-4 suggested sentences
  - Text-to-speech via ElevenLabs API (`POST /api/tts`) — sends Burmese text, returns MP3 audio
- Endpoint: `POST /api/ai/process_image` (replaces current `/image_to_speech/process`)
- Endpoint: `POST /api/ai/suggest_sentences`
- Endpoint: `GET /api/tts?text=...&lang=my` — ElevenLabs TTS (replaces current `/tts` Google Translate proxy)
- **Fallback:** If API call fails, show user-friendly error with retry button. For image processing, allow manual text input as fallback.

**Model choice:** Use `mimo-v2.5-pro` for image processing (vision + translation in one call). Use `claude-haiku-4-5` for sentence suggestions (fast, cheap, <$0.10/1000 suggestions).

**Cost estimate at hackathon scale:** Negligible (<$2 for the entire event).

### 2.2 Feelings & Emotions Board

**Why:** Autistic children often struggle with interoception — recognizing and expressing their internal emotional state. A dedicated visual board bridges this gap, reducing frustration and challenging behaviors.

**Implementation:**

- New route: `/feelings_board` (user role required)
- 8 emotion cards, each with:
  - Large emoji or custom SVG illustration (120px+)
  - Color-coded background: Happy 🟢, Sad 🔵, Angry 🔴, Scared 🟣, Tired 🟤, Hungry 🟡, Sick 🟢 (pale), Loved 🩷
  - Word in Burmese (primary) + English (smaller, below)
  - Tap → adds to sentence builder + plays TTS audio
- Emotion cards are also available as a filterable category on the communication board
- **Edge case:** For non-verbal children who can't read, the emoji + color alone should be enough to make a selection

### 2.3 Favorites / Quick-Access Bar

**Why:** Children develop strong preferences for certain icons/words. A favorites bar reduces navigation friction and empowers quick communication.

**Implementation:**

- Star (⭐) toggle on each communication card
- Favorited icons appear in a sticky toolbar at the top of the communication board
- **Client-side:** localStorage for instant add/remove feedback
- **Server-side:** Flask endpoint syncs favorites on page load/save (stored per-user in JSON)
- Maximum 8 visible favorites in bar; "Show all" expander if more
- **Edge case:** Empty favorites → bar is hidden. First-time user gets a small hint: "Tap the ⭐ to save your favorite words here."

### 2.4 Visual Routine Builder

**Why:** Visual schedules are a cornerstone of autism support. Predictable routines reduce anxiety and help children transition between activities. Caregivers currently have no way to create these within the app.

**Implementation:**

**Caregiver side:**
- Route: `/caregiver/routines` — list/create/edit routines
- Drag-and-drop reordering (sortable JS library or simple up/down buttons)
- Add steps by selecting icons from the existing icon library (typed in search or category filter)
- Each step: icon + short label (e.g., 🪥 "Brush Teeth")
- Stored in `data.json` as a new `routines` array

**Child side:**
- Route: `/my_routines` — lists available routines set by caregiver
- Play mode: shows one step at a time in large card format
- Tap "Done ✅" → confetti animation + transition to next step
- On completion: celebration screen with animation + optional audio ("Good job!")
- **Edge case:** No routines configured → show "Ask your caregiver to set up a routine for you" with a friendly illustration

**Data structure addition to `data.json`:**
```json
{
  "routines": [
    {
      "id": "uuid",
      "name": "Morning Routine",
      "steps": [
        {"icon_id": "abc", "label": "Wash Face", "order": 1},
        {"icon_id": "def", "label": "Brush Teeth", "order": 2}
      ]
    }
  ]
}
```

### 2.5 AI Sentence Suggestions

**Why:** Children often get stuck on what to say. AI-generated context-aware suggestions reduce cognitive load and model communication.

**Implementation:**

- Section on sentence builder page labeled "Try Saying..."
- 3-4 sentence chips, each tappable to add to sentence bar
- Context sent to Claude:
  - Time of day (morning/afternoon/evening/night)
  - Recent icon clicks (last 5 from session)
  - Selected mood (if from feelings board)
- Prompt: *"Based on the time ({time_of_day}), recent selections ({icons}), and mood ({mood}), suggest 3 short sentences (in Burmese) a non-verbal autistic child might want to say. Keep them simple, 2-5 words each. Return as JSON array."*
- **Performance:** Pre-fetch on page load with debounce (only re-fetch when context meaningfully changes)
- **Edge case:** Loading state shows 3 skeleton chips. API failure → section is hidden silently (no error shown to child).

### 2.6 Recent Sentences

**Why:** Children may want to repeat a sentence they just built. Having a history reduces repetitive effort and encourages practice.

**Implementation:**

- Strip at bottom of sentence builder showing last 10 built sentences
- Each entry: sentence text + play button (🔊)
- Stored in session or per-user in JSON
- Newest at left, scrollable horizontally
- Syncs from localStorage on page load, posts to backend periodically
- **Edge case:** No history → strip hidden. First sentence built → strip appears.

### 2.7 Password Hashing

**Why:** Current code stores passwords in plaintext. This is unacceptable for any deployed application.

**Implementation:**
```python
from werkzeug.security import generate_password_hash, check_password_hash
# Register: store hash instead of plain password
# Login: use check_password_hash()
```
- Migrate existing users on first login (detect plaintext, re-hash and save)
- **Edge case:** If migration detects an already-hashed password, skip re-hashing

### 2.8 Child-Friendly UI Redesign

**Why:** The current UI is functional but not optimized for autistic children who need large targets, clear contrast, and minimal visual noise.

**Design system:**
- **Color palette:** Softer background (#FFF8F0 warm cream), high-contrast foreground elements. Each category gets a distinct saturated color for easy scanning.
- **Typography:** 24px+ body text, bold weights, sans-serif (Nunito or similar rounded font). Burmese text rendered with Noto Sans Burmese.
- **Touch targets:** Minimum 80×80px for all interactive elements. 120px+ for communication cards.
- **Cards:** Rounded corners (16px), soft drop shadows, subtle hover/tap scale animation.
- **Navigation:** 4 large icon-based nav buttons at bottom (Home, Board, Feelings, Sentences) instead of text sidebar. Text labels present but secondary.
- **Reduced noise:** No superfluous borders or decorative elements. Clean whitespace between sections.
- **Burmese-first:** All labels default to Burmese. English shown as smaller secondary text.
- **High contrast mode:** Optional toggle for children with visual sensitivities.

### 2.9 Vercel Deployment

**Implementation:**
- `vercel.json` with Python runtime configuration
- `wsgi.py` entry point wrapping the Flask app
- Move `app.secret_key` to env var
- `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` as environment variables
- Data persistence: for hackathon MVP, `/tmp` JSON (ephemeral) is acceptable. Long-term use Vercel Blob.
- Optimize cold starts: keep function lean by removing all PyTorch dependencies
- Post-deployment verification checklist:
  - [ ] All routes respond correctly
  - [ ] Anthropic API calls work
  - [ ] ElevenLabs TTS audio plays for Burmese text
  - [ ] Auth flow works end-to-end
  - [ ] Image upload processes correctly

---

## 3. Data Flow Diagrams

### Image-to-Speech (New)
```
User uploads image
  → POST /api/ai/process_image
    → Anthropic API (mimo-v2.5-pro)
      → "A red car" + "ကားနီ"
    → ElevenLabs TTS generates Burmese audio
    → Returns JSON { english_text, burmese_text, audio_url }
  → Client renders text + plays audio
```

### AI Sentence Suggestions
```
Page load (sentence builder)
  → JS gathers context (hour, recent icons from session, mood from URL param)
  → POST /api/ai/suggest_sentences
    → Anthropic API (claude-haiku-4-5)
    → Returns ["ငါဗိုက်ဆာတယ်", "ငါရေလိုချင်တယ်", "ငါမောနေတယ်"]
  → Rendered as tappable chips
```

### Routine Play Mode
```
Child taps "Start Routine"
  → GET /routine/<id>/play
    → Loads routine steps from data.json
    → Shows step 1: large icon + label + "Done ✅" button
  → Tap "Done ✅"
    → Confetti animation (CSS)
    → Fade to next step
  → All steps complete
    → Celebration screen + "You did it! 🎉"
```

---

## 4. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| Anthropic API timeout/error | Show "Couldn't process right now" + retry button. Sentence suggestions hide silently. |
| ElevenLabs API timeout/error | Fall back to browser's built-in SpeechSynthesis (Web Speech API) for basic TTS |
| Image upload too large | Reject with friendly message. Max 5MB. |
| Unsupported image format | Show "Please upload a PNG or JPG" message. |
| Browser no SpeechRecognition | Show "Type instead" text fallback |
| Vercel cold start (1-2s) | Accept latency; no splash screen needed |
| Child mis-taps | Add confirmation overlay for destructive actions |
| Empty state (no favorites) | Hide section; show one-time hint |
| Empty state (no routines) | Show placeholder illustration + instruction text |
| Network offline | Cache recently used icons in localStorage; show "You're offline — some features may not work" banner |
| Burmese font not loading | `font-display: swap` with system fallback |
| Multiple rapid API calls | Debounce sentence suggestions (300ms); rate-limit image processing to 1 concurrent |

---

## 5. Files That Need Changes

| File | Change |
|---|---|
| `app.py` | Add new routes, remove PyTorch imports, add Anthropic client, password hashing |
| `ai_module.py` | **New file** — Anthropic API wrapper |
| `config.py` | **New file** — environment variable management |
| `vercel.json` | **New file** — Vercel deployment config |
| `wsgi.py` | **New file** — Vercel WSGI entry point |
| `requirements.txt` | Replace torch/transformers/gtts/sentencepiece with anthropic, elevenlabs, python-dotenv |
| `static/js/script.js` | Add favorites sync, sentence suggestions fetch, routine player, feelings board interactions |
| `static/css/style.css` | Complete redesign for child-friendly UX (big buttons, colors, animations) |
| `templates/base.html` | Update nav to icon-based bottom bar |
| `templates/communication_board.html` | Add favorites bar, feelings filter |
| `templates/sentence_builder.html` | Add AI suggestions section, recent sentences strip |
| `templates/feelings_board.html` | **New file** — Feelings & Emotions board |
| `templates/routine_builder.html` | **New file** — Caregiver routine creation |
| `templates/routine_play.html` | **New file** — Child routine play mode |
| `docs/screenshots/` | Add new feature screenshots |

---

## 6. Out of Scope (For This 12h Sprint)

- Unit tests (add after hackathon)
- PostgreSQL / proper database migration (JSON stays for MVP)
- User profile pictures
- Real-time multiplayer / shared boards
- Mobile native app (PWA is sufficient)
- Analytics dashboard with charts
- Print/export functionality
- Email/password reset flow

---

## 7. Success Criteria

The hackathon MVP is successful when:
1. ✅ A child can open the app, find emotion icons, and express feelings in 2 taps
2. ✅ A caregiver can create a visual morning routine in under 60 seconds
3. ✅ AI suggests relevant sentences based on time of day
4. ✅ Image upload → Burmese text + audio works without PyTorch
5. ✅ App deploys and runs on Vercel free tier
6. ✅ All 5 user-facing features are demo-able end-to-end

---

*Spec reviewed and passes self-check: no placeholders, no contradictions, no ambiguity, scope is focused for a single implementation plan.*
