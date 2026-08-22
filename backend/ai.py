"""AI advisor.

Ported from the reference Node server's engines/ai.js. HARD RULE: the model
never computes a number. It receives the finished recommendation as JSON
and may only explain it in the farmer's language. With no API key
configured the template explainer below covers every branch, so the app is
fully demoable without any AI provider.

Provider chain: Groq first (fast, generous per-key limits), then Gemini as a
genuine second attempt if Groq's own quota is the one that's out, then the
deterministic template. Both providers support a primary+fallback key pair.
"""
import os
import re as _re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional

from groq_client import groq_generate, groq_available
from gemini_client import gemini_generate, gemini_available

_IST = ZoneInfo("Asia/Kolkata")


def _format_when(t_ms: float) -> str:
    """'Thursday, 2 PM' in IST — the farmer's local time, not the server's."""
    dt = datetime.fromtimestamp(t_ms / 1000, tz=_IST)
    return dt.strftime("%A, %-I %p")

SYSTEM = """You are AgriSense, a fertilizer advisor talking to a farmer in India.

A deterministic agronomy engine has already worked out this farmer's plan from ICAR and
STCR rules. You are given its complete output as RECOMMENDATION JSON. Your job is to make
that plan understood and trusted.

WHAT YOU MUST NOT DO
1. Never calculate, estimate, convert or invent any quantity, price, dose or date.
   Every number you state must appear in the RECOMMENDATION JSON, exactly as written there.
2. Never contradict the engine's recommendation.
3. Never advise on pesticides, medicines, or anything outside fertilizer and soil.

WHAT YOU SHOULD DO
You are expected to REASON about the facts you were given, and to answer fully from them.
Refusing a question you can answer from the JSON is a failure, not caution. In particular:

- "Why is X zero?" -> zeroDoseReasons and classes explain it. Answer properly.
- "Can I use <product> instead?" -> alternatives lists every product that supplies each
  nutrient, with kilograms and cost already worked out. Compare them from that list.
  phBand and warnings tell you when a product is a poor fit for this soil.
- "What if I only have Rs X?" -> spendingPriority gives the order to buy in and the cost of
  each step; budgetPlan, when present, gives the answer outright. Name what the money covers
  and what it does not.
- "When should I apply?" -> advisory.windows and the calendar. Give the first
  window's exact day and time when it exists, plus any relevant timing condition.
- "Is this good for my soil?" -> soilHealth, nutrientBalance, environment.
- "Where is this for?" / "which location?" -> the location field names the place.
- "Which crops suit my soil/field?" -> cropRecommendations.recommendations. List all
  three ranked crops and their supplied reasons. Do not replace them with a generic
  soil-health score.

The JSON also contains the full live weather blocks, crop-season calendar, organic
input, amendments, product list, cost comparison, budget notice, nutrient ratio,
soil-health parts, environmental impact, income estimate, warnings, and crop
alternatives. Use those fields when the farmer asks about them. Do not claim data
is absent when a relevant field is present.

If the JSON genuinely does not contain what was asked, say so plainly in one sentence and
suggest the nearest Krishi Vigyan Kendra. Do not pad it out.

HOW TO WRITE
- Answer in the language requested. Simple words a farmer will understand. Short sentences.
- Plain text only. No markdown, no bullet characters, no headings.
- 2 to 5 sentences unless more is genuinely needed.
- Describe conditions rather than giving orders. Say "today is a good day for it", not
  "apply now". The farmer may be standing in a shop while reading this.
- Rupee amounts as the JSON gives them."""

# ------------------------------------------------------------- templates

