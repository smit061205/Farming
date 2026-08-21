"""Impact model — turns the environmental claims into numbers.

Ported from the reference Node server's engines/impact.js. Everything here
is a model, never a field measurement, and the UI says so.
"""
from data import thresholds

I = thresholds["impact"]
SC = thresholds["soilClasses"]

clamp = lambda v, lo, hi: max(lo, min(hi, v))
_round = lambda n, d=1: round(n * 10 ** d) / 10 ** d


# ------------------------------------------------------ soil health score

def soil_health_score(soil: dict) -> dict:
    w = I["soilHealthWeights"]
    parts = []

    # Organic carbon — the single best indicator of soil health
    oc_pct = soil.get("oc")
    oc_score = None if oc_pct is None else clamp(oc_pct / 0.9, 0, 1)
    parts.append({"key": "oc", "label": "Organic carbon", "weight": w["oc"], "score": oc_score,
                   "detail": "not tested" if oc_pct is None else f"{oc_pct}%"})

    # pH — best at neutral, penalised either side
    ph = float(soil["ph"])
    ph_score = clamp(1 - abs(ph - 7.0) / 2.0, 0, 1)
    parts.append({"key": "ph", "label": "pH balance", "weight": w["ph"], "score": ph_score, "detail": f"{ph}"})

    # NPK availability — how close each is to the middle of its adequate band
    def band(v, k):
        if v is None:
            return None
        c = SC[k]
        if v < c["low"]:
            return clamp(v / c["low"], 0, 1) * 0.6
        if v > c["high"]:
            return 0.85  # high is fine, but wasteful to keep adding
        return 0.6 + 0.4 * ((v - c["low"]) / (c["high"] - c["low"]))

    npk = [x for x in (band(soil.get("n"), "N"), band(soil.get("p"), "P"), band(soil.get("k"), "K")) if x is not None]
    npk_score = (sum(npk) / len(npk)) if npk else None
    parts.append({"key": "npk", "label": "N-P-K availability", "weight": w["npk"], "score": npk_score,
                   "detail": f"{soil.get('n')} / {soil.get('p')} / {soil.get('k')} kg/ha"})

    # Salinity
    ec = soil.get("ec")
    ec_score = None if ec is None else clamp(1 - ec / thresholds["ec"]["critical"], 0, 1)
    parts.append({"key": "ec", "label": "Salinity", "weight": w["ec"], "score": ec_score,
                   "detail": "not tested" if ec is None else f"{ec} dS/m"})

    # Micronutrients
    s = soil.get("s")
    zn = soil.get("zn")
    micro = []
    if s is not None:
        micro.append(clamp(s / (thresholds["deficiency"]["S"]["critical"] * 1.6), 0, 1))
    if zn is not None:
        micro.append(clamp(zn / (thresholds["deficiency"]["Zn"]["critical"] * 1.6), 0, 1))
    micro_score = (sum(micro) / len(micro)) if micro else None
    parts.append({"key": "micro", "label": "Sulphur & zinc", "weight": w["micro"], "score": micro_score,
                   "detail": f"S {s if s is not None else '—'} ppm, Zn {zn if zn is not None else '—'} ppm" if micro else "not tested"})

    # Renormalise over the parts we could actually score
    scored = [p for p in parts if p["score"] is not None]
    total_weight = sum(p["weight"] for p in scored)
    score = round(sum(p["score"] * p["weight"] for p in scored) / total_weight * 100) if total_weight else 0

    return {
        "score": score,
        "parts": [{**p, "score": None if p["score"] is None else round(p["score"] * 100)} for p in parts],
        "untested": [p["label"] for p in parts if p["score"] is None],
        "grade": "Good" if score >= 75 else "Fair" if score >= 55 else "Poor" if score >= 35 else "Degraded",
    }


# -------------------------------------------------------- season trajectory

