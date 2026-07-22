# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AAC (Augmentative and Alternative Communication) web app for Burmese-speaking autistic children. Users build sentences by tapping emoji+text cards (Subject → Verb → Object), which are spoken aloud. Features include AI-powered image captioning + Burmese translation (Anthropic Claude), Burmese TTS (ElevenLabs), favorites, AI sentence suggestions, visual routines, and feelings board.

**Stack:** Flask (Python 3.x) + Supabase (PostgreSQL) + Anthropic API + ElevenLabs API → deployed on Vercel serverless. Frontend: React 19 + TypeScript + Vite.

**Status:** Hackathon MVP — backend API is fully built and deployed. The React frontend (`frontend/`) fetches categories and icons from the Flask/Supabase API via Vite proxy. No tests yet.

**⚠️ Critical: Unresolved merge conflicts:** `frontend/src/App.tsx` and `frontend/src/data.ts` have merge conflict markers (`<<<<<<< HEAD` / `>>>>>>> fd728ad`) from a failed merge. The frontend will not compile until these are resolved. The `HEAD` side is the old static-card version; the `fd728ad` side is the new API-fetching version.

**⚠️ macOS Port Conflict:** macOS uses port 5000 for AirPlay Receiver. Flask runs on **port 5001** to avoid this. The Vite dev proxy (`frontend/vite.config.ts`) forwards `/api` to `localhost:5001`.

## Commands

### Backend (root directory)
```
# Install dependencies
pip install -r requirements.txt

# Run locally
python app.py                    # Flask dev server on :5001

# Run via gunicorn (production-like)
gunicorn wsgi:application
```

### Frontend (`frontend/` directory)
```
# Install dependencies
cd frontend && npm install

# Dev server (HMR on :5173)
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Preview production build
cd frontend && npm run preview

# Lint
cd frontend && npm run lint
```

### Database
```
# Apply Supabase migration
# Run the SQL in supabase/migrations/001_initial_schema.sql via Supabase SQL editor or CLI
```

### Environment Variables
Copy `.env.example` to `.env` and fill in:
- `ANTHROPIC_API_KEY` — Claude API key (vision/translation/suggestions)
- `ANTHROPIC_BASE_URL` — Claude API base URL (default `https://api.anthropic.com`)
- `ELEVENLABS_API_KEY` — ElevenLabs TTS API key
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_KEY` — Supabase anon/public key
- `SECRET_KEY` — Flask session secret

## Architecture

### Repository Structure
```
/
├── app.py              # Flask app — all REST routes (auth, TTS, icons, favorites, sentences, routines, AI endpoints)
├── ai_module.py        # Anthropic Claude (image→caption→Burmese translation, sentence suggestions) + ElevenLabs TTS
├── db.py               # Supabase PostgreSQL client wrapper — all queries organized by domain (auth, icons, favorites, sentences, routines)
├── wsgi.py             # Vercel WSGI entry point
├── vercel.json         # Vercel config — rewrites all routes to Flask via /api/app
├── requirements.txt    # Python deps
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # Full DB schema + seed data
├── frontend/           # React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx     # Main component — sentence builder, card grid, parent/caregiver mode
│   │   ├── api.ts      # API client — fetchJson wrapper, Category/Icon types, getCategories/getIcons/textToSpeech
│   │   ├── data.ts     # AAC card definitions — iconToCard mapper, CATEGORY_ROLE map, shortcut/emergency cards
│   │   ├── main.tsx    # React entry point
│   │   └── index.css   # All frontend styles
│   ├── index.html      # Vite entry HTML
│   ├── vite.config.ts  # Vite config (React plugin, /api proxy → :5001)
│   └── package.json    # npm deps (react, lucide-react, vite, typescript, oxlint)
└── docs/superpowers/   # Feature specs and implementation plans
```

### Data Flow
```
Client ←→ Flask API ←→ Supabase (PostgreSQL)
Client ←→ Flask API ←→ Anthropic Claude API (image captioning + translation, sentence suggestions)
Client ←→ Flask API ←→ ElevenLabs API (Burmese TTS → MP3)

Frontend (Vite dev :5173) ←→ Backend (Flask :5001) via Vite proxy (/api → localhost:5001)
```

### API Routes
| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/health | Health check |
| POST | /api/auth/login | Login (username + password, session-based) |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/register | Register new user |
| GET | /api/categories | List icon categories (ordered by icon_order) |
| GET | /api/icons?category_id= | List icons (optionally filtered, ordered by icon_order) |
| GET | /api/tts?text= | ElevenLabs TTS → MP3 audio (500 char max) |
| POST | /api/ai/process_image | Upload image → Claude captions + translates to Burmese |
| POST | /api/ai/suggest_sentences | Context-aware sentence suggestions from Claude |
| POST | /api/favorites/toggle | Toggle favorite icon |
| GET | /api/favorites | List user favorites |
| GET | /api/sentences/recent | Recent sentences (paginated, max 100) |
| POST | /api/sentences/save | Save a sentence |
| GET/POST | /api/routines | List/create routines (auth required) |
| GET | /api/routines/<id>/steps | Get routine steps |
| DELETE | /api/routines/<id> | Delete routine |

### Key Design Notes

- **Session-based auth** — Flask sessions with server-side secret key. Login required for favorites, sentences, and routines.
- **AI module** uses `mimo-v2.5-pro` for image processing (vision + translation in one call) and `claude-haiku-4-5` for sentence suggestions (fast/cheap).
- **Card grammar via API** — The frontend fetches categories and icons from the API on mount. `data.ts` maps DB category IDs to grammar roles via `CATEGORY_ROLE` (people→subject, actions→verb, food/feelings/places/body→object). The `iconToCard()` function converts API `Icon` objects to `AACCard` objects with `nextCategories` for sentence builder flow (subject→verb→object).
- **Shortcut/emergency cards are hardcoded** in `data.ts` (not stored in DB) — universal phrases like "I want water" and "Help me".
- **Two UI implementations exist**: the React app (`frontend/`) is the primary UI. The `demo-ui.html` standalone page is a separate vanilla HTML/CSS/JS prototype that mocks all features directly in the browser without any build step.
- **Supabase key note** — Use the legacy JWT anon key (not `sb_publishable_` key) unless RLS policies are set up. The publishable key requires RLS for any read access.
- **ElevenLabs TTS fallback** — The TTS endpoint returns MP3 audio from ElevenLabs when available; falls back to browser SpeechSynthesis with `my-MM` locale on failure.
- **Root `package.json` has unused npm deps** (`@supabase/ssr`, `@supabase/supabase-js`) — these are remnants. All Supabase access happens server-side via the Python `supabase` package.
- **Database seed data lives in the migration** — 6 categories with ~36 icons across food, feelings, actions, places, people, and body/health.
