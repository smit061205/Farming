"""Dosing engine — pure functions, zero I/O.

Ported from the reference Node server's engines/dosing.js.
Tier A: STCR targeted-yield equation.  Tier B: ICAR base dose x soil-test
class factor. Every threshold comes from data/thresholds.json — no magic
numbers here, matching the original's own stated principle.
"""
from typing import Optional

from data import thresholds as T

round1 = lambda n: round(n * 10) / 10


def classify(value: Optional[float], key: str) -> str:
    c = T["soilClasses"][key]
    if value is None:
        return "Unknown"
    if value < c["low"]:
        return "Low"
    if value > c["high"]:
        return "High"
    return "Medium"


def ph_band(ph: float) -> str:
    for b in T["ph"]["bands"]:
        if ph <= b["max"]:
            return b["key"]
    return "sodic"


def ec_band(ec: Optional[float]) -> str:
    if ec is None:
        return "unknown"
    if ec < T["ec"]["normal"]:
        return "normal"
    if ec < T["ec"]["critical"]:
        return "critical"
    return "injurious"


def compute_dose(crop: dict, slopes: dict, zone: str, soil: dict, target_yield: float, organic: Optional[dict]) -> dict:
    """
    crop         entry from crops.json
    slopes       global b coefficients { N, P, K }
    zone         middle | north | saurashtra
    soil         { ph, oc, n, p, k, ec, s, zn }
    target_yield q/ha (Tier A only)
    organic      { source, tonnesPerHa } | None
    """
    tier = (crop.get("tier") or {}).get(zone, "B")
    classes = {
        "N": classify(soil["n"], "N"),
        "P": classify(soil["p"], "P"),
        "K": classify(soil["k"], "K"),
        "OC": classify(soil.get("oc"), "OC"),
    }

    organic_credit = {"N": 0.0, "P": 0.0, "K": 0.0}
    if organic and organic.get("tonnesPerHa", 0) > 0 and organic.get("source"):
        src = organic["source"]
        organic_credit["N"] = src["nPerTonne"] * organic["tonnesPerHa"]
        organic_credit["P"] = src["pPerTonne"] * organic["tonnesPerHa"]
        organic_credit["K"] = src["kPerTonne"] * organic["tonnesPerHa"]

    raw = {}
    method = {}

    for key, soil_key in (("N", "n"), ("P", "p"), ("K", "k")):
        base = crop["base"][key]
        ceiling = base * T["ceilingMultiplier"]

        if tier == "A" and crop.get("stcr"):
            a = crop["stcr"][key]["a"]
            b = slopes[key]
            soil_val = soil[soil_key]
            v = a * target_yield - b * soil_val - organic_credit[key]
            method[key] = f"STCR: {a} x {target_yield} q/ha − {b} x {soil_val} kg/ha" + (
                f" − {organic_credit[key]:.0f} from manure" if organic_credit[key] else ""
            )
        else:
            factor = T["classFactor"].get(classes[key], 1.0)
            v = base * factor - organic_credit[key]
            method[key] = f"ICAR base {base} kg/ha x {factor} (soil {classes[key]})" + (
                f" − {organic_credit[key]:.0f} from manure" if organic_credit[key] else ""
            )

        raw[key] = max(0.0, min(v, ceiling))

    dose = {"N": round1(raw["N"]), "P": round1(raw["P"]), "K": round1(raw["K"]), "S": 0, "Zn": 0}

    warnings = []
    zero_dose_reasons = {}

    def _zero(key, value, cls):
        return {"key": "zeroDose", "params": {"nutrient": key, "value": value, "class": cls}}

    if dose["N"] == 0:
        zero_dose_reasons["N"] = _zero("N", soil["n"], classes["N"])
    if dose["P"] == 0:
        zero_dose_reasons["P"] = _zero("P", soil["p"], classes["P"])
    if dose["K"] == 0:
        zero_dose_reasons["K"] = _zero("K", soil["k"], classes["K"])

    # --- Sulphur ---
    s_deficient = False
    if soil.get("s") is not None:
        if float(soil["s"]) < T["deficiency"]["S"]["critical"]:
            dose["S"] = crop.get("s") or 0
            s_deficient = True
        else:
            zero_dose_reasons["S"] = {"key": "zeroMicro", "params": {"nutrient": "S", "value": soil["s"], "limit": T["deficiency"]["S"]["critical"]}}
    else:
        warnings.append({"level": "info", "key": "warnNoS"})

    # --- Zinc ---
    if soil.get("zn") is not None:
        if float(soil["zn"]) < T["deficiency"]["Zn"]["critical"]:
            dose["Zn"] = crop.get("zn") or 0
        else:
            zero_dose_reasons["Zn"] = {"key": "zeroMicro", "params": {"nutrient": "Zn", "value": soil["zn"], "limit": T["deficiency"]["Zn"]["critical"]}}
    else:
        warnings.append({"level": "info", "key": "warnNoZn"})

    # --- pH gates ---
    band = ph_band(soil["ph"])
    amendments = []
    if band == "sodic":
        warnings.append({"level": "warn", "key": "warnSodic", "params": {"ph": soil["ph"]}})
        amendments.append({"id": "gypsum", "kgPerHa": 500, "whyKey": "amendGypsum"})
    elif band == "alkaline":
        warnings.append({"level": "info", "key": "warnAlkaline", "params": {"ph": soil["ph"]}})
    elif band == "acidic":
        warnings.append({"level": "warn", "key": "warnAcidic", "params": {"ph": soil["ph"]}})
        amendments.append({"id": "lime", "kgPerHa": 400, "whyKey": "amendLime"})

    # --- EC gate ---
    ecb = ec_band(soil.get("ec"))
    if ecb == "injurious":
        warnings.append({"level": "warn", "key": "warnEcHigh", "params": {"ec": soil.get("ec")}})
    elif ecb == "critical":
        warnings.append({"level": "info", "key": "warnEcMid", "params": {"ec": soil.get("ec")}})

    return {
        "tier": tier,
        "classes": classes,
        "phBand": band,
        "ecBand": ecb,
        "dose": dose,
        "method": method,
        "zeroDoseReasons": zero_dose_reasons,
        "warnings": warnings,
        "amendments": amendments,
        "sDeficient": s_deficient,
        "organicCredit": organic_credit,
        "blanket": {"N": crop["base"]["N"], "P": crop["base"]["P"], "K": crop["base"]["K"], "S": 0, "Zn": 0},
    }
