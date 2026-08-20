import os
import re
import json
import math
import base64
import io
import asyncio
import httpx
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

from database import get_db
from auth import get_current_user

try:
    from groq import AsyncGroq
    _groq_available = True
except ImportError:
    _groq_available = False

import gee_client
import ee
import fertilizer_engine
import sustainability_engine

router = APIRouter(prefix="/api/engine", tags=["engine"])

# Initialize GEE at startup if credentials exist
gee_client.initialize_gee()

api_key = os.getenv("GROQ_API_KEY", "").strip().strip('"').strip("'")

def _fetch_satellite_insights_sync(lat: float, lng: float) -> dict:
    """Blocking Earth Engine work — always call via asyncio.to_thread so it
    can't freeze the server's event loop for every other request."""
    from datetime import datetime, timedelta
    end_date = datetime.now()
    start_date = end_date - timedelta(days=60)  # Look back 60 days to bypass winter cloud cover

    point = ee.Geometry.Point([lng, lat])
    roi = point.buffer(200)  # 200m radius around farm

    collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterBounds(roi)
                  .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                  .sort('system:time_start', False))

    count = collection.size().getInfo()
    if count == 0:
        return {"error": "No cloud-free Sentinel-2 imagery found in recent timeframe."}

    image = collection.first()

    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    ndwi = image.normalizedDifference(['B8', 'B11']).rename('NDWI')

    ndvi_mean = ndvi.reduceRegion(ee.Reducer.mean(), geometry=roi, scale=10).get('NDVI').getInfo()
    ndwi_mean = ndwi.reduceRegion(ee.Reducer.mean(), geometry=roi, scale=10).get('NDWI').getInfo()
    image_date = image.date().format('YYYY-MM-dd').getInfo()

    return {
        "ndvi": round(ndvi_mean, 3) if ndvi_mean else 0.0,
        "ndwi": round(ndwi_mean, 3) if ndwi_mean else 0.0,
        "image_date": image_date,
        "info": "LIVE_DATA"
    }


@router.get("/satellite-insights")
async def get_satellite_insights(lat: float, lng: float):
    """
    Query Google Earth Engine for Sentinel-2 satellite imagery over the
    specified coordinates and calculate multispectral indices (NDVI, NDWI).
    """
    if not gee_client.ee_initialized:
        # Graceful fallback if no credentials are provided by user
        import random
        return {
            "ndvi": round(random.uniform(0.65, 0.85), 2),
            "ndwi": round(random.uniform(0.20, 0.40), 2),
            "info": "MOCK_DATA - Upload GEE Credentials (gee_credentials.json) to enable true Sentinel-2 scans"
        }

    try:
        return await asyncio.to_thread(_fetch_satellite_insights_sync, lat, lng)
    except Exception as e:
        print("GEE Pipeline Error:", e)
        import random
        return {
            "ndvi": round(random.uniform(0.65, 0.85), 2),
            "ndwi": round(random.uniform(0.20, 0.40), 2),
            "info": f"MOCK_DATA - GEE Failed: {str(e)}"
        }


def _fetch_satellite_map_sync(lat: float, lng: float, layer_type: str) -> dict:
    """Blocking Earth Engine work — always call via asyncio.to_thread."""
    from datetime import datetime, timedelta
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)  # recent imagery only — a wide date range forces
                                                 # GEE to mosaic hundreds of scenes, which is what
                                                 # made this endpoint take minutes instead of seconds

    point = ee.Geometry.Point(lng, lat)
    roi = point.buffer(200)

    collection = (ee.ImageCollection('COPERNICUS/S2')
                  .filterBounds(roi)
                  .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                  .sort('system:time_start', False))

    if collection.size().getInfo() == 0:
        return {"url": None, "error": "No recent Sentinel-2 imagery available."}

    # Single most-recent scene, not a mosaic — plenty for a 200m field radius and
    # far cheaper for Earth Engine to render into map tiles.
    image = collection.first()

    if layer_type in ['microbial', 'ndvi']:
        # Use NDVI visualization for Biomass/Greenness
        ndvi = image.normalizedDifference(['B8', 'B4'])
        map_id_dict = ndvi.getMapId({
            'min': -0.1,
            'max': 0.8,
            'palette': ['#9f402d', '#fb9f54', '#e7e3ca', '#c5efad', '#173809']
        })
    elif layer_type == 'ndwi':
        # NDWI for moisture (B8 and B11 for canopy water)
        ndwi = image.normalizedDifference(['B8', 'B11'])
        map_id_dict = ndwi.getMapId({
            'min': -0.3,
            'max': 0.4,
            'palette': ['#e7e3ca', '#f8f4db', '#c5efad', '#87ceeb', '#1e90ff', '#00008b']
        })
    elif layer_type == 'truecolor':
        # Visual RGB spectrum
        map_id_dict = image.getMapId({
            'bands': ['B4', 'B3', 'B2'],
            'min': 0, 'max': 3000,
            'gamma': 1.2
        })
    else:  # atmospheric / thermal proxy
        # Pseudo-color representation for Moisture & Atmosphere (SWIR, NIR, GREEN)
        map_id_dict = image.getMapId({
            'bands': ['B12', 'B8', 'B3'],
            'min': 0, 'max': 3000,
            'gamma': 1.5
        })

    tile_url = map_id_dict['tile_fetcher'].url_format
    return {"url": tile_url, "status": "success"}


