"""Flask backend for Burmese AAC communication app.
Provides REST API endpoints for TTS, AI processing, favorites, sentences, and routines.
"""
import os
from flask import Flask, request, jsonify, Response, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv()

from db import (
    authenticate_user, create_user, change_password,
    get_categories, get_icons,
    get_favorites, toggle_favorite,
    save_sentence, get_recent_sentences, get_sentence_analytics,
    create_routine, get_routines, get_routine_steps, delete_routine,
    save_custom_card, get_custom_cards, delete_custom_card, update_custom_card,
)
from ai_module import process_image_for_aac, suggest_sentences, summarize_conversation, text_to_speech

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")

# ── CORS: allow React dev server (Vite :5173) and production origin ──
CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])

# ── Required env var validation ──
_REQUIRED_ENV_VARS = [
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "SECRET_KEY",
]

_missing = [v for v in _REQUIRED_ENV_VARS if not os.environ.get(v)]
if _missing:
    import logging
    logging.warning("Missing required env vars: %s — using local fallback database", ", ".join(_missing))


# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────
@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


# ──────────────────────────────────────────────
# Auth
# ──────────────────────────────────────────────
@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        user = authenticate_user(data.get("username", ""), data.get("password", ""))
        if user:
            session["user_id"] = user["id"]
            session["role"] = user["role"]
            return jsonify({"id": user["id"], "username": user["username"], "role": user["role"]})
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": "Login failed", "detail": str(e)}), 500


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/auth/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        username = data.get("username", "").strip()
        password = data.get("password", "")
        role = data.get("role", "user")
        child_nickname = data.get("child_nickname", "").strip()
        child_gender = data.get("child_gender", "").strip()
        child_birth_year = data.get("child_birth_year", "").strip()

        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        user = create_user(
            username, 
            generate_password_hash(password), 
            role,
            child_nickname=child_nickname,
            child_gender=child_gender,
            child_birth_year=child_birth_year
        )
        session["user_id"] = user["id"]
        session["role"] = user["role"]
        return jsonify({
            "id": user["id"], 
            "username": user["username"], 
            "role": user["role"],
            "child_nickname": user.get("child_nickname", ""),
            "child_gender": user.get("child_gender", ""),
            "child_birth_year": user.get("child_birth_year", "")
        }), 201
    except Exception as e:
        err_msg = str(e)
        if "duplicate key" in err_msg.lower() or "unique" in err_msg.lower() or "already taken" in err_msg.lower():
            return jsonify({"error": "Username already taken"}), 409
        return jsonify({"error": "Registration failed", "detail": err_msg}), 500


@app.route("/api/auth/change_password", methods=["POST"])
def change_pwd():
    try:
        data = request.get_json() or {}
        user_id = session.get("user_id") or data.get("user_id")
        new_password = data.get("new_password", "")
        if not user_id:
            return jsonify({"error": "User not authenticated"}), 401
        if not new_password or len(new_password) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        
        success = change_password(user_id, generate_password_hash(new_password))
        if success:
            return jsonify({"ok": True, "message": "Password changed successfully"})
        return jsonify({"error": "Failed to update password"}), 400
    except Exception as e:
        return jsonify({"error": "Change password failed", "detail": str(e)}), 500


@app.route("/api/cards/custom", methods=["GET", "POST"])
def custom_cards():
    try:
        user_id = session.get("user_id") or request.args.get("user_id")
        if request.method == "POST":
            data = request.get_json() or {}
            card_user_id = user_id or data.get("user_id")
            card = save_custom_card(data, user_id=card_user_id)
            return jsonify(card), 201
        return jsonify(get_custom_cards(user_id=user_id))
    except Exception as e:
        return jsonify({"error": "Failed to process custom cards", "detail": str(e)}), 500


@app.route("/api/cards/custom/<card_id>", methods=["DELETE", "PUT"])
def custom_card_detail(card_id):
    try:
        user_id = session.get("user_id") or request.args.get("user_id")
        if request.method == "DELETE":
            delete_custom_card(card_id, user_id=user_id)
            return jsonify({"ok": True, "id": card_id})
        elif request.method == "PUT":
            data = request.get_json() or {}
            updated = update_custom_card(card_id, data, user_id=user_id)
            if updated:
                return jsonify(updated)
            return jsonify({"error": "Card not found"}), 404
    except Exception as e:
        return jsonify({"error": "Failed to manage custom card", "detail": str(e)}), 500


# ──────────────────────────────────────────────
# Icons & Categories
# ──────────────────────────────────────────────
@app.route("/api/categories")
def categories():
    try:
        return jsonify(get_categories())
    except Exception as e:
        return jsonify({"error": "Failed to fetch categories", "detail": str(e)}), 500


@app.route("/api/icons")
def icons():
    try:
        category_id = request.args.get("category_id")
        return jsonify(get_icons(category_id))
    except Exception as e:
        return jsonify({"error": "Failed to fetch icons", "detail": str(e)}), 500


# ──────────────────────────────────────────────
# TTS Endpoint
# ──────────────────────────────────────────────
@app.route("/api/tts")
def tts():
    try:
        text = request.args.get("text", "")
        if not text:
            return jsonify({"error": "No text provided"}), 400
        if len(text) > 500:
            return jsonify({"error": "Text too long (max 500 characters)"}), 400
        audio = text_to_speech(text)
        if audio:
            return Response(audio, mimetype="audio/mpeg")
        # Fallback: return text for browser SpeechSynthesis
        return jsonify({"text": text, "fallback": "browser_tts"})
    except Exception as e:
        return jsonify({"error": "TTS failed", "detail": str(e)}), 500


