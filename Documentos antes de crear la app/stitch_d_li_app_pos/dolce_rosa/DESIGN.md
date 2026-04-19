# Design System Strategy: Sweet Organic Editorial

## 1. Overview & Creative North Star
**Creative North Star: "The Confectionary Gallerist"**

This design system moves away from the rigid, boxy constraints of traditional food-service apps and instead embraces a high-end, editorial aesthetic. It is designed to feel like a premium digital boutique—combining the playful, indulgent nature of a dessert parlor with the sophisticated restraint of a modern fashion editorial.

We break the "template" look by utilizing **intentional asymmetry**. Hero elements and "organic stains" (inspired by spilled cream or melting gelato) should break the container boundaries, creating a sense of fluid movement. By overlapping high-resolution product photography with bold, script-based typography, we create a layered depth that feels tactile and bespoke.

---

## 2. Colors
Our palette is rooted in the indulgence of Fuchsia and the softness of Light Pink, balanced by a sophisticated neutral foundation.

### Color Palette (Material Tokens)
- **Primary (`#b30069`):** The signature Fuchsia. Used for high-priority actions and brand accents.
- **Secondary (`#874e58`):** A sophisticated dusty rose for supportive UI elements.
- **Surface (`#fcf9f8`):** An off-white, warm "cream" base that feels more premium than pure hex white.
- **On-Surface (`#1b1c1c`):** Our "Dark Grey" for maximum readability.

### Design Principles
*   **The "No-Line" Rule:** Do not use 1px solid borders to separate sections. Use background color shifts. For example, a card should be `surface-container-lowest` placed on a `surface-container-low` background.
*   **Surface Hierarchy:** Use `surface-container` tiers (Lowest to Highest) to create physical layers. Think of the UI as sheets of fine textured paper stacked upon one another.
*   **The Glass & Gradient Rule:** For floating navigation or modal headers, use Glassmorphism (`surface` color at 70% opacity + 20px backdrop-blur). Main CTAs should use a subtle linear gradient from `primary` to `primary_container` to add "soul" and dimension.

---

## 3. Typography
The typography system is a dialogue between structured modernity and playful expression.

*   **Display & Headline (Plus Jakarta Sans):** Clean, geometric, and authoritative. Use `display-lg` (3.5rem) for hero statements to ground the whimsical elements.
*   **Title & Brand Accents (Playful Script):** While the UI logic remains in Plus Jakarta Sans, use a high-end script font for category titles (e.g., "Copas," "Helados") to mimic the handwriting of a boutique shop owner.
*   **Body (Plus Jakarta Sans):** Set at `body-lg` (1rem) for descriptions and `body-md` (0.875rem) for secondary details. Ensure a generous line height (1.5) to maintain the editorial feel.

---

## 4. Elevation & Depth
We eschew traditional "drop shadows" in favor of **Tonal Layering** and **Ambient Occlusion**.

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-lowest` card on a `surface-container-low` background creates a soft, natural lift.
*   **Ambient Shadows:** If a floating action button or modal requires a shadow, it must be highly diffused (Blur: 40px, Opacity: 6%) and tinted with the `primary` hue rather than pure black.
*   **Ghost Borders:** If a boundary is strictly required for accessibility, use the `outline-variant` token at 15% opacity. Never use 100% opaque borders.
*   **Organic Shapes:** Use the `roundedness` scale to soften the UI. Large containers should use `xl` (3rem) or `full` corner radius to mirror the "stains" and "waves" found in the brand imagery.

---

## 5. Components

### Buttons
*   **Primary:** Rounded `full`, utilizing a subtle gradient from `primary` to `primary_container`. Text is `on_primary` (White).
*   **Secondary:** Ghost style with a `1.5px` border of `primary` at 30% opacity.

### Cards & Lists
*   **Editorial Cards:** Forbid the use of divider lines. Separate product items using `md` (1.5rem) vertical spacing.
*   **Image Overlays:** Product images should "break" the card. For example, a Sundae image should sit 20px above the top edge of its container, creating a 3D effect.

### Chips (Selection)
*   **Selection Chips:** Use `secondary_container` for the unselected state and `primary` for the selected state. Corners must be `full`.

### Input Fields
*   **Soft Inputs:** Use `surface_container_high` with no border. Upon focus, transition the background to `surface_container_highest` and add a subtle `primary` glow.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use the organic pink "waves" as asymmetrical background masks for product photos.
*   **Do** use generous whitespace (80px+) between major sections to let the "sweetness" of the design breathe.
*   **Do** mix the clean Sans-Serif UI with the Script branding accents specifically for titles to maintain a "hand-crafted" boutique feel.

### Don't
*   **Don't** use sharp 90-degree corners. Everything must feel soft, approachable, and "melted."
*   **Don't** use standard grey shadows. They make the vibrant Fuchsia and Pink feel "dirty."
*   **Don't** use dividers or lines. Rely on the `surface-container` tiers to define where one piece of content ends and another begins.
*   **Don't** clutter the screen. If a section feels heavy, increase the `surface-container` contrast instead of adding more borders.