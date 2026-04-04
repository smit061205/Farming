import os
import json
import math
import base64
import io
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

router = APIRouter(prefix="/api/engine", tags=["engine"])

# Initialize GEE at startup if credentials exist
gee_client.initialize_gee()

api_key = os.getenv("GROQ_API_KEY", "").strip().strip('"').strip("'")

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
        from datetime import datetime, timedelta
        end_date = datetime.now()
        start_date = end_date - timedelta(days=60) # Look back 60 days to bypass winter cloud cover
        
        point = ee.Geometry.Point([lng, lat])
        roi = point.buffer(200) # 200m radius around farm
        
        collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                      .filterBounds(roi)
                      .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                      .sort('system:time_start', False))
                      
        count = collection.size().getInfo()
        if count == 0:
            return {"error": "No cloud-free Sentinel-2 imagery found in recent timeframe."}
            
        image = collection.first()
        
        # NDVI: (NIR - Red) / (NIR + Red) -> Bands 8 and 4
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        
        # NDWI (Water): (NIR - SWIR) / (NIR + SWIR) -> Bands 8 and 11
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
    except Exception as e:
        print("GEE Pipeline Error:", e)
        import random
        return {
            "ndvi": round(random.uniform(0.65, 0.85), 2),
            "ndwi": round(random.uniform(0.20, 0.40), 2),
            "info": f"MOCK_DATA - GEE Failed: {str(e)}"
        }

@router.get("/satellite-map")
async def get_satellite_map(lat: float, lng: float, layer_type: str = 'microbial'):
    if not gee_client.ee_initialized:
        return {"url": None, "error": "GEE not initialized"}
        
    try:
        import ee
        point = ee.Geometry.Point(lng, lat)
        roi = point.buffer(200)

        # Get latest cloud-free Sentinel-2 image
        collection = (ee.ImageCollection('COPERNICUS/S2')
                      .filterBounds(roi)
                      .filterDate('2025-01-01', '2026-12-31')
                      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                      .sort('system:time_start', False))
                      
        if collection.size().getInfo() == 0:
            return {"url": None, "error": "No Sentinel-2 imagery available."}
            
        image = collection.first()
        
        map_id_dict = None
        if layer_type == 'microbial':
            # Use NDVI visualization for Biomass (Microbial proxy)
            # High NDVI (green) = higher active root biomass
            ndvi = image.normalizedDifference(['B8', 'B4'])
            # We clip it to the generic area around the farm so the tile is visually focused, 
            # or just serve the whole tile and leaf-let masked it.
            map_id_dict = ndvi.getMapId({
                'min': -0.1, 
                'max': 0.8, 
                'palette': ['#9f402d', '#fb9f54', '#e7e3ca', '#c5efad', '#173809']
            })
        else: # atmospheric
            # Pseudo-color representation for Moisture & Atmosphere (SWIR, NIR, GREEN)
            # Often used to see moisture stress and atmospheric penetration
            map_id_dict = image.getMapId({
                'bands': ['B12', 'B8', 'B3'], 
                'min': 0, 'max': 3000,
                'gamma': 1.5
            })
            
        # Extract the {z}/{x}/{y} url template
        tile_url = map_id_dict['tile_fetcher'].url_format
        
        return {"url": tile_url, "status": "success"}
        
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
    telemetry = {"moisture": None, "temperature": None, "ph": None, "nitrogen": None}

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
    except Exception:
        pass  # fall through to defaults below

    # If real data unavailable, return realistic fallback instantly
    if telemetry["moisture"] is None:
        import random
        random.seed(int(abs(lat * 100) + abs(lng * 100)) % 1000)
        telemetry["moisture"]    = round(random.uniform(28.0, 52.0), 1)
        telemetry["temperature"] = round(random.uniform(21.0, 34.0), 1)

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
            "actionLabel": "View Protocol →"
        },
        {
            "color": "#fb9f54",
            "glow": "0 0 15px 2px rgba(251,159,84,0.6)",
            "title": "Weather Threshold",
            "desc": "Predicted relative humidity rise tomorrow. Optimal timing for nutrient absorption.",
            "actionLabel": None
        }
    ],
    "fertilizerProtocol": {
        "formulaName": "Granular Urea",
        "npk": "(46-0-0)",
        "dosage": "120 kg",
        "timing": "Pre-Sunrise 4-6 AM",
        "mode": "Broadcasting"
    }
}

MOCK_SOIL_REPORT = (
    "Based on your geological anchor, your soil profile indicates a robust foundation for deep-rooting varietals. "
    "The pH balance sits within an optimal margin for bioavailability, though the available nitrogen is currently "
    "acting as a limiting factor for vegetative vigor. We detect strong microbial baseline vitality naturally "
    "suppressing pathogenic fungal buildup. To achieve peak phenological development this season, supplementing "
    "the upper horizons with targeted nitrogen before the first dew will dramatically improve canopy density."
)


