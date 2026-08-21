"""Weather advisory engine.

Ported from the reference Node server's engines/weather.js. Rain is both
friend and enemy: light rain carries urea into the soil, heavy rain washes
it off the field. The rules below encode that distinction.

fetch_forecast() is the one function NOT ported verbatim — the reference
used OpenWeatherMap (needs a paid-tier key we don't have); this uses
Open-Meteo instead (no key required), bucketed into the same 3-hour block
shape {t, tempC, humidity, windKmh, rainMm, desc, icon} so every pure
function below (evaluate/bestWindows/lossEstimate/buildCalendar) works
completely unchanged.
"""
import time
from datetime import datetime, timezone

import httpx

from data import thresholds, get_product

R = thresholds["weatherRules"]
L = thresholds["lossModel"]

H = 3600 * 1000  # one hour in ms, matching the reference's block-timestamp unit


# ------------------------------------------------------------------ fetch

async def fetch_forecast(lat: float, lon: float) -> dict:
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
                    "forecast_days": 5,
                    "timezone": "auto",
                    "wind_speed_unit": "kmh",
                },
            )
            if resp.status_code != 200:
                return {"blocks": _mock_forecast(), "source": "mock", "note": f"Weather service unavailable ({resp.status_code}) — showing a sample forecast."}
            data = resp.json()
    except Exception:
        return {"blocks": _mock_forecast(), "source": "mock", "note": "Weather service unavailable — showing a sample forecast."}

    hourly = data.get("hourly") or {}
    times = hourly.get("time") or []
    if not times:
        return {"blocks": _mock_forecast(), "source": "mock", "note": "No forecast data returned — showing a sample forecast."}

    temps = hourly.get("temperature_2m") or []
    hums = hourly.get("relative_humidity_2m") or []
    precs = hourly.get("precipitation") or []
    winds = hourly.get("wind_speed_10m") or []
    codes = hourly.get("weather_code") or []

    blocks = []
    for i in range(0, len(times), 3):
        group = range(i, min(i + 3, len(times)))
        t_ms = int(datetime.fromisoformat(times[i]).replace(tzinfo=timezone.utc).timestamp() * 1000)
        rain3h = round(sum(precs[j] for j in group if j < len(precs)) * 10) / 10
        code = codes[i] if i < len(codes) else 0
        blocks.append({
            "t": t_ms,
            "tempC": temps[i] if i < len(temps) else 0,
            "humidity": hums[i] if i < len(hums) else 0,
            "windKmh": round((winds[i] if i < len(winds) else 0) * 10) / 10,
            "rainMm": rain3h,
            "desc": _wmo_desc(code),
            "icon": _wmo_icon(code, rain3h),
        })

    # The client (unmodified — see module docstring) checks
    # `source === 'openweather'` verbatim to show the "Live forecast" badge
    # instead of "Sample forecast". This data really is live, just from
    # Open-Meteo rather than OpenWeatherMap, so it keeps that exact string —
    # the literal value is never itself shown to the farmer, only the
    # true/false it drives.
    return {"blocks": blocks, "source": "openweather", "place": None, "note": None}


def _wmo_desc(code: int) -> str:
    if code == 0:
        return "clear sky"
    if code in (1, 2):
        return "partly cloudy"
    if code == 3:
        return "overcast"
    if code in (45, 48):
        return "fog"
    if code in (95, 96, 99):
        return "thunderstorm"
    if code in (71, 73, 75, 77, 85, 86):
        return "snow"
    return "rain"


def _wmo_icon(code: int, rain3h: float) -> str:
    if rain3h > 15 or code in (65, 67, 82, 95, 96, 99):
        return "10d"
    if rain3h > 0 or code in (51, 53, 55, 56, 57, 61, 63, 66, 80, 81):
        return "09d"
    if code in (45, 48):
        return "03d"
    if code in (1, 2, 3):
        return "02d"
    return "01d"


