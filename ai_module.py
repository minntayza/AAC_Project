"""AI module: Anthropic Claude vision/translation + ElevenLabs TTS."""
import os
import base64
import json
import mimetypes
from anthropic import Anthropic

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_BASE_URL = os.environ.get("ANTHROPIC_BASE_URL")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")

_anthropic: Anthropic | None = None


def get_anthropic() -> Anthropic:
    global _anthropic
    if _anthropic is None:
        kwargs = {"api_key": ANTHROPIC_API_KEY}
        if ANTHROPIC_BASE_URL:
            kwargs["base_url"] = ANTHROPIC_BASE_URL
        _anthropic = Anthropic(**kwargs)
    return _anthropic


def process_image_for_aac(image_bytes: bytes) -> dict:
    """Send image to Claude → caption + Burmese translation (mimo-v2.5-pro)."""
    mime = mimetypes.guess_type("image")[0] or "image/jpeg"
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    client = get_anthropic()
    response = client.messages.create(
        model="mimo-v2.5-pro",
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
    text = response.content[0].text
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])


def suggest_sentences(time_of_day: str, recent_icons: list[str], mood: str = "") -> list[str]:
    """Get 3-4 context-aware sentence suggestions (claude-haiku-4-5)."""
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
    text = response.content[0].text
    start = text.find("[")
    end = text.rfind("]") + 1
    return json.loads(text[start:end])


def rephrase_sentence(raw_text: str) -> str | None:
    """Rephrase card-concatenated Burmese into natural Burmese via Claude on proxy."""
    import requests
    import logging
    base = ANTHROPIC_BASE_URL or "https://proxy.vibecode.tours"
    try:
        resp = requests.post(
            f"{base}/v1/chat/completions",
            headers={"Authorization": f"Bearer {ANTHROPIC_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "mimo-v2.5-pro",
                "max_tokens": 1024,
                "temperature": 0.3,
                "messages": [{
                    "role": "user",
                    "content": (
                        "Rewrite this AAC card-built Burmese into natural spoken Burmese. "
                        "Add proper particles. Output ONLY the result.\n\n"
                        f"Input: {raw_text}\nNatural:"
                    )
                }]
            },
            timeout=15
        )
        if resp.status_code != 200:
            return None
        choices = resp.json().get("choices", [])
        if not choices:
            return None
        result = choices[0]["message"]["content"].strip().strip('"').strip("'")
        logging.warning("Rephrase: '%s' -> '%s'", raw_text, result)
        return result if result and result != raw_text else None
    except Exception:
        return None


def text_to_speech(text: str) -> bytes | None:
    """Generate Burmese speech via Google TTS (gTTS). Returns MP3 bytes or None."""
    from gtts import gTTS
    import io
    try:
        tts = gTTS(text=text, lang="my", slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return buf.read()
    except Exception:
        return None