L = {
    "en": {
        "intro": lambda crop, area: f"Here is your fertilizer plan for {crop} on {area} hectare.",
        "dose": lambda n, p, k: f"It needs {n} kg nitrogen, {p} kg phosphorus and {k} kg potash per hectare.",
        "zero": lambda nutrient, reason: f"You do not need any {nutrient}. {reason}",
        "saving": lambda rs, pct: f"This plan costs ₹{rs} less than the usual blanket dose — about {pct}% saved.",
        "costlier": lambda: "This plan corrects a nutrient your soil is short of, so it costs a little more than the blanket dose — but it protects your yield.",
        "wait": lambda msg: f"Today is not a good day for it. {msg}",
        "go": lambda msg: f"Today is a good day for it. {msg}",
        "modify": lambda msg: f"It will work today, with one change. {msg}",
        "window": lambda when, why: f"The best time this week is {when} — {why}.",
        "risk": lambda rs, pct: f"If you apply at the wrong time, about {pct}% of the nitrogen can be lost. That is roughly ₹{rs} of fertilizer.",
        "ask": "Ask me anything about this plan.",
        "noinfo": "I do not have that information in this recommendation. Please ask your nearest Krishi Vigyan Kendra.",
        "location": lambda loc: f"This plan is for {loc}.",
    },
    "hi": {
        "intro": lambda crop, area: f"{area} हेक्टेयर में {crop} के लिए आपकी खाद योजना यह है।",
        "dose": lambda n, p, k: f"प्रति हेक्टेयर {n} किलो नाइट्रोजन, {p} किलो फॉस्फोरस और {k} किलो पोटाश की ज़रूरत है।",
        "zero": lambda nutrient, reason: f"आपको {nutrient} की ज़रूरत नहीं है। {reason}",
        "saving": lambda rs, pct: f"यह योजना सामान्य खुराक से ₹{rs} सस्ती है — लगभग {pct}% की बचत।",
        "costlier": lambda: "यह योजना उस पोषक तत्व की पूर्ति करती है जिसकी आपकी मिट्टी में कमी है, इसलिए थोड़ी महँगी है — पर उपज बचेगी।",
        "wait": lambda msg: f"आज इसके लिए अच्छा दिन नहीं है। {msg}",
        "go": lambda msg: f"आज इसके लिए अच्छा दिन है। {msg}",
        "modify": lambda msg: f"आज हो जाएगा, बस एक बदलाव के साथ। {msg}",
        "window": lambda when, why: f"इस सप्ताह सबसे अच्छा समय {when} है — {why}।",
        "risk": lambda rs, pct: f"गलत समय पर डालने से लगभग {pct}% नाइट्रोजन बर्बाद हो सकती है, यानी करीब ₹{rs} की खाद।",
        "ask": "इस योजना के बारे में कुछ भी पूछें।",
        "noinfo": "यह जानकारी मेरे पास नहीं है। कृपया अपने नज़दीकी कृषि विज्ञान केंद्र से पूछें।",
        "location": lambda loc: f"यह योजना {loc} के लिए है।",
    },
    "gu": {
        "intro": lambda crop, area: f"{area} હેક્ટરમાં {crop} માટે તમારી ખાતર યોજના આ રહી.",
        "dose": lambda n, p, k: f"પ્રતિ હેક્ટર {n} કિલો નાઇટ્રોજન, {p} કિલો ફોસ્ફરસ અને {k} કિલો પોટાશની જરૂર છે.",
        "zero": lambda nutrient, reason: f"તમારે {nutrient} ની જરૂર નથી. {reason}",
        "saving": lambda rs, pct: f"આ યોજના સામાન્ય ખાતર કરતાં ₹{rs} સસ્તી છે — આશરે {pct}% બચત.",
        "costlier": lambda: "આ યોજના તમારી જમીનમાં ખૂટતું પોષક તત્વ પૂરું પાડે છે, તેથી થોડી મોંઘી છે — પણ ઉપજ બચશે.",
        "wait": lambda msg: f"આજે આના માટે સારો દિવસ નથી. {msg}",
        "go": lambda msg: f"આજે આના માટે સારો દિવસ છે. {msg}",
        "modify": lambda msg: f"આજે થઈ જશે, ફક્ત એક ફેરફાર સાથે. {msg}",
        "window": lambda when, why: f"આ અઠવાડિયે શ્રેષ્ઠ સમય {when} છે — {why}.",
        "risk": lambda rs, pct: f"ખોટા સમયે નાખવાથી આશરે {pct}% નાઇટ્રોજન વેડફાઈ શકે, એટલે કે આશરે ₹{rs} નું ખાતર.",
        "ask": "આ યોજના વિશે કંઈ પણ પૂછો.",
        "noinfo": "આ માહિતી મારી પાસે નથી. કૃપા કરી નજીકના કૃષિ વિજ્ઞાન કેન્દ્રનો સંપર્ક કરો.",
        "location": lambda loc: f"આ યોજના {loc} માટે છે.",
    },
}

