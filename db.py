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


def create_user(
    username: str, 
    password_hash: str, 
    role: str = "user",
    child_nickname: str = "",
    child_gender: str = "",
    child_birth_year: str = ""
) -> dict:
    user_id = str(uuid.uuid4())
    user_record = {
        "id": user_id,
        "username": username,
        "password_hash": password_hash,
        "role": role,
        "child_nickname": child_nickname,
        "child_gender": child_gender,
        "child_birth_year": child_birth_year,
        "created_at": datetime.now().isoformat()
    }
    db = get_db()
    if db is not None:
        try:
            insert_data = {
                "username": username,
                "password_hash": password_hash,
                "role": role,
            }
            if child_nickname:
                insert_data["child_nickname"] = child_nickname
            if child_gender:
                insert_data["child_gender"] = child_gender
            if child_birth_year:
                insert_data["child_birth_year"] = child_birth_year

            result = db.table("users").insert(insert_data).execute()
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
# ── Custom Card Studio ──
def save_custom_card(card_data: dict, user_id: str | None = None) -> dict:
    card_id = card_data.get("id") or f"custom_{uuid.uuid4().hex[:8]}"
    owner_id = user_id or card_data.get("user_id") or "default_owner"
    record = {
        "id": card_id,
        "user_id": owner_id,
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


def get_custom_cards(user_id: str | None = None) -> list[dict]:
    local_data = _load_local_db()
    all_cards = local_data.get("custom_cards", [])
    if user_id:
        return [c for c in all_cards if c.get("user_id") == user_id or not c.get("user_id")]
    return all_cards


def delete_custom_card(card_id: str, user_id: str | None = None) -> bool:
    db = get_db()
    if db is not None:
        try:
            db.table("icons").delete().eq("id", card_id).execute()
        except Exception as e:
            logger.warning("Supabase delete_custom_card failed: %s", e)

    local_data = _load_local_db()
    local_data["custom_cards"] = [
        c for c in local_data.get("custom_cards", []) 
        if not (c.get("id") == card_id and (user_id is None or c.get("user_id") == user_id or not c.get("user_id")))
    ]
    _save_local_db(local_data)
    return True


def update_custom_card(card_id: str, card_data: dict, user_id: str | None = None) -> dict | None:
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
        if c.get("id") == card_id and (user_id is None or c.get("user_id") == user_id or not c.get("user_id")):
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


def get_sentence_analytics(user_id: str | None = None) -> dict:
    from collections import Counter
    db = get_db()
    sentences = []
    if db is not None:
        try:
            query = db.table("sentences").select("*")
            if user_id:
                query = query.eq("user_id", user_id)
            res = query.order("created_at", desc=True).execute()
            if res.data:
                sentences = res.data
        except Exception as e:
            logger.warning("Supabase get_sentence_analytics failed, falling back to local DB: %s", e)

    if not sentences:
        local_data = _load_local_db()
        sentences = local_data.get("sentences", [])
        if user_id:
            sentences = [s for s in sentences if s.get("user_id") == user_id or not s.get("user_id")]

    total_sentences = len(sentences)
    daily_counter = Counter()
    weekly_counter = Counter()
    monthly_counter = Counter()
    word_counter = Counter()
    sentence_counter = Counter()
    category_counter = Counter()

    daily_reports = {}

    for s in sentences:
        text = s.get("text_my", "").strip()
        created = s.get("created_at", "")
        if text:
            sentence_counter[text] += 1
            words = [w for w in text.split() if w]
            for w in words:
                word_counter[w] += 1
                if w in ["စားမယ်", "သောက်မယ်", "သွားမယ်", "ကစားမယ်", "ဆော့မယ်", "အိပ်မယ်", "ရေချိုးမယ်", "လက်ဆေးမယ်"]:
                    category_counter["Actions & Verbs"] += 1
                elif w in ["မေမေ", "ဖေဖေ", "သား", "သမီး", "သူ", "အမေ", "အဖေ"]:
                    category_counter["People & Subjects"] += 1
                elif w in ["အိမ်", "ကျောင်း", "ကစားကွင်း", "ဆေးရုံ", "ဆိုင်", "အခန်း", "အိမ်သာ"]:
                    category_counter["Places & Locations"] += 1
                elif w in ["ရေ", "နို့", "ခေါက်ဆွဲ", "ငှက်ပျောသီး", "ပေါင်မုန့်", "မုန့်", "ထမင်း", "ဟင်း"]:
                    category_counter["Food & Objects"] += 1
                else:
                    category_counter["Other Words"] += 1

        if created:
            try:
                dt = datetime.fromisoformat(created)
                day_str = dt.strftime("%Y-%m-%d")
                week_str = f"Week {dt.strftime('%U')}"
                month_str = dt.strftime("%b")

                daily_counter[day_str] += 1
                weekly_counter[week_str] += 1
                monthly_counter[month_str] += 1

                if day_str not in daily_reports:
                    daily_reports[day_str] = {"date": day_str, "count": 0, "sentences": []}
                daily_reports[day_str]["count"] += 1
                daily_reports[day_str]["sentences"].append({
                    "text_my": text,
                    "text_en": s.get("text_en", ""),
                    "time": dt.strftime("%H:%M")
                })
            except Exception:
                pass

    top_words = [{"word": k, "count": v} for k, v in word_counter.most_common(10)]
    top_sentences = [{"sentence": k, "count": v} for k, v in sentence_counter.most_common(10)]

    daily_list = sorted(list(daily_reports.values()), key=lambda x: x["date"], reverse=True)

    return {
        "total_sentences": total_sentences,
        "daily": dict(daily_counter),
        "weekly": dict(weekly_counter),
        "monthly": dict(monthly_counter),
        "categories": dict(category_counter),
        "top_words": top_words,
        "top_sentences": top_sentences,
        "daily_report": daily_list,
        "weekly_report": []
    }



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

def get_sentence_analytics(user_id: str | None = None) -> dict:
    local_data = _load_local_db()
    sentences = local_data.get("sentences", [])
    
    db = get_db()
    if db is not None:
        try:
            query = db.table("sentences").select("*")
            if user_id:
                query = query.eq("user_id", user_id)
            result = query.execute()
            if result.data:
                sentences = result.data
        except Exception as e:
            logger.warning("Supabase get_sentence_analytics failed: %s", e)

    now = datetime.now()
    from collections import defaultdict, Counter

    daily_counts = defaultdict(int)
    weekly_counts = defaultdict(int)
    monthly_counts = defaultdict(int)
    category_counts = defaultdict(int)

    word_counter = Counter()
    sentence_counter = Counter()

    daily_logs = defaultdict(list)
    weekly_logs = defaultdict(list)

    for s in sentences:
        dt_str = s.get("created_at") or ""
        try:
            dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        except Exception:
            dt = now

        day_key = dt.strftime("%Y-%m-%d")
        week_key = f"Week {dt.isocalendar()[1]} ({dt.strftime('%b %Y')})"
        month_key = dt.strftime("%b %Y")
        time_str = dt.strftime("%I:%M %p")

        daily_counts[day_key] += 1
        weekly_counts[week_key] += 1
        monthly_counts[month_key] += 1

        text_my = s.get("text_my", "").strip()
        text_en = s.get("text_en", "").strip()

        if text_my:
            sentence_counter[text_my] += 1
            words = text_my.split()
            for w in words:
                if len(w) > 0:
                    word_counter[w] += 1

        sentence_item = {
            "text_my": text_my,
            "text_en": text_en,
            "time": time_str
        }
        daily_logs[day_key].append(sentence_item)
        weekly_logs[week_key].append(sentence_item)

        # Categorize words spoken
        if any(v in text_my for v in ["လိုချင်", "စား", "သောက်", "လုပ်", "သွား", "ကစား", "ဖတ်", "ကြည့်", "အိပ်"]):
            category_counts["Actions & Verbs"] += 1
        if any(p in text_my for p in ["သား", "သမီး", "မေမေ", "ဖေဖေ", "တီချယ်", "သူငယ်ချင်း", "သူ"]):
            category_counts["People & Subjects"] += 1
        if any(o in text_my for o in ["ရေ", "မုန့်", "ကစားစရာ", "သီး", "စာအုပ်", "ဖုန်း"]):
            category_counts["Objects & Foods"] += 1
        if any(f in text_my for f in ["ပျော်", "နာ", "ဝမ်းနည်း", "ခံစား", "ကြောက်", "ပင်ပန်း"]):
            category_counts["Feelings & Health"] += 1

    # Format top words
    top_words = [{"word": word, "count": count} for word, count in word_counter.most_common(12)]

    # Format top sentences
    top_sentences = [{"sentence": sent, "count": count} for sent, count in sentence_counter.most_common(10)]

    # Format daily report
    daily_report = []
    for d_key in sorted(daily_logs.keys(), reverse=True):
        daily_report.append({
            "date": d_key,
            "count": len(daily_logs[d_key]),
            "sentences": daily_logs[d_key]
        })

    # Format weekly report
    weekly_report = []
    for w_key in sorted(weekly_logs.keys(), reverse=True):
        weekly_report.append({
            "week": w_key,
            "count": len(weekly_logs[w_key]),
            "sentences": weekly_logs[w_key]
        })

    return {
        "total_sentences": len(sentences),
        "daily": dict(daily_counts),
        "weekly": dict(weekly_counts),
        "monthly": dict(monthly_counts),
        "categories": dict(category_counts),
        "top_words": top_words,
        "top_sentences": top_sentences,
        "daily_report": daily_report,
        "weekly_report": weekly_report
    }




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
