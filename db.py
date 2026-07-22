"""Supabase database client wrapper.
Replaces all data.json load/save with PostgreSQL queries.
"""
import os
import logging
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

_supabase: Client | None = None

logger = logging.getLogger(__name__)


def get_db() -> Client | None:
    """Get the Supabase client. Returns None if credentials are missing."""
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.error("SUPABASE_URL and SUPABASE_KEY must be set in environment")
            return None
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase


def _require_db():
    """Get the Supabase client or raise a clean error."""
    db = get_db()
    if db is None:
        raise RuntimeError("Database not configured: missing SUPABASE_URL or SUPABASE_KEY")
    return db


# --- Auth ---
def authenticate_user(username: str, password: str) -> dict | None:
    from werkzeug.security import check_password_hash
    try:
        result = _require_db().table("users").select("*").eq("username", username).execute()
        if not result.data:
            return None
        user = result.data[0]
        if check_password_hash(user["password_hash"], password):
            return user
        return None
    except Exception as e:
        logger.error("authenticate_user failed: %s", e)
        raise


def create_user(username: str, password_hash: str, role: str = "user") -> dict:
    try:
        result = _require_db().table("users").insert({
            "username": username,
            "password_hash": password_hash,
            "role": role
        }).execute()
        return result.data[0]
    except Exception as e:
        logger.error("create_user failed: %s", e)
        raise


# --- Icons & Categories ---
def get_categories() -> list[dict]:
    try:
        db = _require_db()
        result = db.table("categories").select("*").order("icon_order").execute()
        return result.data
    except Exception as e:
        logger.error("get_categories failed: %s", e)
        return []


def get_icons(category_id: str | None = None) -> list[dict]:
    try:
        db = _require_db()
        query = db.table("icons").select("*").order("icon_order")
        if category_id:
            query = query.eq("category_id", category_id)
        result = query.execute()
        return result.data
    except Exception as e:
        logger.error("get_icons failed: %s", e)
        return []


# --- Favorites ---
def get_favorites(user_id: str) -> list[dict]:
    try:
        result = _require_db().table("favorites").select("*, icons(*)").eq("user_id", user_id).execute()
        return [r["icons"] for r in result.data if r.get("icons")]
    except Exception as e:
        logger.error("get_favorites failed: %s", e)
        return []


def toggle_favorite(user_id: str, icon_id: str) -> bool:
    """Returns True if now favorited, False if unfavorited."""
    try:
        db = _require_db()
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
        raise


# --- Sentences ---
def save_sentence(user_id: str, text_my: str, text_en: str = "") -> dict:
    try:
        result = _require_db().table("sentences").insert({
            "user_id": user_id,
            "text_my": text_my,
            "text_en": text_en
        }).execute()
        return result.data[0]
    except Exception as e:
        logger.error("save_sentence failed: %s", e)
        raise


def get_recent_sentences(user_id: str, limit: int = 10) -> list[dict]:
    try:
        result = (_require_db().table("sentences")
                   .select("*")
                   .eq("user_id", user_id)
                   .order("created_at", desc=True)
                   .limit(limit)
                   .execute())
        return result.data
    except Exception as e:
        logger.error("get_recent_sentences failed: %s", e)
        return []


# --- Routines ---
def create_routine(caregiver_id: str, name: str, steps: list[dict]) -> dict:
    try:
        db = _require_db()
        routine = db.table("routines").insert({
            "caregiver_id": caregiver_id,
            "name": name
        }).execute()
        routine_id = routine.data[0]["id"]
        step_records = [
            {"routine_id": routine_id, "icon_id": s["icon_id"], "label": s["label"], "step_order": s["order"]}
            for s in steps
        ]
        if step_records:
            db.table("routine_steps").insert(step_records).execute()
        return routine.data[0]
    except Exception as e:
        logger.error("create_routine failed: %s", e)
        raise


def get_routines(caregiver_id: str | None = None) -> list[dict]:
    try:
        db = _require_db()
        query = db.table("routines").select("*")
        if caregiver_id:
            query = query.eq("caregiver_id", caregiver_id)
        result = query.order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        logger.error("get_routines failed: %s", e)
        return []


def get_routine_steps(routine_id: str) -> list[dict]:
    try:
        result = (_require_db().table("routine_steps")
                   .select("*")
                   .eq("routine_id", routine_id)
                   .order("step_order")
                   .execute())
        return result.data
    except Exception as e:
        logger.error("get_routine_steps failed: %s", e)
        return []


def delete_routine(routine_id: str) -> None:
    try:
        _require_db().table("routines").delete().eq("id", routine_id).execute()
    except Exception as e:
        logger.error("delete_routine failed: %s", e)
        raise