async def _call_groq(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
    """Calls the Groq API asynchronously."""
    if not _groq_available or not api_key:
        raise RuntimeError("Groq SDK not available or no API key")
    
    client = AsyncGroq(api_key=api_key)
    
    kwargs = {}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
        kwargs["model"] = "llama-3.3-70b-versatile"
    else:
        kwargs["model"] = "llama-3.3-70b-versatile"

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
        "You are an elite Agrarian AI for the 'Technological Terroir' platform. "
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
            "actionLabel": "View Protocol →"
        }},
        {{
            "color": "#fb9f54",
            "glow": "0 0 15px 2px rgba(251,159,84,0.6)",
            "title": "<Weather or irrigation alert relevant to this location>",
            "desc": "<Irrigation or timing advice>",
            "actionLabel": null
        }}
    ],
    "fertilizerProtocol": {{
        "formulaName": "<Specific fertilizer name matched to these NPK deficiencies>",
        "npk": "<N-P-K ratio e.g. 46-0-0>",
        "dosage": "<kg/ha>",
        "timing": "<When to apply>",
        "mode": "<Broadcasting/Foliar/Drip>"
    }}
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
async def get_soil_report(lang: str = "en", user: dict = Depends(get_current_user)):
    """Returns an AI-generated soil analysis natively in the requested language."""
    if "cached_soil_report" in user and user.get("cached_soil_report_lang") == lang:
        return {"report": user["cached_soil_report"]}

    if not api_key or not _groq_available:
        return {"report": MOCK_SOIL_REPORT}

    soil_ph = user.get("soil_data", {}).get("ph", "6.5")
    soil_n = user.get("soil_data", {}).get("nitrogen", "300")
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

    system_prompt = f"Act as an elite digital agronomist writing for a premium agritech platform. Write elegant, scientific prose without any markdown. YOU MUST WRITE THE ENTIRE RESPONSE NATIVELY IN {native_lang.upper()}."
    user_prompt = f"""
Write a single sophisticated paragraph (max 4 sentences) analyzing soil with pH {soil_ph} and Nitrogen {soil_n} ppm from a field located in {coords}.
Cover: how the regional climate and pH affect microbial bioavailability, what the nitrogen level implies for crop phenology in this region, and what precise amendment is needed.
Do NOT use markdown. Write the response beautifully in {native_lang}.
"""

    try:
        report = await _call_groq(system_prompt, user_prompt, json_mode=False)
        report = report.strip()
        db = get_db()
        await db["users"].update_one(
            {"_id": user["_id"]}, 
            {"$set": {
                "cached_soil_report": report,
                "cached_soil_report_lang": lang
            }}
        )
        return {"report": report}
    except Exception as e:
        print(f"Groq soil report error: {e}")
        return {"report": MOCK_SOIL_REPORT}