def _mock_forecast() -> list:
    now = int(time.time() * 1000)
    pattern = [
        (30, 55, 8, 0), (33, 45, 11, 0), (31, 50, 9, 0), (27, 62, 6, 0),
        (26, 70, 5, 2), (29, 66, 7, 8), (32, 58, 10, 0), (30, 60, 9, 0),
        (28, 72, 12, 18), (26, 84, 16, 31), (25, 88, 14, 22), (24, 86, 9, 6),
        (27, 74, 7, 0), (31, 58, 8, 0), (33, 48, 12, 0), (30, 55, 10, 0),
        (28, 64, 7, 0), (26, 70, 5, 0), (25, 74, 4, 0), (24, 78, 4, 0),
        (27, 68, 6, 0), (31, 54, 9, 0), (33, 44, 13, 0), (30, 52, 11, 0),
        (28, 60, 8, 0), (26, 66, 6, 0), (25, 70, 5, 0), (24, 72, 5, 0),
        (27, 64, 7, 0), (30, 56, 9, 0), (32, 47, 12, 0), (29, 55, 10, 0),
        (27, 62, 8, 0), (25, 68, 6, 0), (24, 71, 5, 0), (24, 73, 5, 0),
        (26, 66, 7, 0), (29, 58, 9, 0), (31, 50, 11, 0), (28, 57, 9, 0),
    ]
    return [
        {
            "t": now + i * 3 * H,
            "tempC": p[0], "humidity": p[1], "windKmh": p[2], "rainMm": p[3],
            "desc": "heavy rain" if p[3] > 15 else "light rain" if p[3] > 0 else "clear sky",
            "icon": "10d" if p[3] > 15 else "09d" if p[3] > 0 else "01d",
        }
        for i, p in enumerate(pattern)
    ]


# -------------------------------------------------------------- utilities

def _within(blocks, from_h, to_h):
    now = blocks[0]["t"] if blocks else int(time.time() * 1000)
    return [b for b in blocks if now + from_h * H <= b["t"] < now + to_h * H]


def _sum_rain(bs):
    return round(sum(b["rainMm"] for b in bs) * 10) / 10


def _max_of(bs, k):
    return max((b[k] for b in bs), default=0)


def _min_of(bs, k):
    return min((b[k] for b in bs), default=0)


# ------------------------------------------------------------------ rules