@router.get("/satellite-map")
async def get_satellite_map(lat: float, lng: float, layer_type: str = 'microbial'):
    if not gee_client.ee_initialized:
        return {"url": None, "error": "GEE not initialized"}

    try:
        return await asyncio.to_thread(_fetch_satellite_map_sync, lat, lng, layer_type)
    except Exception as e:
        print("GEE Map Generation Error:", e)
        return {"url": None, "error": str(e)}

import time as _time
_telemetry_cache: dict = {}   # {(lat2, lng2): (timestamp, data)}
_TELEMETRY_TTL = 300          # seconds — 5 minutes

@router.get("/fetch-telemetry")
async def fetch_telemetry(lat: float, lng: float):
    # Round to 2dp so nearby repeated calls share the same cache entry
    cache_key = (round(lat, 2), round(lng, 2))
    cached = _telemetry_cache.get(cache_key)
    if cached and (_time.time() - cached[0]) < _TELEMETRY_TTL:
        return {"status": "success", "data": cached[1]}

    meteo_url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lng}"
        f"&current=temperature_2m,soil_temperature_0cm,soil_moisture_0_to_1cm"
    )
    telemetry = {"moisture": None, "temperature": None, "ph": None, "nitrogen": None, "source": "unavailable"}

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(meteo_url)
            if resp.status_code == 200:
                current = resp.json().get("current", {})
                raw_moisture = current.get("soil_moisture_0_to_1cm")
                if raw_moisture is not None:
                    telemetry["moisture"] = min(100, round(raw_moisture * 100, 1))
                telemetry["temperature"] = (
                    current.get("soil_temperature_0cm") or current.get("temperature_2m")
                )
                if telemetry["moisture"] is not None or telemetry["temperature"] is not None:
                    telemetry["source"] = "open-meteo"
    except Exception:
        pass  # telemetry stays None/"unavailable" — never synthesize a sensor reading

    _telemetry_cache[cache_key] = (_time.time(), telemetry)
    return {"status": "success", "data": telemetry}


# Fallback data
MOCK_INSIGHTS = {
    "cropCards": [
        {"tag": "Primary Match", "name": "Cabernet Sauvignon", "score": 96, "img": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80", "bg": "#f2efd5", "offset": False},
        {"tag": "Soil Rotation", "name": "Heirloom Carrots", "score": 84, "img": "https://images.unsplash.com/photo-1447175008436-054170c2e979?w=600&q=80", "bg": "#e7e3ca", "offset": True},
        {"tag": "Alternative", "name": "Provence Lavender", "score": 78, "img": "https://images.unsplash.com/photo-1498019559366-a1cbd07b5160?w=600&q=80", "bg": "#f2efd5", "offset": False}
    ],
    "activeIntelligence": [
        {
            "color": "#9f402d",
            "glow": "0 0 15px 2px rgba(159,64,45,0.6)",
            "title": "Low Nitrogen Identified",
            "desc": "Baseline nitrogen is insufficient for optimal yield. Application required.",
            "actionLabel": "View Plan →"
        },
        {
            "color": "#fb9f54",
            "glow": "0 0 15px 2px rgba(251,159,84,0.6)",
            "title": "Weather Threshold",
            "desc": "Predicted relative humidity rise tomorrow. Optimal timing for nutrient absorption.",
            "actionLabel": None
        }
    ]
}

async def _call_groq(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
    """Calls the Groq API asynchronously."""
    if not _groq_available or not api_key:
        raise RuntimeError("Groq SDK not available or no API key")
    
    client = AsyncGroq(api_key=api_key)
    
    kwargs = {"model": "groq/compound-mini"}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    chat_completion = await client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            }
        ],
        **kwargs
    )
    return chat_completion.choices[0].message.content


# Unsplash Source API — keyword-based, no API key, always returns a relevant image
# Format: https://source.unsplash.com/600x400/?{keyword},farm,agriculture
CROP_IMAGE_MAP = {
    "rice":         "https://source.unsplash.com/600x400/?rice,paddy,crop",
    "wheat":        "https://source.unsplash.com/600x400/?wheat,grain,field",
    "corn":         "https://source.unsplash.com/600x400/?corn,maize,harvest",
    "maize":        "https://source.unsplash.com/600x400/?maize,corn,harvest",
    "sugarcane":    "https://source.unsplash.com/600x400/?sugarcane,sugar,farm",
    "cotton":       "https://source.unsplash.com/600x400/?cotton,plant,field",
    "soybean":      "https://source.unsplash.com/600x400/?soybean,legume,farm",
    "soybeans":     "https://source.unsplash.com/600x400/?soybean,legume,farm",
    "barley":       "https://source.unsplash.com/600x400/?barley,grain,golden",
    "lentils":      "https://source.unsplash.com/600x400/?lentil,pulse,legume",
    "chickpea":     "https://source.unsplash.com/600x400/?chickpea,pulse,legume",
    "groundnut":    "https://source.unsplash.com/600x400/?peanut,groundnut,legume",
    "tomato":       "https://source.unsplash.com/600x400/?tomato,red,garden",
    "potato":       "https://source.unsplash.com/600x400/?potato,vegetable,harvest",
    "onion":        "https://source.unsplash.com/600x400/?onion,vegetable,farm",
    "mustard":      "https://source.unsplash.com/600x400/?mustard,yellow,field",
    "sunflower":    "https://source.unsplash.com/600x400/?sunflower,yellow,field",
    "mango":        "https://source.unsplash.com/600x400/?mango,tropical,fruit",
    "banana":       "https://source.unsplash.com/600x400/?banana,tropical,fruit",
    "turmeric":     "https://source.unsplash.com/600x400/?turmeric,spice,yellow",
    "default":      "https://source.unsplash.com/600x400/?agriculture,farm,crop",
}