NUTRIENT_NAME = {
    "en": {"N": "nitrogen (urea)", "P": "phosphorus", "K": "potash"},
    "hi": {"N": "नाइट्रोजन (यूरिया)", "P": "फॉस्फोरस", "K": "पोटाश"},
    "gu": {"N": "નાઇટ્રોજન (યુરિયા)", "P": "ફોસ્ફરસ", "K": "પોટાશ"},
}

_ZERO = {
    "en": lambda v, c: f"Your soil already holds {v} kg/ha — that is the {c} class.",
    "hi": lambda v, c: f"आपकी मिट्टी में पहले से {v} किलो/हे. है — यह {c} श्रेणी है।",
    "gu": lambda v, c: f"તમારી જમીનમાં પહેલેથી {v} કિલો/હે. છે — આ {c} શ્રેણી છે.",
}
_CLS = {
    "en": {"Low": "low", "Medium": "medium", "High": "high"},
    "hi": {"Low": "कम", "Medium": "मध्यम", "High": "अधिक"},
    "gu": {"Low": "ઓછું", "Medium": "મધ્યમ", "High": "વધુ"},
}


def template_explain(rec: dict, lang: str = "en") -> str:
    """Deterministic explanation — always available, no key needed.

    Defensive about shape: this is called both on a full /recommend
    response and, from the chat fallback, on the smaller grounding object
    /chat builds for the model — which uses 'crop' instead of 'cropName'
    and a differently-shaped 'advisory'. Missing/renamed fields degrade
    gracefully here instead of raising, matching the reference's own
    behavior of quietly rendering "undefined" rather than crashing."""
    t = L.get(lang, L["en"])
    nn = NUTRIENT_NAME.get(lang, NUTRIENT_NAME["en"])
    lines = []
    dose = rec.get("dose") or {}

    crop_name = rec.get("cropName") or rec.get("crop") or "your crop"
    lines.append(t["intro"](crop_name, rec.get("areaHa")))
    if dose:
        lines.append(t["dose"](dose.get("N"), dose.get("P"), dose.get("K")))

    for key in ("N", "P", "K"):
        r = (rec.get("zeroDoseReasons") or {}).get(key)
        if dose.get(key) == 0 and r:
            cls = (_CLS.get(lang, _CLS["en"])).get((r.get("params") or {}).get("class"), (r.get("params") or {}).get("class", ""))
            why = (_ZERO.get(lang, _ZERO["en"]))((r.get("params") or {}).get("value"), cls)
            lines.append(t["zero"](nn[key], why))

    if rec.get("comparison"):
        c = rec["comparison"].get("npkOnly") or rec["comparison"]
        if c.get("savedTotal", 0) > 0:
            lines.append(t["saving"](c["savedTotal"], c["savedPct"]))
        else:
            lines.append(t["costlier"]())

    adv = rec.get("advisory")
    if adv and adv.get("verdict"):
        # Full shape has rulesFired: [{message}]; the trimmed chat-grounding
        # shape has reasons: [str] instead — support both.
        rules = adv.get("rulesFired")
        first_msg = (rules[0].get("message") if rules else None) or ((adv.get("reasons") or [None])[0])
        msg = (adv.get("override") or {}).get("message") or first_msg or ""
        if adv["verdict"] == "WAIT":
            lines.append(t["wait"](msg))
        elif adv["verdict"] == "GO":
            lines.append(t["go"](msg))
        else:
            lines.append(t["modify"](msg))

        # Full shape has windows: [{t, reasons}]; trimmed shape has
        # bestWindows: [{when, why}] instead — support both.
        windows = adv.get("windows")
        w = windows[0] if windows else None
        if w:
            when = _format_when(w["t"])
            reasons_txt = ", ".join((w.get("reasons") or [])[:2])
        else:
            best = adv.get("bestWindows")
            bw = best[0] if best else None
            when = bw["when"] if bw and isinstance(bw.get("when"), str) else (_format_when(bw["when"]) if bw else None)
            reasons_txt = ", ".join((bw.get("why") or [])[:2]) if bw else None
        if when:
            lines.append(t["window"](when, reasons_txt or ""))

        if (adv.get("risk") or {}).get("rupeesAtRisk", 0) > 0:
            lines.append(t["risk"](adv["risk"]["rupeesAtRisk"], adv["risk"]["nLossPct"]))

    return " ".join(lines)