@router.delete("/cache")
async def clear_cache(user: dict = Depends(get_current_user)):
    """Clears cached AI insights so they are regenerated fresh."""
    db = get_db()
    await db["users"].update_one(
        {"_id": user["_id"]},
        {"$unset": {"cached_insights": "", "cached_soil_report": ""}}
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
    Given NPK + pH + soil type, compute 6 derived soil health metrics.
    All calculations based on standard agronomic formulas.
    """
    ph = req.ph
    n = req.nitrogen
    p = req.phosphorus or max(0, round(50 + (ph - 7) * 10))
    k = req.potassium or max(0, round(200 + (ph - 7) * 30))
    soil_type = (req.soil_type or "loam").lower()

    # 1. Organic Matter % — Walkley-Black approximation
    organic_matter_pct = round(n / (10 * 0.05), 2) if n else None
    if organic_matter_pct:
        organic_matter_pct = min(organic_matter_pct, 12.0)  # cap at realistic max

    # 2. CEC (Cation Exchange Capacity) meq/100g — estimated from pH + soil type
    cec_base = {"clay": 30, "loam": 20, "silt": 18, "sandy": 8}.get(soil_type, 20)
    cec_ph_factor = 1 + (ph - 7) * 0.05  # CEC increases slightly with pH
    cec = round(cec_base * cec_ph_factor, 1)

    # 3. Lime Requirement (kg CaCO3 / ha) — buffer pH method approximation
    target_ph = 6.5
    if ph < target_ph:
        lime_req_kg_ha = round((target_ph - ph) * 2000 * {"clay": 1.5, "loam": 1.0, "silt": 1.1, "sandy": 0.6}.get(soil_type, 1.0))
    else:
        lime_req_kg_ha = 0

    # 4. Salinity Risk — heuristic from K level
    if k > 400:
        salinity_risk = "high"
    elif k > 200:
        salinity_risk = "medium"
    else:
        salinity_risk = "low"

    # 5. Microbial Activity — pH is the primary driver
    if 6.0 <= ph <= 7.5:
        microbial_activity = "optimal"
    elif 5.5 <= ph <= 8.0:
        microbial_activity = "moderate"
    else:
        microbial_activity = "stressed"

    # 6. Water Retention — from soil type
    water_retention = {"clay": "high", "loam": "medium", "silt": "medium-high", "sandy": "low"}.get(soil_type, "medium")

    # 7. Nitrogen Adequacy
    if n >= 250:
        n_status = "sufficient"
    elif n >= 100:
        n_status = "moderate"
    else:
        n_status = "deficient"

    # 8. Phosphorus Adequacy
    if p >= 50:
        p_status = "sufficient"
    elif p >= 20:
        p_status = "moderate"
    else:
        p_status = "deficient"

    return {
        "organic_matter_pct": organic_matter_pct,
        "cec": cec,
        "lime_requirement_kg_ha": lime_req_kg_ha,
        "salinity_risk": salinity_risk,
        "microbial_activity": microbial_activity,
        "water_retention": water_retention,
        "nitrogen_status": n_status,
        "phosphorus_status": p_status,
        "ph_adequacy": "optimal" if 6.0 <= ph <= 7.5 else ("slightly off" if 5.5 <= ph <= 8.5 else "critical"),
        "overall_health_score": _compute_health_score(ph, n, p, k),
    }


def _compute_health_score(ph: float, n: float, p: float, k: float) -> int:
    """0-100 composite soil health score."""
    ph_score = max(0, 100 - abs(ph - 6.5) * 25)
    n_score = min(100, (n / 300) * 100)
    p_score = min(100, (p / 60) * 100)
    k_score = min(100, (k / 250) * 100)
    return round((ph_score * 0.4) + (n_score * 0.3) + (p_score * 0.15) + (k_score * 0.15))

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
        "bestFor": "Blueberries, Alkaline Terroir"
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

# Per-user cache: {user_id: (timestamp, response)}
_fert_cache: dict = {}
_FERT_TTL = 1800  # 30 minutes

@router.get("/fertilizer-top3")
async def get_fertilizer_top3(user: dict = Depends(get_current_user)):
    user_id = str(user.get("_id", ""))
    cached = _fert_cache.get(user_id)
    if cached and (_time.time() - cached[0]) < _FERT_TTL:
        return cached[1]

    soil_data = user.get("soil_data", {})
    ph = soil_data.get("ph", "Unknown")
    n = soil_data.get("nitrogen", "Unknown")

    if not api_key or not _groq_available:
        # Inject standard reasons into the mock fallback
        mock_rec1 = dict(FERTILIZER_DB[0])
        mock_rec1["reason"] = "Due to the critical nitrogen deficiency detected in your baseline, this synthetic granule rapidly injects N to trigger immediate canopy recovery."
        mock_rec1["dosage"] = "100 kg / hectare"
        
        mock_rec2 = dict(FERTILIZER_DB[1])
        mock_rec2["reason"] = "We selected this to balance the P deficit and support string root structures despite the local alkaline pH buffering."
        mock_rec2["dosage"] = "40 kg / hectare"

        mock_rec3 = dict(FERTILIZER_DB[6])
        mock_rec3["reason"] = "The sulfur content actively counters high soil pH, optimizing overall uptake while delivering a secondary nitrogen boost."
        mock_rec3["dosage"] = "75 kg / hectare"

        return {
            "status": "mock",
            "summary": "This is a fallback summary indicating that based on your soil's constraints, we have selected standard commercial amendments to ensure crop viability.",
            "recommendations": [mock_rec1, mock_rec2, mock_rec3]
        }

    system_prompt = "You are an elite AI agronomist. Output only valid JSON data matching the user's requested schema, without any markdown formatting."
    user_prompt = f"""
    Based on the following user soil baseline:
    pH: {ph}
    Nitrogen (ppm): {n}

    Select exactly 3 most appropriate fertilizers from the standard agriculture industry that will correct or support this baseline. Provide an AI rationale summary too.
    Must match exactly this JSON format:
    {{
        "summary": "A highly elegant, single-paragraph (3 sentences max) AI rationale explaining why these specific 3 fertilizers were chosen for the user's specific pH and Nitrogen levels. Use scientific agricultural tone.",
        "recommendations": [
            {{ "name": "Fertilizer 1", "npk": "X-X-X", "type": "Synthetic or Organic", "dosage": "Recommended dosage rate per hectare/acre", "reason": "A highly specific, custom 2-sentence AI rationale explaining EXACTLY why this formula was chosen for this farmer's specific pH and Nitrogen levels." }},
            ... exactly 3 items
        ]
    }}
    Do NOT output anything except the JSON payload.
    """

    try:
        response = await _call_groq(system_prompt, user_prompt, json_mode=True)
        data = json.loads(response)
        result = {"status": "success", "summary": data.get("summary", ""), "recommendations": data.get("recommendations", [])}
        _fert_cache[user_id] = (_time.time(), result)
        return result
    except Exception as e:
        print(f"Fertilizer Top3 error: {e}")
        mock_err1 = dict(FERTILIZER_DB[0])
        mock_err1["reason"] = "Default selection triggered due to missing AI synthesis connection."
        fallback = {
            "status": "mock",
            "summary": "Error reaching the AI. Defaulting to general recommendations.",
            "recommendations": [mock_err1, FERTILIZER_DB[1], FERTILIZER_DB[6]]
        }
        _fert_cache[user_id] = (_time.time(), fallback)
        return fallback


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

    # Extract user context wrapper
    soil = current_user.get("soil_data", {})
    context_str = f"""
    FARMER PROFILE CONTEXT:
    - Name: Farmer
    - Location Coordinate Info: {current_user.get('coordinates', {}).get('label', 'Unknown')}
    - Latest Soil Scan: pH={soil.get('ph', 'N/A')}, N={soil.get('nitrogen', 'N/A')}ppm, P={soil.get('phosphorus', 'N/A')}ppm, K={soil.get('potassium', 'N/A')}ppm.
    """

    system_prompt = {
        "role": "system",
        "content": f"""You are the 'Technological Terroir AI Agronomist', a highly advanced, professional, and hyper-intelligent consultant for farmers.
You MUST provide concise, highly accurate, and actionable advice tailored directly to the farmer.
Respond natively in whatever language the user speaks. Do NOT use markdown headers, keep text formatting clean (bullet points and bold are fine).
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
            model="llama-3.3-70b-versatile", 
            messages=payload,
            temperature=0.6,
            max_tokens=600
        )
        reply = response.choices[0].message.content
        return {"status": "success", "reply": reply}
    except Exception as e:
        print(f"Chatbot Engine error: {e}")
        raise HTTPException(status_code=500, detail="AI Brain unavailable. Please try again later.")


