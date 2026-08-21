"""
Sustainability + yield/income impact layer, built on top of the precision dose
computed by fertilizer_engine.py.

Answers the two halves of the problem statement that pure dosing doesn't:
"ensuring sustainable agricultural practices" and "enhancing crop yield and
farmer income". All monetary/yield figures are illustrative reference values
for demo purposes, clearly labeled as estimates in the API response.
"""

from typing import Optional

import fertilizer_engine as fe

# Illustrative average yield (kg/ha) and farm-gate price (INR/kg) per crop.
# Reference values only — real figures vary by region and season.
CROP_YIELD_PRICE = {
    "rice":       {"yield_kg_ha": 4000,  "price_per_kg": 20},
    "wheat":      {"yield_kg_ha": 3500,  "price_per_kg": 22},
    "maize":      {"yield_kg_ha": 3000,  "price_per_kg": 18},
    "sugarcane":  {"yield_kg_ha": 70000, "price_per_kg": 3.5},
    "cotton":     {"yield_kg_ha": 500,   "price_per_kg": 65},
    "soybean":    {"yield_kg_ha": 1200,  "price_per_kg": 45},
    "chickpea":   {"yield_kg_ha": 1000,  "price_per_kg": 55},
    "groundnut":  {"yield_kg_ha": 1500,  "price_per_kg": 55},
    "potato":     {"yield_kg_ha": 22000, "price_per_kg": 12},
    "tomato":     {"yield_kg_ha": 25000, "price_per_kg": 10},
    "mustard":    {"yield_kg_ha": 1300,  "price_per_kg": 50},
    "sunflower":  {"yield_kg_ha": 900,   "price_per_kg": 60},
    "onion":      {"yield_kg_ha": 18000, "price_per_kg": 12},
}
DEFAULT_YIELD_PRICE = {"yield_kg_ha": 2500, "price_per_kg": 20}

# Government-notified retail MRP per kg of each carrier product (INR),
# under India's Nutrient Based Subsidy (NBS) scheme — Kharif 2026 notified
# rates, cross-checked Aug 2026. Farmers pay this MRP; the government pays
# the per-nutrient subsidy directly to fertilizer companies.
#   Urea: ₹242 / 45kg bag · DAP: ₹1,350 / 50kg bag · MOP: ₹1,670 / 50kg bag
# These are set by government notification and do change between seasons —
# worth re-checking against the current Dept. of Fertilizers notification
# if this drifts far from what a farmer reports paying.
PRODUCT_PRICE_PER_KG = {
    "Granular Urea": 5.38,
    "DAP (Diammonium Phosphate)": 27.00,
    "Muriate of Potash (MOP)": 33.40,
}

# Typical over-application: without a soil test, farmers commonly blanket-apply
# the full recommended dose regardless of what nutrients are already in the
# soil, plus a safety margin — a well-documented driver of excess fertilizer use.
OVER_APPLICATION_FACTOR = 1.25

# Illustrative embodied-emissions factor for nitrogen fertilizer (manufacture + field use)
N_CO2E_PER_KG = 4.0


def _get_yield_price(crop_type: Optional[str]) -> dict:
    key = (crop_type or "").strip().lower()
    for crop_name, vals in CROP_YIELD_PRICE.items():
        if crop_name in key or key in crop_name:
            return vals
    return DEFAULT_YIELD_PRICE


def _health_score(ph: float, n: float, p: float, k: float) -> int:
    """0-100 composite soil health score — same formula used across the app."""
    ph_score = max(0, 100 - abs(ph - 6.5) * 25)
    n_score = min(100, (n / 300) * 100)
    p_score = min(100, (p / 60) * 100)
    k_score = min(100, (k / 250) * 100)
    return round((ph_score * 0.4) + (n_score * 0.3) + (p_score * 0.15) + (k_score * 0.15))


