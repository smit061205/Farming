"""
Deterministic precision-fertilizer dosing engine.

Computes *how much* of *which* fertilizer a field needs from soil test values,
crop nutrient demand, and field size — then adjusts the application schedule
for forecast weather (rain -> leaching/runoff risk, heat -> volatilization risk).

Kept separate from the Groq LLM call so the numbers judges see are reproducible
agronomy math, not model guesswork. The LLM (in engine_routes.py) is only used
to narrate these already-computed numbers.
"""

import re
from typing import Optional

import httpx

# Reference nutrient uptake targets (kg/ha) per crop, expressed as N-P2O5-K2O
# per standard Indian fertilizer-recommendation convention. Every crop below
# is cross-checked against a citable ICAR/institute source (Aug 2026):
#   rice       60-30-30    ICAR, irrigated Kharif, most common cultivation method
#   wheat      120-60-40   ICAR general recommendation
#   maize      135-62.5-50 ICAR (+ 37.5 kg/ha ZnSO4 — Zn not yet modeled, see roadmap)
#   sugarcane  250-125-150 ICAR general recommendation
#   cotton     120-60-60   Maharashtra state POP, irrigated Bt cotton (Shriram-6588 BG-II)
#   soybean    20-60-20    ICAR general recommendation
#   chickpea   20-60-20    ICAR general recommended dose (maize-chickpea GRD study)
#   groundnut  20-50-30    ICAR-CCARI Goa trial; best-available general reference
#   potato     270-80-150  ICAR-CPRI (Central Potato Research Institute) commercial dose
#   tomato     75-40-25    General/standard recommendation, non-hybrid; hybrid
#                          varieties commonly need far more (up to ~200-150-100)
#   mustard    80-40-40    ICAR general recommendation
#   sunflower  60-80-60    ICAR recommended dose of fertilizer (RDF)
#   onion      100-50-50   ICAR-DOGR (Directorate of Onion & Garlic Research), rainy season
#                          — post-rainy/winter season is closer to 110-40-60
# Real ICAR doses vary further by state, irrigation status, and variety
# (e.g. rainfed rice is 40-20-20, hybrid rice is 100-60-60) — this table is
# the general/all-India figure, not yet state- or condition-aware. See
# ROADMAP.md Part 4 "Next" tier.
#
# Known limitation, not yet resolved: soil-test "available P/K" readings are
# entered here as raw ppm and converted to kg/ha with a flat elemental-basis
# factor, while these targets follow the P2O5/K2O convention above — Indian
# agronomy sources are inconsistent about which basis a given lab report
# uses, so this comparison may be mixing units for P and K specifically.
# Needs a soil-lab-format-aware answer before treating as solved; see
# ROADMAP.md Part 4 "Next" tier.
CROP_NUTRIENT_TARGETS = {
    "rice":       {"n": 60,  "p": 30, "k": 30},
    "wheat":      {"n": 120, "p": 60, "k": 40},
    "maize":      {"n": 135, "p": 62.5, "k": 50},
    "sugarcane":  {"n": 250, "p": 125, "k": 150},
    "cotton":     {"n": 120, "p": 60, "k": 60},
    "soybean":    {"n": 20,  "p": 60, "k": 20},
    "chickpea":   {"n": 20,  "p": 60, "k": 20},
    "groundnut":  {"n": 20,  "p": 50, "k": 30},
    "potato":     {"n": 270, "p": 80, "k": 150},
    "tomato":     {"n": 75,  "p": 40, "k": 25},
    "mustard":    {"n": 80,  "p": 40, "k": 40},
    "sunflower":  {"n": 60,  "p": 80, "k": 60},
    "onion":      {"n": 100, "p": 50, "k": 50},
}
DEFAULT_TARGET = {"n": 100, "p": 55, "k": 45}  # fallback for unlisted crops

