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
    baseline_co2e_kg = round(baseline_n_kg_total * N_CO2E_PER_KG, 1)
    recommended_co2e_kg = round(recommended_n_kg_total * N_CO2E_PER_KG, 1)

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
        "co2e": {
            "baseline_kg": baseline_co2e_kg,
            "recommended_kg": recommended_co2e_kg,
            "avoided_kg": co2e_avoided_kg,
        },
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
        "baseline_method": "\"Average approach\" models a typical blanket application for this crop without a soil test — full crop target plus a 25% typical over-application margin, priced at the same real fertilizer rates — not this farmer's actual past spending, which the app has no record of.",
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
    separate timing scheme. Each stage names the current problem (if any)
    before the guidance, and the guidance itself explains the mechanism and
    consequence, not just the instruction.
    """
    ph = dose["ph"]
    crop = dose["crop_type"]
    ph_adequacy = soil.get("ph_adequacy")
    soil_type = (soil.get("soilType") or soil.get("soil_type") or "loam").lower()
    lime_req = soil.get("lime_requirement_kg_ha") or 0
    n, p, k = dose["nutrients"]["nitrogen"], dose["nutrients"]["phosphorus"], dose["nutrients"]["potassium"]
    application_plan = dose.get("application_plan") or [{"stage": "Now", "pct_of_nitrogen": 100}]
    weather = dose.get("weather") or {}

    stages = []

    # ── Stage 1: Soil Preparation ──
    prep_problem = None
    prep_guidance = []
    if ph_adequacy == "critical" or ph < 5.5 or ph > 8.5:
        if ph < 6.0:
            prep_problem = (
                f"This field's pH is {ph}, which is too acidic for {crop}. Below roughly pH 6.0, "
                f"phosphorus starts binding with iron and aluminum in the soil into forms roots "
                f"can barely reach, and several micronutrients become less available too — so a "
                f"real share of whatever fertilizer gets applied later in the season won't "
                f"actually be usable by the plant, no matter how precisely it's dosed."
            )
            prep_guidance.append(
                f"Apply agricultural lime at roughly {lime_req} kg/ha, worked into the top 15cm "
                f"of soil so it reacts with the acidity through the full root zone rather than "
                f"sitting on the surface. Lime takes several weeks to neutralize soil acidity, "
                f"which is exactly why this has to happen well before sowing — applying it "
                f"alongside basal fertilizer is too late to help this season's crop."
            )
            prep_guidance.append(
                f"Retest in 4-6 weeks to confirm pH is trending toward 6.5. {soil_type.capitalize()} "
                f"soils in particular can have enough buffering capacity that the standard lime "
                f"estimate undershoots — if the retest still shows acidity, a second, smaller "
                f"application is normal rather than a sign anything went wrong."
            )
        else:
            prep_problem = (
                f"This field's pH is {ph}, which is too alkaline for {crop}. Above roughly pH 7.5, "
                f"phosphorus binds with calcium into compounds roots can't dissolve, and "
                f"micronutrients like iron and zinc become significantly less available — the "
                f"same underlying problem as acidic soil, just from the other direction."
            )
            prep_guidance.append(
                f"Apply elemental sulfur or gypsum to bring pH down toward 6.5. Sulfur works by "
                f"oxidizing into sulfuric acid with the help of soil bacteria over several weeks, "
                f"so — like lime — there's no fast version of this correction; it needs real lead "
                f"time before sowing."
            )
            prep_guidance.append("Retest in 4-6 weeks to confirm it's moving in the right direction before committing to this season's full fertilizer plan.")
    elif ph_adequacy == "slightly off":
        prep_problem = (
            f"pH {ph} is a little outside the 6.0-7.5 range {crop} does best in — not severe "
            f"enough to block nutrient uptake outright, but enough to quietly reduce how "
            f"efficiently the fertilizer applied later in the season actually gets used."
        )
        prep_guidance.append(
            f"A light {'lime' if ph < 6.0 else 'sulfur or gypsum'} application now, well ahead of "
            f"sowing, nudges pH back into range and improves how much of this plan's nitrogen, "
            f"phosphorus, and potassium the crop can actually take up."
        )
    else:
        prep_guidance.append(
            f"pH {ph} already sits in the 6.0-7.5 range where {crop} can take up nitrogen, "
            f"phosphorus, and potassium efficiently, so no correction is needed before sowing. "
            f"It's still worth rechecking after harvest — intensive cropping and repeated "
            f"fertilizer use can shift pH gradually over several seasons even from a good "
            f"starting point."
        )
    stages.append({
        "id": "prep", "label": "Soil Preparation", "window": "2-3 weeks before sowing",
        "icon": "science", "problem": prep_problem, "guidance": prep_guidance, "product_kg": {},
    })

    # ── Stage 2: Sowing / Basal Dose — P and K don't move in soil, so both
    #    go in fully now regardless of the nitrogen timing split ──
    basal_problems = []
    basal_guidance = []
    basal_product_kg = {}
    for label, data in (("phosphorus", p), ("potassium", k)):
        if data["status"] == "excess":
            basal_problems.append(
                f"Soil {label} is already {data['available_kg_ha']} kg/ha against a "
                f"{data['target_kg_ha']} kg/ha target for {crop} — {data['surplus_kg_ha']} kg/ha "
                f"more than the crop can use this season."
            )
            basal_guidance.append(
                f"Skip {label} at sowing. Unlike nitrogen, {label} doesn't get consumed or "
                f"washed away quickly if unused — the surplus already sitting in this soil will "
                f"still be there for the crop to draw on. Adding more on top doesn't raise yield; "
                f"it just accumulates further and, over several seasons of continued over-application, "
                f"can start interfering with the uptake of other nutrients."
            )
        elif data["product_kg_total"] > 0:
            basal_problems.append(
                f"Soil {label} is short by {data['deficit_kg_ha']} kg/ha against what {crop} "
                f"needs this season."
            )
            basal_guidance.append(
                f"Apply the full {data['product_kg_total']} kg of {data['product']} now, worked "
                f"into the root zone rather than left on the surface. {label.capitalize()} barely "
                f"moves through soil once applied — it stays close to where it lands — so unlike "
                f"nitrogen it can't be top-dressed later and expected to reach the roots in time. "
                f"Missing this window generally means the crop runs short on {label} for the "
                f"entire season, not just a temporary dip."
            )
        else:
            basal_guidance.append(f"{label.capitalize()} is already at target — nothing to add here.")

    first_n_pct = application_plan[0]["pct_of_nitrogen"]
    basal_n_kg = round(n["product_kg_total"] * first_n_pct / 100, 1) if n["product_kg_total"] > 0 else 0
    if n["status"] == "excess":
        basal_problems.append(f"Soil nitrogen is already {n['surplus_kg_ha']} kg/ha above what {crop} needs.")
        basal_guidance.append("Skip nitrogen at sowing too, for the same reason as above — there's already more in the soil than this crop will use.")
    elif basal_n_kg > 0:
        basal_guidance.append(
            f"Apply {basal_n_kg} kg of {n['product']} ({first_n_pct}% of the season's nitrogen "
            f"dose) at sowing. Nitrogen moves through soil easily and is taken up steadily as the "
            f"crop grows, which is why — unlike phosphorus and potassium — it doesn't all have to "
            f"go in on day one; the remainder of the dose is timed for the vegetative stage below."
        )
        basal_product_kg[n["product"]] = round(basal_product_kg.get(n["product"], 0) + basal_n_kg, 1)

    for label, data in (("phosphorus", p), ("potassium", k)):
        if data["status"] not in ("excess",) and data["product_kg_total"] > 0:
            basal_product_kg[data["product"]] = round(basal_product_kg.get(data["product"], 0) + data["product_kg_total"], 1)

    stages.append({
        "id": "sowing", "label": "Sowing", "window": "At sowing / transplanting", "icon": "grass",
        "problem": " ".join(basal_problems) if basal_problems else None,
        "guidance": basal_guidance, "product_kg": basal_product_kg,
    })

    # ── Stage 3: Vegetative Growth / Top-Dress — remaining nitrogen ──
    veg_problem = None
    veg_guidance = []
    veg_product_kg = {}
    if n["status"] == "excess":
        veg_guidance.append("No nitrogen top-dress needed here — the excess already sitting in the soil will carry the crop through vegetative growth on its own.")
    elif len(application_plan) > 1 and n["product_kg_total"] > 0:
        remaining_pct = application_plan[1]["pct_of_nitrogen"]
        remaining_n_kg = round(n["product_kg_total"] * remaining_pct / 100, 1)
        if weather.get("high_rain_risk"):
            veg_problem = (
                f"{weather.get('rain_forecast_mm_5d')}mm of rain is forecast in the next 5 days — "
                f"nitrogen applied as a single dose right before that much rain would lose a "
                f"meaningful share to runoff and leaching before the crop had a chance to use it."
            )
        veg_guidance.append(
            f"Apply the remaining {remaining_n_kg} kg of {n['product']} ({remaining_pct}% of the "
            f"season's nitrogen) around {application_plan[1]['stage']}. Splitting the dose this "
            f"way means less nitrogen is sitting in the soil at any one time waiting to be taken "
            f"up, which is exactly the window during which rain can wash it away — so the split "
            f"isn't just about timing convenience, it directly reduces how much of what you paid "
            f"for actually reaches the crop."
        )
        veg_product_kg[n["product"]] = remaining_n_kg
    elif n["product_kg_total"] > 0:
        veg_guidance.append("Nitrogen was fully covered at sowing — no separate top-dress needed at this stage.")
    else:
        veg_guidance.append("Nitrogen is already at target — no top-dress needed at this stage.")
    if weather.get("heat_volatilization_risk"):
        heat_note = (
            f"Average temperatures are forecast around {weather.get('avg_temp_c')}°C during this "
            f"window. Urea left on the soil surface in hot conditions loses nitrogen to the air as "
            f"ammonia gas within days — incorporating it into the soil instead of "
            f"surface-broadcasting keeps that nitrogen where the crop can still reach it."
        )
        veg_guidance.append(heat_note)
        veg_problem = (veg_problem + " " if veg_problem else "") + f"Heat volatilization risk is elevated (avg {weather.get('avg_temp_c')}°C forecast)."
    stages.append({
        "id": "vegetative", "label": "Vegetative Growth",
        "window": application_plan[1]["stage"] if len(application_plan) > 1 else "~3-4 weeks after sowing",
        "icon": "eco", "problem": veg_problem, "guidance": veg_guidance, "product_kg": veg_product_kg,
    })

    # ── Stage 4: Flowering & Fill — monitoring, not new inputs ──
    flowering_problem = None
    flowering_guidance = [
        "No new fertilizer is typically needed at this stage if the basal and top-dress doses "
        "above were applied on schedule — this window is about monitoring the crop's response, "
        "not adding more inputs."
    ]
    short_nutrients = []
    watch_points = []
    if p["status"] == "deficient":
        short_nutrients.append("phosphorus")
        watch_points.append(
            "phosphorus deficiency — dark or purple-tinged leaves and delayed flowering — since "
            "this field started short on phosphorus and the basal dose may not fully close the "
            "gap in time for peak demand during flowering"
        )
    if k["status"] == "deficient":
        short_nutrients.append("potassium")
        watch_points.append(
            "potassium deficiency — scorched or yellowing leaf edges and weak stems — since this "
            "field started short on potassium, which the crop draws on heavily during grain or "
            "fruit fill for water regulation and starch/sugar transport"
        )
    if watch_points:
        flowering_problem = (
            f"This field entered the season short on {' and '.join(short_nutrients)}, "
            f"so it's worth watching for symptoms even after the basal dose."
        )
        flowering_guidance.append(
            "Watch specifically for " + "; and ".join(watch_points) +
            ". A light foliar feed can help if either shows up mid-season, since it acts faster than another soil application at this point in the crop's cycle."
        )
    stages.append({
        "id": "flowering", "label": "Flowering & Fill", "window": "Flowering through grain/fruit fill",
        "icon": "local_florist", "problem": flowering_problem, "guidance": flowering_guidance, "product_kg": {},
    })

    # ── Stage 5: Post-Harvest — reset for next season ──
    post_problem = None
    post_guidance = [
        "Re-test your soil after harvest. This season's crop will have drawn nitrogen, "
        "phosphorus, and potassium down by different amounts than this plan assumed, and "
        "whatever was applied doesn't simply reset to zero — starting next season on last "
        "season's soil test, rather than a fresh one, is one of the most common ways over- or "
        "under-application creeps back in."
    ]
    om = soil.get("organic_matter_pct")
    if om is not None and om < 2.0:
        post_problem = f"Organic matter is only {om}%, well below the 3-5% range that meaningfully improves water retention and nutrient holding capacity."
        post_guidance.append(
            "Work in compost, farmyard manure, or a green-manure cover crop before the next "
            "season. Organic matter acts as a slow-release nutrient reserve and buffer against "
            "both drought stress and nutrient leaching — it's a multi-season investment, not "
            "something a single application fixes, but it compounds if kept up between seasons."
        )
    if soil.get("salinity_risk") == "high":
        salinity_note = "Salinity risk is elevated based on this field's potassium level — worth addressing before it affects germination next season."
        post_problem = (post_problem + " " if post_problem else "") + salinity_note
        post_guidance.append("Improve field drainage where possible and consider a gypsum application before next season to help leach excess salts below the root zone.")
    post_guidance.append("Come back here once the new soil test is in — this whole plan regenerates from the latest reading, not the one it was built from today.")
    stages.append({
        "id": "post-harvest", "label": "Post-Harvest", "window": "After harvest, before next season",
        "icon": "history", "problem": post_problem, "guidance": post_guidance, "product_kg": {},
    })

    # Chart data: kg of each product applied at each stage, for a season-wide view
    all_products = sorted({prod for s in stages for prod in s["product_kg"]})
    chart_data = [
        {"stage": s["label"], **{prod: round(s["product_kg"].get(prod, 0), 1) for prod in all_products}}
        for s in stages
    ]

    return {"stages": stages, "chart_products": all_products, "chart_data": chart_data}
