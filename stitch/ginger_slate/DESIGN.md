# Design System Specification: The Warm Curator

## 1. Overview & Creative North Star
This design system moves beyond the rigid, utilitarian nature of traditional admin portals to embrace the role of **"The Digital Curator."** In a pet community context, the interface must balance professional management capabilities with the warmth and approachability of the "Ginger Cat" persona.

The "Creative North Star" is **Editorial Organicism.** We reject the "boxed-in" layout of standard SaaS dashboards. Instead, we use intentional asymmetry, overlapping elements, and high-contrast typography scales to create a narrative flow. The interface should feel like a premium lifestyle magazine for pet lovers—structured yet breathing, professional yet tactile.

---

## 2. Color & Surface Philosophy
The palette draws from the "Ginger Cat Orange" and "Calico Gray" motifs, translated into a sophisticated Material Design token set.

### The "No-Line" Rule
Explicitly prohibit 1px solid borders for sectioning. Structural boundaries must be defined solely through background color shifts or tonal transitions.
- **Example:** Use `surface-container-low` (#eff4f8) sections sitting on a `surface` (#f4fafe) background.
- **Why:** Lines create cognitive friction and visual "noise." Tonal shifts create "zones" that feel integrated and modern.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine, heavy-stock paper.
- **Base Layer:** `surface` (#f4fafe)
- **Primary Content Areas:** `surface-container-low` (#eff4f8)
- **High-Interaction Cards:** `surface-container-lowest` (#ffffff)
- **Deep Nesting/Modal Backdrops:** `surface-dim` (#d5dbdf)

### The "Glass & Gradient" Rule
To inject "soul" into the admin experience:
- **Glassmorphism:** Use `surface-container-lowest` with 80% opacity and a 16px backdrop-blur for floating navigation bars or filter drawers.
- **Signature Gradients:** For primary CTAs and high-level dashboard summaries, use a subtle linear gradient from `primary` (#944a00) to `primary-container` (#e67e22) at a 135° angle.

---

## 3. Typography: Editorial Authority
We utilize **Plus Jakarta Sans** for its geometric clarity and friendly apertures. For Chinese localization, pair with a high-quality sans-serif like **Noto Sans SC** or **PingFang SC** for a seamless weight match.

- **Display Scale:** Use `display-lg` (3.5rem) sparingly for "Welcome" states or major data milestones. This creates a bold, editorial entrance.
- **Headline Scale:** `headline-sm` (1.5rem) serves as the standard page title. Ensure a generous `line-height` (1.4) to maintain the "approachable" feel.
- **The Hierarchy Strategy:** Use `primary` (#944a00) for high-impact headlines to pull the eye, while utilizing `on-surface-variant` (#564337) for body text to ensure a warm, readable contrast that isn't as harsh as pure black.

---

## 4. Elevation & Depth
Traditional shadows are replaced by **Tonal Layering** and **Ambient Diffusion.**

- **The Layering Principle:** Depth is achieved by stacking. Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural lift.
- **Ambient Shadows:** For elements that *must* float (e.g., dropdowns, modals), use a diffuse shadow: `0px 8px 24px rgba(86, 67, 55, 0.08)`. The shadow uses a tint of the `on-surface-variant` color rather than grey, mimicking natural light.
- **The "Ghost Border" Fallback:** If a border is required for accessibility, use `outline-variant` (#dcc1b1) at 20% opacity. Never use 100% opaque borders.
- **Corner Radius:** All interactive containers must use `Round 12` (0.75rem / `md`). For high-level brand elements or images, use `xl` (1.5rem) to reinforce the friendly, organic aesthetic.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`), `on-primary` text. No border. `Round 12`.
- **Secondary:** `secondary-container` fill with `on-secondary-container` text.
- **State Transition:** On hover, increase the gradient intensity; on press, scale the component to 0.98.

### Input Fields
- **Styling:** Use `surface-container-highest` (#dde3e7) as the fill. 
- **The "Focus" State:** No heavy border. Instead, use a 2px "Ghost Border" of `primary` at 40% and a subtle `primary-container` inner glow.

### Cards & Lists
- **Rule:** Absolute prohibition of divider lines.
- **Separation:** Use `spacing-6` (1.5rem) of vertical white space or shift the background from `surface-container-low` to `surface-container-lowest`.
- **Contextual Addition - "Pet Status Chips":** Use `tertiary-container` (#d78800) with `on-tertiary-container` text for status tags (e.g., "Pending Adoption," "Health Alert").

### Checkboxes & Radios
- **Style:** Use a thicker `outline` token (#897365) when unselected. When selected, the fill should be the `primary` gradient with a white checkmark/dot.

---

## 6. Do's and Don'ts

### Do
- **Do** use asymmetrical layouts for dashboard headers (e.g., text on the left, a large organic pet illustration overlapping the container edge on the right).
- **Do** prioritize white space. If a layout feels "crowded," increase the `spacing` scale by one tier (e.g., move from `10` to `12`).
- **Do** use "Calico Gray" (`secondary` tokens) for metadata and supporting text to keep the interface from feeling overwhelming.

### Don't
- **Don't** use pure black (#000000). Use `on-background` (#161c20) for maximum readability with a premium feel.
- **Don't** use 90-degree sharp corners. Everything—from tooltips to images—must adhere to the `Round 12` or higher scale.
- **Don't** use "Alert Red" for non-critical errors. Use the `error` tokens (#ba1a1a) but wrap them in `error_container` backgrounds to soften the visual impact in a "warm" community setting.