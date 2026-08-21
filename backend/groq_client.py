"""Groq caller — OpenAI-compatible chat completions, no SDK dependency
(same pattern as gemini_client.py).

Groq's daily token quota is per-organization, not per-key, so a second key
only helps when it belongs to a genuinely different account — which
GROQ_API_KEY_FALLBACK does here. Retries on the fallback key only for
rate-limit errors, never for a real failure (bad prompt, model error).
"""
import os
from typing import Optional

import httpx

ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "groq/compound-mini"


def groq_keys() -> list:
    primary = os.getenv("GROQ_API_KEY")
    fallback = os.getenv("GROQ_API_KEY_FALLBACK")
    keys = [k for k in (primary, fallback) if k]
    # De-dupe while preserving order, in case both env vars hold the same key.
    seen = set()
    out = []
    for k in keys:
        if k not in seen:
            seen.add(k)
            out.append(k)
    return out


def groq_available() -> bool:
    return bool(groq_keys())


def _is_rate_limit(status: int, data: dict) -> bool:
    return status == 429 or (data.get("error") or {}).get("code") == "rate_limit_exceeded"


async def groq_generate(
    system: Optional[str] = None,
    messages: Optional[list] = None,
    max_tokens: int = 1200,
    temperature: float = 0.4,
    model: Optional[str] = None,
) -> dict:
    keys = groq_keys()
    if not keys:
        return {"ok": False, "reason": "no-key"}
    messages = messages or []
    model = model or DEFAULT_MODEL

    payload_messages = []
    if system:
        payload_messages.append({"role": "system", "content": system})
    for m in messages:
        payload_messages.append({"role": m["role"], "content": m["content"]})

    last_reason = "unknown"
    async with httpx.AsyncClient(timeout=30.0) as client:
        for key in keys:
            try:
                resp = await client.post(
                    ENDPOINT,
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                    json={"model": model, "messages": payload_messages, "max_tokens": max_tokens, "temperature": temperature},
                )
                data = resp.json()

                if resp.status_code != 200:
                    last_reason = (data.get("error") or {}).get("message") or f"HTTP {resp.status_code}"
                    if _is_rate_limit(resp.status_code, data):
                        continue  # try the next key
                    return {"ok": False, "reason": last_reason}

                choices = data.get("choices") or []
                text = ((choices[0] or {}).get("message") or {}).get("content") if choices else None
                if not text:
                    last_reason = "empty response"
                    continue

                return {"ok": True, "text": text.strip(), "model": model}
            except Exception as e:
                last_reason = str(e)

    return {"ok": False, "reason": last_reason}