def _get_crop_image(crop_name: str) -> str:
    key = crop_name.lower().strip()
    for k, v in CROP_IMAGE_MAP.items():
        if k in key:
            return v
    # Fallback: dynamically generate from the crop name itself
    return f"https://source.unsplash.com/600x400/?{crop_name.lower().replace(' ', ',')},agriculture,farm"



@router.get("/insights")
async def get_insights(
    user: dict = Depends(get_current_user),
    n: float = None,
    p: float = None,
    k: float = None,
    ph: float = None,
    crop_type: str = None,
    soil_type: str = None,
) -> Dict[str, Any]:
    """Generates and returns personalized dashboard insights based on latest analysis."""
    db = get_db()

    # Use query params if provided (from latest analysis), else fall back to profile
    soil_ph   = ph  if ph  is not None else float(user.get("soil_data", {}).get("ph",       6.5))
    soil_n    = n   if n   is not None else float(user.get("soil_data", {}).get("nitrogen", 300))
    soil_p    = p   if p   is not None else round(50  + (soil_ph - 7) * 10)
    soil_k    = k   if k   is not None else round(200 + (soil_ph - 7) * 30)
    crop_hint = crop_type or ""
    soil_hint = soil_type or ""

    raw_coords = user.get("coordinates", {})
    if isinstance(raw_coords, dict):
        coords = raw_coords.get("label") or f"{raw_coords.get('lat', '')}° N, {raw_coords.get('lng', '')}° E"
    else:
        coords = raw_coords or "Unknown location"

    # Cache key: bust cache if analysis values have changed
    cache_key = f"{soil_ph}_{soil_n}_{soil_p}_{soil_k}"
    cached = user.get("cached_insights")
    if cached and user.get("cached_insights_key") == cache_key:
        return cached

    if not api_key or not _groq_available:
        print("Warning: No GROQ_API_KEY or SDK not available, returning mock insights.")
        await db["users"].update_one({"_id": user["_id"]}, {"$set": {"cached_insights": MOCK_INSIGHTS, "cached_insights_key": cache_key}})
        return MOCK_INSIGHTS

    system_prompt = (
        "You are an expert farm advisor for the 'AgriSense' app, writing for smallholder farmers. "
        "Use simple, everyday words — avoid technical jargon where a plain word works just as well. "
        "Return ONLY valid JSON. Never use markdown, no code fences, no backticks. "
        "Crop names must be real agricultural crops suitable for the given soil conditions."
    )

    crop_list = ", ".join(CROP_IMAGE_MAP.keys())
    user_prompt = f"""
A field at {coords} has the following soil analysis:
- Nitrogen (N): {soil_n} ppm
- Phosphorus (P): {soil_p} ppm
- Potassium (K): {soil_k} ppm
- pH: {soil_ph}
- Preferred Crop: {crop_hint or "not specified"}
- Soil Type: {soil_hint or "not specified"}

Based on this data, recommend 3 crops from this list: {crop_list}

Return ONLY this JSON structure (no markdown, no backticks):
{{
    "cropCards": [
        {{"tag": "Primary Match", "name": "<Best crop>", "score": <integer 70-99>, "bg": "#f2efd5", "reason": "<2-3 concise sentences about why this crop suits pH {soil_ph} with N={soil_n} ppm, P={soil_p} ppm, K={soil_k} ppm. Mention pH tolerance, key nutrient benefit, and yield advantage.>"}},
        {{"tag": "Soil Rotation", "name": "<Second crop>", "score": <integer 50-80>, "bg": "#e7e3ca", "reason": "<2-3 sentences: suitability and rotation soil health benefit.>"}},
        {{"tag": "Alternative", "name": "<Third crop>", "score": <integer 40-70>, "bg": "#f2efd5", "reason": "<2-3 sentences: viable alternative given the NPK and pH constraints.>"}}
    ],

    "activeIntelligence": [
        {{
            "color": "#9f402d",
            "glow": "0 0 15px 2px rgba(159,64,45,0.6)",
            "title": "<Specific alert based on the above NPK and pH>",
            "desc": "<Actionable advice referencing actual values like pH {soil_ph} or N={soil_n} ppm>",
            "actionLabel": "View Plan →"
        }},
        {{
            "color": "#fb9f54",
            "glow": "0 0 15px 2px rgba(251,159,84,0.6)",
            "title": "<Weather or irrigation alert relevant to this location>",
            "desc": "<Irrigation or timing advice>",
            "actionLabel": null
        }}
    ]
}}
"""

    try:
        text = await _call_groq(system_prompt, user_prompt, json_mode=True)
        data = json.loads(text)

        # Strip any leftover img/offset fields the AI may have included
        for card in data.get("cropCards", []):
            card.pop("img", None)
            card.pop("offset", None)


        await db["users"].update_one(
            {"_id": user["_id"]},
            {"$set": {"cached_insights": data, "cached_insights_key": cache_key}}
        )
        return data
    except Exception as e:
        print(f"Groq insights error: {e}")
        return MOCK_INSIGHTS



