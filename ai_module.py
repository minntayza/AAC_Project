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
        max_tokens=3000,
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
    import re
    base = ANTHROPIC_BASE_URL or "https://proxy.vibecode.tours"
    try:
        resp = requests.post(
            f"{base}/v1/chat/completions",
            headers={"Authorization": f"Bearer {ANTHROPIC_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "mimo-v2.5-pro",
                "max_tokens": 3000,
                "temperature": 0.3,
                "messages": [{
                    "role": "user",
                    "content": (
                        "Rewrite this AAC card-built Burmese into natural spoken Burmese. "
                        "DO NOT add subject particle 'က' or ' က ' after subjects (e.g. use 'မေမေ စားမယ်' instead of 'မေမေ က စားမယ်' or 'အမေက စားမယ်'). "
                        "Output ONLY the result.\n\n"
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
        if result:
            # Strip any subject particle 'က' inserted after subject words
            result = re.sub(r'(\S+)\s*က\s*', r'\1 ', result).strip()
        logging.warning("Rephrase: '%s' -> '%s'", raw_text, result)
        return result if result and result != raw_text else None
    except Exception:
        return None


def text_to_speech(text: str, voice: str = "my-MM-NilarNeural") -> bytes | None:
    """Generate natural Burmese speech via Microsoft Azure Neural TTS (edge-tts) with gTTS fallback. Returns MP3 bytes or None."""
    import asyncio
    import io
    import logging

    try:
        import edge_tts

        async def _edge_gen():
            buf = io.BytesIO()
            communicate = edge_tts.Communicate(text, voice)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    buf.write(chunk["data"])
            buf.seek(0)
            return buf.read()

        audio_bytes = asyncio.run(_edge_gen())
        if audio_bytes and len(audio_bytes) > 0:
            return audio_bytes
    except Exception as err:
        logging.warning("Edge Neural TTS failed (%s), falling back to gTTS", err)

    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang="my", slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return buf.read()
    except Exception as err:
        logging.error("gTTS fallback failed: %s", err)
        return None
