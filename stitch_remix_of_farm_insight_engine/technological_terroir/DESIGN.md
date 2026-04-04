# Design System Document: Technological Terroir

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Agrarian"**

This design system is a sophisticated dialogue between the ancestral wisdom of the land and the precision of artificial intelligence. It rejects the cold, sterile "SaaS blue" aesthetic in favor of a **High-End Editorial** experience. We are not building a dashboard; we are curating a digital field journal. 

The layout breaks the traditional rigid grid through **Intentional Asymmetry** and **Overlapping Elements**, mimicking the organic layering of soil and sediment. By utilizing generous white space and a "magazine-style" hierarchy, we guide the user’s eye with the authority of a premium publication and the efficiency of a high-performance tool.

---

## 2. Colors & Surface Philosophy
The palette is grounded in earth-tones but elevated by "digital light."

### The "No-Line" Rule
**Borders are strictly prohibited.** To define boundaries, designers must use tonal shifts between surface tiers. 
*   **Surface Hierarchy:** Instead of a flat grid, use `surface_container_low` for large background sections and `surface_container_lowest` for interactive cards to create a "lifted" effect.
*   **Tonal Nesting:** A card (`surface_container_highest`) should sit on a background of `surface_container` to create distinction purely through value.

### Signature Textures & Glass
*   **The Soil Layer Effect:** Use subtle vertical gradients from `primary` to `primary_container` for hero sections to evoke depth.
*   **Glassmorphism:** For floating navigation or modal overlays, use `surface` colors with a 70% opacity and a `24px` backdrop-blur. This ensures the "terroir" of the background is never fully lost.

| Role | Token | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Base** | `background` | `#fefae0` | The soft cream canvas. Always the starting point. |
| **Primary** | `primary` | `#173809` | Deep Forest. Use for high-authority headings and primary actions. |
| **Secondary** | `secondary` | `#9f402d` | Terracotta Accent. Use for human-centric elements and directional cues. |
| **Tertiary** | `tertiary` | `#4e2500` | Earth Shadow. Use for deep contrast and grounding accents. |

---

## 3. Typography
Our typography pairing is a tension between the future (Geometric) and the human (Humanist).

*   **Display & Headlines (Space Grotesk):** Modern, geometric, and bold. These should be treated as architectural elements. Use `display-lg` for hero statements with tight letter-spacing (-0.02em).
*   **Body & Titles (Manrope):** Large, high-contrast, and highly readable. Manrope provides a friendly but professional tone.
*   **The Editorial Lead:** Always begin long-form content with a `title-lg` "intro" paragraph to establish the magazine feel before dropping into `body-md`.

---

## 4. Elevation & Depth
Depth in this system is organic, not mechanical.

*   **The Layering Principle:** Treat the UI as "stacked soil."
    *   *Level 0:* `surface` (The Ground)
    *   *Level 1:* `surface_container_low` (Recessed Areas)
    *   *Level 2:* `surface_container_highest` (Interactive Cards)
*   **Ambient Shadows:** For floating elements, use a "Soil Shadow": 
    *   `box-shadow: 0 20px 40px rgba(29, 28, 13, 0.06);`
    *   Shadows must be tinted with the `on_surface` color—never use pure black or grey.
*   **The Ghost Border Fallback:** If accessibility requires a stroke, use `outline_variant` at **15% opacity**. A solid 1px line is a failure of the layout's tonal balance.

---

## 5. Components

### Buttons & Tactility
*   **Primary Action:** Pill-style (`rounded-full`) using the `primary` color. Add a very subtle inner-glow (top-down white gradient at 10% opacity) to give it a tactile, "pressable" feel.
*   **Secondary Action:** `secondary_container` background with `on_secondary_container` text. No border.

### Editorial Cards
*   **Construction:** Use `xl` (3rem) corner radius. 
*   **Separation:** Strictly forbid divider lines. Use `surface_container_low` to separate chunks of data or increase vertical padding to `4rem` between sections.
*   **Asymmetry:** Images within cards should occasionally "break the container," overlapping the edge of the card to create a layered, organic feel.

### Status Indicators (The "Glow" State)
Instead of flat status dots, use **Glowing Indicators**:
*   **Active:** `primary_fixed` with a `8px` blurred outer glow.
*   **Warning:** `tertiary_fixed` with a `8px` blurred outer glow.
*   **Critical:** `secondary` (Terracotta) with a `10px` blurred outer glow.

### Tactile Inputs
*   **Style:** Large, pill-shaped inputs with `surface_container_highest` background. 
*   **Focus State:** Instead of a border, the background should shift to `surface_bright` and the shadow should increase in diffusion.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use intentional asymmetry. Offset your columns (e.g., a 7-column main area and a 4-column sidebar with a 1-column gap).
*   **Do** lean into "Over-Sized" spacing. If it feels like too much white space, add 20% more.
*   **Do** use typography as a decorative element. A large, low-opacity "01" behind a header is encouraged.

### Don't
*   **Don't** use 1px borders or dividers. **Ever.**
*   **Don't** use pure black (#000000) for text. Use `on_surface` (#1d1c0d) to maintain the organic warmth.
*   **Don't** align everything to a center axis. Modernity is found in the "off-balance" harmony of the layout.
*   **Don't** use standard Material shadows. They are too sharp for this system’s "soft soil" philosophy.