"""Product allocation engine — turns a nutrient dose (kg/ha) into actual bags
to buy. Ported from the reference Node server's engines/allocate.js.

Order matters: phosphorus sources carry nitrogen, so P is met before N and
the nitrogen it brings is credited against the N requirement.
"""
from data import products, get_product

round1 = lambda n: round(n * 10) / 10


def _price_per_kg(p: dict) -> float:
    return p["bagPrice"] / p["bagKg"]


def allocate(dose: dict, opts: dict = None) -> dict:
    """
    dose  { N, P, K, S, Zn } kg/ha
    opts  { sDeficient, phBand, areaHa }
    returns {items, costPerHa, costTotal}
    """
    opts = opts or {}
    s_deficient = opts.get("sDeficient", False)
    ph_band = opts.get("phBand", "neutral")
    area_ha = opts.get("areaHa", 1)

    need = {"N": dose.get("N") or 0, "P": dose.get("P") or 0, "K": dose.get("K") or 0, "S": dose.get("S") or 0, "Zn": dose.get("Zn") or 0}
    items = []

    def add(product_id: str, kg_per_ha: float, why_key: str):
        if kg_per_ha <= 0.05:
            return
        p = get_product(product_id)
        per_ha = round1(kg_per_ha)
        total_kg = round1(per_ha * area_ha)
        items.append({
            "id": product_id,
            "name": p["name"],
            "kgPerHa": per_ha,
            "totalKg": total_kg,
            "bags": round((total_kg / p["bagKg"]) * 10) / 10,
            "bagKg": p["bagKg"],
            "costPerHa": round(per_ha * _price_per_kg(p)),
            "costTotal": round(total_kg * _price_per_kg(p)),
            "whyKey": why_key,
            "supplies": {"n": p["n"], "p": p["p"], "k": p["k"], "s": p["s"], "zn": p["zn"]},
        })

    # Alkaline and sodic soils: DAP performs poorly, prefer SSP + ammonium sulphate.
    prefer_ssp = s_deficient or ph_band in ("alkaline", "sodic")

    # --- 1 + 2. Sulphur and phosphorus, together, because SSP carries both ---
    if need["P"] > 0 and prefer_ssp:
        ssp = get_product("ssp")
        ssp_for_s = (need["S"] / ssp["s"]) * 100 if need["S"] > 0 else 0
        ssp_for_p = (need["P"] / ssp["p"]) * 100
        ssp_kg = min(ssp_for_p, max(ssp_for_s, ssp_for_p * (1 if s_deficient else 0.5)))

        if ssp_kg > 0:
            add("ssp", ssp_kg, "whySspS" if s_deficient else "whySspAlk")
            need["P"] -= (ssp_kg * ssp["p"]) / 100
            s_from_ssp = (ssp_kg * ssp["s"]) / 100
            need["S"] = max(0.0, need["S"] - s_from_ssp)

    if need["P"] > 0.05:
        dap = get_product("dap")
        dap_kg = (need["P"] / dap["p"]) * 100
        add("dap", dap_kg, "whyDap")
        need["P"] = 0
        # --- 3. Credit the nitrogen that came with the DAP ---
        n_from_dap = (dap_kg * dap["n"]) / 100
        need["N"] = max(0.0, need["N"] - n_from_dap)

    # --- Remaining sulphur, if any ---
    if need["S"] > 0.05:
        if need["N"] > 0.05:
            as_ = get_product("ammsulph")
            as_for_s = (need["S"] / as_["s"]) * 100
            as_for_n = (need["N"] / as_["n"]) * 100
            as_kg = min(as_for_s, as_for_n)
            if as_kg > 0.05:
                add("ammsulph", as_kg, "whyAmmSulph")
                need["S"] -= (as_kg * as_["s"]) / 100
                need["N"] -= (as_kg * as_["n"]) / 100
        if need["S"] > 0.05:
            bs = get_product("bentsulph")
            add("bentsulph", (need["S"] / bs["s"]) * 100, "whyBentSulph")
            need["S"] = 0

    # --- 4. Remaining nitrogen with urea ---
    if need["N"] > 0.05:
        urea = get_product("urea")
        add("urea", (need["N"] / urea["n"]) * 100, "whyUrea")
        need["N"] = 0

    # --- 5. Potassium ---
    if need["K"] > 0.05:
        mop = get_product("mop")
        add("mop", (need["K"] / mop["k"]) * 100, "whyMop")
        need["K"] = 0

    # --- 6. Zinc ---
    if need["Zn"] > 0.05:
        zs = get_product("zincsulph")
        add("zincsulph", (need["Zn"] / zs["zn"]) * 100, "whyZinc")
        need["Zn"] = 0

    cost_per_ha = sum(i["costPerHa"] for i in items)
    cost_total = sum(i["costTotal"] for i in items)

    return {"items": items, "costPerHa": cost_per_ha, "costTotal": cost_total}