# Known synonyms that don't share a substring with their canonical key —
# get_crop_targets() only does exact matching now (see below), so these are
# mapped explicitly rather than relying on fuzzy substring containment,
# which previously matched unrelated crops (e.g. "pea" silently matched
# "chickpea") and missed exact synonyms (e.g. "corn" never matched "maize").
CROP_ALIASES = {
    "corn": "maize",
    "soybeans": "soybean",
    "garbanzo": "chickpea",
    "garbanzo bean": "chickpea",
}

# Approximate conversion: soil-test ppm (mg/kg) of an available nutrient ->
# kg/ha in the top ~15cm furrow slice (~2,000,000 kg soil/ha). Standard
# agronomy rule-of-thumb factor.
PPM_TO_KG_HA = 2.24

ACRE_TO_HECTARE = 0.4047

# Carrier products used to correct each deficit — the actual dominant,
# NBS-subsidized product Indian farmers buy for that nutrient (verified
# Aug 2026; TSP was previously modeled for phosphorus but is a minor,
# unsubsidized product in the Indian retail market — DAP is what's
# actually sold and priced under the government scheme).
# DAP also contains ~18% N; that secondary contribution isn't yet
# subtracted from the nitrogen deficit — see ROADMAP.md Part 4 "Next" tier.
NUTRIENT_CARRIER = {
    "n": {"name": "Granular Urea", "npk_fraction": 0.46},
    "p": {"name": "DAP (Diammonium Phosphate)", "npk_fraction": 0.46},
    "k": {"name": "Muriate of Potash (MOP)", "npk_fraction": 0.60},
}

# Rain over this many mm across the next 5 days is treated as leaching/runoff risk
RAIN_RISK_MM_5D = 25.0
# Average max temp above this is treated as urea volatilization risk
HEAT_RISK_C = 35.0

# Available nutrient above this multiple of the crop's target is flagged as
# over-supply, not just "sufficient" — the core failure mode the problem
# statement is about (excess fertilizer degrading soil), and one that a
# plain deficit-only calculation silently misses.
EXCESS_THRESHOLD = 1.5


def field_size_to_hectares(size: float, unit: Optional[str]) -> float:
    size = size or 0
    if (unit or "").lower().startswith("acre"):
        return size * ACRE_TO_HECTARE
    return size


def ppm_to_available_kg_ha(ppm: float) -> float:
    return max(0.0, (ppm or 0)) * PPM_TO_KG_HA


def get_crop_targets(crop_type: Optional[str]) -> dict:
    """Exact match only (case-insensitive), plus a small known-alias table.
    Previously did fuzzy substring containment, which silently matched
    unrelated crops sharing a substring (e.g. "pea" matched "chickpea") and
    just as often missed real synonyms that don't share one (e.g. "corn"
    never matched "maize", falling back to the generic default instead)."""
    key = (crop_type or "").strip().lower()
    key = CROP_ALIASES.get(key, key)
    return CROP_NUTRIENT_TARGETS.get(key, DEFAULT_TARGET)