@router.get("/soil-report")
async def get_soil_report(lang: str = "en", field_id: str = None, user: dict = Depends(get_current_user)):
    """Returns an AI-generated soil analysis natively in the requested language, for
    the given field (or the primary field if none given). Never falls back to
    invented soil-science copy — if there's no soil test yet, or the AI call
    fails, that's reported honestly so the UI can say so instead of showing a
    generic paragraph as if it were a real personalized reading."""
    resolved_field_id = field_id or "primary"
    soil = _get_soil_source(user, field_id)
    soil_ph = soil.get("ph")
    soil_n = soil.get("nitrogen")
    crop_type = soil.get("cropType") or "your crop"

    if soil_ph is None or soil_n is None:
        return {"status": "no_data", "report": None}

    if (
        user.get("cached_soil_report_field_id") == resolved_field_id
        and user.get("cached_soil_report_lang") == lang
        and user.get("cached_soil_report_ph") == soil_ph
        and user.get("cached_soil_report_n") == soil_n
    ):
        return {"status": "ok", "report": user["cached_soil_report"]}

    if not api_key or not _groq_available:
        return {"status": "unavailable", "report": None}

    raw_coords = user.get("coordinates", {})
    if isinstance(raw_coords, dict):
        coords = raw_coords.get("label") or f"{raw_coords.get('lat', '')}° N, {raw_coords.get('lng', '')}° E"
    else:
        coords = raw_coords or "Unknown location"

    lang_map = {
        "hi": "Hindi",
        "gu": "Gujarati",
        "mr": "Marathi",
        "pa": "Punjabi",
        "ta": "Tamil",
        "te": "Telugu",
        "kn": "Kannada",
        "ml": "Malayalam",
        "bn": "Bengali",
        "or": "Odia"
    }
    native_lang = lang_map.get(lang, "English")

    system_prompt = f"Act as a friendly farm advisor explaining a soil test to a smallholder farmer. Use simple, everyday words and short sentences — avoid technical jargon. Write no markdown. YOU MUST WRITE THE ENTIRE RESPONSE NATIVELY IN {native_lang.upper()}."
    user_prompt = f"""
Write a short, simple paragraph (max 4 sentences) explaining what pH {soil_ph} and Nitrogen {soil_n} ppm mean for {crop_type} in a field located in {coords}.
Cover: whether the soil is in good shape, what the nitrogen level means for the crop in plain terms, and exactly what amendment is needed.
Do NOT use markdown. Write in plain, easy-to-understand {native_lang}.
"""

    try:
        report = await _call_groq(system_prompt, user_prompt, json_mode=False)
        report = report.strip()
        db = get_db()
        await db["users"].update_one(
            {"_id": user["_id"]},
            {"$set": {
                "cached_soil_report": report,
                "cached_soil_report_lang": lang,
                "cached_soil_report_field_id": resolved_field_id,
                "cached_soil_report_ph": soil_ph,
                "cached_soil_report_n": soil_n,
            }}
        )
        return {"status": "ok", "report": report}
    except Exception as e:
        print(f"Groq soil report error: {e}")
        return {"status": "unavailable", "report": None}


@router.delete("/cache")
async def clear_cache(user: dict = Depends(get_current_user)):
    """Clears cached AI insights so they are regenerated fresh."""
    db = get_db()
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$unset": {
            "cached_insights": "", "cached_insights_key": "",
            "cached_soil_report": "", "cached_soil_report_lang": "",
            "cached_soil_report_field_id": "", "cached_soil_report_ph": "", "cached_soil_report_n": "",
        }}
    )
    return {"message": "Cache cleared. Fresh insights will be generated on next load."}


# ── OCR Soil Lab Report ──────────────────────────────────────────────────────

