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
    key = fe.CROP_ALIASES.get(key, key)
    return CROP_YIELD_PRICE.get(key, DEFAULT_YIELD_PRICE)


def _health_score(ph: float, n: float, p: float, k: float, crop_type: Optional[str] = None) -> int:
    """0-100 composite soil health score — delegates to the same target-aware
    formula used everywhere else in the app (fertilizer_engine.compute_health_score),
    rather than keeping a second copy that could drift out of sync with it."""
    return fe.compute_health_score(ph, n, p, k, crop_type)


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

    health_score = _health_score(ph, n_ppm, p_ppm, k_ppm, dose["crop_type"])
    # More room for improvement when current soil health is worse; capped at 25%.
    yield_uplift_pct = min(25, round((100 - health_score) * 0.25))

    gross_yield_value_inr = round(
        crop_ref["yield_kg_ha"] * hectares * (yield_uplift_pct / 100) * crop_ref["price_per_kg"]
    ) if hectares else 0
    net_income_impact_inr = round(gross_yield_value_inr + cost_savings_inr)

    # "After" state if the farmer actually follows the roadmap: nutrients
    # land exactly on target, and pH is corrected toward the workable
    # midpoint if it's currently outside the 6.0-7.5 range that any crop
    # can use — both computed with the same real formula as "before",
    # not a separately invented number.
    projected_ph = 6.5 if (ph < 6.0 or ph > 7.5) else ph
    projected_n_ppm = dose["nutrients"]["nitrogen"]["target_kg_ha"] / fe.PPM_TO_KG_HA
    projected_p_ppm = dose["nutrients"]["phosphorus"]["target_kg_ha"] / fe.PPM_TO_KG_HA
    projected_k_ppm = dose["nutrients"]["potassium"]["target_kg_ha"] / fe.PPM_TO_KG_HA
    projected_health_score = _health_score(projected_ph, projected_n_ppm, projected_p_ppm, projected_k_ppm, dose["crop_type"])
    projected_yield_kg_ha = round(crop_ref["yield_kg_ha"] * (1 + yield_uplift_pct / 100))

    return {
        "health_score": health_score,
        "projected_health_score": projected_health_score,
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
            "projected_yield_kg_ha": projected_yield_kg_ha,
        },
        "before_after": {
            "ph": {"before": ph, "after": round(projected_ph, 1)},
            "health_score": {"before": health_score, "after": projected_health_score},
            "yield_kg_ha": {"before": crop_ref["yield_kg_ha"], "after": projected_yield_kg_ha},
            "nutrients": dose["nutrients"],
        },
        "baseline_method": "Blanket full-target application without a soil test, plus a 25% typical safety margin.",
        "disclaimer": "Illustrative estimate from reference yield/price data, not a financial guarantee.",
    }


