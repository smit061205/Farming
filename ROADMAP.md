# Roadmap: Technological Terroir → AI-Powered Precision Fertilizer Recommendation

> **Status: Phases 0–7 below are complete.** Brand is now **AgriSense**, Loans/Lender is gone, the precision engine (`fertilizer_engine.py` + `sustainability_engine.py`) is live, login/signup are simplified, and copy is de-jargoned. See **Part 2** below for the current focus/cleanup audit.

**Problem statement:** Excessive/improper fertilizer use degrades soil and cuts farmer income. Build a data-driven app that recommends optimal fertilizer **type and quantity** from soil health, crop type, and weather patterns — driving sustainable practice, better yield, better income.

**Approach:** Keep the entire Technological Terroir visual system (earth-tone palette, Space Grotesk/Manrope type, no-border editorial cards, glassmorphism) and stack (React/Vite/Tailwind + FastAPI/MongoDB/Groq/Earth Engine) unchanged. Cut what's off-topic, deepen what's on-topic. Scope decisions locked in: **remove Loans/Lender entirely**, timeline **1–2 weeks**.

---

## Phase 0 — Scope lock & rebrand copy (0.5 day)

- Keep the "Technological Terroir" brand/visual language; retarget the *copy* toward precision fertilizer, not general agritech (Phase 6 covers exact copy spots).
- Confirm single role: `farmer` only. Drop the `lender` role from schemas/auth entirely.

## Phase 1 — Remove Loans & Lender module (0.5–1 day)

Off-topic surface area to delete:

- **Frontend pages:** `LoansPage.jsx`, `LoanTermsPage.jsx`, `LenderLandingPage.jsx`, `LenderDashboardPage.jsx`, `LenderProfilePage.jsx`
- **Frontend components:** `LenderNavbar.jsx`, `LenderOfferModal.jsx`, `LoanApplicationModal.jsx`
- **Frontend context:** `LenderAuthContext.jsx` (and its provider wrapper in `App.jsx`)
- **Routes in `App.jsx`:** `/loans`, `/loans/terms`, `/lender`, `/lender/dashboard`, `/lender/profile`
- **Backend:** `GET /api/engine/verified-farmers` in `engine_routes.py` (the lender risk feed)
- **Nav links:** any "Loans" / "For Lenders" links in `Navbar.jsx` / dashboard CTAs
- Grep the repo for `lender` and `loan` (case-insensitive) after deleting to catch stray imports/links.

## Phase 2 — Rebuild the input model: Field + Crop + Soil (2–3 days)

The problem statement needs soil health **+ crop type + weather** as inputs and a **quantity** as output — today `crop_type` is barely used and there's no field-size concept to turn "kg/ha" into an actual quantity.

- Extend the soil profile (`InputPage.jsx` + `schemas.py`) with:
  - `field_size` + unit (acres/hectares) — required to compute total product quantity, not just a rate
  - `crop_type` — promote from optional hint to a required, structured field (dropdown from the existing `CROP_IMAGE_MAP` crop list)
  - `growth_stage` (optional: sowing / vegetative / flowering / maturity) — fertilizer timing depends on this
  - keep existing pH / N / P / K / soil_type / coordinates as-is
- Backend: extend `derive-soil-metrics` (or a new `FieldProfile` model) to carry these through to the recommendation engine.

## Phase 3 — Weather-aware precision recommendation engine (3–4 days, core differentiator)

This is the part that's currently thin: `fertilizer-top3` today only looks at pH + N and returns a generic dosage string; weather telemetry is fetched but never actually influences a recommendation. Fixing this is what makes the app match the problem statement instead of just resembling it.

New backend module, e.g. `backend/fertilizer_engine.py`:

1. **Deterministic baseline (not LLM)** — so results are explainable and reproducible, with the LLM layered on top for narrative:
   - Small crop-nutrient-requirement table (target N-P-K kg/ha per crop — rice, wheat, cotton, maize, etc., standard agronomy reference values)
   - Deficit = target − current soil test value (clamped ≥ 0) → drives fertilizer *type* selection
   - `field_size` → converts kg/ha rate into total kg of product needed
