"""AI module: Anthropic Claude vision/translation + ElevenLabs TTS."""
import os
import base64
import json
import mimetypes
import logging
import requests

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_BASE_URL = (os.environ.get("ANTHROPIC_BASE_URL") or "https://api.anthropic.com").rstrip("/")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")

logger = logging.getLogger(__name__)


def _call_anthropic(body: dict) -> dict:
    resp = requests.post(
        f"{ANTHROPIC_BASE_URL}/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json=body,
        timeout=120,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Anthropic API error {resp.status_code}: {resp.text[:300]}")
    return resp.json()


def _extract_text(response: dict) -> str:
    blocks = response.get("content", [])
    for b in blocks:
        if b.get("type") == "text":
            return b["text"]
    return blocks[-1].get("text", "") if blocks else ""


def process_image_for_aac(image_bytes: bytes) -> dict:
    """Send image to Claude → caption + Burmese translation (mimo-v2.5-pro)."""
    mime = mimetypes.guess_type("image")[0] or "image/jpeg"
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    response = _call_anthropic({
        "model": "mimo-v2.5-pro",
        "max_tokens": 10000,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64}},
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
    })
    text = _extract_text(response)
    start = text.find("{")
    end = text.rfind("}") + 1
    return json.loads(text[start:end])


def suggest_sentences(time_of_day: str, recent_icons: list[str], mood: str = "") -> list[str]:
    """Get 3-4 context-aware sentence suggestions (mimo-v2.5-pro)."""
    prompt = (
        f"Time: {time_of_day}. Recent icon taps: {recent_icons}. Mood: {mood or 'neutral'}.\n"
        "Suggest 3 short sentences (in Burmese) a non-verbal autistic child might want to say. "
        "Keep each 2-5 words. Return as JSON array of strings."
    )
    response = _call_anthropic({
        "model": "mimo-v2.5-pro",
        "max_tokens": 10000,
        "messages": [{"role": "user", "content": prompt}]
    })
    text = _extract_text(response)
    start = text.find("[")
    end = text.rfind("]") + 1
    return json.loads(text[start:end])


def summarize_conversation(conversation_text: str) -> str:
    """Summarize Burmese AAC conversation data into concise Burmese (mimo-v2.5-pro)."""
    prompt = (
        f"Below are Burmese AAC sentences from a child. Summarize in 2-3 Burmese sentences "
        f"what the child wants about food/drinks and actions. Output only the summary.\n\n"
        f"Sentences: {conversation_text}\n\nSummary:"
    )
    response = _call_anthropic({
        "model": "mimo-v2.5-pro",
        "max_tokens": 10000,
        "messages": [{"role": "user", "content": prompt}]
    })
    return _extract_text(response).strip().strip('"').strip("'")


def text_to_speech(text: str, voice: str = "my-MM-NilarNeural") -> bytes | None:
    """Generate natural Burmese speech via Microsoft Azure Neural TTS (edge-tts) with gTTS fallback. Returns MP3 bytes or None."""
    import asyncio
    import io

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
        logger.warning("Edge Neural TTS failed (%s), falling back to gTTS", err)

    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang="my", slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return buf.read()
    except Exception as err:
        logger.error("gTTS fallback failed: %s", err)
        return None