def allocate_blanket(blanket: dict, opts: dict = None) -> dict:
    """The traditional blanket dose, costed the same way, for a like-for-like comparison."""
    opts = opts or {}
    return allocate({**blanket, "S": 0, "Zn": 0}, {**opts, "sDeficient": False, "phBand": "neutral"})


def comparison(plan: dict, blanket_plan: dict) -> dict:
    saved_total = blanket_plan["costTotal"] - plan["costTotal"]
    saved_pct = round((saved_total / blanket_plan["costTotal"]) * 100) if blanket_plan["costTotal"] > 0 else 0
    return {
        "planCost": plan["costTotal"],
        "blanketCost": blanket_plan["costTotal"],
        "savedTotal": saved_total,
        "savedPct": saved_pct,
        "cheaper": saved_total >= 0,
    }


def product_list():
    return products


def price_source():
    from data import products_data
    return products_data.get("_priceSource", "STATIC_TABLE")


# ------------------------------------------------- spending priority + budget

_CLASS_RANK = {"Low": 1, "Medium": 2, "High": 3, "Unknown": 2}
# Within the same severity band, macronutrients carry the yield.
_AGRONOMIC_ORDER = ["N", "P", "K", "S", "Zn"]


def spending_priority(dose: dict, classes: dict, opts: dict = None) -> list:
    """Rank nutrients by how badly the soil needs them.

    Liebig's law of the minimum: the nutrient in shortest supply caps what
    every other rupee can achieve, so the shortest supply is funded first.
    """
    opts = opts or {}
    present = [k for k in _AGRONOMIC_ORDER if (dose.get(k) or 0) > 0]

    def rank_of(k):
        if k in ("S", "Zn"):
            return 1  # only dosed when measured deficient
        return _CLASS_RANK.get((classes or {}).get(k), 2)

    ordered = sorted(present, key=lambda k: (rank_of(k), _AGRONOMIC_ORDER.index(k)))

    # Cumulative-prefix costing, so nitrogen arriving inside DAP — and phosphorus
    # arriving inside SSP — is credited at every step rather than double-charged.
    steps = []
    previous = 0
    running = {"N": 0, "P": 0, "K": 0, "S": 0, "Zn": 0}

    for k in ordered:
        running[k] = dose[k]
        plan = allocate(dict(running), opts)
        steps.append({
            "nutrient": k,
            "severity": "Deficient" if k in ("S", "Zn") else ((classes or {}).get(k) or "Unknown"),
            "addedCost": plan["costTotal"] - previous,
            "cumulativeCost": plan["costTotal"],
        })
        previous = plan["costTotal"]

    return steps


def budget_allocate(dose: dict, classes: dict, budget: float, opts: dict = None) -> dict:
    """What the farmer can actually buy for a given amount of money.

    Greedy by severity, but a nutrient that will not fit is skipped rather
    than ending the run — otherwise one expensive item strands the
    remaining budget.
    """
    opts = opts or {}
    steps = spending_priority(dose, classes, opts)

    covered = {"N": 0, "P": 0, "K": 0, "S": 0, "Zn": 0}
    covers = []
    dropped = []
    cost = 0

    for step in steps:
        k = step["nutrient"]
        trial = {**covered, k: dose[k]}
        trial_cost = allocate(trial, opts)["costTotal"]
        if trial_cost <= budget:
            covered[k] = dose[k]
            cost = trial_cost
            covers.append(k)
        else:
            dropped.append({"nutrient": k, "severity": step["severity"], "wouldAdd": trial_cost - cost})

    full = allocate(dict(dose), opts)["costTotal"]
    plan = allocate(dict(covered), opts)

    return {
        "budget": budget,
        "covers": covers,
        "dropped": dropped,
        "plan": plan["items"],
        "cost": cost,
        "unspent": max(0, budget - cost),
        "fullCost": full,
        "shortfall": max(0, full - budget),
        "enough": len(dropped) == 0,
    }


def alternatives_for(dose: dict, opts: dict = None) -> dict:
    """Every product that could supply a given nutrient, costed for this dose."""
    opts = opts or {}
    area_ha = opts.get("areaHa", 1)
    key_map = {"N": "n", "P": "p", "K": "k", "S": "s", "Zn": "zn"}
    out = {}

    for nutrient in ("N", "P", "K", "S", "Zn"):
        need = dose.get(nutrient) or 0
        if need <= 0:
            continue
        field = key_map[nutrient]

        candidates = []
        for p in products:
            if not p[field] > 0:
                continue
            kg_per_ha = (need / p[field]) * 100
            total_kg = round(kg_per_ha * area_ha * 10) / 10
            candidates.append({
                "id": p["id"],
                "name": p["name"],
                "totalKg": total_kg,
                "bags": round((total_kg / p["bagKg"]) * 10) / 10,
                "cost": round(total_kg * _price_per_kg(p)),
                "alsoSupplies": [f.upper() for f in ("n", "p", "k", "s", "zn") if f != field and p[f] > 0],
            })
        candidates.sort(key=lambda c: c["cost"])
        out[nutrient] = candidates
    return out