def _pdf_to_images_b64(file_bytes: bytes, max_pages: int = 3) -> list[tuple[str, str]]:
    """Convert PDF pages to base64 PNG using PyMuPDF. No poppler required."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="PyMuPDF not installed. Run: pip install pymupdf")
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    results = []
    for i in range(min(len(doc), max_pages)):
        page = doc[i]
        mat = fitz.Matrix(2.0, 2.0)  # 2× scale ≈ 200 DPI
        pix = page.get_pixmap(matrix=mat)
        b64 = base64.standard_b64encode(pix.tobytes("png")).decode("utf-8")
        results.append((b64, "image/png"))
    doc.close()
    return results


OCR_PROMPT = (
    "This is a soil laboratory report or soil test kit result. "
    "Extract ONLY the following numeric values and return them as valid JSON with no markdown:\n"
    '{"ph": <number or null>, "nitrogen_ppm": <number or null>, '
    '"phosphorus_ppm": <number or null>, "potassium_ppm": <number or null>, '
    '"organic_matter_pct": <number or null>}\n'
    "Rules:\n"
    "- ph: Soil pH (4.0–9.0). Labels: pH, Soil pH, Reaction.\n"
    "- nitrogen_ppm: ppm or mg/kg. Labels: N, Nitrogen, Available N, NH4+, NO3-, N-total, KMnO4-N.\n"
    "- phosphorus_ppm: ppm. Labels: P, Phosphorus, P2O5, Bray P, Olsen P, Available P, Mehlich P.\n"
    "- potassium_ppm: ppm. Labels: K, Potassium, K2O, Exch. K, Available K.\n"
    "- organic_matter_pct: %. Labels: OM, Organic Matter. If only OC given, multiply by 1.724.\n"
    "If kg/ha given, divide by 1 to approximate ppm. Use null if cannot be found. Return ONLY JSON."
)


@router.post("/ocr-soil-report")
async def ocr_soil_report(file: UploadFile = File(...)):
    """
    Accept a soil lab report image (JPG/PNG/WEBP) or PDF.
    Uses PyMuPDF for PDF conversion (no poppler needed).
    Uses Groq Vision to extract N, P, K, pH values across all pages.
    """
    if not api_key or not _groq_available:
        raise HTTPException(status_code=503, detail="Groq API not configured")

    content_type = file.content_type or ""
    filename = (file.filename or "").lower()
    file_bytes = await file.read()

    # Build list of (base64, mime) tuples to pass to vision model
    images_to_scan: list[tuple[str, str]] = []

    if "pdf" in content_type or filename.endswith(".pdf"):
        try:
            images_to_scan = _pdf_to_images_b64(file_bytes, max_pages=4)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"PDF processing failed: {e}")
    elif any(t in content_type for t in ["jpeg", "jpg", "png", "webp"]) or \
         any(filename.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
        mime = content_type if content_type.startswith("image/") else "image/jpeg"
        b64 = base64.standard_b64encode(file_bytes).decode("utf-8")
        images_to_scan = [(b64, mime)]
    else:
        raise HTTPException(status_code=415, detail="Unsupported file type. Use JPG, PNG, WEBP, or PDF.")

    if not images_to_scan:
        raise HTTPException(status_code=422, detail="Could not extract any image from the file.")

    client = AsyncGroq(api_key=api_key)
    aggregated = {"ph": None, "nitrogen_ppm": None, "phosphorus_ppm": None,
                  "potassium_ppm": None, "organic_matter_pct": None}

    for b64, mime in images_to_scan:
        try:
            response = await client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                        {"type": "text", "text": OCR_PROMPT}
                    ]
                }],
                response_format={"type": "json_object"},
                max_tokens=400,
            )
            page_data = json.loads(response.choices[0].message.content)
            # Merge — first non-null value per field wins
            for key in aggregated:
                if aggregated[key] is None and page_data.get(key) is not None:
                    aggregated[key] = page_data[key]
        except Exception as e:
            print(f"OCR page scan error: {e}")
            continue

    if all(v is None for v in aggregated.values()):
        raise HTTPException(
            status_code=422,
            detail="No soil values could be extracted. Ensure the document shows legible NPK and pH readings."
        )

    return {"status": "success", "pages_scanned": len(images_to_scan), "data": aggregated}


# ── Derive Soil Health Metrics ───────────────────────────────────────────────

class DeriveMetricsRequest(BaseModel):
    ph: float
    nitrogen: float
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    soil_type: Optional[str] = "loam"  # clay | loam | sandy | silt
    lat: Optional[float] = None
    lng: Optional[float] = None


@router.post("/derive-soil-metrics")
async def derive_soil_metrics(req: DeriveMetricsRequest):
    """
    Given NPK + pH + soil type, compute derived soil health metrics.
    All calculations based on standard agronomic formulas.
    """
    return fertilizer_engine.compute_soil_diagnostics(req.ph, req.nitrogen, req.phosphorus, req.potassium, req.soil_type)


# ── Precision Fertilizer Recommendation Engine ───────────────────────────────
# Core feature: soil health + crop type + weather patterns -> exact fertilizer
# type & quantity. The dose itself is deterministic agronomy math
# (fertilizer_engine.py); Groq only narrates the already-computed numbers.

_precision_cache: dict = {}   # {user_id: (timestamp, cache_key, response)}
_PRECISION_TTL = 1800  # 30 minutes — weather/soil don't change faster than this


def _get_soil_source(user: dict, field_id: str = None) -> dict:
    """Resolve which field's data to use: the primary field (soil_data,
    field_id None or 'primary') or one of the farmer's additional fields
    by id. Falls back to the primary field if the id isn't found."""
    if field_id and field_id != "primary":
        for f in (user.get("fields") or []):
            if f.get("id") == field_id:
                return f
    return user.get("soil_data") or {}


def _resolve_field_inputs(user: dict, n, p, k, ph, crop_type, field_size, field_size_unit, field_id: str = None) -> dict:
    """Merge explicit query overrides with the resolved field's saved data."""
    soil = _get_soil_source(user, field_id)
    soil_ph = ph if ph is not None else float(soil.get("ph", 6.5))
    soil_n  = n  if n  is not None else float(soil.get("nitrogen", 100))
    soil_p  = p  if p  is not None else float(soil.get("phosphorus") or max(0, round(50 + (soil_ph - 7) * 10)))
    soil_k  = k  if k  is not None else float(soil.get("potassium")  or max(0, round(200 + (soil_ph - 7) * 30)))
    return {
        "ph": soil_ph, "n": soil_n, "p": soil_p, "k": soil_k,
        "crop": crop_type or soil.get("cropType") or "Wheat",
        "size": field_size if field_size is not None else float(soil.get("fieldSize") or 2),
        "size_unit": field_size_unit or soil.get("fieldSizeUnit") or "acres",
        "current_fertilizer": soil.get("currentFertilizer") or None,
        "past_fertilizer": soil.get("pastFertilizer") or None,
        "planting_method": soil.get("plantingMethod") or None,
    }