def trajectory(soil: dict, dose: dict, blanket: dict, crop: dict, target_yield: float, seasons: int = 5) -> dict:
    """Directional nutrient-balance projection. Not a field trial.
    soil_next = soil_now + applied*recovery - removal*yield"""
    rf = {"N": I["nRecoveryFactor"], "P": I["pRecoveryFactor"], "K": I["kRecoveryFactor"]}
    removal = {
        "N": crop["removal"]["N"] * target_yield,
        "P": crop["removal"]["P"] * target_yield,
        "K": crop["removal"]["K"] * target_yield,
    }

    def run(applied):
        cur = {"N": float(soil["n"]), "P": float(soil["p"]), "K": float(soil["k"])}
        out = [{"season": 0, **cur}]
        for s in range(1, seasons + 1):
            cur = {
                "N": max(0.0, cur["N"] + applied["N"] * rf["N"] - removal["N"]),
                "P": max(0.0, cur["P"] + applied["P"] * rf["P"] - removal["P"]),
                "K": max(0.0, cur["K"] + applied["K"] * rf["K"] - removal["K"]),
            }
            out.append({"season": s, "N": _round(cur["N"]), "P": _round(cur["P"]), "K": _round(cur["K"])})
        return out

    return {
        "agrisense": run(dose),
        "blanket": run(blanket),
        "removal": removal,
        "disclaimer": "Directional projection from a nutrient-balance model, not a field trial.",
    }


# ------------------------------------------------------------ environment

def environment(dose: dict, blanket: dict, area_ha: float) -> dict:
    excess_n = max(0.0, blanket["N"] - dose["N"]) * area_ha
    excess_p = max(0.0, blanket["P"] - dose["P"]) * area_ha

    runoff_avoided = _round(excess_n * I["runoffLossFraction"], 1)
    co2e_avoided = round(excess_n * (I["n2oCo2ePerKgN"] + I["ureaManufactureCo2ePerKgN"]))

    return {
        "excessNAvoidedKg": _round(excess_n, 1),
        "excessPAvoidedKg": _round(excess_p, 1),
        "runoffAvoidedKg": runoff_avoided,
        "co2eAvoidedKg": co2e_avoided,
        "co2eEquivalentKm": round(co2e_avoided / 0.12),  # ~120 g CO2e per km, average car
        "method": f"Runoff = excess N x {I['runoffLossFraction']}. CO2e = excess N x ({I['n2oCo2ePerKgN']} N2O + {I['ureaManufactureCo2ePerKgN']} manufacturing) kg CO2e per kg N.",
    }


# ------------------------------------------------------------ ratio check

def ratio_check(dose: dict, blanket: dict) -> dict:
    def norm(d):
        base = d["K"] if d["K"] > 0 else (min(d["N"], d["P"]) or 1)
        return {"N": _round(d["N"] / base, 1), "P": _round(d["P"] / base, 1), "K": _round(d["K"] / base, 1)}

    ideal = I["idealRatio"]
    applied = norm(dose)
    blanket_ratio = norm(blanket)

    urea_heavy = (dose["N"] / dose["P"] > (ideal["N"] / ideal["P"]) * 1.6) if dose["P"] > 0 else dose["N"] > 0

    return {
        "applied": applied,
        "blanket": blanket_ratio,
        "ideal": ideal,
        "ureaHeavy": urea_heavy,
        "note": (
            "This plan is nitrogen-heavy relative to phosphorus. That is the national pattern that "
            "degrades soil over time — worth discussing with your extension officer."
            if urea_heavy else
            "The nutrient balance in this plan is within a healthy range."
        ),
    }


# ---------------------------------------------------------------- income

def income(comparison: dict, risk: dict, area_ha: float) -> dict:
    input_saving = max(0, comparison["savedTotal"])
    protected_value = (risk or {}).get("rupeesAtRisk") or 0
    return {
        "inputSavingPerSeason": input_saving,
        "lossAvoidedByTiming": protected_value,
        "totalPerSeason": input_saving + protected_value,
        "perHectare": round((input_saving + protected_value) / area_ha) if area_ha else 0,
        "note": "Input saving is the difference against the blanket dose. Loss avoided is the fertilizer that correct timing keeps in the soil.",
    }