def evaluate(blocks: list, ctx: dict) -> dict:
    """
    blocks   normalised 3-hour forecast blocks
    ctx      { doseN, doseP, method, phBand, soilTexture, waterlogged, criticalStage }
    """
    dose_n = ctx.get("doseN", 0)
    dose_p = ctx.get("doseP", 0)
    method = ctx.get("method", "broadcast")
    ph_band = ctx.get("phBand", "neutral")
    soil_texture = ctx.get("soilTexture", "loamy")
    waterlogged = ctx.get("waterlogged", False)
    critical_stage = ctx.get("criticalStage", False)

    next24 = _within(blocks, 0, 24)
    next48 = _within(blocks, 0, 48)
    next72 = _within(blocks, 0, 72)
    win6to24 = _within(blocks, 6, 24)
    next12 = _within(blocks, 0, 12)

    rain24 = _sum_rain(next24)
    rain48 = _sum_rain(next48)
    rain72 = _sum_rain(next72)
    rain6to24 = _sum_rain(win6to24)
    temp_max24 = _max_of(next24, "tempC")
    temp_min24 = _min_of(next24, "tempC")
    wind_max12 = _max_of(next12, "windKmh")
    humidity_min24 = _min_of(next24, "humidity")

    surface = method == "broadcast"
    fired = []

    # R1 — heavy rain: runoff and leaching
    if rain24 > R["heavyRainMm24h"]:
        fired.append({
            "id": "R1", "verdict": "WAIT", "key": "ruleR1", "params": {"rain": rain24}, "mechKey": "mechRunoff",
            "title": "Heavy rain is coming",
            "message": f"{rain24} mm of rain is expected in the next 24 hours. Fertilizer applied now will wash off the field before the crop can use it.",
            "mechanism": "Surface runoff and nitrate leaching",
        })

    # R2 — light rain: the ideal window for broadcast urea
    if surface and R["lightRainMinMm"] <= rain6to24 <= R["lightRainMaxMm"] and rain24 <= R["heavyRainMm24h"]:
        fired.append({
            "id": "R2", "verdict": "GO", "key": "ruleR2", "params": {"rain": rain6to24}, "mechKey": "mechIncorp",
            "title": "This is the best window this week",
            "message": f"Light rain ({rain6to24} mm) is expected in the next 6 to 24 hours. It will carry the urea into the soil instead of letting it escape into the air. Apply now.",
            "mechanism": "Rainfall incorporation reduces ammonia volatilization",
        })

    # R3 — hot, dry, alkaline, surface-applied: ammonia volatilization
    if surface and rain72 < R["lightRainMinMm"] and temp_max24 > R["hotTempC"] and ph_band in ("alkaline", "sodic"):
        fired.append({
            "id": "R3", "verdict": "MODIFY", "key": "ruleR3", "params": {"hours": R["dryHours"], "temp": round(temp_max24)}, "mechKey": "mechVolat",
            "title": "Nitrogen will escape into the air",
            "message": f"No rain for {R['dryHours']} hours, {round(temp_max24)}°C, and your soil is alkaline. Urea left on the surface will turn to gas. Mix it into the soil, or irrigate lightly straight after applying.",
            "mechanism": "Ammonia volatilization",
        })

    # R4 — wind: uneven spread
    if wind_max12 > R["windyKmh"]:
        fired.append({
            "id": "R4", "verdict": "MODIFY", "key": "ruleR4", "params": {"wind": round(wind_max12)}, "mechKey": "mechUneven",
            "title": "Too windy to spread evenly",
            "message": f"Wind up to {round(wind_max12)} km/h today. Granules will land unevenly. Wait for a calm morning.",
            "mechanism": "Uneven application",
        })

    # R5 — waterlogged: denitrification
    if waterlogged or rain48 > R["waterloggedRainMm48h"]:
        fired.append({
            "id": "R5", "verdict": "WAIT", "key": "ruleR5", "params": {}, "mechKey": "mechDenitr",
            "title": "The field is waterlogged",
            "message": "Nitrogen applied to a waterlogged field is lost as gas within days. Wait until the water drains.",
            "mechanism": "Denitrification",
        })

    # R6 — cold: poor uptake
    if temp_min24 < R["coldTempC"]:
        fired.append({
            "id": "R6", "verdict": "MODIFY", "key": "ruleR6", "params": {"temp": round(temp_min24), "limit": R["coldTempC"]}, "mechKey": "mechUptake",
            "title": "Too cold for the roots to take it up",
            "message": f"Temperature drops to {round(temp_min24)}°C. Roots absorb very little below {R['coldTempC']}°C. Delay by a few days, or apply a smaller amount.",
            "mechanism": "Reduced root uptake",
        })

    # R7 — sandy soil + rain: leaching below the root zone
    if soil_texture == "sandy" and rain48 > R["sandyLeachRainMm"]:
        fired.append({
            "id": "R7", "verdict": "MODIFY", "key": "ruleR7", "params": {"rain": rain48}, "mechKey": "mechLeach",
            "title": "Split the nitrogen on this sandy soil",
            "message": f"{rain48} mm expected over two days on sandy soil. Nitrogen will drain below the roots. Apply half now and the rest after the rain.",
            "mechanism": "Nitrate leaching",
        })

    # R8 — hot and dry air: midday loss
    if surface and humidity_min24 < R["lowHumidityPct"] and temp_max24 > R["veryHotTempC"]:
        fired.append({
            "id": "R8", "verdict": "MODIFY", "key": "ruleR8", "params": {"temp": round(temp_max24)}, "mechKey": "mechVolat",
            "title": "Do not apply in the afternoon heat",
            "message": f"{round(temp_max24)}°C with dry air. Apply in the early morning or evening instead of midday.",
            "mechanism": "Ammonia volatilization",
        })

    # --- precedence: WAIT > MODIFY > GO ---
    rank = {"WAIT": 3, "MODIFY": 2, "GO": 1}
    verdict = "GO"
    for f in fired:
        if rank[f["verdict"]] > rank[verdict]:
            verdict = f["verdict"]

    windows = best_windows(blocks, ctx)

    # --- urgency override: delay is not always the safe answer ---
    override = None
    if verdict == "WAIT" and critical_stage:
        safe_soon = windows and windows[0]["t"] < int(time.time() * 1000) + 72 * H
        if not safe_soon:
            verdict = "MODIFY"
            override = {
                "key": "overrideCritical", "params": {},
                "title": "Do not skip this application",
                "message": "The crop is at a stage where it cannot wait. Apply now, but work the fertilizer into the soil immediately so less is lost.",
            }

    risk = loss_estimate({"doseN": dose_n, "doseP": dose_p, "method": method, "phBand": ph_band, "rain24": rain24, "rain6to24": rain6to24, "tempMax24": temp_max24})

    return {
        "verdict": verdict,
        "rulesFired": fired,
        "override": override,
        "windows": windows,
        "risk": risk,
        "summary": {
            "rain24": rain24, "rain48": rain48, "tempMax24": round(temp_max24), "tempMin24": round(temp_min24),
            "windMax12": round(wind_max12), "humidityMin24": humidity_min24,
        },
    }