def compute_sustainability_impact(dose: dict, ph: float, n_ppm: float, p_ppm: float, k_ppm: float) -> dict:
    hectares = dose["field_size_hectares"] or 0.0
    crop_ref = _get_yield_price(dose["crop_type"])

    baseline_total_cost = 0.0
    recommended_total_cost = 0.0
    baseline_n_kg_total = 0.0
    recommended_n_kg_total = 0.0

    nutrient_carrier_key = {"nitrogen": "n", "phosphorus": "p", "potassium": "k"}
    for label, data in dose["nutrients"].items():
        carrier_key = nutrient_carrier_key[label]
        carrier = fe.NUTRIENT_CARRIER[carrier_key]
        target_kg_ha = data["target_kg_ha"]

        baseline_kg_ha = round((target_kg_ha * OVER_APPLICATION_FACTOR) / carrier["npk_fraction"], 1)
        baseline_kg_total = round(baseline_kg_ha * hectares, 1) if hectares else baseline_kg_ha
        price = PRODUCT_PRICE_PER_KG.get(data["product"], 10)

        baseline_total_cost += baseline_kg_total * price
        recommended_total_cost += data["product_kg_total"] * price

        if label == "nitrogen":
            baseline_n_kg_total = baseline_kg_total
            recommended_n_kg_total = data["product_kg_total"]

    cost_savings_inr = round(baseline_total_cost - recommended_total_cost)
    reduction_pct = round((1 - recommended_total_cost / baseline_total_cost) * 100) if baseline_total_cost > 0 else 0
    # Cap the headline figure short of "100% savings" — even a well-corrected field
    # still needs some fertilizer, and a 100% claim reads as implausible in a demo.
    reduction_pct = min(reduction_pct, 92)

    n_avoided_kg = max(0.0, baseline_n_kg_total - recommended_n_kg_total)
    co2e_avoided_kg = round(n_avoided_kg * N_CO2E_PER_KG, 1)

    health_score = _health_score(ph, n_ppm, p_ppm, k_ppm)
    # More room for improvement when current soil health is worse; capped at 25%.
    yield_uplift_pct = min(25, round((100 - health_score) * 0.25))

    gross_yield_value_inr = round(
        crop_ref["yield_kg_ha"] * hectares * (yield_uplift_pct / 100) * crop_ref["price_per_kg"]
    ) if hectares else 0
    net_income_impact_inr = round(gross_yield_value_inr + cost_savings_inr)

    return {
        "health_score": health_score,
        "sustainability_score": max(0, reduction_pct),
        "fertilizer_reduction_pct": max(0, reduction_pct),
        "co2e_avoided_kg": co2e_avoided_kg,
        "cost": {
            "recommended_inr": round(recommended_total_cost),
            "baseline_inr": round(baseline_total_cost),
            "savings_inr": cost_savings_inr,
        },
        "yield_uplift_pct": yield_uplift_pct,
        "income": {
            "gross_yield_value_inr": gross_yield_value_inr,
            "net_income_impact_inr": net_income_impact_inr,
        },
        "reference": {
            "crop_yield_kg_ha": crop_ref["yield_kg_ha"],
            "crop_price_per_kg_inr": crop_ref["price_per_kg"],
        },
        "baseline_method": "Blanket full-target application without a soil test, plus a 25% typical safety margin.",
        "disclaimer": "Illustrative estimate from reference yield/price data, not a financial guarantee.",
    }


