"""Shared Gemini caller used by both the advisor and the soil-card reader.

Ported from the reference Node server's lib/gemini.js. Three things this
handles that a naive request does not:
  1. Key fallback. GEMINI_API_KEY_FALLBACK is tried if the primary key's
     quota or billing cap is hit, same pattern as groq_client.py.
  2. Model fallback. Flash models return 503 under load and retired names
     404. We walk a chain rather than failing the farmer's request.
  3. Token budget. Flash models spend output tokens on internal reasoning,
     so a small max_output_tokens returns an EMPTY response with
     finish_reason MAX_TOKENS. Budgets here are set well above the visible
     answer.
"""
import json
import os
import re
from typing import Optional

import httpx

ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models"
DEFAULT_CHAIN = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-3.5-flash-lite"]


def gemini_keys() -> list:
    primary = os.getenv("GEMINI_API_KEY")
    fallback = os.getenv("GEMINI_API_KEY_FALLBACK")
    keys = [k for k in (primary, fallback) if k]
    # De-dupe while preserving order, in case both env vars hold the same key.
    seen = set()
    out = []
    for k in keys:
        if k not in seen:
            seen.add(k)
            out.append(k)
    return out


def gemini_available() -> bool:
    return bool(gemini_keys())


def model_chain() -> list:
    pinned = os.getenv("GEMINI_MODEL")
    if pinned:
        return [pinned] + [m for m in DEFAULT_CHAIN if m != pinned]
    return DEFAULT_CHAIN


def _should_fall_over(status: int) -> bool:
    """Retry-worthy: transient overload, rate limit, retired model name."""
    return status in (503, 429, 404) or status >= 500


async def gemini_generate(
    system: Optional[str] = None,
    messages: Optional[list] = None,
    image: Optional[dict] = None,
    max_tokens: int = 1200,
    temperature: float = 0.4,
) -> dict:
    """
    system    system instruction
    messages  [{role:'user'|'assistant', content:str}]
    image     optional { base64, mime } sent with the first user turn
    returns   {ok, text?, model?, reason?}
    """
    keys = gemini_keys()
    if not keys:
        return {"ok": False, "reason": "no-key"}
    messages = messages or []

    contents = []
    for i, m in enumerate(messages):
        parts = []
        if image and i == 0:
            parts.append({"inline_data": {"mime_type": image["mime"], "data": image["base64"]}})
        parts.append({"text": m["content"]})
        contents.append({"role": "model" if m["role"] == "assistant" else "user", "parts": parts})

    body = {"contents": contents, "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature}}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}

    last_reason = "unknown"

    # A key is only worth abandoning for the next one once its whole model
    # chain has failed — a single model being overloaded doesn't mean the
    # key itself (its quota) is the problem.
    async with httpx.AsyncClient(timeout=30.0) as client:
        for key in keys:
            for model in model_chain():
                try:
                    resp = await client.post(f"{ENDPOINT}/{model}:generateContent", params={"key": key}, json=body)
                    data = resp.json()

                    if resp.status_code != 200:
                        last_reason = (data.get("error") or {}).get("message") or f"HTTP {resp.status_code}"
                        if _should_fall_over(resp.status_code):
                            continue
                        return {"ok": False, "reason": last_reason}

                    candidates = data.get("candidates") or []
                    cand = candidates[0] if candidates else {}
                    parts = (cand.get("content") or {}).get("parts") or []
                    text = "".join(p.get("text", "") for p in parts).strip()

                    if not text:
                        finish = cand.get("finishReason")
                        last_reason = "model used its whole token budget on reasoning" if finish == "MAX_TOKENS" else f"empty response ({finish or 'no candidate'})"
                        continue

                    return {"ok": True, "text": text, "model": model}
                except Exception as e:
                    last_reason = str(e)

    return {"ok": False, "reason": last_reason}


def parse_json_loose(text: Optional[str]) -> Optional[dict]:
    """Tolerant JSON reader — models like to wrap objects in ``` fences."""
    if not text:
        return None
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    body = fenced.group(1) if fenced else text
    start = body.find("{")
    end = body.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(body[start:end + 1])
    except Exception:
        return None