# --------------------------------------------------------- window scoring

def best_windows(blocks: list, ctx: dict = None) -> list:
    ctx = ctx or {}
    method = ctx.get("method", "broadcast")
    soil_texture = ctx.get("soilTexture", "loamy")
    surface = method == "broadcast"
    scored = []
    now_ms = int(time.time() * 1000)

    for i, b in enumerate(blocks):
        if b["t"] < now_ms:
            continue
        after24 = blocks[i:i + 8]
        rain_after = _sum_rain(after24)
        rain_this = b["rainMm"]

        score = 100
        reasons = []

        if rain_this > 5:
            score -= 45
            reasons.append("raining at that time")
        if rain_after > R["heavyRainMm24h"]:
            score -= 50
            reasons.append("heavy rain follows")
        elif R["lightRainMinMm"] <= rain_after <= R["lightRainMaxMm"] and surface:
            score += 30
            reasons.append("light rain follows — it will wash the urea into the soil")
        if b["tempC"] > R["veryHotTempC"]:
            score -= 25
            reasons.append("too hot")
        elif b["tempC"] > R["hotTempC"] and surface:
            score -= 12
            reasons.append("warm")
        if b["tempC"] < R["coldTempC"]:
            score -= 25
            reasons.append("too cold")
        if b["windKmh"] > R["windyKmh"]:
            score -= 25
            reasons.append("windy")
        if b["humidity"] < R["lowHumidityPct"] and surface:
            score -= 10
            reasons.append("dry air")
        if soil_texture == "sandy" and rain_after > R["sandyLeachRainMm"]:
            score -= 20
            reasons.append("leaching risk on sandy soil")

        hour = datetime.fromtimestamp(b["t"] / 1000, tz=timezone.utc).hour
        if 6 <= hour <= 10:
            score += 12
            reasons.append("cool morning")
        elif 16 <= hour <= 19:
            score += 8
            reasons.append("evening")
        elif 11 <= hour <= 15:
            score -= 10
            reasons.append("midday heat")
        else:
            score -= 20
            reasons.append("night")

        scored.append({"t": b["t"], "score": score, "reasons": reasons, "rainMm": b["rainMm"], "tempC": b["tempC"], "windKmh": b["windKmh"]})

    scored.sort(key=lambda s: (-s["score"], s["t"]))

    # Keep the top windows but spread them across different days
    picked = []
    days = set()
    for s in scored:
        day = datetime.fromtimestamp(s["t"] / 1000, tz=timezone.utc).date()
        if day in days:
            continue
        days.add(day)
        picked.append(s)
        if len(picked) == 3:
            break
    return picked