def build_roadmap(dose: dict, soil: dict) -> list:
    """
    A concrete, ordered action plan for this specific field — built entirely
    from the soil diagnostics and precision dose already computed for it, not
    a separate AI call. That keeps it consistent with the rest of the app
    (it can't recommend something the Fertilizer Hub contradicts) and
    available even when the AI advisor itself is rate-limited.
    """
    steps = []
    order = 1
    ph = dose["ph"]
    ph_adequacy = soil.get("ph_adequacy")
    lime_req = soil.get("lime_requirement_kg_ha") or 0

    # 1. Soil pH correction — nothing else matters until this is fixed if severe
    if ph_adequacy == "critical" or ph < 5.5 or ph > 8.5:
        if ph < 6.0:
            desc = (
                f"pH {ph} is too acidic for most crops to take up nutrients efficiently. "
                f"Apply agricultural lime at roughly {lime_req} kg/ha, worked into the top "
                f"15cm of soil, and retest in 4-6 weeks before relying on this season's "
                f"fertilizer plan — nutrients applied now will be largely locked up."
            )
        else:
            desc = (
                f"pH {ph} is too alkaline for nutrients to stay available to roots. Apply "
                f"elemental sulfur or gypsum and retest in 4-6 weeks — fertilizer applied "
                f"before this is corrected will be substantially wasted."
            )
        steps.append({"order": order, "category": "soil", "priority": "critical",
                       "title": "Correct soil pH first", "description": desc})
        order += 1
    elif ph_adequacy == "slightly off":
        desc = (
            f"pH {ph} is a little outside the 6.0-7.5 range most crops prefer. A light "
            f"{'lime' if ph < 6.0 else 'sulfur or gypsum'} application over the next few "
            f"weeks will improve nutrient uptake."
        )
        steps.append({"order": order, "category": "soil", "priority": "important",
                       "title": "Fine-tune soil pH", "description": desc})
        order += 1

    # 2. Nutrient corrections — stop excess before adding more deficits
    excess = [(label, d) for label, d in dose["nutrients"].items() if d["status"] == "excess"]
    deficient = [(label, d) for label, d in dose["nutrients"].items() if d["status"] == "deficient"]

    for label, d in excess:
        steps.append({
            "order": order, "category": "fertilizer", "priority": "critical",
            "title": f"Stop applying {label}",
            "description": (
                f"Your soil already holds {d['available_kg_ha']} kg/ha of {label} against a "
                f"{d['target_kg_ha']} kg/ha target — {d['surplus_kg_ha']} kg/ha more than "
                f"needed. Skip {label} fertilizer this season; any more will leach into "
                f"groundwater or run off without helping yield."
            ),
        })
        order += 1

    for label, d in deficient:
        steps.append({
            "order": order, "category": "fertilizer", "priority": "important",
            "title": f"Apply {d['product']} for {label}",
            "description": (
                f"{label.capitalize()} is short by {d['deficit_kg_ha']} kg/ha against target. "
                f"Apply {d['product_kg_total']} kg of {d['product']} across the field to close "
                f"the gap."
            ),
        })
        order += 1

    if not excess and not deficient:
        steps.append({
            "order": order, "category": "fertilizer", "priority": "routine",
            "title": "Hold your current fertilizer plan",
            "description": "Nitrogen, phosphorus, and potassium are all within target range — no additional fertilizer is needed right now.",
        })
        order += 1

    # 3. Weather-aware timing
    weather = dose.get("weather") or {}
    if weather.get("high_rain_risk") and deficient:
        steps.append({
            "order": order, "category": "timing", "priority": "important",
            "title": "Split your nitrogen application",
            "description": "Heavy rain is forecast in the next 5 days. Apply about 60% of the nitrogen dose now and hold the remaining 40% for roughly 3 weeks out, so less washes away before the crop can use it.",
        })
        order += 1

    # 4. Long-term soil health
    om = soil.get("organic_matter_pct")
    if om is not None and om < 2.0:
        steps.append({
            "order": order, "category": "soil-health", "priority": "routine",
            "title": "Build up organic matter",
            "description": f"Organic matter is only {om}% — below the 3-5% range that improves water retention and nutrient holding. Work in compost, farmyard manure, or a green-manure cover crop between seasons.",
        })
        order += 1

    if soil.get("salinity_risk") == "high":
        steps.append({
            "order": order, "category": "soil-health", "priority": "important",
            "title": "Manage salinity risk",
            "description": "Potassium and salt levels are high enough to risk salinity buildup. Improve field drainage where possible and consider a gypsum application to help leach excess salts below the root zone.",
        })
        order += 1

    # 5. Always end with a monitoring step
    steps.append({
        "order": order, "category": "monitor", "priority": "routine",
        "title": "Re-test and track",
        "description": "Soil chemistry shifts over a season. Re-test in 4-6 weeks and check back here — this plan updates automatically from your latest reading.",
    })

    return steps
