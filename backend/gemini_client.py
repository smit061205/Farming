"""JSON-parsing utility shared with the OpenRouter client.

The direct-to-Google Gemini HTTP caller that used to live here has been
replaced by openrouter_client.py, which reaches Gemini (and DeepSeek) through
one OpenAI-compatible endpoint instead. Only this parser survives — models
still like to wrap JSON objects in ``` fences regardless of which provider
serves them.
"""
import json
import re
from typing import Optional


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
