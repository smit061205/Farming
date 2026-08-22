"""OpenRouter caller — one OpenAI-compatible endpoint, one key, for every
model this app uses: DeepSeek for text (chat, budget explanations, crop
recommendations) and Gemini Flash for vision (reading soil-card photos).

Same shape as the direct groq_client.py this replaced: httpx, no SDK,
retries a rate-limited/overloaded response once against nothing else (a
single key here, unlike Groq's primary+fallback pair) before giving up.
"""
import os
from typing import Optional

import httpx

ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

# Cheapest real-time (non-batch) tier of each family, verified against
# OpenRouter's live /models pricing and a real test call — DeepSeek has no
# model literally named "v4 lite"; v4-flash is its equivalent smallest/
# cheapest tier (v4-pro costs ~6-15x more per token). The leading "~" is
# part of the actual model id: an alias that always points at the current
# V4 Flash release, same self-updating pattern as Gemini's own "-latest".
# gemini-2.5-flash-lite is the cheapest vision-capable Gemini that isn't a
# batch (delayed, async) model.
TEXT_MODEL = "~deepseek/deepseek-v4-flash-latest"
VISION_MODEL = "google/gemini-2.5-flash-lite"


def openrouter_key() -> Optional[str]:
    return os.getenv("OPENROUTER_API_KEY") or None


def openrouter_available() -> bool:
    return bool(openrouter_key())


def _is_retryable(status: int) -> bool:
    return status == 429 or status >= 500


async def openrouter_generate(
    system: Optional[str] = None,
    messages: Optional[list] = None,
    model: str = TEXT_MODEL,
    image: Optional[dict] = None,
    max_tokens: int = 1200,
    temperature: float = 0.4,
) -> dict:
    """
    system    system prompt
    messages  [{role:'user'|'assistant', content:str}]
    model     OpenRouter model slug — TEXT_MODEL or VISION_MODEL
    image     optional {base64, mime} attached to the first user turn
    returns   {ok, text?, model?, reason?}
    """
    key = openrouter_key()
    if not key:
        return {"ok": False, "reason": "no-key"}
    messages = messages or []

    payload_messages = []
    if system:
        payload_messages.append({"role": "system", "content": system})
    for i, m in enumerate(messages):
        if image and i == 0 and m["role"] == "user":
            payload_messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": m["content"]},
                    {"type": "image_url", "image_url": {"url": f"data:{image['mime']};base64,{image['base64']}"}},
                ],
            })
        else:
            payload_messages.append({"role": m["role"], "content": m["content"]})

    last_reason = "unknown"
    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(2):
            try:
                resp = await client.post(
                    ENDPOINT,
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        # OpenRouter asks for these on every request for its own analytics.
                        "HTTP-Referer": "https://agrisense-farm.vercel.app",
                        "X-Title": "AgriSense",
                    },
                    json={"model": model, "messages": payload_messages, "max_tokens": max_tokens, "temperature": temperature},
                )
                data = resp.json()

                if resp.status_code != 200:
                    last_reason = (data.get("error") or {}).get("message") or f"HTTP {resp.status_code}"
                    if _is_retryable(resp.status_code) and attempt == 0:
                        continue
                    return {"ok": False, "reason": last_reason}

                choices = data.get("choices") or []
                text = ((choices[0] or {}).get("message") or {}).get("content") if choices else None
                if not text:
                    last_reason = "empty response"
                    if attempt == 0:
                        continue
                    return {"ok": False, "reason": last_reason}

                return {"ok": True, "text": text.strip(), "model": model}
            except Exception as e:
                last_reason = str(e)

    return {"ok": False, "reason": last_reason}