def build_season_plan(dose: dict, soil: dict) -> dict:
    """
    A stage-by-stage plan across the whole growing season — soil prep, sowing
    (basal dose), vegetative top-dress, flowering, post-harvest — built
    entirely from this field's own precision dose and soil diagnostics, not a
    separate AI call. Splits phosphorus and potassium fully into the basal
    stage (both are immobile in soil, so they have to reach the root zone at
    sowing) and nitrogen across the same stages the dose engine's own
    weather-aware application_plan already computes, rather than inventing a
    separate timing scheme.
    """
    ph = dose["ph"]
    crop = dose["crop_type"]
    ph_adequacy = soil.get("ph_adequacy")
    lime_req = soil.get("lime_requirement_kg_ha") or 0
    n, p, k = dose["nutrients"]["nitrogen"], dose["nutrients"]["phosphorus"], dose["nutrients"]["potassium"]
    application_plan = dose.get("application_plan") or [{"stage": "Now", "pct_of_nitrogen": 100}]
    weather = dose.get("weather") or {}

    stages = []

    # ── Stage 1: Soil Preparation ──
    prep_actions = []
    if ph_adequacy == "critical" or ph < 5.5 or ph > 8.5:
        if ph < 6.0:
            prep_actions.append(
                f"Apply agricultural lime at roughly {lime_req} kg/ha, worked into the top "
                f"15cm of soil. Retest in 4-6 weeks — nutrients applied to acidic, "
                f"uncorrected soil are largely locked up and wasted."
            )
        else:
            prep_actions.append(
                f"Apply elemental sulfur or gypsum to bring pH down from {ph}. Retest in "
                f"4-6 weeks before the rest of this plan can work as calculated."
            )
    elif ph_adequacy == "slightly off":
        prep_actions.append(
            f"pH {ph} is a little outside the 6.0-7.5 range {crop} prefers. A light "
            f"{'lime' if ph < 6.0 else 'sulfur or gypsum'} application now will improve "
            f"how well the rest of this plan performs."
        )
    else:
        prep_actions.append(f"pH {ph} is already in a good range for {crop} — no correction needed before sowing.")
    stages.append({
        "id": "prep", "label": "Soil Preparation", "window": "2-3 weeks before sowing",
        "icon": "science", "actions": prep_actions, "product_kg": {},
    })

    # ── Stage 2: Sowing / Basal Dose — P and K don't move in soil, so both
    #    go in fully now regardless of the nitrogen timing split ──
    basal_actions = []
    basal_product_kg = {}
    for label, data in (("phosphorus", p), ("potassium", k)):
        if data["status"] == "excess":
            basal_actions.append(f"Skip {label} — soil already holds {data['surplus_kg_ha']} kg/ha more than {crop} needs.")
        elif data["product_kg_total"] > 0:
            basal_actions.append(
                f"Apply the full {data['product_kg_total']} kg of {data['product']} now, worked "
                f"into the root zone — {label} barely moves through soil, so it has to go in at "
                f"sowing to be reachable once roots need it."
            )
            basal_product_kg[data["product"]] = round(basal_product_kg.get(data["product"], 0) + data["product_kg_total"], 1)
        else:
            basal_actions.append(f"{label.capitalize()} is already at target — nothing to add.")

    first_n_pct = application_plan[0]["pct_of_nitrogen"]
    basal_n_kg = round(n["product_kg_total"] * first_n_pct / 100, 1) if n["product_kg_total"] > 0 else 0
    if n["status"] == "excess":
        basal_actions.append(f"Skip nitrogen at sowing too — soil already holds {n['surplus_kg_ha']} kg/ha more than needed.")
    elif basal_n_kg > 0:
        basal_actions.append(f"Apply {basal_n_kg} kg of {n['product']} ({first_n_pct}% of the season's nitrogen) at sowing.")
        basal_product_kg[n["product"]] = round(basal_product_kg.get(n["product"], 0) + basal_n_kg, 1)

    stages.append({
        "id": "sowing", "label": "Sowing", "window": "At sowing / transplanting",
        "icon": "grass", "actions": basal_actions, "product_kg": basal_product_kg,
    })

    # ── Stage 3: Vegetative Growth / Top-Dress — remaining nitrogen ──
    veg_actions = []
    veg_product_kg = {}
    if n["status"] == "excess":
        veg_actions.append("No nitrogen top-dress needed — the excess already in the soil will carry the crop through vegetative growth.")
    elif len(application_plan) > 1 and n["product_kg_total"] > 0:
        remaining_pct = application_plan[1]["pct_of_nitrogen"]
        remaining_n_kg = round(n["product_kg_total"] * remaining_pct / 100, 1)
        veg_actions.append(f"Apply the remaining {remaining_n_kg} kg of {n['product']} ({remaining_pct}% of the season's nitrogen) at {application_plan[1]['stage']}.")
        veg_product_kg[n["product"]] = remaining_n_kg
        if weather.get("high_rain_risk"):
            veg_actions.append(
                f"This split exists because {weather.get('rain_forecast_mm_5d')}mm of rain is "
                f"forecast in the next 5 days — applying the full dose at sowing would mean "
                f"losing a chunk of it to runoff before the crop could use it."
            )
    elif n["product_kg_total"] > 0:
        veg_actions.append("Nitrogen was fully covered at sowing — no top-dress needed this stage.")
    else:
        veg_actions.append("Nitrogen is already at target — no top-dress needed this stage.")
    if weather.get("heat_volatilization_risk"):
        veg_actions.append(
            f"Average temperatures are forecast around {weather.get('avg_temp_c')}°C — "
            f"incorporate any urea into the soil rather than surface-broadcasting it, or a "
            f"meaningful share will be lost to ammonia volatilization."
        )
    stages.append({
        "id": "vegetative", "label": "Vegetative Growth",
        "window": application_plan[1]["stage"] if len(application_plan) > 1 else "~3-4 weeks after sowing",
        "icon": "eco", "actions": veg_actions, "product_kg": veg_product_kg,
    })

    # ── Stage 4: Flowering & Fill — monitoring, not new inputs ──
    flowering_actions = ["No new fertilizer is typically needed here if the basal and top-dress doses above were applied on schedule."]
    if p["status"] == "deficient":
        flowering_actions.append("Watch for phosphorus deficiency signs — dark or purple-tinged leaves, delayed flowering — a hint this crop may still be short despite the basal dose.")
    if k["status"] == "deficient":
        flowering_actions.append("Watch for potassium deficiency signs — scorched leaf edges, weak stems — since this field started short on potassium; a light foliar feed can help if symptoms appear.")
    stages.append({
        "id": "flowering", "label": "Flowering & Fill", "window": "Flowering through grain/fruit fill",
        "icon": "local_florist", "actions": flowering_actions, "product_kg": {},
    })

    # ── Stage 5: Post-Harvest — reset for next season ──
    post_actions = ["Re-test your soil — this season's crop will have drawn down nutrients differently than this plan assumed."]
    om = soil.get("organic_matter_pct")
    if om is not None and om < 2.0:
        post_actions.append(f"Organic matter is only {om}% — work in compost, farmyard manure, or a green-manure cover crop before the next season to rebuild it.")
    if soil.get("salinity_risk") == "high":
        post_actions.append("Salinity risk is elevated — improve drainage where possible and consider a gypsum application before next season.")
    post_actions.append("Come back here once your new soil test is in — this plan regenerates from your latest reading.")
    stages.append({
        "id": "post-harvest", "label": "Post-Harvest", "window": "After harvest, before next season",
        "icon": "history", "actions": post_actions, "product_kg": {},
    })

    # Chart data: kg of each product applied at each stage, for a season-wide view
    all_products = sorted({prod for s in stages for prod in s["product_kg"]})
    chart_data = [
        {"stage": s["label"], **{prod: round(s["product_kg"].get(prod, 0), 1) for prod in all_products}}
        for s in stages
    ]

    return {"stages": stages, "chart_products": all_products, "chart_data": chart_data}
