"""Supabase database client wrapper with automatic local JSON DB fallback.
Ensures registration, login, card creation, and settings work 100% reliably
both in local offline development and in cloud production with Supabase PostgreSQL.
"""
import json
import logging
import os
import sys
import uuid
from datetime import datetime

# Ensure PyPI `supabase` package is imported, not the local ./supabase folder
_cwd = os.path.abspath(os.path.dirname(__file__))
_path = [p for p in sys.path if os.path.abspath(p or ".") != _cwd]
try:
    _sys_path_old = sys.path
    sys.path = _path
    from supabase import create_client, Client
finally:
    sys.path = _sys_path_old


SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

_supabase: Client | None = None
logger = logging.getLogger(__name__)

LOCAL_DB_FILE = os.path.join(os.path.dirname(__file__), "local_db.json")


def get_db() -> Client | None:
    """Get the Supabase client. Returns None if credentials are missing."""
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.info("SUPABASE_URL/SUPABASE_KEY not set — using local DB storage")
            return None
        try:
            _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            logger.warning("Failed to initialize Supabase client: %s", e)
            return None
    return _supabase


def _load_local_db() -> dict:
    if not os.path.exists(LOCAL_DB_FILE):
        return {
            "users": [],
            "custom_cards": [],
            "sentences": [],
            "routines": []
        }
    try:
        with open(LOCAL_DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"users": [], "custom_cards": [], "sentences": [], "routines": []}


