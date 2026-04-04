# Design System Specification: High-End Smart Farming

## 1. Overview & Creative North Star: "The Digital Agronomist"
This design system is built upon the North Star of **The Digital Agronomist**. We are moving away from the "industrial dashboard" aesthetic and toward a high-end editorial experience that feels as much like a premium lifestyle magazine as it does a technical tool.

To break the "template" look, we leverage **intentional asymmetry** and **tonal depth**. The layout mimics the physical world: layers of earth and glass stacked with purpose. We reject rigid, boxed-in grids in favor of expansive white space and high-contrast typography scales that ensure legibility under the harsh glare of the midday sun. This is a system that commands authority through restraint.

---

## 2. Colors: Tonal Earth & Deep Verdant
The palette is rooted in the soil but polished for the screen. It utilizes a sophisticated "Primary-Container" model to create depth without relying on black or grey.

### Primary & Secondary (The Foundation)
*   **Primary (`#012D1D`):** Our deepest forest green. Use this for high-level navigation and moments of ultimate authority.
*   **Primary Container (`#1B4332`):** The functional "Brand Green." Used for major UI elements.
*   **Secondary (`#6F5B3D`):** An earthy, sand-inspired tone that grounds the tech in the physical farm environment.
*   **Surface (`#F9F9F8`):** An off-white "fine paper" base that reduces eye strain compared to pure white.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. 
*   *Instead of a border:* Place a `surface-container-low` card onto a `surface` background.
*   *Signature Texture:* Use a subtle linear gradient (Primary to Primary-Container) for hero CTAs to provide a "soul" that flat hex codes lack.

### Glassmorphism & Tonal Nesting
To achieve a "Stripe-meets-Apple" finish, use **Glassmorphism** for floating overlays. Use semi-transparent surface colors (e.g., `surface_container_lowest` at 80% opacity) with a `20px` backdrop-blur. This ensures the UI feels like a cohesive ecosystem rather than a series of disconnected boxes.

---

## 3. Typography: Editorial Authority
We utilize two distinct families to balance technical precision with premium character.

| Level | Token | Font | Size | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Manrope | 3.5rem | 800 | Hero metrics (e.g., Yield %) |
| **Headline** | `headline-md` | Manrope | 1.75rem | 700 | Section entry points |
| **Title** | `title-lg` | Inter | 1.375rem | 600 | Card headings |
| **Body** | `body-lg` | Inter | 1.0rem | 400 | High-visibility field notes |
| **Label** | `label-md` | Inter | 0.75rem | 600 | Metadata / All-caps |

**The Hierarchy Strategy:** Use `Manrope` for data visualization and headlines to provide a modern, geometric "Apple-esque" feel. Use `Inter` for body text to maintain the legendary readability required for outdoor utility.

---

## 4. Elevation & Depth: Tonal Layering
In this system, "Up" is not indicated by a shadow alone, but by a shift in material.

*   **The Layering Principle:** Stack `surface-container` tiers to create hierarchy. 
    *   **Level 0 (Base):** `surface` (#F9F9F8)
    *   **Level 1 (Section):** `surface-container-low` (#F3F4F3)
    *   **Level 2 (Card):** `surface-container-lowest` (#FFFFFF)
*   **Ambient Shadows:** For floating elements (Modals/Popovers), use a "Sunlight Shadow": `y-12, blur-24, color: on-surface (8% opacity)`. It should feel like a cloud’s shadow over a field—broad and soft.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline-variant` at **15% opacity**. Never use 100% opaque lines.

---

## 5. Components: Primitive Guidelines

### Cards (The Primary Vehicle)
*   **Styling:** Use `xl` (1.5rem) corner rounding.
*   **Constraint:** Forbid divider lines within cards. Use `1.5rem` vertical spacing or a `surface-variant` background tint to separate header from content.
*   **Interaction:** On hover, a card should shift from `surface-container-lowest` to `surface-bright` with a subtle elevation increase.

### Buttons & Inputs
*   **Primary Button:** `primary` background with `on-primary` text. `lg` (1.0rem) rounding.
*   **Input Fields:** Use a `surface-container-high` background with no border. The label should be `label-md` placed 8px above the field.
*   **Chips:** Use `secondary-container` with `on-secondary-container` text for "Earthy" status, and the specialized status palette for health indicators.

### Specialized Farming Components
*   **Health Radiometers:** Circular gauges using `Healthy Green (#2D6A4F)` to `Critical Red (#D90429)` gradients.
*   **Weather Glass:** A frosted glass widget (backdrop-blur) that sits atop farm imagery, displaying real-time atmospheric data.

---

## 6. Do’s and Don'ts

### Do:
*   **DO** use generous whitespace. If you think there is enough padding, add 8px more.
*   **DO** use literal, high-quality icons. A "tractor" should look like a tractor, not a stylized geometric shape.
*   **DO** treat data as the hero. Use the `display-lg` scale for key farm metrics.

### Don't:
*   **DON'T** use pure black (#000000). Use `primary` or `on-surface` for deep tones.
*   **DON'T** use 1px dividers to separate list items. Use 16px of `surface-container-low` padding.
*   **DON'T** use "Default" shadows. If the shadow looks like a "drop shadow" from 2005, it is too dark and too tight.