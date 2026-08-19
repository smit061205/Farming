# Roadmap: Technological Terroir → AI-Powered Precision Fertilizer Recommendation

> **Status: Phases 0–7 below are complete.** Brand is now **AgriSense**, Loans/Lender is gone, the precision engine (`fertilizer_engine.py` + `sustainability_engine.py`) is live, login/signup are simplified, and copy is de-jargoned. See **Part 2** for the focus/cleanup audit, and **Part 3** for the data-flow audit and redesign.

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

---

# Part 3 — Data Flow Audit & Redesign

**The question asked:** how does data actually get loaded and demanded right now, and what would a real professional precision-ag product's data flow look like?

## What I traced

Followed one user end to end: `OnboardingPage.jsx` → `AuthContext` → `DashboardPage.jsx` → `InputPage.jsx` → `ProfilePage.jsx`, plus the backend paths each one hits (`auth_routes.py`, `user_routes.py`, `engine_routes.py`).

### What signup actually collects

`OnboardingPage.jsx` (single-page signup) collects exactly: **name, email-or-phone, password.** Nothing about the farm — no location, no crop, no field size, no soil reading. `UserRegister` in `schemas.py` accepts `coordinates`, `focuses`, `soil_data` as optional fields, but the signup form never sends them. A brand-new account has `coordinates: null` and no `soil_data` key at all.

### What happens the instant that new user lands on the Dashboard

`DashboardPage.jsx` immediately fires three requests: `/api/engine/insights`, `/api/engine/precision-recommendation`, `/api/engine/fetch-telemetry`. All three are built to **never fail and never come back empty** — each one has a silent fallback baked in server-side:

- `engine_routes.py`'s `_resolve_field_inputs()` (line 622): if the user has no `soil_data`, it invents `pH 6.5`, `Nitrogen 100 ppm`, derives P and K from a formula off that pH, and defaults `crop_type` to `"Wheat"` and field size to `2 acres`. This isn't a documented placeholder — it's indistinguishable in the API response from a real lab reading.
- `/insights` (line 328) does the same pH/N/P/K fabrication, and if Groq is unreachable it falls back further to a **hardcoded `MOCK_INSIGHTS` object** (fixed crop names, fixed scores, fixed AI-sounding "reasoning" text) — again with no flag telling the frontend "this is canned."
- `fetch-telemetry` is the one honest exception: it requires real `coordinates` and returns nothing without them, so the Dashboard correctly shows moisture/temp as `—` / "Sync Required" for a new user.

The practical effect: **a farmer who has entered nothing sees a fully-populated "Your Fertilizer Plan" card — a specific crop, specific kg totals, an AI-written headline — computed from numbers nobody measured.** `DashboardPage.jsx` already has the right empty state built for this (`precision?.dose ? <plan card> : <"No Plan Yet, Analyze Now">`, line 342), but it can never fire, because the backend always returns a fabricated `dose` instead of `null`. The empty state is dead code.

### The second place this happens: `InputPage.jsx`

The soil-entry form itself (`InputPage.jsx` line 33) initializes its fields to a hardcoded literal — `N: 96, P: 48, K: 194, pH: 6.8, cropType: 'Wheat', soilType: 'Clay Loam', fieldSize: 2` — whenever there's no `localStorage` cache and no saved profile. So a first-time visitor opens "Analyze Your Field" and sees a form that *looks* already filled in with plausible lab numbers, with no visual distinction from a form holding their own real, previously-saved data. Nothing prompts them to actually enter their soil's numbers — the path of least resistance is to just hit "Get My Fertilizer Plan" on data that was never theirs.

### Where real data *can* enter the system (but isn't asked for)

- **Location** — only settable via `MapPicker` on `ProfilePage.jsx`, a page with no entry point from the signup flow or the Dashboard's empty states. A farmer has to discover the profile dropdown themselves.
- **Soil chemistry** — three real paths exist and are good: manual entry on `InputPage.jsx`, OCR lab-report upload (`SoilOCRUploader`, already wired to real extraction), and a "Sync" button that pulls a satellite-derived pH/moisture estimate once coordinates exist. The problem isn't that these paths are missing — it's that **none of them are demanded**, so a user can skip straight to seeing a "personalized" plan without ever touching any of them.
- **Crop type, field size** — same story: real dropdown/input on `InputPage.jsx`, never asked for anywhere before the Dashboard shows results as if they were.