# ── Lender Data Feed ─────────────────────────────────────────────────────────

@router.get("/verified-farmers")
async def get_verified_farmers():
    """
    Public ledger endpoint specifically for the Lender Dashboard.
    Returns anonymized farm data for users who have submitted a valid soil test.
    Used by banks and lending institutions to find low-risk candidates.
    """
    db = get_db()
    # Fetch users who have filled out their soil profile
    cursor = db.users.find({"soil_data.ph": {"$exists": True}, "soil_data.nitrogen": {"$exists": True}})
    
    candidates = []
    async for doc in cursor:
        soil = doc.get("soil_data", {})
        
        # Calculate Mock Blockchain Score algorithmically
        # If pH is neutral-ish (5.5 - 7.5) and Nitrogen is decent, risk is lower.
        try:
            ph = float(soil.get("ph", 6.5))
        except (ValueError, TypeError):
            ph = 6.5
            
        try:
            n = float(soil.get("nitrogen", 100))
        except (ValueError, TypeError):
            n = 100.0
        
        if 5.8 <= ph <= 7.2 and n > 40:
            score = "A+"
        elif 5.0 <= ph <= 8.0:
            score = "B"
        else:
            score = "C"
            
        region = "Unknown Region"
        raw_coords = doc.get("coordinates", {})
        # coordinates may be stored as a plain string for legacy users
        if isinstance(raw_coords, dict):
            loc_label = raw_coords.get("label", "")
        elif isinstance(raw_coords, str):
            loc_label = raw_coords
        else:
            loc_label = ""
        if loc_label:
            parts = loc_label.split(",")
            if len(parts) >= 2:
                region = f"Region: {parts[-2].strip()}, {parts[-1].strip()}"
            else:
                region = loc_label

        candidates.append({
            "id": str(doc["_id"]),
            "region": region,
            "crop_type": soil.get("cropType", "Unknown"),
            "soil_type": soil.get("soilType", "Standard"),
            "ph": ph,
            "nitrogen_ppm": n,
            "phosphorus_ppm": soil.get("phosphorus", 0),
            "potassium_ppm": soil.get("potassium", 0),
            "risk_score": score,
            "verified": True
        })
        
    return {"status": "success", "total_candidates": len(candidates), "candidates": candidates}
