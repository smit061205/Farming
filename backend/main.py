"""AgriSense API — FastAPI port of the reference Node/Express server.

Faithful port of server/src/index.js + routes/api.js: same six endpoints,
same response shapes, so the unmodified Goal frontend (frontend/) works
against this without any changes on its side. Stateless by design — no
accounts, no database — matching the reference exactly.
"""
import time
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data import crops, zones, products, organics, thresholds, slopes, split_patterns, get_crop, get_zone, get_organic
from dosing import compute_dose
from allocate import allocate, allocate_blanket, comparison, spending_priority, budget_allocate, alternatives_for, price_source
from weather import fetch_forecast, evaluate, build_calendar
from impact import soil_health_score, trajectory, environment, ratio_check, income
from ai import chat as ai_chat, template_explain, ai_status
from extract import extract_from_image, parse_soil_text, sanitise, vision_available

app = FastAPI(title="AgriSense API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def num(v, dflt):
    if v is None or v == "":
        return dflt
    try:
        return float(v)
    except (TypeError, ValueError):
        return dflt


def opt_num(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


r1 = lambda n: round(n * 10) / 10

# STCR (Tier A) equations only exist where a university has actually run the
# calibration trials — Gujarat's 3 zones here. Everywhere else falls back to
# Tier B (ICAR published base-dose x soil-class), which is real, nationally
# applicable data — not a Gujarat-specific label stretched over a place it
# was never calibrated for.
GENERIC_ZONE_NAME = {"en": "Your area", "hi": "आपका क्षेत्र", "gu": "તમારો વિસ્તાર"}


@app.get("/api/health")
async def health():
    return {"ok": True, "service": "agrisense", "time": int(time.time() * 1000)}


# ---------------------------------------------------------- reference data

@app.get("/api/meta")
async def meta():
    return {
        "crops": [
            {"id": c["id"], "name": c["name"], "group": c["group"], "tier": c.get("tier"), "target": c["target"], "seasonDays": c.get("seasonDays")}
            for c in crops
        ],
        "zones": zones,
        "products": [
            {"id": p["id"], "name": p["name"], "n": p["n"], "p": p["p"], "k": p["k"], "s": p["s"], "zn": p["zn"], "bagKg": p["bagKg"], "bagPrice": p["bagPrice"]}
            for p in products
        ],
        "organics": organics,
        "thresholds": {
            "soilClasses": thresholds["soilClasses"],
            "deficiency": thresholds["deficiency"],
            "classFactor": thresholds["classFactor"],
            "weatherRules": thresholds["weatherRules"],
            "lossModel": thresholds["lossModel"],
            "impact": thresholds["impact"],
        },
        "priceSource": price_source(),
        "ai": ai_status(),
        "soilUpload": {"vision": vision_available()},
        # Open-Meteo needs no key and is always live — unlike the reference's
        # OpenWeatherMap integration, there's no "unconfigured" state here.
        "weatherConfigured": True,
    }


# -------------------------------------------------------------- recommend

@app.post("/api/recommend")
async def recommend(body: dict):
    try:
        crop_id = body.get("cropId")
        zone = body.get("zone") or None
        soil = body.get("soil") or {}
        target_yield_in = body.get("targetYield")
        area_ha = body.get("areaHa") if body.get("areaHa") is not None else 1
        method = body.get("method") or "broadcast"
        irrigation = body.get("irrigation") or "canal"
        sowing_date = body.get("sowingDate")
        lat = body.get("lat")
        lon = body.get("lon")
        organic = body.get("organic")
        waterlogged = body.get("waterlogged") or False
        lang = body.get("lang") or "en"
        budget = body.get("budget")

        crop = get_crop(crop_id)
        if not crop:
            raise HTTPException(status_code=400, detail=f"Unknown crop: {crop_id}")

        zone_info = get_zone(zone)
        zone_name = zone_info["name"] if zone_info else GENERIC_ZONE_NAME
        soil_texture = zone_info["soilTexture"] if zone_info else "loamy"
        yield_target = (float(target_yield_in) if target_yield_in not in (None, "") else None) or crop["target"]["default"]

        soil_num = {
            "ph": num(soil.get("ph"), 7.5), "oc": opt_num(soil.get("oc")),
            "n": num(soil.get("n"), 200), "p": num(soil.get("p"), 15), "k": num(soil.get("k"), 200),
            "ec": opt_num(soil.get("ec")), "s": opt_num(soil.get("s")), "zn": opt_num(soil.get("zn")),
        }

        organic_spec = None
        if organic and organic.get("id") and organic.get("tonnesPerHa"):
            organic_spec = {"source": get_organic(organic["id"]), "tonnesPerHa": float(organic["tonnesPerHa"])}

        # 1. Dose
        d = compute_dose(crop, slopes, zone, soil_num, yield_target, organic_spec)

        # 2. Products
        plan = allocate(d["dose"], {"sDeficient": d["sDeficient"], "phBand": d["phBand"], "areaHa": area_ha})
        blanket_plan = allocate_blanket(d["blanket"], {"areaHa": area_ha})
        cmp = comparison(plan, blanket_plan)

        # Like-for-like: the blanket dose contains no sulphur or zinc, so compare N-P-K
        # alone, then report the micronutrient correction as a separate, deliberate add.
        npk_only_plan = allocate({**d["dose"], "S": 0, "Zn": 0}, {"sDeficient": False, "phBand": d["phBand"], "areaHa": area_ha})
        npk_cmp = comparison(npk_only_plan, blanket_plan)
        cmp["npkOnly"] = {"planCost": npk_cmp["planCost"], "savedTotal": npk_cmp["savedTotal"], "savedPct": npk_cmp["savedPct"]}
        cmp["microCost"] = plan["costTotal"] - npk_only_plan["costTotal"]
        cmp["microAdded"] = (["S"] if d["dose"]["S"] > 0 else []) + (["Zn"] if d["dose"]["Zn"] > 0 else [])

        # 3. Weather
        if lat is not None and lon is not None:
            fc = await fetch_forecast(float(lat), float(lon))
        else:
            fc = {"blocks": [], "source": "none", "note": "No location given.", "place": None}

        advisory = None
        calendar = []
        if fc["blocks"]:
            advisory = evaluate(fc["blocks"], {
                "doseN": d["dose"]["N"] * area_ha, "doseP": d["dose"]["P"] * area_ha,
                "method": method, "phBand": d["phBand"], "soilTexture": soil_texture,
                "waterlogged": waterlogged, "criticalStage": False,
            })
            if sowing_date:
                pattern = split_patterns.get(crop["split"]) or split_patterns["cereal3"]
                calendar = build_calendar(crop, pattern, sowing_date, d["dose"], fc["blocks"], {"method": method, "phBand": d["phBand"], "soilTexture": soil_texture})

        # 3b. What-if facts — deterministic, so the advisor never has to invent them
        alloc_opts = {"sDeficient": d["sDeficient"], "phBand": d["phBand"], "areaHa": area_ha}
        priority = spending_priority(d["dose"], d["classes"], alloc_opts)
        alternatives = alternatives_for(d["dose"], alloc_opts)
        budget_num = float(budget) if budget not in (None, "") else 0
        budget_plan = budget_allocate(d["dose"], d["classes"], budget_num, alloc_opts) if budget_num > 0 else None

        # 4. Impact
        health = soil_health_score(soil_num)
        traj = trajectory(soil_num, d["dose"], d["blanket"], crop, yield_target)
        env = environment(d["dose"], d["blanket"], area_ha)
        ratio = ratio_check(d["dose"], d["blanket"])
        inc = income(cmp, (advisory or {}).get("risk"), area_ha)

        # Organic cost, if the farmer is substituting
        organic_line = None
        if organic_spec:
            cost = round(organic_spec["source"]["pricePerTonne"] * organic_spec["tonnesPerHa"] * area_ha)
            organic_line = {
                "id": organic["id"], "name": organic_spec["source"]["name"],
                "tonnesPerHa": organic_spec["tonnesPerHa"], "totalTonnes": organic_spec["tonnesPerHa"] * area_ha,
                "cost": cost, "credit": d["organicCredit"],
                "ocGain": round(organic_spec["source"]["ocPerTonne"] * organic_spec["tonnesPerHa"] * 1000) / 1000,
            }

        recommendation = {
            "id": f"rec_{int(time.time() * 1000):x}",
            "createdAt": int(time.time() * 1000),
            "cropId": crop["id"], "cropName": crop["name"].get(lang) or crop["name"]["en"], "cropNames": crop["name"],
            "group": crop["group"], "zone": zone, "zoneName": zone_name, "soilTexture": soil_texture,
            "areaHa": area_ha, "targetYield": yield_target, "method": method, "irrigation": irrigation, "sowingDate": sowing_date,
            "tier": d["tier"],
            "confidence": (
                {"tier": "A", "key": "tierALabel", "params": {"zone": zone_name["en"]}, "zoneNames": zone_name, "label": f"STCR-calibrated for {zone_name['en']}"}
                if d["tier"] == "A" else
                {"tier": "B", "key": "tierBLabel", "params": {}, "label": "ICAR general recommendation — not zone-calibrated"}
            ),
            "soil": soil_num, "classes": d["classes"], "phBand": d["phBand"], "ecBand": d["ecBand"],
            "dose": d["dose"],
            "dosePerField": {
                "N": r1(d["dose"]["N"] * area_ha), "P": r1(d["dose"]["P"] * area_ha), "K": r1(d["dose"]["K"] * area_ha),
                "S": r1(d["dose"]["S"] * area_ha), "Zn": r1(d["dose"]["Zn"] * area_ha),
            },
            "blanket": d["blanket"], "method_explain": d["method"], "zeroDoseReasons": d["zeroDoseReasons"],
            "warnings": d["warnings"], "amendments": d["amendments"],
            "products": plan["items"], "priority": priority, "alternatives": alternatives, "budgetPlan": budget_plan,
            "blanketProducts": blanket_plan["items"], "comparison": cmp,
            "organic": organic_line,
            "weather": {"source": fc["source"], "note": fc.get("note"), "place": fc.get("place"), "blocks": fc["blocks"][:40]},
            "advisory": advisory, "calendar": calendar, "soilHealth": health, "trajectory": traj,
            "environment": env, "ratio": ratio, "income": inc,
        }

        recommendation["explanation"] = {
            "en": template_explain(recommendation, "en"),
            "hi": template_explain(recommendation, "hi"),
            "gu": template_explain(recommendation, "gu"),
        }

        return recommendation
    except HTTPException:
        raise
    except Exception as e:
        print(f"[recommend] {e}")
        raise HTTPException(status_code=500, detail=str(e) or "Recommendation failed")


# ---------------------------------------------------------------- weather

@app.get("/api/weather")
async def weather(lat: Optional[float] = None, lon: Optional[float] = None):
    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="lat and lon required")
    return await fetch_forecast(lat, lon)


# ------------------------------------------------------------------- chat

@app.post("/api/chat")
async def chat_route(body: dict):
    messages = body.get("messages") or []
    recommendation = body.get("recommendation")
    lang = body.get("lang") or "en"
    if not recommendation:
        raise HTTPException(status_code=400, detail="recommendation required")

    # Trim the payload the model sees — it only needs the decided numbers.
    grounding = {
        "crop": recommendation.get("cropName"),
        "areaHa": recommendation.get("areaHa"),
        "tier": recommendation.get("tier"),
        "confidence": (recommendation.get("confidence") or {}).get("label"),
        "soil": recommendation.get("soil"),
        "classes": recommendation.get("classes"),
        "dose": recommendation.get("dose"),
        "dosePerField": recommendation.get("dosePerField"),
        "blanket": recommendation.get("blanket"),
        "zeroDoseReasons": recommendation.get("zeroDoseReasons"),
        "method": recommendation.get("method_explain"),
        "products": [
            {"name": p["name"]["en"], "totalKg": p["totalKg"], "bags": p["bags"], "cost": p["costTotal"], "why": p.get("whyKey")}
            for p in (recommendation.get("products") or [])
        ],
        "comparison": recommendation.get("comparison"),
        "phBand": recommendation.get("phBand"),
        "ecBand": recommendation.get("ecBand"),
        "amendments": recommendation.get("amendments"),
        # Which nutrient to fund first when money is short, and what each step costs
        "spendingPriority": recommendation.get("priority"),
        # Every product that could supply each nutrient, already costed
        "alternatives": recommendation.get("alternatives"),
        "budgetPlan": recommendation.get("budgetPlan"),
        "nutrientBalance": recommendation.get("ratio"),
        "advisory": (lambda a: a and {
            "verdict": a.get("verdict"),
            "reasons": [r.get("message") for r in (a.get("rulesFired") or [])],
            "bestWindows": [{"when": w.get("t"), "why": w.get("reasons")} for w in (a.get("windows") or [])],
            "risk": a.get("risk"),
        })(recommendation.get("advisory")),
        "calendar": [
            {"stage": c["stage"]["en"], "daysAfterSowing": c["daysAfterSowing"], "amounts": c["amounts"]}
            for c in (recommendation.get("calendar") or [])
        ],
        "soilHealth": (lambda h: h and {"score": h.get("score"), "grade": h.get("grade")})(recommendation.get("soilHealth")),
        "environment": recommendation.get("environment"),
        "income": recommendation.get("income"),
        "warnings": [w.get("key") for w in (recommendation.get("warnings") or [])],
    }

    # If the farmer names an amount of money, work out what it actually buys rather
    # than hoping the model reads the priority table correctly. Engine computes,
    # advisor explains — the same rule as everywhere else.
    last_user = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
    import re as _re
    money = _re.search(r"(?:₹|rs\.?|rupees?|रु\.?|રૂ\.?)\s*([\d,]{2,9})|([\d,]{3,9})\s*(?:rupees?|रुपये|રૂપિયા)", last_user, _re.IGNORECASE)
    if money and recommendation.get("dose"):
        amount_str = (money.group(1) or money.group(2) or "").replace(",", "")
        try:
            amount = float(amount_str)
        except ValueError:
            amount = 0
        if 0 < amount < 10_000_000:
            try:
                dose = recommendation["dose"]
                budget_answer = budget_allocate(
                    dose, recommendation.get("classes"), amount,
                    {"areaHa": recommendation.get("areaHa") or 1, "phBand": recommendation.get("phBand"), "sDeficient": (dose.get("S") or 0) > 0},
                )
                budget_answer["askedAbout"] = amount
                grounding["budgetAnswer"] = budget_answer
            except Exception:
                pass  # fall back to the priority table

    out = await ai_chat(messages, grounding, lang)
    return out


# ------------------------------------------------------------ SMS / IVR sim

@app.post("/api/sms-sim")
async def sms_sim(body: dict):
    text = (body.get("text") or "").strip()
    parts = text.split()

    if not parts or parts[0].upper() != "AGRI":
        return {"reply": "Send: AGRI <CROP> <pH> <N> <P> <K> <hectares>\nExample: AGRI WHEAT 6.8 220 18 240 2", "ok": False}

    crop_word = parts[1] if len(parts) > 1 else ""
    crop = next((c for c in crops if c["id"] == crop_word.lower() or c["name"]["en"].lower().startswith(crop_word.lower())), None)
    if not crop:
        return {"reply": "Crop not recognised. Reply with one of: WHEAT, COTTON, GROUNDNUT, BAJRA.", "ok": False}

    ph = parts[2] if len(parts) > 2 else None
    n = parts[3] if len(parts) > 3 else None
    p = parts[4] if len(parts) > 4 else None
    k = parts[5] if len(parts) > 5 else None
    ha = parts[6] if len(parts) > 6 else None

    area_ha = num(ha, 1)
    soil_num = {"ph": num(ph, 7.5), "n": num(n, 200), "p": num(p, 15), "k": num(k, 200), "oc": None, "ec": None, "s": None, "zn": None}
    # No location on an SMS reply — always the generic ICAR tier, never a
    # guessed Gujarat zone.
    d = compute_dose(crop, slopes, None, soil_num, crop["target"]["default"], None)
    plan = allocate(d["dose"], {"sDeficient": d["sDeficient"], "phBand": d["phBand"], "areaHa": area_ha})
    blanket_plan = allocate_blanket(d["blanket"], {"areaHa": area_ha})
    cmp = comparison(plan, blanket_plan)

    bags = ", ".join(f"{i['name']['en']} {i['bags']} bag" for i in plan["items"])
    reply = " ".join([
        f"{crop['name']['en'].upper()} {area_ha}ha:",
        bags or "No fertilizer needed.",
        f"Cost Rs {cmp['planCost']} (save Rs {cmp['savedTotal']}).",
        "Reply H for Hindi, G for Gujarati.",
    ])

    return {"reply": reply, "ok": True, "chars": len(reply), "segments": -(-len(reply) // 160)}


# ---------------------------------------------------- soil report extraction

@app.post("/api/extract-soil")
async def extract_soil(body: dict):
    """Reads a Soil Health Card so the farmer does not have to type it in.
    The response NEVER feeds the engine directly — the client shows every
    value for the farmer to confirm or correct first."""
    try:
        image_base64 = body.get("imageBase64")
        mime = body.get("mime") or "image/jpeg"
        ocr_text = body.get("ocrText")

        if image_base64:
            approx_bytes = len(image_base64) * 0.75
            if approx_bytes > 8 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="Image is too large. Please send one under 8 MB.")
            out = await extract_from_image(image_base64, mime)
            if out.get("ok"):
                return {**out, "needsReview": True}

            # Vision unavailable or failed — fall through to any text the client read.
            if not ocr_text:
                return {
                    "ok": False, "values": {}, "needsReview": True, "method": "none", "reason": out.get("reason"),
                    "notes": "Could not read the card automatically. Typing the values in will be quicker.",
                }

        if ocr_text:
            parsed = parse_soil_text(ocr_text)
            result = sanitise(parsed["values"])
            return {"ok": len(result["values"]) > 0, **parsed, "values": result["values"], "rejected": result["rejected"], "needsReview": True}

        raise HTTPException(status_code=400, detail="Send either imageBase64 or ocrText.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[extract-soil] {e}")
        raise HTTPException(status_code=500, detail=str(e) or "Extraction failed")