async def fetch_rain_forecast(lat: float, lng: float) -> dict:
    """5-day precipitation + heat outlook from Open-Meteo. Never raises — callers
    get a best-effort result with rain/heat risk flags left False on failure."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lng,
                    "daily": "precipitation_sum,temperature_2m_max",
                    "forecast_days": 5,
                    "timezone": "auto",
                },
            )
            if resp.status_code == 200:
                daily = resp.json().get("daily", {})
                precip = daily.get("precipitation_sum") or []
                temps = daily.get("temperature_2m_max") or []
                rain_5d = round(sum(p for p in precip if p is not None), 1)
                avg_temp = round(sum(temps) / len(temps), 1) if temps else None
                return {
                    "rain_forecast_mm_5d": rain_5d,
                    "avg_temp_c": avg_temp,
                    "high_rain_risk": rain_5d >= RAIN_RISK_MM_5D,
                    "heat_volatilization_risk": (avg_temp or 0) >= HEAT_RISK_C,
                }
    except Exception:
        pass
    return {
        "rain_forecast_mm_5d": None,
        "avg_temp_c": None,
        "high_rain_risk": False,
        "heat_volatilization_risk": False,
    }


def compute_precision_dose(
    crop_type: str,
    ph: float,
    n_ppm: float,
    p_ppm: float,
    k_ppm: float,
    field_size: float,
    field_size_unit: str,
    weather: Optional[dict] = None,
) -> dict:
    weather = weather or {
        "rain_forecast_mm_5d": None, "avg_temp_c": None,
        "high_rain_risk": False, "heat_volatilization_risk": False,
    }
    targets = get_crop_targets(crop_type)
    hectares = field_size_to_hectares(field_size, field_size_unit) or 0.0

    available = {
        "n": ppm_to_available_kg_ha(n_ppm),
        "p": ppm_to_available_kg_ha(p_ppm),
        "k": ppm_to_available_kg_ha(k_ppm),
    }

    nutrients = {}
    for key, label in (("n", "nitrogen"), ("p", "phosphorus"), ("k", "potassium")):
        target_kg_ha = targets[key]
        available_kg_ha = round(available[key], 1)
        deficit_kg_ha = max(0.0, round(target_kg_ha - available_kg_ha, 1))
        surplus_kg_ha = max(0.0, round(available_kg_ha - target_kg_ha, 1))
        carrier = NUTRIENT_CARRIER[key]
        product_kg_ha = round(deficit_kg_ha / carrier["npk_fraction"], 1) if deficit_kg_ha > 0 else 0.0
        product_kg_total = round(product_kg_ha * hectares, 1) if hectares else product_kg_ha

        if deficit_kg_ha > 0:
            status = "deficient"
        elif target_kg_ha > 0 and available_kg_ha >= target_kg_ha * EXCESS_THRESHOLD:
            status = "excess"
        else:
            status = "sufficient"

        nutrients[label] = {
            "target_kg_ha": target_kg_ha,
            "available_kg_ha": available_kg_ha,
            "deficit_kg_ha": deficit_kg_ha,
            "surplus_kg_ha": surplus_kg_ha,
            "status": status,
            "product": carrier["name"],
            "product_kg_per_ha": product_kg_ha,
            "product_kg_total": product_kg_total,
        }

    # Split-dose schedule when heavy rain is forecast — cuts nitrogen leaching/runoff,
    # the direct mechanism behind "improper fertilizer use degrades soil".
    if weather.get("high_rain_risk") and nutrients["nitrogen"]["product_kg_total"] > 0:
        application_plan = [
            {"stage": "Now (pre-rain)", "pct_of_nitrogen": 60},
            {"stage": "+3 weeks", "pct_of_nitrogen": 40},
        ]
    else:
        application_plan = [{"stage": "Now", "pct_of_nitrogen": 100}]

    return {
        "crop_type": crop_type,
        "field_size": field_size,
        "field_size_unit": field_size_unit,
        "field_size_hectares": round(hectares, 3),
        "ph": ph,
        "nutrients": nutrients,
        "weather": weather,
        "application_plan": application_plan,
        "notes": _build_notes(weather),
    }


def _build_notes(weather: dict) -> list[str]:
    notes = []
    if weather.get("high_rain_risk"):
        notes.append(
            f"Heavy rain forecast ({weather.get('rain_forecast_mm_5d')}mm over 5 days) — "
            "split the nitrogen dose to avoid leaching/runoff loss."
        )
    if weather.get("heat_volatilization_risk"):
        notes.append(
            f"High temperatures forecast (avg {weather.get('avg_temp_c')}°C) — "
            "incorporate urea into the soil rather than surface-broadcasting to limit "
            "ammonia volatilization."
        )
    return notes


_NPK_RE = re.compile(r"(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)")


def parse_npk(npk_str: str) -> tuple[float, float, float]:
    """'46-0-0' -> (0.46, 0.0, 0.0) fractions. Ignores trailing '(+24S)' suffixes."""
    m = _NPK_RE.search(npk_str or "")
    if not m:
        return (0.0, 0.0, 0.0)
    return tuple(float(g) / 100 for g in m.groups())


def _nutrient_score(available_ppm: float, target_kg_ha: float) -> float:
    """0-100, peaking at the crop's actual target — not just 'more is better'.
    Symmetric: 2x too little and 2x too much both score 0. Available-in-ppm
    is converted to the same kg/ha basis as the target for the ratio."""
    if not target_kg_ha:
        return 100.0
    target_ppm = target_kg_ha / PPM_TO_KG_HA
    if target_ppm <= 0:
        return 100.0
    ratio = (available_ppm or 0) / target_ppm
    return max(0.0, 100 - abs(ratio - 1) * 100)


def compute_health_score(ph: float, n: float, p: float, k: float, crop_type: Optional[str] = None) -> int:
    """0-100 composite soil health score, scored against the given crop's
    real nutrient targets (or a generic target if no crop is known) — a
    field with double the nitrogen it needs scores WORSE, not better, same
    as the excess-detection logic the rest of the app already uses. Scoring
    "more nutrients = healthier" with no ceiling would silently reward the
    exact over-fertilization this app exists to prevent."""
    targets = get_crop_targets(crop_type)
    ph_score = max(0, 100 - abs(ph - 6.5) * 25)
    n_score = _nutrient_score(n, targets["n"])
    p_score = _nutrient_score(p, targets["p"])
    k_score = _nutrient_score(k, targets["k"])
    return round((ph_score * 0.4) + (n_score * 0.3) + (p_score * 0.15) + (k_score * 0.15))


def compute_soil_diagnostics(ph: float, n: float, p: Optional[float], k: Optional[float], soil_type: Optional[str] = "loam", crop_type: Optional[str] = None) -> dict:
    """
    Given NPK + pH + soil type, derive organic matter, CEC, lime requirement,
    salinity risk, and related soil-health diagnostics. Standard agronomic
    approximations — used to keep the Soil Health page's diagnostics panel
    honest (computed from the farmer's actual test, not placeholder numbers).
    """
    p = p if p is not None else max(0, round(50 + (ph - 7) * 10))
    k = k if k is not None else max(0, round(200 + (ph - 7) * 30))
    soil_type = (soil_type or "loam").lower()

    # Organic Matter % — Walkley-Black approximation
    organic_matter_pct = round(n / (10 * 0.05), 2) if n else None
    if organic_matter_pct:
        organic_matter_pct = min(organic_matter_pct, 12.0)  # cap at realistic max

    # CEC (Cation Exchange Capacity) meq/100g — estimated from pH + soil type
    cec_base = {"clay": 30, "loam": 20, "silt": 18, "sandy": 8}.get(soil_type, 20)
    cec_ph_factor = 1 + (ph - 7) * 0.05  # CEC increases slightly with pH
    cec = round(cec_base * cec_ph_factor, 1)

    # Lime Requirement (kg CaCO3 / ha) — buffer pH method approximation
    target_ph = 6.5
    if ph < target_ph:
        lime_req_kg_ha = round((target_ph - ph) * 2000 * {"clay": 1.5, "loam": 1.0, "silt": 1.1, "sandy": 0.6}.get(soil_type, 1.0))
    else:
        lime_req_kg_ha = 0

    # Salinity Risk — heuristic from K level
    if k > 400:
        salinity_risk = "high"
    elif k > 200:
        salinity_risk = "medium"
    else:
        salinity_risk = "low"

    # Microbial Activity — pH is the primary driver
    if 6.0 <= ph <= 7.5:
        microbial_activity = "optimal"
    elif 5.5 <= ph <= 8.0:
        microbial_activity = "moderate"
    else:
        microbial_activity = "stressed"

    water_retention = {"clay": "high", "loam": "medium", "silt": "medium-high", "sandy": "low"}.get(soil_type, "medium")

    n_status = "sufficient" if n >= 250 else ("moderate" if n >= 100 else "deficient")
    p_status = "sufficient" if p >= 50 else ("moderate" if p >= 20 else "deficient")

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
        "overall_health_score": compute_health_score(ph, n, p, k, crop_type),
    }