### What's genuinely organic already (leave alone)

Weather (`fetch_rain_forecast`, Open-Meteo) and satellite moisture/NDVI telemetry are correctly zero-input — they derive entirely from `coordinates`, which is the one thing worth asking for early. This part already behaves like a real product: give it a location, it goes and gets real external data with no further demands on the farmer.

## Why this reads as "not organic"

A professional data-driven app's contract is: **the depth of the answer must be visibly bounded by the depth of the input.** Right now that contract is broken in both directions — deep-looking answers (specific kg doses, AI narratives, crop-match scores) are shown on zero real input, with no visual difference between a measured value and an invented one. That's what makes the whole experience feel synthetic even when the underlying engine (`fertilizer_engine.py`) is legitimate and well-built.

## Proposed redesign: a staged, honest demand model

**Tier 1 — Identity (signup, unchanged).** Name + email/phone + password. Correctly minimal; don't add anything here.

**Tier 2 — Essential Field Facts (new: a mandatory one-screen step immediately after signup, before the first Dashboard view).** Three things every farmer already knows without measuring anything:
   - **Location** — a map tap or a "Use My Current Location" GPS button (mirrors the existing `MapPicker`, just surfaced at the right moment instead of buried in Profile).
   - **Crop type** — the existing dropdown.
   - **Field size** — the existing input.

   This is not a return to the old multi-step wizard — it's one screen, three fields, all quick-pick/tap inputs, no typing required beyond field size. It's the minimum a real recommendation needs to not be generic.

**Tier 3 — Soil Chemistry (explicitly optional at setup, demanded contextually).** Present as a real choice, not a hidden default:
   - "I have a lab report" → OCR upload (already built).
   - "Enter my own numbers" → the existing N/P/K/pH inputs.
   - "I don't have this yet" → proceed without it. The plan that results must say so.

**The rule that fixes the core problem:** every number the app displays carries a provenance, and the UI shows it. Concretely:
   - Backend: `_resolve_field_inputs()` returns a `data_source` per field (`"measured"` / `"estimated"` / `"regional_default"`) instead of silently blending them into one number.
   - Frontend: any card built from `"regional_default"` values gets a visible "Estimated — add your soil data for an exact dose" chip, and downgrades its own language ("approximate range" instead of "your fertilizer plan").
   - The Dashboard's already-built `precision?.dose ? plan : "No Plan Yet"` branch becomes reachable again: it should key off whether Tier 2 is complete, not off whether the backend *could* invent numbers.
   - `InputPage.jsx`'s hardcoded `{N: 96, P: 48, ...}` seed is replaced with either a genuinely empty form (placeholders, not values) for first-time users, or the user's real saved data — never a look-alike fake filled in silently.
   - `MOCK_INSIGHTS` stays as a last-resort fallback only for genuine Groq outages, but gets a `"source": "fallback"` flag so the frontend can label it rather than presenting it as personalized AI reasoning.

## Suggested execution order

1. Add `data_source` provenance to `_resolve_field_inputs()` and `/insights`, and thread it through to the frontend cards (highest-leverage fix — turns every downstream screen honest without redesigning them).
2. Build the Tier 2 "Set Up Your Field" single-screen step, inserted between signup and first Dashboard load (reuses `MapPicker`, the crop dropdown, and the field-size input already built for `InputPage.jsx`/`ProfilePage.jsx` — no new components, just relocated ones).
3. Gate the Dashboard's plan/crop-recommendation cards on Tier 2 completion instead of on `precision?.dose` truthiness, so the existing "No Plan Yet" empty state actually fires for incomplete profiles.
4. Replace `InputPage.jsx`'s hardcoded seed values with an honest empty/placeholder first-visit state.
5. Add the "Estimated" / "Add your soil data" chip treatment wherever `data_source !== "measured"`.
