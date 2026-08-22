"""Crop suggestions grounded only in the wizard's field details.

The fertilizer recommendation remains deterministic and independent. This module
is a secondary advisory layer: DeepSeek (via OpenRouter) chooses and explains
three crop candidates from the local crop catalog, while the server validates
every returned crop id. If it's unavailable or returns an invalid shape, a
small catalog-based fallback keeps the Plan and Soil tabs useful without
blocking the main result.
"""
import json
import re

from data import crops
from openrouter_client import openrouter_available, openrouter_generate, TEXT_MODEL


_LANG_NAME = {"en": "English", "hi": "Hindi", "gu": "Gujarati"}


def _number(value, default=None):
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _wizard_context(details: dict) -> dict:
    soil = details.get("soil") or {}
    return {
        "location": details.get("place") or None,
        "zone": details.get("zone") or None,
        "areaHa": _number(details.get("areaHa")),
        "irrigation": details.get("irrigation") or "canal",
        "sowingDate": details.get("sowingDate") or None,
        "method": details.get("method") or "broadcast",
        "organic": details.get("organic") or None,
        "waterlogged": bool(details.get("waterlogged")),
        "selectedCropId": details.get("cropId") or None,
        "soil": {
            key: _number(soil.get(key))
            for key in ("ph", "oc", "n", "p", "k", "ec", "s", "zn")
        },
    }


def _catalog(context: dict, lang: str) -> list:
    selected = context.get("selectedCropId")
    zone = context.get("zone")
    candidates = []
    for crop in crops:
        if crop["id"] == selected:
            continue
        candidates.append({
            "id": crop["id"],
            "name": crop["name"].get(lang) or crop["name"]["en"],
            "group": crop["group"],
            "base": crop["base"],
            "target": crop["target"],
            "seasonDays": crop.get("seasonDays"),
            "tierForZone": (crop.get("tier") or {}).get(zone, "B") if zone else "B",
            "hasStcr": bool(crop.get("stcr")),
            "split": crop.get("split"),
        })
    return candidates


def _fallback(context: dict, lang: str, catalog: list) -> list:
    """Stable non-LLM fallback; it never claims a crop is guaranteed."""
    irrigation = context.get("irrigation")

    def score(item):
        value = 0
        if item["tierForZone"] == "A":
            value += 20
        if item["hasStcr"]:
            value += 5
        if irrigation == "rainfed" and item["group"] in ("Pulse", "Oilseed", "Cereal"):
            value += 2
        return (-value, item.get("seasonDays") or 999, item["id"])

    ranked = sorted(catalog, key=score)
    selected = ranked[:3]
    reason = {
        "en": "This crop is available in the catalog for your selected field context; check local seed and market conditions before planting.",
        "hi": "यह फसल आपके खेत की जानकारी के आधार पर कैटलॉग में उपलब्ध है; बोने से पहले स्थानीय बीज और बाजार की स्थिति जाँचें।",
        "gu": "તમારા ખેતરની માહિતી માટે આ પાક કેટલોગમાં ઉપલબ્ધ છે; વાવણી પહેલાં સ્થાનિક બીજ અને બજારની સ્થિતિ તપાસો.",
    }.get(lang, "This crop is available in the catalog for your selected field context; check local seed and market conditions before planting.")
    return [
        {"cropId": item["id"], "name": item["name"], "group": item["group"], "reason": reason}
        for item in selected
    ]


def _parse_json(text: str):
    if not text:
        return None
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    body = fenced.group(1) if fenced else text
    start, end = body.find("{"), body.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(body[start:end + 1])
    except (TypeError, ValueError):
        return None


async def recommend_crops(details: dict, lang: str = "en") -> dict:
    context = _wizard_context({**(details or {}), "lang": lang})
    catalog = _catalog(context, lang)
    by_id = {item["id"]: item for item in catalog}
    fallback = _fallback(context, lang, catalog)

    if not openrouter_available():
        return {"status": "ready", "provider": "catalog", "recommendations": fallback}

    language = _LANG_NAME.get(lang, "English")
    system = f"""You are AgriSense's crop-selection advisor for an Indian farmer.

Use only the WIZARD DETAILS and CROP CATALOG supplied by the server. Suggest exactly
three different crop ids from the catalog, excluding selectedCropId. Do not invent
prices, yield numbers, weather readings, soil measurements, or market facts. Explain
the fit in simple farmer-friendly language in {language}. If the details are not
enough to distinguish candidates, say that plainly in the reason.

Return JSON only, with this exact shape:
{{"recommendations":[{{"cropId":"catalog id","reason":"one or two short sentences"}}]}}
"""
    user = json.dumps({"wizardDetails": context, "cropCatalog": catalog}, ensure_ascii=False)
    out = await openrouter_generate(
        system=system,
        messages=[{"role": "user", "content": user}],
        model=TEXT_MODEL,
        max_tokens=900,
        temperature=0.2,
    )
    if not out.get("ok"):
        return {"status": "ready", "provider": "catalog", "recommendations": fallback, "degraded": out.get("reason")}

    parsed = _parse_json(out.get("text")) or {}
    rows = parsed.get("recommendations") if isinstance(parsed, dict) else None
    valid = []
    seen = set()
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        crop_id = row.get("cropId")
        reason = str(row.get("reason") or "").strip()
        if crop_id not in by_id or crop_id in seen or not reason:
            continue
        seen.add(crop_id)
        item = by_id[crop_id]
        valid.append({"cropId": crop_id, "name": item["name"], "group": item["group"], "reason": reason})
        if len(valid) == 3:
            break

    if len(valid) < 3:
        existing = {row["cropId"] for row in valid}
        valid.extend(row for row in fallback if row["cropId"] not in existing)
        valid = valid[:3]

    return {"status": "ready", "provider": "deepseek", "model": out.get("model"), "recommendations": valid}
