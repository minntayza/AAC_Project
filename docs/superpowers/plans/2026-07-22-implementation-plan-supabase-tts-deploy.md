# Implementation Plan: Data Storage + TTS + Deployment

**Date:** 2026-07-22
**Focused on:** Supabase DB, ElevenLabs TTS, Anthropic AI, Vercel deploy

---

## 1. Supabase PostgreSQL Schema (Migration SQL)

File: `supabase/migrations/001_initial_schema.sql`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (replaces flat auth in data.json)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'caregiver')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories for icon grouping
CREATE TABLE categories (
  id TEXT PRIMARY KEY,  -- e.g. 'food', 'feelings', 'actions'
  name_en TEXT NOT NULL,
  name_my TEXT NOT NULL,  -- Burmese
  color TEXT NOT NULL DEFAULT '#FF6B6B',
  icon_order INTEGER DEFAULT 0
);

-- Communication icons (the core AAC vocabulary)
CREATE TABLE icons (
  id TEXT PRIMARY KEY,  -- e.g. 'apple', 'toothbrush'
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  image_url TEXT,
  label_en TEXT NOT NULL,
  label_my TEXT NOT NULL,  -- Burmese
  icon_order INTEGER DEFAULT 0
);

-- User favorites (starred icons)
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  icon_id TEXT REFERENCES icons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, icon_id)
);

-- Sentences built by users (recent history)
CREATE TABLE sentences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text_my TEXT NOT NULL,  -- Burmese sentence
  text_en TEXT,           -- English translation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routines (created by caregivers)
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caregiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Steps within a routine
CREATE TABLE routine_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
  icon_id TEXT REFERENCES icons(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  step_order INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_sentences_user ON sentences(user_id);
CREATE INDEX idx_sentences_created ON sentences(created_at DESC);
CREATE INDEX idx_routine_steps_routine ON routine_steps(routine_id);
CREATE INDEX idx_icons_category ON icons(category_id);
```

**Seed data:** Same initial vocabulary (food, feelings, actions, etc.) inserted via the migration.

---

## 2. db.py — Supabase Client Module

File: `db.py`

```python
"""Supabase database client wrapper.
Replaces all data.json load/save with PostgreSQL queries.
"""
import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

_supabase: Client | None = None

def get_db() -> Client:
    global _supabase
    if _supabase is None:
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase

# --- Auth ---
def authenticate_user(username: str, password: str) -> dict | None:
    from werkzeug.security import check_password_hash
    result = get_db().table("users").select("*").eq("username", username).execute()
    if not result.data:
        return None
    user = result.data[0]
    if check_password_hash(user["password_hash"], password):
        return user
    return None

def create_user(username: str, password_hash: str, role: str = "user") -> dict:
    result = get_db().table("users").insert({
        "username": username,
        "password_hash": password_hash,
        "role": role
    }).execute()
    return result.data[0]

# --- Icons & Categories ---
def get_categories() -> list[dict]:
    result = get_db().table("categories").select("*").order("icon_order").execute()
    return result.data

def get_icons(category_id: str | None = None) -> list[dict]:
    query = get_db().table("icons").select("*").order("icon_order")
    if category_id:
        query = query.eq("category_id", category_id)
    result = query.execute()
    return result.data

# --- Favorites ---
def get_favorites(user_id: str) -> list[dict]:
    result = get_db().table("favorites").select("*, icons(*)").eq("user_id", user_id).execute()
    return [r["icons"] for r in result.data if r.get("icons")]

def toggle_favorite(user_id: str, icon_id: str) -> bool:
    """Returns True if now favorited, False if unfavorited."""
    existing = get_db().table("favorites")\
        .select("*")\
        .eq("user_id", user_id)\
        .eq("icon_id", icon_id)\
        .execute()
    if existing.data:
        get_db().table("favorites")\
            .delete()\
            .eq("user_id", user_id)\
            .eq("icon_id", icon_id)\
            .execute()
        return False
    else:
        get_db().table("favorites").insert({
            "user_id": user_id,
            "icon_id": icon_id
        }).execute()
        return True

# --- Sentences ---
def save_sentence(user_id: str, text_my: str, text_en: str = "") -> dict:
    result = get_db().table("sentences").insert({
        "user_id": user_id,
        "text_my": text_my,
        "text_en": text_en
    }).execute()
    return result.data[0]

def get_recent_sentences(user_id: str, limit: int = 10) -> list[dict]:
    result = get_db().table("sentences")\
        .select("*")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .limit(limit)\
        .execute()
    return result.data

# --- Routines ---
def create_routine(caregiver_id: str, name: str, steps: list[dict]) -> dict:
    routine = get_db().table("routines").insert({
        "caregiver_id": caregiver_id,
        "name": name
    }).execute()
    routine_id = routine.data[0]["id"]
    step_records = [
        {"routine_id": routine_id, "icon_id": s["icon_id"], "label": s["label"], "step_order": s["order"]}
        for s in steps
    ]
    if step_records:
        get_db().table("routine_steps").insert(step_records).execute()
    return routine.data[0]

def get_routines(caregiver_id: str | None = None) -> list[dict]:
    query = get_db().table("routines").select("*")
    if caregiver_id:
        query = query.eq("caregiver_id", caregiver_id)
    result = query.order("created_at", desc=True).execute()
    return result.data

def get_routine_steps(routine_id: str) -> list[dict]:
    result = get_db().table("routine_steps")\
        .select("*")\
        .eq("routine_id", routine_id)\
        .order("step_order")\
        .execute()
    return result.data

def delete_routine(routine_id: str) -> None:
    get_db().table("routines").delete().eq("id", routine_id).execute()
```

---

## 3. ai_module.py — Anthropic + ElevenLabs

File: `ai_module.py`

```python
"""AI module: Anthropic vision/translation + ElevenLabs TTS."""
import os
import base64
from anthropic import Anthropic

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")

_anthropic: Anthropic | None = None

def get_anthropic() -> Anthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = Anthropic(api_key=ANTHROPIC_API_KEY)
    return _anthropic

def process_image_for_aac(image_bytes: bytes) -> dict:
    """Send image to mimo-v2.5-pro → caption + Burmese translation."""
    import mimetypes
    mime = mimetypes.guess_type("image")[0] or "image/jpeg"
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    client = get_anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime,
                        "data": b64
                    }
                },
                {
                    "type": "text",
                    "text": (
                        "Describe this image in one simple sentence suitable for an autistic child. "
                        "Then translate that sentence to Burmese. "
                        'Return JSON with "english_text" and "burmese_text" fields. '
                        "Keep sentences 2-6 words."
                    )
                }
            ]
        }]
    )
    import json
    text = response.content[0].text
    # Extract JSON from response
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])