async def _compute_dose_for_user(user: dict, n, p, k, ph, crop_type, field_size, field_size_unit, field_id: str = None) -> dict:
    f = _resolve_field_inputs(user, n, p, k, ph, crop_type, field_size, field_size_unit, field_id)
    coords = user.get("coordinates", {})
    weather = None
    if isinstance(coords, dict) and coords.get("lat") and coords.get("lng"):
        weather = await fertilizer_engine.fetch_rain_forecast(coords["lat"], coords["lng"])
    dose = fertilizer_engine.compute_precision_dose(
        crop_type=f["crop"], ph=f["ph"], n_ppm=f["n"], p_ppm=f["p"], k_ppm=f["k"],
        field_size=f["size"], field_size_unit=f["size_unit"], weather=weather,
    )
    return dose, f


@router.get("/precision-recommendation")
async def get_precision_recommendation(
    user: dict = Depends(get_current_user),
    n: float = None,
    p: float = None,
    k: float = None,
    ph: float = None,
    crop_type: str = None,
    field_size: float = None,
    field_size_unit: str = None,
    field_id: str = None,
):
    """
    The core endpoint: computes exact fertilizer type + quantity for this field,
    adjusted for the 5-day rain/heat forecast, then asks the AI to explain it.
    field_id selects which of the farmer's fields to compute for — omitted or
    'primary' uses the main field (soil_data); any other id looks it up in
    the farmer's additional fields[] list.
    """
    f = _resolve_field_inputs(user, n, p, k, ph, crop_type, field_size, field_size_unit, field_id)
    soil_ph, soil_n, soil_p, soil_k = f["ph"], f["n"], f["p"], f["k"]
    crop, size, size_unit = f["crop"], f["size"], f["size_unit"]

    cache_key = f"{soil_ph}_{soil_n}_{soil_p}_{soil_k}_{crop}_{size}_{size_unit}"
    user_id = f"{user.get('_id', '')}_{field_id or 'primary'}"
    cached = _precision_cache.get(user_id)
    if cached and cached[1] == cache_key and (_time.time() - cached[0]) < _PRECISION_TTL:
        return cached[2]

    dose, _ = await _compute_dose_for_user(user, n, p, k, ph, crop_type, field_size, field_size_unit, field_id)

    # Attach real per-nutrient cost (NBS-notified MRP, see sustainability_engine.py)
    # directly onto the dose so the Fertilizer Hub can show a cost breakdown per
    # nutrient, not just a single combined total.
    for nutrient in dose["nutrients"].values():
        price_per_kg = sustainability_engine.PRODUCT_PRICE_PER_KG.get(nutrient["product"], 10)
        nutrient["cost_inr"] = round(nutrient["product_kg_total"] * price_per_kg)

    current_fertilizer = f["current_fertilizer"]
    past_fertilizer = f["past_fertilizer"]
    planting_method = f["planting_method"]
    excess_nutrients = [label for label, d in dose["nutrients"].items() if d["status"] == "excess"]

    # Pull the farmer's last few recommendations so the AI can spot a pattern
    # (e.g. nitrogen has been in excess for three visits running) instead of
    # only ever judging this one snapshot in isolation.
    history_line = ""
    try:
        hist_db = get_db()
        # Entries saved before multi-field support have no field_id at all —
        # treat those as belonging to the primary field, same as they always did.
        field_filter = (
            {"$or": [{"field_id": "primary"}, {"field_id": {"$exists": False}}]}
            if not field_id or field_id == "primary"
            else {"field_id": field_id}
        )
        past_cursor = hist_db["recommendation_history"].find(
            {"user_id": user["_id"], **field_filter}
        ).sort("created_at", -1).limit(3)
        past_runs = [doc async for doc in past_cursor]
        if past_runs:
            summaries = []
            for doc in past_runs:
                statuses = {label: d.get("status", "?") for label, d in doc.get("dose", {}).get("nutrients", {}).items()}
                summaries.append(f"- {doc.get('crop_type', '?')}: {statuses}")
            history_line = "Farmer's last few recommendations (oldest pattern first):\n" + "\n".join(summaries)
    except Exception:
        pass  # history is a nice-to-have — never block the recommendation on it

    narrative = None
    if api_key and _groq_available:
        system_prompt = (
            "You are a friendly farm advisor for the AgriSense app, explaining a fertilizer plan to a farmer. "
            "Use simple, everyday words — no technical jargon. "
            "You are given ALREADY-COMPUTED dosing numbers — do not invent different figures, "
            "only explain and contextualize the ones given. "
            "Each nutrient has a status: 'deficient' (needs product), 'sufficient' (at target, no action), "
            "or 'excess' (well above target — this is over-application, the exact problem this app exists to "
            "prevent; a farmer with excess nutrients has likely been over-fertilizing and needs to be told "
            "plainly to STOP applying that nutrient, not just that 'no more is needed'). "
            "Return ONLY valid JSON, no markdown."
        )
        current_fert_line = (
            f'The farmer says they are currently applying: "{current_fertilizer}". '
            "Compare this plan against what they're already doing — say plainly whether to keep, switch, "
            "add to, or stop it, and why."
            if current_fertilizer else
            "The farmer did not say what they currently apply — do not assume, just give the plan."
        )
        past_fert_line = f'They previously used: "{past_fertilizer}".' if past_fertilizer else ""
        planting_line = f'Planting method: {planting_method}.' if planting_method else ""
        excess_line = (
            f"IMPORTANT: {', '.join(excess_nutrients)} are in EXCESS (well above target) — the headline and "
            "explanation MUST lead with this over-supply and its risk (nutrient leaching, wasted past spending, "
            "soil/water harm), not just say the deficit is zero."
            if excess_nutrients else ""
        )
        user_prompt = f"""
Computed precision fertilizer plan for {crop} on a {dose['field_size']} {dose['field_size_unit']} field (pH {soil_ph}):
{json.dumps(dose['nutrients'], indent=2)}

Weather outlook: {json.dumps(dose['weather'])}
Application plan: {json.dumps(dose['application_plan'])}

{current_fert_line}
{past_fert_line}
{planting_line}
{excess_line}

{history_line}

Return ONLY this JSON:
{{
    "headline": "<one short sentence stating the single most important action — lead with over-supply if any nutrient status is 'excess'>",
    "explanation": "<2-3 sentences explaining WHY, referencing the actual deficit/surplus numbers above — call out excess nutrients by name and how far over target they are>",
    "sustainability_note": "<1-2 sentences on how following this exact dose (vs. guessing/over-applying) protects soil health and avoids waste>",
    "current_practice_note": "<1-2 sentences comparing this plan to what the farmer currently applies, or null if they didn't say>",
    "trend_note": "<1 sentence noting a pattern across their past recommendations if one exists (e.g. repeated excess), or null if there's no history or no pattern>"
}}
"""
        try:
            text = await _call_groq(system_prompt, user_prompt, json_mode=True)
            narrative = json.loads(text)
        except Exception as e:
            print(f"Precision recommendation narrative error: {e}")

    if narrative is None:
        narrative = {
            "headline": f"Apply computed doses for {crop} based on current soil deficits.",
            "explanation": "AI narrative unavailable — showing computed agronomy figures only.",
            "sustainability_note": "Applying only the calculated deficit avoids the over-fertilization that degrades soil and wastes input cost.",
            "current_practice_note": None,
            "trend_note": None,
        }

    result = {"status": "success", "dose": dose, "ai": narrative}
    _precision_cache[user_id] = (_time.time(), cache_key, result)

    # Persist to history (best-effort — a logging failure shouldn't break the response)
    try:
        db = get_db()
        await db["recommendation_history"].insert_one({
            "user_id": user["_id"],
            "field_id": field_id or "primary",
            "created_at": _time.time(),
            "crop_type": crop,
            "field_size": size,
            "field_size_unit": size_unit,
            "ph": soil_ph, "n": soil_n, "p": soil_p, "k": soil_k,
            "dose": dose,
            "headline": narrative.get("headline"),
        })
    except Exception as e:
        print(f"Recommendation history logging error: {e}")

    return result