def ask_prompt(lang: str) -> str:
    return L.get(lang, L["en"])["ask"]


def no_info(lang: str) -> str:
    return L.get(lang, L["en"])["noinfo"]


# --------------------------------------------------------- provider calls

def ai_status() -> dict:
    if groq_available():
        return {"enabled": True, "provider": "groq", "mode": "llm"}
    if gemini_available():
        return {"enabled": True, "provider": "gemini", "mode": "llm"}
    return {"enabled": False, "provider": "template", "mode": "rule-based fallback"}


async def explain_budget_constraint(facts: dict, lang: str = "en") -> dict:
    """Explain an already-computed budget shortfall without inventing advice.

    The allocation engine decides every quantity and rupee value first. The
    model may only translate those facts into a short farmer-facing warning;
    a deterministic fallback keeps the budget safeguard available without
    any key configured, or if both providers are out of quota.
    """
    missing = facts.get("missing") or []
    partial = facts.get("partial") or []
    full_cost = facts.get("fullCost")
    cap = facts.get("cap")
    plan_cost = facts.get("planCost")
    requested = facts.get("requestedBudget")

    def template_text():
        missing_text = ", ".join(missing + partial) or "part of the required nutrient dose"
        return (
            f"The complete plan costs ₹{full_cost}, above your ₹{requested} budget. "
            f"This purchase list is capped at ₹{plan_cost} and leaves out or reduces {missing_text}. "
            f"To complete the full plan, raise the fertilizer budget to ₹{full_cost} or phase the remaining nutrients after advice from your local Krishi Vigyan Kendra."
        )

    if not groq_available() and not gemini_available():
        return {"text": template_text(), "provider": "template"}

    language = _LANG_NAME.get(lang, "English")
    system = f"""You are AgriSense's budget advisor for an Indian farmer.

Write a short, clear warning in {language}, using only the FACTS JSON. Do not
invent prices, crop outcomes, nutrient effects, or alternatives. State why the
full plan does not fit, what was reduced or omitted, and one practical way to
avoid the shortfall: increase the budget to fullCost or phase the remaining
nutrients after advice from a local Krishi Vigyan Kendra. Keep all rupee values
exactly as supplied. Plain text only, 2–3 sentences."""
    facts_json = __import__("json").dumps(facts, ensure_ascii=False, separators=(",", ":"))
    last_reason = None

    if groq_available():
        out = await groq_generate(
            system=system, messages=[{"role": "user", "content": facts_json}], max_tokens=220, temperature=0.2,
        )
        if out.get("ok"):
            return {"text": out["text"], "provider": "groq", "model": out.get("model")}
        last_reason = out.get("reason")

    if gemini_available():
        out = await gemini_generate(
            system=system, messages=[{"role": "user", "content": facts_json}], max_tokens=700, temperature=0.2,
        )
        if out.get("ok"):
            return {"text": out["text"], "provider": "gemini", "model": out.get("model")}
        last_reason = out.get("reason")

    return {"text": template_text(), "provider": "template", "degraded": last_reason}