2. **Weather adjustment** — extend the existing Open-Meteo call in `fetch-telemetry` from `current` to a short-range `daily` forecast (rain probability/precip sum, temp):
   - Heavy rain forecast → recommend split/staged application (e.g. 60% now, 40% in ~3 weeks) or slow-release formulation to cut nitrogen leaching/runoff — this is the direct "improper use → soil degradation" fix the problem statement calls out
   - Hot/dry forecast → flag urea volatilization risk, suggest incorporation method or an alternative (e.g. ammonium sulfate)
3. **LLM narrative layer** — pass the *computed* deficits + weather flags into the Groq prompt (reuse `_call_groq`) so the AI's `reason` text is grounded in real numbers instead of guessing from pH/N alone.
4. **Output** — exact kg of product for the whole field (not just kg/ha), an application schedule when rain risk is detected, and type (organic vs synthetic) weighted toward avoiding over-application.

## Phase 4 — Sustainability & yield/income impact layer (2–3 days)

Directly answers "ensuring sustainable agricultural practices" and "enhancing crop yield and farmer income":

- **Sustainability score**: compare the AI-recommended dose against a "typical over-application" baseline → surface "X% less fertilizer used" / "runoff risk avoided" as a headline metric.
- **Yield/income estimate**: map the existing 0–100 soil health score (from `derive-soil-metrics`) → an expected yield-uplift % from correcting the deficiency, times a small crop price table (mock ₹/quintal + typical yield/ha) → an estimated ₹ income delta. Label explicitly as an estimate.
- Repurpose `SustainabilityPage.jsx` (already exists, currently generic) to show these numbers.
- Repurpose the existing `YieldChart.jsx` component for a "baseline vs. recommended" comparison visual.

## Phase 5 — Recommendation history (1–2 days)

- Persist each recommendation run (soil snapshot, weather snapshot, crop, computed dose, timestamp) per user in Mongo.
- Surface as a history list/trend on `SoilLibraryPage.jsx` (already exists) — reinforces the "data-driven" story and pairs with the existing `SoilTrendsChart.jsx`.

## Phase 6 — UI/copy consolidation (1–2 days)

No structural redesign needed — same design system throughout. Just retarget copy and trim nav:

- `Navbar.jsx`: Dashboard, Soil Health, Fertilizer Hub, Soil Library, Consult, Profile — no Loans.
- `LandingPage.jsx`, `DashboardPage.jsx`, `FertilizerHubPage.jsx` headlines: foreground "Precision Fertilizer Recommendation" instead of general "AI agrarian platform" framing.
- `ConsultPage.jsx` chatbot system prompt (`engine_routes.py` → `/api/engine/chat`): narrow persona from general agronomist to fertilizer-recommendation advisor.

## Phase 7 — Demo prep (0.5–1 day)

- Seed 2–3 demo farmer profiles (different crop/soil/region) so judges see varied recommendations.
- One-pager mapping each sentence of the problem statement to a shipped feature (useful for the pitch/judging rubric).
- Rehearse the OCR soil-report upload flow (already built) as a demo moment — strong "data-driven" visual.

---

## What survives untouched

Satellite NDVI/NDWI insights, Open-Meteo telemetry plumbing, `derive-soil-metrics`, fertilizer encyclopedia, soil-report OCR, auth, the entire design system — all directly reusable, no rework needed beyond what's listed above.

## Rough total

~11–16 days of focused work → fits the 1–2 week window.

---
---

# Part 2 — Focus Audit: What's Unnecessary, What's Broken, How to Restructure