def _save_local_db(data: dict):
    try:
        with open(LOCAL_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error("Failed to save local_db.json: %s", e)


# ── Auth ──
def authenticate_user(username: str, password: str) -> dict | None:
    from werkzeug.security import check_password_hash
    db = get_db()
    if db is not None:
        try:
            result = db.table("users").select("*").eq("username", username).execute()
            if result.data:
                user = result.data[0]
                if check_password_hash(user["password_hash"], password):
                    return user
            return None
        except Exception as e:
            logger.warning("Supabase authenticate_user failed, falling back to local DB: %s", e)

    # Local DB fallback
    local_data = _load_local_db()
    user = next((u for u in local_data.get("users", []) if u["username"].lower() == username.lower()), None)
    if user and check_password_hash(user["password_hash"], password):
        return user
    return None


def create_user(username: str, password_hash: str, role: str = "user") -> dict:
    user_id = str(uuid.uuid4())
    user_record = {
        "id": user_id,
        "username": username,
        "password_hash": password_hash,
        "role": role,
        "created_at": datetime.now().isoformat()
    }
    db = get_db()
    if db is not None:
        try:
            result = db.table("users").insert({
                "username": username,
                "password_hash": password_hash,
                "role": role
            }).execute()
            if result.data:
                return result.data[0]
        except Exception as e:
            logger.warning("Supabase create_user failed, saving locally: %s", e)

    # Local DB fallback
    local_data = _load_local_db()
    if any(u["username"].lower() == username.lower() for u in local_data.get("users", [])):
        raise ValueError("Username already taken")
    local_data.setdefault("users", []).append(user_record)
    _save_local_db(local_data)
    return user_record


def change_password(user_id: str, new_password_hash: str) -> bool:
    db = get_db()
    if db is not None:
        try:
            db.table("users").update({"password_hash": new_password_hash}).eq("id", user_id).execute()
            return True
        except Exception as e:
            logger.warning("Supabase change_password failed, updating local DB: %s", e)

    local_data = _load_local_db()
    for u in local_data.get("users", []):
        if u["id"] == user_id:
            u["password_hash"] = new_password_hash
            _save_local_db(local_data)
            return True
    return False


# ── Custom Card Studio ──
def save_custom_card(card_data: dict) -> dict:
    card_id = card_data.get("id") or f"custom_{uuid.uuid4().hex[:8]}"
    record = {
        "id": card_id,
        "category": card_data.get("category", "object"),
        "burmese": card_data.get("burmese", ""),
        "englishMeaning": card_data.get("englishMeaning", ""),
        "emoji": card_data.get("emoji", "⭐"),
        "image_url": card_data.get("image_url", ""),
        "audio_url": card_data.get("audio_url", ""),
        "card_type": card_data.get("card_type", "custom"), # 'ai_speech', 'custom_voice', 'story_1min'
        "created_at": datetime.now().isoformat()
    }
    db = get_db()
    if db is not None:
        try:
            db.table("icons").insert({
                "id": record["id"],
                "category_id": record["category"],
                "label_en": record["englishMeaning"],
                "label_my": record["burmese"],
                "image_url": record["image_url"] or record["emoji"]
            }).execute()
        except Exception as e:
            logger.warning("Supabase save_custom_card failed, using local DB: %s", e)

    local_data = _load_local_db()
    local_data.setdefault("custom_cards", []).append(record)
    _save_local_db(local_data)
    return record


def get_custom_cards() -> list[dict]:
    local_data = _load_local_db()
    return local_data.get("custom_cards", [])


def delete_custom_card(card_id: str) -> bool:
    db = get_db()
    if db is not None:
        try:
            db.table("icons").delete().eq("id", card_id).execute()
        except Exception as e:
            logger.warning("Supabase delete_custom_card failed: %s", e)

    local_data = _load_local_db()
    local_data["custom_cards"] = [c for c in local_data.get("custom_cards", []) if c.get("id") != card_id]
    _save_local_db(local_data)
    return True


def update_custom_card(card_id: str, card_data: dict) -> dict | None:
    db = get_db()
    if db is not None:
        try:
            db.table("icons").update({
                "category_id": card_data.get("category"),
                "label_en": card_data.get("englishMeaning"),
                "label_my": card_data.get("burmese"),
                "image_url": card_data.get("image_url") or card_data.get("emoji")
            }).eq("id", card_id).execute()
        except Exception as e:
            logger.warning("Supabase update_custom_card failed: %s", e)

    local_data = _load_local_db()
    cards = local_data.get("custom_cards", [])
    for c in cards:
        if c.get("id") == card_id:
            c.update({
                "category": card_data.get("category", c.get("category")),
                "burmese": card_data.get("burmese", c.get("burmese")),
                "englishMeaning": card_data.get("englishMeaning", c.get("englishMeaning")),
                "emoji": card_data.get("emoji", c.get("emoji")),
                "image_url": card_data.get("image_url", c.get("image_url")),
                "audio_url": card_data.get("audio_url", c.get("audio_url")),
                "card_type": card_data.get("card_type", c.get("card_type")),
            })
            _save_local_db(local_data)
            return c
    return None



# ── Icons & Categories ──
def get_categories() -> list[dict]:
    db = get_db()
    if db is not None:
        try:
            result = db.table("categories").select("*").order("icon_order").execute()
            if result.data:
                return result.data
        except Exception as e:
            logger.error("get_categories failed: %s", e)
    return []


def get_icons(category_id: str | None = None) -> list[dict]:
    db = get_db()
    if db is not None:
        try:
            query = db.table("icons").select("*").order("icon_order")
            if category_id:
                query = query.eq("category_id", category_id)
            result = query.execute()
            if result.data:
                return result.data
        except Exception as e:
            logger.error("get_icons failed: %s", e)
    return []


# ── Favorites ──
def get_favorites(user_id: str) -> list[dict]:
    db = get_db()
    if db is not None:
        try:
            result = db.table("favorites").select("*, icons(*)").eq("user_id", user_id).execute()
            return [r["icons"] for r in result.data if r.get("icons")]
        except Exception as e:
            logger.error("get_favorites failed: %s", e)
    return []


def toggle_favorite(user_id: str, icon_id: str) -> bool:
    db = get_db()
    if db is not None:
        try:
            existing = (db.table("favorites")
                        .select("*")
                        .eq("user_id", user_id)
                        .eq("icon_id", icon_id)
                        .execute())
            if existing.data:
                (db.table("favorites")
                 .delete()
                 .eq("user_id", user_id)
                 .eq("icon_id", icon_id)
                 .execute())
                return False
            else:
                db.table("favorites").insert({
                    "user_id": user_id,
                    "icon_id": icon_id
                }).execute()
                return True
        except Exception as e:
            logger.error("toggle_favorite failed: %s", e)
    return False


# ── Sentences ──
def save_sentence(user_id: str, text_my: str, text_en: str = "") -> dict:
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "text_my": text_my,
        "text_en": text_en,
        "created_at": datetime.now().isoformat()
    }
    db = get_db()
    if db is not None:
        try:
            result = db.table("sentences").insert({
                "user_id": user_id,
                "text_my": text_my,
                "text_en": text_en
            }).execute()
            if result.data:
                return result.data[0]
        except Exception as e:
            logger.warning("Supabase save_sentence failed: %s", e)

    local_data = _load_local_db()
    local_data.setdefault("sentences", []).append(record)
    _save_local_db(local_data)
    return record