# ──────────────────────────────────────────────
# AI Image Processing
# ──────────────────────────────────────────────
@app.route("/api/ai/process_image", methods=["POST"])
def process_image():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400
        image = request.files["image"]
        # Validate file size (max 10MB)
        image.seek(0, os.SEEK_END)
        size = image.tell()
        image.seek(0)
        if size > 10 * 1024 * 1024:
            return jsonify({"error": "Image too large (max 10MB)"}), 400
        result = process_image_for_aac(image.read())
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "Image processing failed", "detail": str(e)}), 500


# ──────────────────────────────────────────────
# AI Sentence Suggestions
# ──────────────────────────────────────────────
@app.route("/api/ai/suggest_sentences", methods=["POST"])
def suggest():
    try:
        data = request.get_json() or {}
        suggestions = suggest_sentences(
            time_of_day=data.get("time_of_day", "day"),
            recent_icons=data.get("recent_icons", []),
            mood=data.get("mood", "")
        )
        return jsonify({"suggestions": suggestions})
    except Exception as e:
        return jsonify({"error": "Failed to generate suggestions", "detail": str(e)}), 500


@app.route("/api/ai/summarize", methods=["POST"])
def summarize():
    try:
        data = request.get_json() or {}
        text = data.get("text", "")
        if not text:
            return jsonify({"error": "No text provided"}), 400
        summary = summarize_conversation(text)
        return jsonify({"summary": summary})
    except Exception as e:
        return jsonify({"error": "Summarization failed", "detail": str(e)}), 500



# ──────────────────────────────────────────────
# Favorites
# ──────────────────────────────────────────────
@app.route("/api/favorites/toggle", methods=["POST"])
def toggle_fav():
    try:
        data = request.get_json()
        if not data or "icon_id" not in data:
            return jsonify({"error": "icon_id is required"}), 400
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Not logged in"}), 401
        is_fav = toggle_favorite(user_id, data["icon_id"])
        return jsonify({"favorited": is_fav})
    except Exception as e:
        return jsonify({"error": "Failed to toggle favorite", "detail": str(e)}), 500


@app.route("/api/favorites")
def get_favs():
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify([])
        return jsonify(get_favorites(user_id))
    except Exception as e:
        return jsonify({"error": "Failed to fetch favorites", "detail": str(e)}), 500


# ──────────────────────────────────────────────
# Recent Sentences
# ──────────────────────────────────────────────
@app.route("/api/sentences/recent")
def recent_sentences():
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify([])
        limit = request.args.get("limit", 10, type=int)
        if limit < 1 or limit > 100:
            limit = 10
        return jsonify(get_recent_sentences(user_id, limit))
    except Exception as e:
        return jsonify({"error": "Failed to fetch recent sentences", "detail": str(e)}), 500


@app.route("/api/sentences/save", methods=["POST"])
def save_sent():
    try:
        data = request.get_json() or {}
        user_id = session.get("user_id") or data.get("user_id") or "guest_child"
        text_my = data.get("text_my", "")
        if not text_my:
            return jsonify({"error": "text_my is required"}), 400
        save_sentence(user_id, text_my, data.get("text_en", ""))
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": "Failed to save sentence", "detail": str(e)}), 500


@app.route("/api/analytics/sentences", methods=["GET"])
def sentence_analytics():
    try:
        user_id = session.get("user_id") or request.args.get("user_id")
        stats = get_sentence_analytics(user_id)
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": "Failed to load sentence analytics", "detail": str(e)}), 500



# ──────────────────────────────────────────────
# Emotions (stub — AuraAACSensor calls these)
# ──────────────────────────────────────────────
@app.route("/api/emotions/log", methods=["POST"])
def emotion_log():
    return jsonify({"ok": True})

@app.route("/api/emotions/history")
def emotion_history():
    return jsonify([])

@app.route("/api/emotions/stats")
def emotion_stats():
    return jsonify({"total": 0, "counts": {}, "daily": {}, "hourly": {}})


# ──────────────────────────────────────────────
# Routines
# ──────────────────────────────────────────────
@app.route("/api/routines", methods=["GET", "POST"])
def routines_api():
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Not logged in"}), 401
        if request.method == "POST":
            data = request.get_json() or {}
            name = data.get("name", "").strip()
            if not name:
                return jsonify({"error": "Routine name is required"}), 400
            routine = create_routine(user_id, name, data.get("steps", []))
            return jsonify(routine), 201
        routines = get_routines(user_id)
        return jsonify(routines)
    except Exception as e:
        return jsonify({"error": "Failed to process routines request", "detail": str(e)}), 500


@app.route("/api/routines/<routine_id>/steps")
def routine_steps_api(routine_id):
    try:
        return jsonify(get_routine_steps(routine_id))
    except Exception as e:
        return jsonify({"error": "Failed to fetch routine steps", "detail": str(e)}), 500


@app.route("/api/routines/<routine_id>", methods=["DELETE"])
def delete_routine_api(routine_id):
    try:
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Not logged in"}), 401
        delete_routine(routine_id)
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": "Failed to delete routine", "detail": str(e)}), 500



# ──────────────────────────────────────────────
# Serve Built Frontend (SPA Fallback)
# ──────────────────────────────────────────────
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        return jsonify({"error": "API route not found"}), 404
    if os.path.exists(os.path.join(FRONTEND_DIST, path)) and path != "":
        return send_from_directory(FRONTEND_DIST, path)
    if os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return jsonify({"status": "AAC API Backend is running", "port": 5001})


# ──────────────────────────────────────────────
# Run
# ──────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5001)

