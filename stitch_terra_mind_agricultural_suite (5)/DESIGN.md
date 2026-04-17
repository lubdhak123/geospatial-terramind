# Design System Document: The Midnight Arboretum

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Midnight Arboretum."** 

We are moving away from the sterile, "SaaS-blue" aesthetics of the past decade. This system interprets the "Organic Editorial" brief by treating the screen as a high-end digital broadsheet. It is a space that feels quiet, premium, and deeply layered. 

Instead of a rigid, boxed-in grid, we embrace **Intentional Asymmetry**. This means using large, confident typography offsets, overlapping image/container elements, and a radical use of negative space. We do not just present data; we curate an environment where the deep forest greens of the brand feel like light filtering through a dense canopy at night.

---

## 2. Colors & Tonal Depth
This palette is rooted in charcoal and slate, utilizing the brand's signature green as a luminous highlight rather than a flat filler.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Layout boundaries must be defined solely through:
1.  **Background Shifts:** Placing a `surface_container_low` (#1a1c1a) block against a `surface` (#121412) background.
2.  **Tonal Transitions:** Using whitespace and color weight to imply the end of a content block.

### Surface Hierarchy & Nesting
Treat the interface as physical layers of slate and tinted glass.
*   **Base:** `surface` (#121412) is your ground floor.
*   **The Inset:** Use `surface_container_lowest` (#0d0f0d) for "sunken" areas like search bars or code blocks.
*   **The Lift:** Use `surface_container_high` (#292a28) or `highest` (#333533) for elements that need to feel closer to the user, like cards or modals.

### The "Glass & Gradient" Rule
To avoid a "flat" dark mode, use Glassmorphism for floating elements (e.g., Navigation bars, Tooltips). Use `surface_variant` (#333533) at 60-80% opacity with a `20px` to `40px` backdrop-blur. 
*   **Signature Polish:** For Primary CTAs, use a subtle linear gradient from `primary` (#88d982) to `primary_container` (#2e7d32) at a 135-degree angle. This adds "soul" and depth that a flat hex code cannot achieve.

---

## 3. Typography
We use **Lexend** across the entire scale. Its geometric clarity balances the moody, organic nature of the palette.

*   **Display & Headline:** Use `display-lg` (3.5rem) and `headline-lg` (2rem) to create an editorial rhythm. Don't be afraid to let a headline "breathe" with 120px of top margin.
*   **Body & Labels:** `body-md` (0.875rem) is the workhorse. Use `on_surface_variant` (#bfcaba) for secondary text to maintain a soft visual hierarchy that doesn't strain the eyes in dark mode.
*   **The Editorial Hook:** Combine `display-sm` for titles with `label-md` (all caps, tracked out +10%) immediately above it to create a sophisticated, magazine-style header.

---

## 4. Elevation & Depth
In this design system, depth is a result of **Tonal Layering**, not structural lines.

*   **The Layering Principle:** Stack containers to create natural lift. A `surface_container_high` card sitting on a `surface_container_low` background creates a sophisticated "soft lift."
*   **Ambient Shadows:** If a floating element (like a dropdown) requires a shadow, use a large blur (30px+) and low opacity (6%). The shadow color must be a tinted version of `surface_container_lowest` (#0d0f0d), never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use the `outline_variant` (#40493d) at **15% opacity**. It should be felt, not seen.
*   **Roundedness:** Stick to the `xl` (1.5rem) for large containers and `md` (0.75rem) for smaller components like buttons to maintain an "organic" feel.

---

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. Text color `on_primary_fixed` (#002204). Roundedness: `full`.
*   **Secondary:** `surface_container_highest` background with `on_surface` text. No border.
*   **Tertiary:** No background. Text in `primary`. Use for low-emphasis actions.

### Cards & Lists
*   **No Dividers:** Forbid the use of line-rule dividers. Separate list items using 16px of vertical whitespace or a subtle background hover state using `surface_bright` (#383a37).
*   **Editorial Cards:** Use `surface_container_low` (#1a1c1a). Combine a `display-sm` title with a `body-md` description. 

### Input Fields
*   **Style:** Use the "Inset" look. Background: `surface_container_lowest`. Bottom-only "Ghost Border" using `outline_variant` at 20% opacity. 
*   **States:** On focus, the bottom border transitions to 100% opacity `primary`.

### Chips
*   **Selection:** Use `secondary_container` (#374c56) with `on_secondary_container` (#a6bcc7) text. Use `full` roundedness for a pebble-like, organic feel.

### Additional Component: The "Verdent Blur"
*   **Context:** Use as a background decoration for hero sections.
*   **Execution:** Large, 400px wide circles of `primary_container` (#2e7d32) with a 150px Gaussian blur, placed at 10% opacity behind content to simulate depth and organic atmosphere.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical margins (e.g., 80px left, 120px right) to create a custom editorial feel.
*   **Do** use `tertiary` (#ffb1c7) sparingly for "high-alert" or "exclusive" features—the soft pink provides a stunning counterpoint to the forest greens.
*   **Do** prioritize legibility by keeping `on_surface` (#e2e3df) for all primary reading material.

### Don't
*   **Don't** use 100% white (#FFFFFF). It creates "halation" (visual vibrating) against the dark slate backgrounds.
*   **Don't** use standard "Drop Shadows." Use tonal shifts and ambient blurs.
*   **Don't** use 1px borders to separate content blocks. If the layout feels messy without a line, you need more whitespace, not more lines.