_LANG_NAME = {"en": "English", "hi": "Hindi", "gu": "Gujarati"}
_LANG_TAG = {"en": "(Reply in English.)", "hi": "(उत्तर हिन्दी में दें।)", "gu": "(જવાબ ગુજરાતીમાં આપો.)"}


async def chat(messages: list, recommendation: dict, lang: str = "en") -> dict:
    if not groq_available() and not gemini_available():
        return {"text": _fallback_answer(messages, recommendation, lang), "provider": "template"}

    lang_name = _LANG_NAME.get(lang, "English")
    # Compact, not pretty-printed — Groq's per-minute token budget is tight
    # enough (12k TPM on this tier) that indent whitespace alone can burn a
    # few hundred tokens for nothing.
    context = (
        "RECOMMENDATION JSON (the only source of numbers you may use):\n"
        f"{__import__('json').dumps(recommendation, separators=(',', ':'))}\n\n"
        f"LANGUAGE: write your whole answer in {lang_name}, and only in {lang_name} — "
        "whatever language the question or the data above happens to be in."
    )

    # A system-prompt instruction still drifted against a large JSON payload, so the
    # directive is repeated on the final user turn — the position models weight most.
    # Older turns are dropped: the full grounding JSON is resent every call, so the
    # model doesn't need the whole conversation history to answer, just enough to
    # follow a "what about that" — and every extra turn is TPM budget spent for free.
    tagged = list(messages)[-6:]
    if tagged and tagged[-1]["role"] == "user":
        tag = _LANG_TAG.get(lang, _LANG_TAG["en"])
        tagged[-1] = {**tagged[-1], "content": f"{tagged[-1]['content']}\n\n{tag}"}

    system_prompt = f"{SYSTEM}\n\n{context}"
    last_reason = None

    # The system prompt itself asks for 2-5 sentences; 2000 was pure headroom
    # that Groq's rate limiter pre-charges against the per-minute budget before
    # a single token is generated, which is what was actually exhausting it.
    if groq_available():
        out = await groq_generate(system=system_prompt, messages=tagged, max_tokens=500, temperature=0.4)
        if out["ok"]:
            return {"text": out["text"], "provider": "groq", "model": out.get("model")}
        last_reason = out.get("reason")

    if gemini_available():
        # Flash models spend some of this budget on internal reasoning before
        # the visible answer, so this needs more headroom than Groq's — an
        # 800-token budget cut one real answer off mid-sentence in testing.
        out = await gemini_generate(system=system_prompt, messages=tagged, max_tokens=1500, temperature=0.4)
        if out["ok"]:
            return {"text": out["text"], "provider": "gemini", "model": out.get("model")}
        last_reason = out.get("reason")

    return {"text": _fallback_answer(messages, recommendation, lang), "provider": "template", "degraded": last_reason}


# --------------------------------------------- keyword fallback answering

