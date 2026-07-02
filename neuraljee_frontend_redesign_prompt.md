# NeuralJEE — Frontend Redesign Brief

Paste this whole document into your coding agent. It is scoped to **presentation only** — no data-fetching, API routes, Zod schemas, mastery logic, or DB code should change. Every visual decision below is final and specific on purpose — do not improvise new colors, spacing values, radii, or font sizes outside what's listed here.

---

## 0. Diagnosis — read this before touching anything

`src/app/globals.css` currently defines only the *old* token system: `--surface-0` through `--surface-4`, `--color-brand-400/500/600`, `--text-primary/secondary/tertiary`, plus `.glass`, `.orb`, `.noise`, `.shimmer-line`, `.gradient-text`, `.pulse-ring`, `.float`.

But the newer components (`TeachingPanel.tsx`, `QuizPanel.tsx`, `Sidebar.tsx`, `Header.tsx`, `MasteryResult.tsx`) already use a *different* convention: `bg-card`, `bg-background`, `bg-primary`, `bg-muted`, `bg-accent`, `border-destructive`, `text-muted-foreground`, `text-primary-foreground`. **None of those CSS variables are defined anywhere in this codebase.** Those classes are currently resolving to nothing. This redesign replaces the old token system entirely and properly defines the new one — it is not optional cleanup, it's required for the newer pages to render at all.

---

## 1. Non-negotiable constraints — what NOT to do

This app currently looks like generic AI-generated SaaS output. Specifically remove and never reintroduce:

- **No gradients of any kind.** No gradient text, no gradient buttons, no gradient backgrounds, no gradient borders. Every fill is a single flat color.
- **No glassmorphism.** No `backdrop-filter: blur()`, no translucent "glass" navbars.
- **No glow/neon shadows.** Delete `--shadow-glow*` entirely. No `box-shadow` that uses a color other than black at low opacity.
- **No floating animated orbs, no noise/grain texture overlays, no shimmer-line loading bars.**
- **No decorative infinite-loop animations** (`pulse-ring`, `float`, orb drift). The only acceptable looping animation is a plain, monochrome skeleton-loading pulse.
- **No emoji used as UI icons.** `TeachingPanel.tsx` currently uses 💡 🔬 📊 ✏️ ⚠️ 🎯 and the old homepage used 🧠 as a logo mark. Replace every single one with `lucide-react` (already installed). Suggested mapping: 💡→`Lightbulb`, 🔬→`FlaskConical`, 📊→`Workflow`, ✏️→`PencilLine`, ⚠️→`TriangleAlert`, 🎯→`Target`, 🧠→`Brain`.
- **No rainbow-per-card coloring.** The old "Why MasteryAI" feature grid colored each card's icon a different hue (indigo/red/emerald/amber/purple/blue) with no semantic reason. One UI = one accent color, used sparingly, plus the four reserved mastery-status colors below — nothing else gets its own color.
- **No inconsistent radii.** The old code mixes `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl` arbitrarily across components. Exactly two radius values exist in this app — see §2.
- **No arbitrary spacing.** Every padding/margin/gap value must come from the 4px-based scale in §2. If you're about to write `padding: 13px` or `gap: 22px`, stop — round to the nearest scale value instead.
- **No off-center, asymmetric layouts.** Every page container centers with equal left/right space (`margin-inline: auto`); every card in a grid shares identical internal padding; every icon+label row vertically centers with a fixed gap.

---

## 2. Design tokens — define these exactly

Replace the entire contents of `src/app/globals.css`'s `:root` token block with this. Use Tailwind v4's CSS-first `@theme inline` block to map every one of these into a usable utility class (`bg-background`, `bg-card`, `text-muted-foreground`, etc.) — this is what the newer components are already expecting.

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  /* Base surfaces — flat, no transparency tricks */
  --background: #0a0a0c;
  --foreground: #f2f2f4;

  --card: #131316;
  --card-foreground: #f2f2f4;

  --popover: #17171b;
  --popover-foreground: #f2f2f4;

  --muted: #1a1a1e;
  --muted-foreground: #8c8c95;

  --border: rgba(255, 255, 255, 0.08);
  --input: rgba(255, 255, 255, 0.12);
  --ring: var(--accent);

  /* Single brand accent — flat, used sparingly: primary buttons, active nav
     item, links, focus rings. Never used decoratively or as a gradient. */
  --accent: #3b6fe0;
  --accent-foreground: #f8fafc;

  --primary: var(--accent);
  --primary-foreground: var(--accent-foreground);
  --secondary: var(--muted);
  --secondary-foreground: var(--foreground);

  --destructive: #e5484d;
  --destructive-foreground: #f8fafc;

  /* Mastery status colors — reserved EXCLUSIVELY for mastery pills,
     the heatmap, and quiz result indicators. Never used as a generic
     UI accent, even if a hue happens to match. */
  --mastery-mastered: #22c55e;
  --mastery-learning: #f5a623;
  --mastery-weak: #ef4444;
  --mastery-not-started: #52525b;

  /* Exactly two radii, app-wide */
  --radius-sm: 6px;   /* buttons, inputs, badges, small controls */
  --radius-lg: 12px;  /* cards, panels, modals, popovers */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --radius-sm: var(--radius-sm);
  --radius-lg: var(--radius-lg);
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