def suggest_sentences(time_of_day: str, recent_icons: list[str], mood: str = "") -> list[str]:
    """Get 3-4 context-aware sentence suggestions from Haiku."""
    client = get_anthropic()
    prompt = (
        f"Time: {time_of_day}. Recent icon taps: {recent_icons}. Mood: {mood or 'neutral'}.\n"
        "Suggest 3 short sentences (in Burmese) a non-verbal autistic child might want to say. "
        "Keep each 2-5 words. Return as JSON array of strings."
    )
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    import json
    text = response.content[0].text
    start = text.find("[")
    end = text.rfind("]") + 1
    return json.loads(text[start:end])

def text_to_speech(text: str) -> bytes | None:
    """Generate Burmese speech via ElevenLabs API. Returns MP3 bytes or None."""
    import requests
    # Use a standard Burmese-sounding voice ID
    url = f"https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM"  # Rachel voice
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
    }
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.5},
    }
    resp = requests.post(url, json=data, headers=headers, timeout=10)
    if resp.status_code == 200:
        return resp.content
    return None
```

---

## 4. Flask Routes (app.py additions)

### a) TTS Endpoint
```python
@app.route("/api/tts")
def tts():
    text = request.args.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    audio = text_to_speech(text)
    if audio:
        return Response(audio, mimetype="audio/mpeg")
    # Fallback: return text for browser SpeechSynthesis
    return jsonify({"text": text, "fallback": "browser_tts"})
```

### b) AI Image Processing
```python
@app.route("/api/ai/process_image", methods=["POST"])
def process_image():
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    image = request.files["image"]
    result = process_image_for_aac(image.read())
    return jsonify(result)
```

### c) AI Sentence Suggestions
```python
@app.route("/api/ai/suggest_sentences", methods=["POST"])
def suggest():
    data = request.get_json()
    suggestions = suggest_sentences(
        time_of_day=data.get("time_of_day", "day"),
        recent_icons=data.get("recent_icons", []),
        mood=data.get("mood", "")
    )
    return jsonify({"suggestions": suggestions})