def _fallback_answer(messages: list, rec: dict, lang: str) -> str:
    q = (messages[-1]["content"] if messages else "").lower()
    t = L.get(lang, L["en"])

    def has(*words):
        return any(w in q for w in words)

    def label(value):
        """Read a localized engine label from either full or compact grounding."""
        if isinstance(value, dict):
            return value.get(lang) or value.get("en") or next((v for v in value.values() if isinstance(v, str)), "")
        return value or ""

    def product_name(product):
        return label(product.get("name")) or product.get("id") or "fertilizer"

    def product_cost(product):
        return product.get("costTotal", product.get("cost"))

    def timing_window():
        advisory = rec.get("advisory") or {}
        # Full recommendation: windows: [{t, reasons}]. Older compact
        # grounding: bestWindows: [{when, why}]. Support both so an AI quota
        # outage never turns a valid timing question into "no information".
        full = (advisory.get("windows") or [None])[0]
        if full:
            return full.get("t"), full.get("reasons") or []
        compact = (advisory.get("bestWindows") or [None])[0]
        if compact:
            return compact.get("when"), compact.get("why") or []
        return None, []

    def crop_suggestions_answer():
        rows = ((rec.get("cropRecommendations") or {}).get("recommendations") or [])[:3]
        if not rows:
            return None
        # These rows were already selected from the wizard details by the crop
        # recommendation endpoint. Reuse them verbatim instead of making a
        # generic soil-health answer when the LLM is unavailable.
        items = []
        for index, row in enumerate(rows, start=1):
            name = label(row.get("name")) or row.get("cropId") or "Crop"
            reason = str(row.get("reason") or "").strip()
            items.append(f"{index}. {name}" + (f" — {reason}" if reason else ""))
        return " ".join(items)

    def asks_for_crops():
        return has(
            "crop", "crops", "best crop", "best crops", "which crop", "which crops",
            "फसल", "फसलें", "कौन सी फसल", "પાક", "કયા પાક",
        )

    # This check must happen before the broad soil/health intent below: a
    # question such as "what crops suit my soil?" contains both word groups.
    if asks_for_crops():
        suggestions = crop_suggestions_answer()
        if suggestions:
            return suggestions
        return t["noinfo"]

    if has("why", "क्यों", "કેમ", "reason"):
        method = rec.get("method_explain") or rec.get("method") or {}
        parts = [f"{key}: {method[key]}" for key in ("N", "P", "K") if isinstance(method, dict) and method.get(key)]
        return f"{template_explain(rec, lang)} {'. '.join(parts)}."
    if has("cost", "price", "rupee", "₹", "कीमत", "दाम", "ભાવ", "કિંમત"):
        products_list = ", ".join(
            f"{product_name(p)} {p.get('bags')} bag (₹{product_cost(p)})"
            for p in (rec.get("products") or [])
        )
        return f"{products_list}. Total ₹{(rec.get('comparison') or {}).get('planCost')}. Blanket dose would cost ₹{(rec.get('comparison') or {}).get('blanketCost')}." if products_list else t["noinfo"]
    if has("when", "time", "rain", "weather", "कब", "बारिश", "ક્યારે", "વરસાદ"):
        window_at, reasons = timing_window()
        if window_at:
            when = window_at if isinstance(window_at, str) else _format_when(window_at)
            prefix = t["wait"]("") if (rec.get("advisory") or {}).get("verdict") == "WAIT" else ""
            return f"{prefix} {t['window'](when, ', '.join(reasons[:2]))}".strip()
        return t["noinfo"]
    if has("dap", "urea", "potash", "mop", "ssp", "खाद", "ખાતર"):
        lst = ". ".join(
            f"{product_name(p)}: {p.get('totalKg')} kg ({p.get('bags')} bag) — {p.get('why', p.get('whyKey', ''))}"
            for p in (rec.get("products") or [])
        )
        return lst or t["noinfo"]
    if has("soil", "health", "मिट्टी", "જમીન"):
        sh = rec.get("soilHealth")
        return f"Your soil health score is {sh['score']} out of 100 — {sh['grade']}." if sh else t["noinfo"]
    if has("location", "where", "place", "जगह", "स्थान", "कहाँ", "ક્યાં", "જગ્યા", "વિસ્તાર"):
        loc = rec.get("location") or rec.get("place") or label(rec.get("zoneName"))
        return t["location"](loc) if loc else t["noinfo"]
    # A short greeting gets a nudge to ask something, not the full plan again
    # — repeating that verbatim for every unmatched message is what reads as
    # broken, not helpful. \b avoids "hi" matching inside e.g. "which".
    if len(q.split()) <= 6 and _re.search(r"\b(hi|hello|hey|yo|namaste|नमस्ते|હાય|કેમ છો)\b", q):
        return t["ask"]
    return template_explain(rec, lang)
