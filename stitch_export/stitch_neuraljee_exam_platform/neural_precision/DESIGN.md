---
name: Neural Precision
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363941'
  surface-container-lowest: '#0b0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d2027'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2ec'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#e1e2ec'
  inverse-on-surface: '#2e3038'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb786'
  on-tertiary: '#502400'
  tertiary-container: '#df7412'
  on-tertiary-container: '#461f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb786'
  on-tertiary-fixed: '#311400'
  on-tertiary-fixed-variant: '#723600'
  background: '#10131a'
  on-background: '#e1e2ec'
  surface-variant: '#32353c'
  surface-base: '#0A0A0A'
  surface-elevated: '#141414'
  surface-stroke: '#262626'
  status-mastered: '#10B981'
  status-review: '#F59E0B'
  status-weak: '#EF4444'
  text-primary: '#FFFFFF'
  text-secondary: '#A3A3A3'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 24px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-numeric:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  data-gap: 8px
  reading-width: 720px
---

## Brand & Style

This design system is engineered as a "precision instrument for exam domination." It rejects the soft, approachable tropes of traditional EdTech in favor of a high-performance, utility-first aesthetic inspired by developer tools like Linear and financial interfaces like the Bloomberg Terminal. 

The brand personality is **Elite, Academic, and Technical**. It respects the user's focus by eliminating "visual noise" and prioritizing information density.

**Design Style: Dark Minimalist / Technical**
- **Architecture:** Monolithic and structured, using 1px borders and subtle background shifts instead of shadows to define hierarchy.
- **Visual Tone:** Sophisticated dark-mode default with a singular high-energy accent to drive action.
- **Interactions:** Responsive and "alive," featuring real-time text streaming for AI components and crisp, immediate transitions.

## Colors

The palette is anchored in a **Deep Charcoal (#0A0A0A)** to reduce eye strain during 12-hour study sessions. 

- **Primary Accent:** Electric Blue (#3B82F6) is used sparingly for primary actions and key progress indicators.
- **Semantic Logic:** A strict traffic-light system (Green/Amber/Red) maps directly to the Mastery Heatmap and Quiz results. These colors must maintain high saturation to remain legible against the dark background.
- **Neutral Hierarchy:** Content depth is managed through grayscale tiers: `#0A0A0A` (Base), `#141414` (Cards/Containers), and `#262626` (Borders).

## Typography

Typography is treated as a data-visualization tool. The system employs three distinct families to separate UI, Content, and Data.

- **UI & Headlines (Geist):** A sharp, technical sans-serif for navigation and structural headers.
- **Long-form Study Content (Inter):** Chosen for its exceptional readability. For LaTeX formulas, line-height is increased to `28px` to prevent superscripts and subscripts from overlapping.
- **Data & Metadata (JetBrains Mono):** Used for scores, timers, tabular figures, and LaTeX source strings. This ensures numerical alignment in high-density tables.

**Mathematical Rendering:**
All formulas should be rendered via KaTeX. Ensure `$inline-math$` uses the same font-size as surrounding text, while `$$block-math$$` includes `1.5rem` vertical padding.

## Layout & Spacing

The layout philosophy follows a **12-column fixed grid** for the Dashboard and a **centered reading column** for Study Pages.

- **Density:** Use an 8px base grid for UI components, but drop to a 4px "micro-grid" for dense data displays like the Mastery Heatmap.
- **Reading Comfort:** Study pages must constrain text width to `720px` to maintain optimal line lengths, even on wide desktop monitors.
- **Breakpoints:**
  - **Desktop (1280px+):** Persistent left sidebar (240px) for curriculum navigation.
  - **Tablet (768px - 1024px):** Collapsible sidebar, 2-column grid for dashboard widgets.
  - **Mobile (<768px):** Bottom navigation bar; single-column content flow.

## Elevation & Depth

This system avoids ambient shadows, relying instead on **Tonal Layering** and **High-Contrast Outlines**.

- **Level 0 (Background):** `#0A0A0A` — The primary canvas.
- **Level 1 (Surface):** `#141414` — Cards, navigation rails, and inset areas.
- **Level 2 (Interaction):** `#1C1C1C` — Hover states and active selections.
- **Borders:** All interactive elements must have a `1px` solid border of `#262626`. When an element is active or focused, the border transitions to the Primary Accent or the relevant Semantic color.
- **Glassmorphism:** Reserved exclusively for floating Command Palettes (Raycast-style) or Modals, using a `12px` backdrop blur and `40%` opacity of the Surface color.

## Shapes

The shape language is **Refined and Sharp**, emphasizing a professional, non-playful character.

- **Primary Radius:** `4px` (Soft) is the standard for buttons, input fields, and cards.
- **Micro-elements:** Heatmap cells and tags use a `2px` radius.
- **Pills:** Only used for "Status Badges" (e.g., Difficulty Level, Question Type) to distinguish them from interactive buttons.

## Components

**Buttons:**
- **Primary:** Solid `#3B82F6` with white text. `4px` radius. No gradient.
- **Secondary:** Transparent background with `#262626` border. 
- **Ghost:** No border or background; text-only until hover.

**Mastery Heatmap:**
- Grid of `12x12px` squares. Color-coded based on status tokens.
- Hovering a cell triggers a Tooltip (Level 2 surface) showing subtopic stats.

**Input Fields:**
- Background: `#0A0A0A`. Border: `#262626`. 
- Focus state: Border becomes `#3B82F6` with a `0 0 0 2px` glow of the same color at `20%` opacity.

**Cards:**
- Background: `#141414`. Border: `1px` solid `#262626`.
- Padding: `24px` for study cards; `16px` for dashboard widgets.

**Doubt Solver UI:**
- Uses a monospaced font for the prompt input.
- AI responses stream in with a "cursor" block at the end of the text string to indicate processing.