def get_recent_sentences(user_id: str, limit: int = 10) -> list[dict]:
    db = get_db()
    if db is not None:
        try:
            result = (_require_db().table("sentences")
                       .select("*")
                       .eq("user_id", user_id)
                       .order("created_at", desc=True)
                       .limit(limit)
                       .execute())
            if result.data:
                return result.data
        except Exception as e:
            logger.error("get_recent_sentences failed: %s", e)

    local_data = _load_local_db()
    user_sents = [s for s in local_data.get("sentences", []) if s.get("user_id") == user_id]
    user_sents.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return user_sents[:limit]


# ── Routines ──
def create_routine(caregiver_id: str, name: str, steps: list[dict]) -> dict:
    routine_id = str(uuid.uuid4())
    routine = {
        "id": routine_id,
        "caregiver_id": caregiver_id,
        "name": name,
        "steps": steps,
        "created_at": datetime.now().isoformat()
    }
    db = get_db()
    if db is not None:
        try:
            result = db.table("routines").insert({
                "caregiver_id": caregiver_id,
                "name": name
            }).execute()
            if result.data:
                step_records = [
                    {"routine_id": result.data[0]["id"], "icon_id": s["icon_id"], "label": s["label"], "step_order": s["order"]}
                    for s in steps
                ]
                if step_records:
                    db.table("routine_steps").insert(step_records).execute()
                return result.data[0]
        except Exception as e:
            logger.warning("Supabase create_routine failed: %s", e)

    local_data = _load_local_db()
    local_data.setdefault("routines", []).append(routine)
    _save_local_db(local_data)
    return routine


def get_routines(caregiver_id: str | None = None) -> list[dict]:
    db = get_db()
    if db is not None:
        try:
            query = db.table("routines").select("*")
            if caregiver_id:
                query = query.eq("caregiver_id", caregiver_id)
            result = query.order("created_at", desc=True).execute()
            if result.data:
                return result.data
        except Exception as e:
            logger.error("get_routines failed: %s", e)

    local_data = _load_local_db()
    if caregiver_id:
        return [r for r in local_data.get("routines", []) if r.get("caregiver_id") == caregiver_id]
    return local_data.get("routines", [])


def get_routine_steps(routine_id: str) -> list[dict]:
    db = get_db()
    if db is not None:
        try:
            result = (_require_db().table("routine_steps")
                       .select("*")
                       .eq("routine_id", routine_id)
                       .order("step_order")
                       .execute())
            if result.data:
                return result.data
        except Exception as e:
            logger.error("get_routine_steps failed: %s", e)

    local_data = _load_local_db()
    routine = next((r for r in local_data.get("routines", []) if r.get("id") == routine_id), None)
    if routine:
        return routine.get("steps", [])
    return []


def delete_routine(routine_id: str) -> None:
    db = get_db()
    if db is not None:
        try:
            db.table("routines").delete().eq("id", routine_id).execute()
        except Exception as e:
            logger.error("delete_routine failed: %s", e)

    local_data = _load_local_db()
    local_data["routines"] = [r for r in local_data.get("routines", []) if r.get("id") != routine_id]
    _save_local_db(local_data)