The core engine is solid and real. But the site around it grew from the old "digital twin of your farm" concept, and a chunk of it is now either **off-topic** for this problem statement, **decorative** (static numbers that were never wired to real data), or **duplicative** (three different screens each claiming to be "your fertilizer recommendation," and they don't agree with each other). This section audits every page and proposes the shape the site should take.

## The biggest problem: three competing fertilizer recommendations

This is the most important finding — it undermines the core pitch more than anything else on this list.

| Screen | Endpoint | What it is |
|---|---|---|
| `DashboardPage.jsx` — "Fertilizer Protocol" card | `/api/engine/insights` → `fertilizerProtocol` | **Old system.** Pure LLM guess (or `MOCK_INSIGHTS` fallback) from pH/N only. Predates the precision engine. |
| `FertilizerHubPage.jsx` — "Your Fertilizer Plan" | `/api/engine/precision-recommendation` | **The real one.** Deterministic per-nutrient math, field-size-aware, weather-adjusted. This is what the problem statement describes. |
| `FertilizerHubPage.jsx` — "Best Fertilizers" (AI Top 3), *on the same page as the real one* | `/api/engine/fertilizer-top3` | **Old system.** Another pure-LLM guess from pH/N only, no field size, no weather — can disagree with the precision plan sitting directly above it. |

A judge (or a farmer) can hit three different "here's your fertilizer" answers that don't match. Fix this before anything else below.

**Action:**
- Dashboard's fertilizer card should call `/api/engine/precision-recommendation` (or a trimmed summary of it) instead of `insights.fertilizerProtocol`. Keep `insights.cropCards` (the crop-recommendation AI) — that part is legitimate and complementary — just drop the `fertilizerProtocol` half of that response.
- Remove the "Best Fertilizers" AI Top 3 section from `FertilizerHubPage.jsx`, or repurpose it honestly as something that doesn't compete — e.g. an unranked "browse organic alternatives" list — not a second "top pick."
- `/api/engine/fertilizer-top3` in `engine_routes.py` can then be retired or repurposed; `/api/engine/insights`'s `fertilizerProtocol` field can be dropped from the response.

## Dead code

- **`/loading` route (`LoadingPage.jsx`)** — nothing in the app navigates here anymore (`InputPage.handleAnalyze` goes straight to `/dashboard`). Confirmed zero references. Delete the route, the page, and its `App.jsx` entry.

## Decorative / disconnected content

These render on-screen but were never wired to a real computation — confirmed by reading the source, not just guessing:

- **`SoilHealthPage.jsx` → Microbial Maps tab** (`MicrobialMapsView.jsx`): "Fungi:Bacteria 1.2:1", "Respiration 48 mg CO₂-C" — all hardcoded constants. Its satellite layer is literally the same NDVI tile the Sensor Network tab already shows (`layer_type=microbial` maps to the same NDVI visualization server-side). Adds a tab, adds nothing real.
- **`SoilHealthPage.jsx` → Nutrient Flow tab** (`NutrientFlowView.jsx`): "Ion Capacity 24.5 meq/100g", "Nitrate Leech: Mod Risk", "Base Saturation: Stable at 82%" — all hardcoded, confirmed in source. The *real* version of "does rain risk this fertilizer leaching" already exists and works — it's the weather-adjusted split-dose logic in `fertilizer_engine.py`, shown on the Fertilizer Hub. This tab is a fake duplicate of a feature that's actually built correctly elsewhere.
- **`SoilHealthPage.jsx` → Sensor Network tab → "Diagnostic Risk Profile" panel** (lime requirement, salinity risk, buffer pH, soil texture): these come from `user.soil_data.{lime_requirement_tons_per_ha, salinity_risk, cec, organic_matter_pct}`, which were only ever populated by the old onboarding's `PhaseGeology.jsx` calling `/api/engine/derive-soil-metrics`. **That step no longer exists** — signup was simplified and no longer collects a soil profile. Every new user now sees fallback defaults (0 t/ha lime, "Low" salinity, "Loam") that were never computed from their actual data. Either wire `derive-soil-metrics` into `InputPage.jsx`'s save flow so these numbers become real again, or drop the panel.
- **`SoilHealthPage.jsx` → Atmospheric tab**: weather/telemetry visuals that duplicate what's already shown on Dashboard and inside the Fertilizer Hub's weather panel, just with more decoration and no new information.

**Net effect:** of Soil Health's 6 tabs, only **AI Report** (real Groq soil narrative) and **Archive** (real recommendation history) are backed by genuine, user-specific computation.

## Off-topic for this problem statement

- **`SoilLibraryPage.jsx` ("Farmer's Encyclopedia")** — a general plant-care lookup (watering needs, sunlight, lifecycle) via the Perenual API. This is generic gardening reference content, not fertilizer- or soil-nutrient-specific. It's leftover surface area from the original broader "digital agrarian" concept, not something the problem statement asks for. Lowest-value page in the app for this pitch.

## What's genuinely core (keep, and these are already in good shape)

- Landing, Login, Signup — already simplified this session.
- `InputPage.jsx` — the single real data-entry point (soil test, crop, field size, growth stage). This is the actual "soil health + crop type" half of the problem statement's input.
- `FertilizerHubPage.jsx`'s **Precision Plan** section — the actual answer to the problem statement. Authoritative once the duplication above is fixed.
- `SustainabilityPage.jsx` — the "sustainable practice + yield/income" half of the problem statement, directly.
- `SoilHealthPage.jsx` → **AI Report** and **Archive** tabs — real, keep.
- `ConsultPage.jsx` — supporting, already retargeted to fertilizer Q&A, adds genuine depth without being the core loop.
- Fertilizer/Soil Types encyclopedia sections on the Fertilizer Hub — legitimate reference content, fine as secondary material.
- Profile, Privacy, Terms, Contact — necessary utility/legal, already de-jargoned.

## Proposed structure going forward

Collapse the app around the actual problem statement — soil + crop + weather in, fertilizer type/quantity + sustainability/income out — instead of the current 11-page sprawl with three competing answers:

1. **Home** (was Dashboard) — field snapshot (soil/crop/size) + THE fertilizer plan (pulled from the real engine, not `/insights`) + sustainability headline numbers + AI crop suggestions. One screen that actually answers the pitch without clicking around.
2. **Analyze Field** (`InputPage.jsx`, unchanged) — the data entry point.
3. **Fertilizer Plan** (trimmed `FertilizerHubPage.jsx`) — full precision breakdown + encyclopedia reference. Drop the competing AI Top 3.
4. **Soil Report** (trimmed `SoilHealthPage.jsx`) — just AI Report + Archive (+ the satellite map, which is real). Drop Microbial Maps, Nutrient Flow, Atmospheric as separate tabs, or fold their one or two real data points (e.g. the satellite layer toggle) into this page directly instead of six tabs for two real features.
5. **Sustainability Impact** (unchanged) — keep as its own page, it's a direct problem-statement match and a strong pitch moment on its own.
6. **Ask AI** (`ConsultPage.jsx`, unchanged) — supporting.
7. Profile / Privacy / Terms / Contact — unchanged, low-chrome utility.

**Cut entirely:** `SoilLibraryPage.jsx` (Farmer's Encyclopedia) and the `/loading` route. Remove their nav links, routes, and (for the library) the `library_routes.py` backend router if nothing else depends on it.

## Suggested execution order

1. **Fix the three-recommendations problem** (highest impact, most credibility-damaging if left as-is) — Dashboard card + drop AI Top 3 section.
2. **Delete dead/decorative weight** — `/loading` route, Microbial Maps tab, Nutrient Flow tab, Soil Library page.
3. **Decide on the Diagnostic Risk Profile panel** — either wire `derive-soil-metrics` into `InputPage.jsx`'s save so it's real again, or remove the panel. Don't leave it showing fake defaults.
4. **Consolidate nav** — trim `Navbar.jsx` to the 6-item structure above.
5. **Merge Dashboard + Fertilizer Hub's precision section into one "Home"** if you want the tightest possible pitch (bigger change, optional — the current two-screen version still works, it's just one more click than necessary).