Delete every old token (`--surface-*`, `--color-brand-*`, `--text-primary/secondary/tertiary`, `--shadow-glow*`) and every old utility class (`.glass`, `.orb`, `.orb-1/2/3`, `.noise`, `.gradient-text`, `.gradient-text-warm`, `.shimmer-line`, `.pulse-ring`, `.float`, `.grid-pattern`). Keep and carry forward: the scrollbar styling (re-themed to the new neutral palette), `:focus-visible`, `::selection`, `.skip-link`, the `prefers-reduced-motion` block, the `@media print` block, and the KaTeX/Mermaid overrides (re-themed — KaTeX text color should read `var(--foreground)`, `.katex-display` background should be `var(--muted)` not a tinted indigo).

### Spacing scale
4px base unit. Only these values are allowed anywhere in the app: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80` (px). Map to Tailwind's default spacing scale (`1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20`) — don't invent arbitrary values with `p-[13px]` syntax.

### Type scale
Inter only, already loaded via `next/font/google` in `layout.tsx` — keep that. One scale, used consistently everywhere, no exceptions:

| Role | Size | Weight | Color |
|---|---|---|---|
| Page title (rare — dashboard greeting, landing hero) | 28px | 600 | `--foreground` |
| Section heading | 20px | 600 | `--foreground` |
| Card title | 16px | 600 | `--foreground` |
| Body | 14px | 400, line-height 1.6 | `--foreground` |
| Secondary / caption | 13px | 400–500 | `--muted-foreground` |

No `font-weight: 800/900`, no `text-8xl`-scale hero text, no letter-spacing tricks.

### Shadows and motion
Flat by default — separation comes from a 1px `border` plus the `--card` vs `--background` color step, never from shadow. The **only** exception: floating overlays (dropdown menus, popovers, modals, toasts) get exactly one neutral shadow: `0 4px 16px rgba(0,0,0,0.4)`. Never a colored or glowing shadow.

Transitions: `150ms ease-out` on `background-color`, `border-color`, `color`, and `transform`. Buttons get `active:scale-[0.98]`. That's the entire motion vocabulary — no spring bounces, no staggered reveals, no decorative entrance animations. Respect `prefers-reduced-motion` everywhere (carry the existing media query forward).

---

## 3. Component primitives to build once, reuse everywhere

You already have `@radix-ui/react-*` (accordion, dialog, label, progress, select, separator, slot, tabs, tooltip), `class-variance-authority`, `clsx`, and `tailwind-merge` installed — this is the standard shadcn/ui toolchain, already present but unused as a coherent system. Build these primitives in `src/components/ui/` using Radix where there's real interaction logic (dialogs, tabs, tooltips, select), and plain styled elements where there isn't:

- **Button** — variants: `primary` (`bg-primary text-primary-foreground`), `secondary` (`bg-secondary text-secondary-foreground border border-border`), `ghost` (transparent, `hover:bg-muted`), `destructive`. Sizes: `sm` (32px height), `md` (40px height, default), `lg` (48px height). `radius-sm`. One consistent focus ring (`ring-2 ring-ring ring-offset-2 ring-offset-background`).
- **Card** — `bg-card border border-border radius-lg`, padding `24px` always, no hover lift/shadow/border-glow effects. A `CardHeader`/`CardTitle`/`CardContent` split if it helps consistency across pages.
- **Badge** — for the four mastery statuses only, `radius-sm`, small `12px` text, background at low opacity of the status color, foreground at full opacity of the same color. No other badge colors exist in this app.
- **Input / Textarea / Select** — `bg-muted border border-input radius-sm`, 40px height for single-line inputs, focus state = `border-accent` + ring.
- **Skeleton** — flat `bg-muted` block with one subtle monochrome opacity pulse (`animate-pulse`, no shimmer gradient), sized to match the real content it's replacing so nothing jumps on load.
- **EmptyState** — icon (lucide, `muted-foreground`, 32px) + one line of body text + optional action button. Used for: new user with no mastery data, empty review queue, no search results.
- **ErrorState** — same shape as the existing pattern in `TeachingPanel.tsx` (icon + message + retry button) — keep that pattern, just restyle it onto the new tokens, and reuse it identically in every other page that can fail (`QuizPanel`, `doubt` page, `review` page).

---

## 4. Page-by-page pass

Go through every one of these in order. Each is a pure restyle — don't change props, data flow, or logic.

1. **`src/app/page.tsx` (landing page)** — currently imports old hardcoded content from `@/lib/data` and links to `/learn/${subjectId}` routes that no longer exist post-migration. Rebuild as a real marketing page: flat dark hero, one clear headline (no gradient text), a single primary CTA button pointing to `/sign-up`, a secondary link to `/dashboard`. Drop the `@/lib/data` import entirely.
2. **`src/app/(auth)/sign-in` and `sign-up`** — these render Clerk's hosted `<SignIn />`/`<SignUp />` components, which default to Clerk's own light theme. Use Clerk's `appearance` prop (`baseTheme: dark` from `@clerk/themes`, plus `variables: { colorPrimary: '#3b6fe0', colorBackground: '#0a0a0c', colorText: '#f2f2f4' }`) so the auth screens match the rest of the app instead of flashing white.
3. **`src/app/(app)/layout.tsx` + `Sidebar.tsx` + `Header.tsx`** — the app shell. Sidebar: flat `bg-card`, one active-state treatment (left border or background fill in `--accent` at low opacity, not a glow), consistent icon+label rows with lucide icons at 18-20px. Header: flat `bg-background` with a single 1px bottom border, no blur.
4. **`src/app/(app)/dashboard/page.tsx` + `MasteryHeatmap.tsx`** — grid of subject/chapter cards using the new `Card` primitive. Heatmap cells use only the four reserved mastery colors, nothing else. Stat summaries use the standard type scale, not oversized hero numbers.
5. **`src/app/(app)/learn/page.tsx`** — subject → chapter → subtopic browse list. Consistent list-row treatment, no per-row color variation.
6. **`src/app/(app)/learn/[subtopicId]/page.tsx` + `TeachingPanel.tsx` + `MathRenderer.tsx` + `DiagramRenderer.tsx`** — the core teaching view. Replace all emoji section icons with lucide icons per the mapping in §1. Every section (`Intuition`, `Core Concept`, `Diagram`, `Worked Example`, `Common Mistakes`, `Key Takeaways`, `JEE Context`) uses the identical `Card` treatment — same padding, same border, same icon size and color (`muted-foreground`, not a different hue per section). The "hook" stays visually distinct as a pull-quote but as a flat `bg-muted` block with a single left border in `--accent`, not the old `border-primary bg-primary/5` gradiented look.
7. **`src/app/(app)/learn/[subtopicId]/quiz/page.tsx` + `QuizPanel.tsx` + `MasteryResult.tsx`** — four question-type UIs (MCQ radio group, MSQ checkbox group, INTEGER/NUMERICAL numeric input) all built on the same `Input`/`Button` primitives. Results view uses the mastery badge colors only for the actual mastery outcome, not as page decoration.
8. **`src/app/(app)/review/page.tsx`** — spaced-repetition queue. Plain list of due cards using the `Card` primitive, a count badge, nothing else.
9. **`src/app/(app)/doubt/page.tsx`** — Socratic AI chat. Standard chat-thread layout: user messages right-aligned in `bg-accent text-accent-foreground`, AI messages left-aligned in `bg-card`, both sharing the same bubble radius (`radius-lg`) and padding. No avatar gradients.

---

## 5. Engineering requirements — "safe, no errors, reactive"

- Every new primitive is fully typed — no `any`, props interfaces exported where other components need them.
- Every page that fetches data needs all three states handled visibly: loading (skeleton sized to match real content), error (the `ErrorState` pattern with a retry action), and empty (the `EmptyState` pattern) — not just the happy path.
- Every interactive element has a visible `:focus-visible` ring — carry forward the existing `:focus-visible` global rule, retarget it to `--ring`.
- Preserve and extend the existing accessibility work: the skip link, `role="radiogroup"`/`role="radio"` on quiz options, `role="tablist"`/`aria-selected"` on tabs, `aria-label` on icon-only buttons and the diagram container. Every icon-only button needs `aria-label`; every decorative icon needs `aria-hidden="true"`.
- `Mermaid` and any other heavy client-only library stays dynamically imported with `ssr: false`, exactly as already done — don't regress this for a "cleaner" import.
- Mobile: every page must work down to 375px width. Sidebar collapses to a bottom nav or drawer below the `md` breakpoint — don't just shrink the desktop layout.
- No layout shift: skeletons must be sized in advance to match the real content's height, not generic small placeholders that cause a jump when real content loads.

---

## 6. Definition of done

- `globals.css` contains only the tokens in §2 — zero references to `--surface-*`, `--color-brand-*`, `.glass`, `.orb`, `.shimmer-line`, `.gradient-text`, `.pulse-ring`, `.float` remain anywhere in the codebase.
- Zero emoji characters remain in any `.tsx` file used as a UI icon.
- Every `bg-card` / `bg-primary` / `text-muted-foreground` / etc. class across the app now resolves to a real, intentional value — verified by actually loading every page in §4 and confirming nothing renders unstyled.
- Every card, button, badge, and input across every page in §4 uses the same primitive from §3 — no one-off ad hoc styled elements remain.
- No `box-shadow` in the codebase contains a non-black color, and no element has an infinite decorative animation.