@router.get("/recommendation-history")
async def get_recommendation_history(user: dict = Depends(get_current_user), limit: int = 20, field_id: str = None):
    """Past precision-recommendation runs for this user, newest first. Omit
    field_id to see every field's history together (each entry carries its
    own field_id/crop so the frontend can still distinguish them)."""
    db = get_db()
    query = {"user_id": user["_id"]}
    if field_id:
        query["field_id"] = field_id if field_id != "primary" else {"$in": ["primary", None]}
    cursor = db["recommendation_history"].find(query).sort("created_at", -1).limit(limit)
    history = []
    async for doc in cursor:
        history.append({
            "id": str(doc["_id"]),
            "field_id": doc.get("field_id") or "primary",
            "created_at": doc.get("created_at"),
            "crop_type": doc.get("crop_type"),
            "field_size": doc.get("field_size"),
            "field_size_unit": doc.get("field_size_unit"),
            "headline": doc.get("headline"),
            "nutrients": doc.get("dose", {}).get("nutrients", {}),
        })
    return {"status": "success", "history": history}


@router.get("/sustainability-impact")
async def get_sustainability_impact(
    user: dict = Depends(get_current_user),
    n: float = None,
    p: float = None,
    k: float = None,
    ph: float = None,
    crop_type: str = None,
    field_size: float = None,
    field_size_unit: str = None,
    field_id: str = None,
):
    """
    Quantifies what following the precision dose (vs. typical blanket over-application)
    means for fertilizer savings, avoided emissions, and projected yield/income —
    the "sustainable practice + farmer income" half of the problem statement.
    """
    dose, f = await _compute_dose_for_user(user, n, p, k, ph, crop_type, field_size, field_size_unit, field_id)
    impact = sustainability_engine.compute_sustainability_impact(dose, f["ph"], f["n"], f["p"], f["k"])
    return {"status": "success", "impact": impact}


# ── Fertilizer Hub ───────────────────────────────────────────────────────────

