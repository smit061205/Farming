"""Soil report extraction — reads a Soil Health Card so the farmer does not type.

Ported from the reference Node server's engines/extract.js.

Two paths, in order of accuracy:
  1. A vision-capable model transcribes the card (used when a key is configured).
  2. Regex parsing of text the client already recognised (OCR in the browser).

TRANSCRIPTION IS NOT COMPUTATION. The model only reads numbers off the farmer's
own document; it never derives, estimates or infers a value. Anything it returns
goes to a review screen the farmer must confirm before it reaches the engine.
"""
import re
from typing import Optional

from gemini_client import parse_json_loose
from openrouter_client import openrouter_generate, openrouter_available, VISION_MODEL

FIELDS = ["ph", "oc", "n", "p", "k", "ec", "s", "zn"]

RANGE = {
    "ph": (0, 14), "oc": (0, 5), "n": (0, 2000), "p": (0, 500),
    "k": (0, 2000), "ec": (0, 20), "s": (0, 200), "zn": (0, 50),
}

VISION_PROMPT = """You are reading an Indian Soil Health Card or a soil testing laboratory report.

Transcribe ONLY the values that are printed on the document. Return strict JSON:

{
  "ph": number|null,
  "oc": number|null,
  "n": number|null,
  "p": number|null,
  "k": number|null,
  "ec": number|null,
  "s": number|null,
  "zn": number|null,
  "confidence": {"<field>": "high"|"low"},
  "notes": "string"
}

Field meanings:
  ph  - soil pH
  oc  - Organic Carbon, percent
  n   - Available Nitrogen, kg/ha
  p   - Available Phosphorus as P2O5, kg/ha
  k   - Available Potassium as K2O, kg/ha
  ec  - Electrical Conductivity, dS/m
  s   - Available Sulphur, ppm
  zn  - DTPA Zinc, ppm

RULES:
1. If a value is not printed on the document, return null. Never guess or infer.
2. Never convert between units. If the card reports a unit you were not asked for,
   return null and say so in "notes".
3. If a number is unclear or partly obscured, still return it but mark that field "low".
4. Labels may be in English, Hindi or Gujarati. Numerals may be Devanagari or Gujarati.
5. Return the JSON only. No commentary, no markdown fence."""

# ------------------------------------------------------------------ parsing

LABELS = {
    "ph": [r"\bp\s*h\b", r"पी\s*एच", r"પી\s*એચ"],
    "oc": [r"organic\s*carbon", r"\boc\b", r"जैविक\s*कार्बन", r"સેન્દ્રિય\s*કાર્બન"],
    "n": [r"available\s*nitrogen", r"\bnitrogen\b", r"नाइट्रोजन", r"નાઇટ્રોજન"],
    "p": [r"available\s*ph[o0]sph[o0]r[ou]s", r"\bphosphor[ou]s\b", r"p\s*2\s*o\s*5", r"फॉस्फोरस", r"ફોસ્ફરસ"],
    "k": [r"available\s*p[o0]tassium", r"\bpotassium\b", r"\bpotash\b", r"k\s*2\s*o", r"पोटाश", r"પોટાશ"],
    "ec": [r"electrical\s*conductivity", r"\bec\b", r"चालकता", r"વાહકતા"],
    "s": [r"\bsulphur\b", r"\bsulfur\b", r"सल्फर", r"સલ્ફર"],
    "zn": [r"\bzinc\b", r"\bzn\b", r"जिंक", r"ઝીંક"],
}
_COMPILED_LABELS = {f: [re.compile(p, re.IGNORECASE) for p in pats] for f, pats in LABELS.items()}

# Devanagari and Gujarati digits -> ASCII
_DIGITS = {
    "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
    "૦": "0", "૧": "1", "૨": "2", "૩": "3", "૪": "4", "૫": "5", "૬": "6", "૭": "7", "૮": "8", "૯": "9",
}
_DIGIT_RE = re.compile("[" + "".join(_DIGITS.keys()) + "]")


def normalise_digits(text: str) -> str:
    return _DIGIT_RE.sub(lambda m: _DIGITS[m.group(0)], text or "")


_STRIP_PATTERNS = [
    re.compile(r"p\s*2\s*o\s*5", re.IGNORECASE),
    re.compile(r"k\s*2\s*o", re.IGNORECASE),
    re.compile(r"n\s*o\s*3", re.IGNORECASE),
    re.compile(r"h\s*2\s*o", re.IGNORECASE),
    re.compile(r"z\s*n\s*s\s*o\s*4", re.IGNORECASE),
    re.compile(r"\b\d+\s*:\s*\d+(?:\.\d+)?\b"),
    re.compile(r"\bs\.?\s*no\.?\s*\d+", re.IGNORECASE),
]
_NUM_RE = re.compile(r"\d+(?:\.\d+)?")


def parse_soil_text(raw_text: str) -> dict:
    """Parse OCR text from a soil card. Deterministic, no model involved."""
    text = normalise_digits(raw_text or "")
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    values = {}
    confidence = {}

    for field, patterns in _COMPILED_LABELS.items():
        for line in lines:
            if not any(p.search(line) for p in patterns):
                continue
            # Strip chemical formulae and common ratio notation first, or the digits
            # inside "P2O5", "K2O" or "1:2.5" get read as the measurement.
            cleaned = line
            for strip_re in _STRIP_PATTERNS:
                cleaned = strip_re.sub(" ", cleaned)
            nums = _NUM_RE.findall(cleaned)
            if not nums:
                continue
            for raw in nums:
                v = float(raw)
                lo, hi = RANGE[field]
                if lo <= v <= hi:
                    values[field] = v
                    confidence[field] = "low"  # regex parsing is never high confidence
                    break
            if field in values:
                break

    return {
        "values": values,
        "confidence": confidence,
        "method": "text-parse",
        "notes": (
            "Read from the text on the image. Please check every value before continuing."
            if values else
            "Could not find soil values in this image. Typing them in will be quicker."
        ),
    }


def sanitise(values: Optional[dict] = None) -> dict:
    """Clamp anything the extractor returns into a believable range."""
    values = values or {}
    out = {}
    rejected = []
    for f in FIELDS:
        v = values.get(f)
        if v is None or v == "":
            continue
        try:
            n = float(v)
        except (TypeError, ValueError):
            continue
        lo, hi = RANGE[f]
        if n < lo or n > hi:
            rejected.append(f)
            continue
        out[f] = n
    return {"values": out, "rejected": rejected}


# ------------------------------------------------------------------- vision

def vision_available() -> bool:
    return openrouter_available()


async def extract_from_image(base64: str, mime: str) -> dict:
    if not openrouter_available():
        return {"ok": False, "reason": "no-vision-key"}

    try:
        out = await openrouter_generate(
            messages=[{"role": "user", "content": VISION_PROMPT}],
            image={"base64": base64, "mime": mime},
            model=VISION_MODEL,
            max_tokens=1500,
            temperature=0,
        )
        if not out["ok"]:
            return {"ok": False, "reason": out.get("reason")}

        parsed = parse_json_loose(out["text"])
        if not parsed:
            return {"ok": False, "reason": "unreadable-response"}

        result = sanitise(parsed)
        return {
            "ok": True,
            "values": result["values"],
            "confidence": parsed.get("confidence") or {},
            "rejected": result["rejected"],
            "notes": parsed.get("notes", ""),
            "method": f"vision:gemini:{out.get('model')}" if out.get("model") else "vision:gemini",
        }
    except Exception as e:
        return {"ok": False, "reason": str(e)}