```

### d) Favorites
```python
@app.route("/api/favorites/toggle", methods=["POST"])
def toggle_fav():
    data = request.get_json()
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401
    is_fav = toggle_favorite(user_id, data["icon_id"])
    return jsonify({"favorited": is_fav})

@app.route("/api/favorites")
def get_favs():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify([])
    return jsonify(get_favorites(user_id))
```

### e) Recent Sentences
```python
@app.route("/api/sentences/recent")
def recent_sentences():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify([])
    limit = request.args.get("limit", 10, type=int)
    return jsonify(get_recent_sentences(user_id, limit))

@app.route("/api/sentences/save", methods=["POST"])
def save_sent():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401
    data = request.get_json()
    save_sentence(user_id, data.get("text_my", ""), data.get("text_en", ""))
    return jsonify({"ok": True})
```

### f) Routines
```python
@app.route("/api/routines", methods=["GET", "POST"])
def routines_api():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401
    if request.method == "POST":
        data = request.get_json()
        routine = create_routine(user_id, data["name"], data.get("steps", []))
        return jsonify(routine), 201
    routines = get_routines(user_id)
    return jsonify(routines)

@app.route("/api/routines/<routine_id>/steps")
def routine_steps_api(routine_id):
    return jsonify(get_routine_steps(routine_id))
```

---

## 5. requirements.txt

```
flask==3.0.0
anthropic==0.49.0
elevenlabs==1.22.0
supabase==2.6.0
python-dotenv==1.0.1
werkzeug==3.0.6
gunicorn==23.0.0
requests==2.32.0
```

---

## 6. Vercel Configuration

### vercel.json
```json
{
  "buildCommand": null,
  "outputDirectory": null,
  "devCommand": null,
  "framework": null,
  "functions": {
    "api/*.py": {
      "maxDuration": 30,
      "memory": 512
    }
  },
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/app" }
  ]
}
```

### wsgi.py
```python
from app import app as application

if __name__ == "__main__":
    application.run()
```

### Move Flask app into api/app.py or keep root + configure vercel.json's `python` runtime:
For Vercel Python, project root needs `api/index.py`:
```python
from wsgi import application
```

---

## 7. Environment Variables (Vercel Project Settings)

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `ELEVENLABS_API_KEY` | `your-key` |
| `SUPABASE_URL` | `https://xyz.supabase.co` |
| `SUPABASE_KEY` | `your-service-role-key` |
| `SECRET_KEY` | `random-secret-for-flask` |

---

## 8. Branch Strategy (8 Team Members)

```
main
├── feature/supabase-db         (P4 backend — db.py + migration SQL)
├── feature/anthropic-ai        (P7 ML/API — ai_module.py image + suggestions)
├── feature/elevenlabs-tts      (P5 backend — /api/tts endpoint)
├── feature/feelings-board      (P1 frontend — feelings board HTML/CSS/JS)
├── feature/favorites-bar       (P2 frontend — star toggle + bar)
├── feature/routines            (P3 frontend — routine builder + play mode)
├── feature/vercel-deploy       (P8 devops — vercel.json + wsgi.py + env)
└── feature/ui-redesign         (P6 design — CSS overhaul + Burmese fonts)
```

**Merge order:**
1. `supabase-db` (database must exist first)
2. `anomalic-ai` + `elevenlabs-tts` (depend on nothing, parallel)
3. `vercel-deploy` (can start early with stub routes)
4. Frontend features & UI redesign (parallel with above)

---

## 9. Team Assignment Summary

| Person | Branch | Deliverable |
|---|---|---|
| P1 | feature/feelings-board | Feelings board HTML + CSS + JS, 8 emotion cards |
| P2 | feature/favorites-bar | Star toggle, favorites bar, localStorage sync |
| P3 | feature/routines | Caregiver routine editor, child play mode, confetti |
| P4 | feature/supabase-db | db.py module, migration SQL, seed data |
| P5 | feature/elevenlabs-tts | TTS endpoint, browser SpeechSynthesis fallback |
| P6 | feature/ui-redesign | Complete CSS overhaul, design system, Burmese fonts |
| P7 | feature/anthropic-ai | ai_module.py (image→caption→Burmese + suggestions) |
| P8 | feature/vercel-deploy | vercel.json, wsgi.py, env config, deployment test |