# -------------------------------------------------------------- loss model

def loss_estimate(ctx: dict) -> dict:
    dose_n = ctx.get("doseN", 0)
    dose_p = ctx.get("doseP", 0)
    method = ctx.get("method")
    ph_band = ctx.get("phBand")
    rain24 = ctx.get("rain24", 0)
    rain6to24 = ctx.get("rain6to24", 0)
    temp_max24 = ctx.get("tempMax24", 0)

    factors = []
    if method == "broadcast":
        volat_pct = L["volatilizationBase"]
        factors.append(f"{L['volatilizationBase']}% base loss for surface-applied urea")
        if temp_max24 > L["volatHotTempC"]:
            volat_pct += L["volatHotBonus"]
            factors.append(f"+{L['volatHotBonus']}% above {L['volatHotTempC']}°C")
        if ph_band in ("alkaline", "sodic"):
            volat_pct += L["volatPhBonus"]
            factors.append(f"+{L['volatPhBonus']}% on alkaline soil")
        if R["lightRainMinMm"] <= rain6to24 <= R["lightRainMaxMm"]:
            volat_pct -= L["volatLightRainRelief"]
            factors.append(f"−{L['volatLightRainRelief']}% because light rain will wash it in")
    else:
        volat_pct = max(0, L["volatilizationBase"] - L["incorporatedReduction"])
        factors.append("reduced because the fertilizer is worked into the soil")
    volat_pct = max(0, volat_pct)

    runoff_n = runoff_p = 0
    if rain24 > L["runoffRainMm"] and method == "broadcast":
        runoff_n = L["runoffNLossPct"]
        runoff_p = L["runoffPLossPct"]
        factors.append(f"+{L['runoffNLossPct']}% nitrogen and {L['runoffPLossPct']}% phosphorus washed away by {rain24} mm of rain")

    n_loss_kg = (dose_n * (volat_pct + runoff_n)) / 100
    p_loss_kg = (dose_p * runoff_p) / 100

    urea = get_product("urea")
    dap = get_product("dap")
    rs_per_kg_n = (urea["bagPrice"] / urea["bagKg"]) / (urea["n"] / 100)
    rs_per_kg_p = (dap["bagPrice"] / dap["bagKg"]) / (dap["p"] / 100)

    return {
        "nLossPct": round(volat_pct + runoff_n),
        "nLossKg": round(n_loss_kg * 10) / 10,
        "pLossKg": round(p_loss_kg * 10) / 10,
        "rupeesAtRisk": round(n_loss_kg * rs_per_kg_n + p_loss_kg * rs_per_kg_p),
        "factors": factors,
        "disclaimer": "Indicative, not predictive. Based on a published loss model, not a measurement of your field.",
    }


# ----------------------------------------------------------- split calendar

def build_calendar(crop: dict, pattern: list, sowing_date: str, dose: dict, blocks: list, ctx: dict = None) -> list:
    ctx = ctx or {}
    sow = int(datetime.fromisoformat(sowing_date.replace("Z", "+00:00")).timestamp() * 1000)
    nutrients = ["N", "P", "K", "S", "Zn"]

    out = []
    horizon_end = blocks[-1]["t"] if blocks else 0
    for idx, step in enumerate(pattern):
        start = sow + step["das"] * 24 * H
        end = start + step["window"] * 24 * H
        amounts = {}
        for n in nutrients:
            pct = step["pct"].get(n, 0)
            if pct > 0 and (dose.get(n) or 0) > 0:
                amounts[n] = round(((dose[n] * pct) / 100) * 10) / 10

        if not amounts:
            continue

        in_range = [b for b in blocks if start <= b["t"] <= end]
        window = (best_windows(in_range, ctx) or [None])[0] if in_range else None

        out.append({
            "index": idx + 1,
            "stage": step["stage"],
            "daysAfterSowing": step["das"],
            "start": start,
            "end": end,
            "amounts": amounts,
            "pct": step["pct"],
            "window": window,
            "beyondForecast": start > horizon_end,
            "done": False,
        })
    return out