FERTILIZER_DB = [
    {
        "id": "f1",
        "name": "Granular Urea",
        "type": "Synthetic",
        "npk": "46-0-0",
        "description": "High-concentration solid nitrogen fertilizer. Dissolves rapidly, providing an immediate nitrogen flush.",
        "bestFor": "Corn, Wheat, Heavy Vegetative Growers"
    },
    {
        "id": "f2",
        "name": "Triple Superphosphate (TSP)",
        "type": "Synthetic",
        "npk": "0-46-0",
        "description": "Premium phosphate formulation specifically targeted string rooting and early-stage flowering.",
        "bestFor": "Legumes, Tubers, Young Orchards"
    },
    {
        "id": "f3",
        "name": "Muriate of Potash (MOP)",
        "type": "Synthetic",
        "npk": "0-0-60",
        "description": "High potassium concentrate critical for disease resistance, drought tolerance, and fruit swelling.",
        "bestFor": "Potatoes, Tomatoes, Vineyards"
    },
    {
        "id": "f4",
        "name": "Blood Meal",
        "type": "Organic",
        "npk": "12-0-0",
        "description": "A very rapid, organic source of high nitrogen. Also effectively deters some mammalian pests.",
        "bestFor": "Brassicas, Leafy Greens"
    },
    {
        "id": "f5",
        "name": "Bone Meal",
        "type": "Organic",
        "npk": "3-15-0",
        "description": "Slow-release phosphorus from steamed animal bones. Essential for massive root networks and robust blooming.",
        "bestFor": "Root Vegetables, Bulbs, Roses"
    },
    {
        "id": "f6",
        "name": "Kelp Meal",
        "type": "Organic",
        "npk": "1-0-2",
        "description": "Marine-derived bioactive amendment loaded with micronutrients, trace minerals, and natural growth hormones.",
        "bestFor": "Stress Recovery, Organic Berries"
    },
    {
        "id": "f7",
        "name": "Ammonium Sulfate",
        "type": "Synthetic",
        "npk": "21-0-0 (+24S)",
        "description": "Delivers dual-action Nitrogen and Sulfur. Excellent for lowering pH in alkaline soils over time.",
        "bestFor": "Blueberries, Alkaline Soils"
    },
    {
        "id": "f8",
        "name": "DAP (Diammonium Phosphate)",
        "type": "Synthetic",
        "npk": "18-46-0",
        "description": "The world's most widely used phosphorus fertilizer. Temporarily raises pH near the granule.",
        "bestFor": "Cereals, Oilseeds"
    },
    {
        "id": "f9",
        "name": "Calcium Nitrate",
        "type": "Synthetic",
        "npk": "15.5-0-0 (+19Ca)",
        "description": "Highly soluble calcium and nitrogen. Prevents blossom end rot and builds strong cell walls.",
        "bestFor": "Peppers, Apples, Tomatoes"
    },
    {
        "id": "f10",
        "name": "Worm Castings",
        "type": "Organic",
        "npk": "1-0-0",
        "description": "The ultimate organic bioactive matrix. Improves soil structure, aeration, and introduces immense microbial life.",
        "bestFor": "Seedlings, High-Value Organics, Cannabis"
    }
]

@router.get("/fertilizer-encyclopedia")
async def get_fertilizer_encyclopedia():
    return {"status": "success", "data": FERTILIZER_DB}


# ── AI Consultant (Chatbot) ──────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str
    
class ChatRequest(BaseModel):
    messages: list[ChatMessage]

@router.post("/chat")
async def ai_consultation_chat(req: ChatRequest, current_user = Depends(get_current_user)):
    """
    Stateful chat endpoint for the AI Agronomist. 
    Injects the user's soil context natively into the AI's persona.
    """
    if not api_key or not _groq_available:
        return {"status": "error", "reply": "System offline: Groq API credentials missing."}

    # Extract user context wrapper — coordinates/soil_data may be stored as
    # explicit None (not just absent), so `.get(key, {})` alone isn't enough.
    soil = current_user.get("soil_data") or {}
    coordinates = current_user.get("coordinates") or {}
    context_str = f"""
    FARMER PROFILE CONTEXT:
    - Name: Farmer
    - Location Coordinate Info: {coordinates.get('label', 'Unknown')}
    - Latest Soil Scan: pH={soil.get('ph', 'N/A')}, N={soil.get('nitrogen', 'N/A')}ppm, P={soil.get('phosphorus', 'N/A')}ppm, K={soil.get('potassium', 'N/A')}ppm.
    - Crop: {soil.get('cropType', 'N/A')}, Field Size: {soil.get('fieldSize', 'N/A')} {soil.get('fieldSizeUnit', '')}, Growth Stage: {soil.get('growthStage', 'N/A')}.
    """

    system_prompt = {
        "role": "system",
        "content": f"""You are the AgriSense fertilizer advisor — a friendly expert who helps farmers choose the right fertilizer, the right amount, and the right time to apply it.
You MUST provide concise, accurate, actionable advice tailored to the farmer's exact soil, crop, and field data below.
Use simple, everyday words a farmer with no chemistry background would understand — avoid technical jargon.
Stay focused on fertilizer type, quantity, timing, and sustainable practice — this is not a general farming chatbot.
Respond natively in whatever language the user speaks. Write in plain text only — no markdown at all: no asterisks, no bold, no headers, no hashtags. If you need a list, start each line with a plain dash.
Do not offer generalities. Use the exact data below to answer their questions.

{context_str}
        """
    }

    # Prepare message payload
    payload = [system_prompt]
    # Keep the last 15 messages so payload doesn't overflow context limits
    payload.extend([{"role": m.role, "content": m.content} for m in req.messages[-15:]])

    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=api_key)
        response = await client.chat.completions.create(
            model="groq/compound-mini",
            messages=payload,
            temperature=0.6,
            max_tokens=600
        )
        reply = response.choices[0].message.content
        reply = re.sub(r'\*\*(.*?)\*\*', r'\1', reply)  # **bold** -> bold
        reply = reply.replace('*', '').replace('#', '')
        return {"status": "success", "reply": reply}
    except Exception as e:
        print(f"Chatbot Engine error: {e}")
        raise HTTPException(status_code=500, detail="AI Brain unavailable. Please try again later.")
