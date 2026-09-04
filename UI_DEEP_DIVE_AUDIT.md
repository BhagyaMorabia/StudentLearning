# NeuralJEE UI Deep Dive Audit

**Date:** 2026-09-02  
**Scope:** Entire product (what it does), every frontend/UI file, and the Stitch export under `stitch_export/`.  
**Goal:** Catalog everything wrong so a rebuild can match Stitch *as a product*, not as a collage of mock HTML pasted onto leftover code.

This is a diagnosis document, not a redesign. Do not implement from this file until a single design source of truth is locked (see §0).

---

## 0. Verdict (read this first)

The UI looks bad because **the live app is three unfinished design systems stacked on top of each other**, and the Stitch pass copied **static mock screens** (fake numbers, dead buttons, decorative chrome) into React **without replacing the old layout, tokens, or landing page**.

Your instinct is correct: the new UI is built on the old one, so it inherited the old mess *and* imported Stitch’s mock inconsistencies.

| Layer | What it is | Where it still lives |
|---|---|---|
| **Layer A — old “Inter / shadcn” redesign** | Blue `#3b6fe0`, Inter-only, `bg-card` / `bg-muted` / `Button` primitives, no Geist | `src/components/ui/index.tsx`, `src/app/page.tsx` (marketing), `src/app/(app)/review/page.tsx`, loading skeletons, `(auth)` Clerk pages, `neuraljee_frontend_redesign_prompt.md` |
| **Layer B — Stitch “Neural Precision”** | Dark charcoal `#0A0A0A`, Geist + Inter + JetBrains Mono, electric blue `#3B82F6`, 720px reading column | `stitch_export/.../neural_precision/DESIGN.md`, parts of Learn / Study / Quiz / Doubt |
| **Layer C — Stitch HTML itself (internally inconsistent)** | Six screens with **four different sidebars, two primaries (purple vs blue vs Material `#adc6ff`), and demo data** | The six `code.html` files. The app copied this literally. |

Until you pick **one** chrome (sidebar width, primary color, type scale) and **strip every fake control**, restyling will keep looking “AI-generated on top of AI-generated.”

### Recommended source of truth for the rebuild

Treat **`DESIGN.md`** as canonical tokens, and **Learn curriculum HTML** as the shared chrome (sidebar + top bar), with these product rules:

1. **Primary accent:** `#3B82F6` (electric blue). Not purple `#a855f7`. Not Material `#adc6ff`. Not old `#3b6fe0`.
2. **Surfaces:** `#0A0A0A` base, `#141414` cards, `#262626` borders.
3. **Type:** Geist headlines, Inter body, JetBrains Mono labels/numbers. Load Geist. Do not map headlines to Inter.
4. **Sidebar:** one width (DESIGN.md says **240px**; Stitch Learn uses 288px / `w-72`; Dashboard uses 300px; Study/Doubt use 240px). Pick 240px and stick to it.
5. **Quiz:** focused canvas, no app chrome (Stitch quiz is a standalone screen).
6. **Never ship Stitch demo numbers** (42% mastery, +14% velocity, 3.2h/day, “Review: Friction”) unless they come from `/api/progress`.

---

## 1. What the product actually is

NeuralJEE is an **adaptive JEE (Mains/Advanced) study engine**, not a marketing site.

### Student loop

1. **Learn** (`/learn`) — browse the full syllabus (subjects → chapters → topics → subtopics).
2. **Study** (`/learn/[subtopicId]`) — four-page lesson: Foundation / Concepts / Formulas / Practice (markdown + KaTeX + Mermaid).
3. **Quiz** (`/learn/[subtopicId]/quiz`) — JEE-style MCQ / MSQ / INTEGER / NUMERICAL; timed; option-switch tracking; submit to mastery engine.
4. **Results** (same route, client state) — mastery score, accuracy, FSRS next review, weak tags, per-question trace.
5. **Dashboard** (`/dashboard`) — mastery heatmap + stats from `/api/progress`.
6. **Review** (`/review`) — FSRS due queue → jump back into quiz.
7. **Doubt** (`/doubt`) — streaming Socratic tutor (`POST /api/ai/doubt`).

### Backend that the UI barely surfaces

These exist in code and are **almost invisible in the UI**:

- Prerequisite knowledge graph (3,762 edges).
- RAG teach / remediate (`/api/ai/teach`, `/api/ai/remediate`).
- Diagnostic router (`/api/ai/diagnostic/*`, `/api/quiz/evaluate`) — 7 failure modes.
- Spaced repetition (ts-fsrs).
- Clerk auth (currently **bypassed** with `mock_user_123`).

Homepage copy advertises “Wrong Answer Book,” timed pressure, negative marking UI, etc. **There is no Wrong Answer Book route.** Negative marking is backend scoring, not a visible quiz UI.

---

## 2. File map (every UI surface)

### App shell

| File | Role |
|---|---|
| `src/app/layout.tsx` | Root HTML. Loads Inter + JetBrains + Material Symbols. **No Geist. No ClerkProvider. Skip link has no CSS.** |
| `src/app/globals.css` | Token dump: Material You palette **plus** Stitch surfaces **plus** `primary: #a855f7` (purple). Headlines mapped to **Inter**. Missing shadcn tokens the Button still uses. |
| `src/app/(app)/layout.tsx` | Auth bypass + **always** Sidebar + Header. Quiz and Doubt cannot opt out. |
| `src/components/layout/Sidebar.tsx` | Desktop left nav + mobile bottom nav. |
| `src/components/layout/Header.tsx` | Sticky top bar: fake search, fake Cmd+K, fake notifications, fake account. |

### Screens

| Route | File(s) | Design era |
|---|---|---|
| `/` | `src/app/page.tsx` | **Old Layer A landing.** Not in Stitch at all. |
| `/learn` | `learn/page.tsx` + `CurriculumView.tsx` | Stitch Learn, but with **hardcoded fake mastery**. |
| `/learn/[id]` | `StudyPageClient.tsx` | Stitch Study, broken breadcrumbs / dead prev-next. |
| `/learn/[id]/quiz` | `quiz/page.tsx` + `QuizContainer.tsx` + `QuizPresenter.tsx` + `MasteryResult.tsx` | Stitch Quiz/Results **inside** old shell (double chrome). |
| `/dashboard` | `dashboard/page.tsx` + `MasteryHeatmap.tsx` | Stitch Dashboard stats, **fake buttons + fake velocity**. |
| `/review` | `review/page.tsx` | **Old Card/Button page.** No Stitch screen exists for this. |
| `/doubt` | `doubt/page.tsx` | Stitch chat **plus a second Header** from app layout. |
| `/sign-in`, `/sign-up` | `src/app/sign-in`, `src/app/sign-up` | Bare Clerk, no theme. |
| `(auth)/sign-in`, `(auth)/sign-up` | Duplicate routes, old `#3b6fe0` theme. | Dead / competing. |

### Shared primitives (half-abandoned)

| File | Problem |
|---|---|
| `src/components/ui/index.tsx` | Entire shadcn-style kit (`Button`, `Card`, `Badge`, `Input`…) uses **undefined CSS variables**: `primary-foreground`, `destructive`, `ring`, `--radius-sm`, `--radius-lg`, `mastery-mastered`, etc. |
| `MathRenderer.tsx` | Fine. |
| `DiagramRenderer.tsx` | Uses `text-destructive` / `--radius-*` (undefined). |

### Leftover junk (not product)

- `public/test.html`, `public/test2.html`, `public/test.css`, `public/test2.css`, `public/tailwind.css`
- `neuraljee_frontend_redesign_prompt.md` (old brief that **contradicts** Stitch)

### Stitch export (the intended look)

| Screen | Path |
|---|---|
| Design tokens | `stitch_export/stitch_neuraljee_exam_platform/neural_precision/DESIGN.md` |
| Dashboard | `.../dashboard_neuraljee_refined_sidebar/code.html` |
| Learn | `.../learn_curriculum_browser_refined_sidebar/code.html` |
| Study | `.../study_projectile_motion/code.html` |
| Quiz | `.../quiz_projectile_motion/code.html` |
| Quiz results | `.../quiz_results_projectile_motion/code.html` |
| Doubt | `.../doubt_solver_neuraljee/code.html` |

**There is no Stitch screen for:** marketing homepage, Review queue, Settings, Support, sign-in/up, empty curriculum, error states, command palette.

---

## 3. Why Stitch-on-old-code looks “ass”

### 3.1 Primary color is wrong in the live CSS

`DESIGN.md` and most CTAs in HTML use **electric blue `#3B82F6`**.

`src/app/globals.css` sets:

```css
--color-primary: #a855f7; /* purple */
```

That came from **one Stitch dashboard file** with the comment *“Updated to match reference images (purple)”*. Learn HTML still uses `#3B82F6` on borders and CTAs. Doubt HTML uses Material `primary: #adc6ff`.

**Live result:** purple logo tile, purple selection highlight, purple progress bars, blue hardcoded buttons (`bg-[#3B82F6]`), green/amber status, Material light-blue tokens unused. The accent is not one color. It is noise.

Also `::selection` is `rgba(168, 85, 247, 0.35)` (purple). DESIGN.md never specified purple.

### 3.2 Geist is specified everywhere and loaded nowhere

DESIGN.md + every Stitch HTML load **Geist** for headlines.

`layout.tsx` only loads Inter + JetBrains Mono.

`globals.css` maps every headline token to Inter:

```css
--font-headline-sm: 'Inter', sans-serif;
--font-display-lg: 'Inter', sans-serif;
--font-headline-md: 'Inter', sans-serif;
```

Headlines will never match Stitch. The “technical / Linear” character is gone.

### 3.3 Tailwind v4 token wiring is broken

Stitch HTML uses Tailwind **v3 CDN** with `theme.extend.fontSize.display-lg = 48px` so `text-display-lg` works.

The Next app uses Tailwind **v4 `@theme`**. You defined `--font-display-lg` (a **font-family**), not `--text-display-lg` (a **font-size**).

So classes like:

- `text-display-lg`, `text-headline-md`, `text-body-md`, `text-label-mono`, `text-data-numeric`

**do not resolve to 48/24/14/12px.** They are no-ops or wrong.

Some files paper over this with `text-[48px]`. Others (Dashboard title `text-display-lg`) do not. Type scale is random.

Same for `rounded-DEFAULT` in `Header.tsx` — not a default Tailwind class. Invalid. Inputs won’t get the 4px Stitch radius.

`px-container-margin` exists in Stitch (`spacing.container-margin = 24px`). The app defined `--spacing-container-margin` but Header uses `px-6 md:px-8` instead. Inconsistent page gutters.

### 3.4 Missing tokens the old primitive kit still references

`Button` / `Badge` / `Input` / `ErrorState` / `DiagramRenderer` still expect:

- `--color-primary-foreground` (missing → primary button text may be unreadable on purple)
- `--color-destructive`, `--color-destructive-foreground`
- `--color-ring`
- `--radius-sm`, `--radius-lg`
- `--color-mastery-mastered` / `learning` / `weak` / `not-started`

Review page and homepage **still use this kit**. Those screens will look like unstyled or half-styled leftovers next to Stitch pages.

### 3.5 Typography plugin missing, animation plugin missing

`StudyPageClient` uses `prose`, `prose-p:mb-6`, `prose-h2:...`. **`@tailwindcss/typography` is not installed.** Those classes do nothing. Reading layout depends on a plugin that isn’t there.

`CurriculumView` uses `animate-in fade-in slide-in-from-bottom-2` (**tailwindcss-animate**, not installed). Dead classes.

### 3.6 App layout cannot match Stitch’s per-screen chrome

`(app)/layout.tsx` **always** injects Sidebar + Header.

Stitch:

| Screen | Sidebar | Top bar | Notes |
|---|---|---|---|
| Learn / Dashboard | Yes (but different widths/styles) | Yes (search on Learn, breadcrumbs on Dashboard) | |
| Study | Yes, **240px icon nav** (different from Learn) | **No global header** — title is in the article | |
| Quiz | **None** — focused exam canvas | Quiz-only close + timer | |
| Results | Yes | “/ Session Debrief” | |
| Doubt | Yes | Its **own** top bar | |

Live app: **every** authenticated page gets the Learn-style sidebar **and** the fake search header. Then Doubt **renders a second header**. Quiz is not fullscreen. Study has a global header **plus** in-page breadcrumbs. This is the “wrong view” problem.

Sidebar widths in Stitch: `w-60` (240) vs `w-72` (288) vs `w-[300px]`. Live CSS: `w-64` (256) + `desktop-main-layout { margin-left: 256px }`. **None of these match DESIGN.md’s 240px.**

### 3.7 Dual icon systems

Stitch: Material Symbols.  
Old pages: `lucide-react`.  
Live: both. Homepage Brain icon vs Sidebar `science` vs Study stitch `neurology`. Three logos.

---

## 4. Fake buttons, dead controls, and decorative lies

Anything a student can click that does not do the labeled job. Grouped by file.

### 4.1 `Header.tsx` — entire right cluster is theater

| Control | What it looks like | What it does |
|---|---|---|
| Search input “Search curriculum…” | Working search | **Nothing.** No `onChange`, no results, no navigation. |
| `⌘` `K` badges | Command palette | **Nothing.** No keydown listener. DESIGN.md even reserved glassmorphism *only* for a Raycast palette that was never built. |
| Notifications | Inbox | `<button>` with **no handler**. |
| Account circle | Profile / Clerk | **No handler.** Auth is mocked anyway. |
| Mobile search icon | Opens search | **No handler.** |

### 4.2 `Sidebar.tsx`

| Control | Issue |
|---|---|
| Logo → `/` | Takes the student **out of the product** onto the old marketing landing. Should go to `/learn` or `/dashboard`. |
| “Home” chip | Same. Stitch labeled this **“Blogs”** (also fake). You renamed it Home but still dump them on `/`. |
| “Table of Content:” | Stitch copy-paste. This is **app nav**, not a table of contents. Wrong label. |
| Settings `href="#"` | Dead. No settings page. |
| Support `href="#"` | Dead. No support page. |
| “Start Review Queue” | Real link to `/review` (good) but Review **UI is the old system**, so the CTA drops them into a different product. |
| Active state | `pathname === '/' && item.href === '/dashboard'` never highlights Dashboard from Home correctly in the app shell (Home isn’t in this layout). Unused logic. |
| Nav order | Learn, Dashboard, Review, Doubt. Stitch Dashboard screen orders **Dashboard first**. Inconsistent IA. |

### 4.3 `CurriculumView.tsx` — looks like progress, is fanfic

| Control / display | Issue |
|---|---|
| Header badge `42% Mastery` / `0% Mastery` | **Hardcoded** from `activeSubjectIdx === 0`. Not `/api/progress`. First subject always 42%. |
| Chapter bar 85% / 45% / 0% | **Hardcoded** by chapter index. First Physics chapter is always “mastered.” |
| Subtopic status dots (green/amber/gray) | **Hardcoded** by `subIdx`. First two dots green regardless of real mastery. |
| “~N PYQs” | `subtopics.length * 15`. **Invented.** Not `pyqFrequency`. |
| Right rail `28% Mastered`, Mastered (12), Review (18), Unseen (30) | **Hardcoded Stitch demo.** |
| “Up Next: Review: Friction” | **Hardcoded** for first subject only. Not the student’s weak topic. |
| **Start Review** button | **No `onClick`, no `href`.** Pure fake CTA. |
| Chapter title click | Does not open the chapter. Jumps to `localStorage last_subtopic` or **first subtopic**. Easy to land on the wrong lesson. |
| **“View All N Subtopics”** | Does **not** expand the list. Same as chapter title: navigates to one subtopic. Truncation is `slice(0, 8)` with no real “all” view. |
| Chapter cards | Stitch Learn is a **2-column chapter grid**. Live is a **wide list with 2-col subtopic names**. Wrong layout vs the screen you designed. |
| `curriculum: any[]` | No types. Easy to break UI when API shape changes. |

### 4.4 `MasteryHeatmap.tsx` (Dashboard)

| Control | Issue |
|---|---|
| **Generate Report** | `<button>` no handler. |
| **Sync Data** | `<button>` no handler. |
| Heatmap cells | `title` tooltip only. Stitch has a custom hover tooltip (`::after`). No click → subtopic. **Cannot drill into a weak cell.** |
| **Active Priorities** rows | `cursor-pointer` **with no Link**. Review Queue / Weak Topics do not navigate. |
| **STUDY VELOCITY +14%**, 3.2h/day, Target 5h, bar at 65% | **100% fake.** Copied from Stitch’s mock. Will show this even for a brand-new user with 0 hours. This is the most dishonest widget on the site. |
| Heatmap grid | Only renders cells for **existing mastery rows**, not the full syllabus. Empty users get a sentence, not a null grid. Stitch showed 100 cells including unmapped. Product-wise either is fine; visually it collapses. |
| `Suspense fallback={null}` on dashboard page | Blank flash instead of the heatmap skeleton already in the client. |

### 4.5 `StudyPageClient.tsx`

| Control | Issue |
|---|---|
| Breadcrumb **“Physics”** | **Hardcoded.** Chemistry/Math lessons still say Physics. Middle crumbs (chapter) missing vs Stitch (`Learn / Physics / Kinematics / Projectile Motion`). Physics span is not a link. |
| **Previous / Next** | Buttons with **no handlers.** Stitch labeled real neighbor topics (“Motion in 1D” / “Relative Motion”). Live says generic “Previous” / “Next” and goes nowhere. |
| Take Quiz | Real. One of the few honest primary CTAs. |
| Tabs | Real, but disabled tabs show `(soon)` — fine. `prose-*` styling does not apply (plugin missing). |

### 4.6 `QuizPresenter.tsx`

| Control | Issue |
|---|---|
| Title **“Physics Practice”** | **Hardcoded.** Every quiz, every subject. |
| Close (X) | Goes to `/learn`, not back to the subtopic. Stitch is “leave exam.” Product-wise should confirm + return to study page. |
| Timer `02:45` | Copied Stitch comment: *“Default 2:45 for visual effect.”* Counts down, **does not auto-submit, does not pause, is not per-question from the API, ignores actual `timeSpentMs` except internally.** When it hits 0, nothing happens except a red color. Fake exam pressure. |
| Progress `%` | `(currentIndex / total)` so question 1 of 5 = **0%**. Stitch showed 40% on Q2. Off-by-one vs “how far through the set.” |
| No Skip / Mark for review / Clear | May be OK vs Stitch (Stitch also only has Next). Not a fake control. |

Quiz still sits **inside Sidebar + Header + `max-w-3xl` page wrapper**. Stitch quiz is a **centered 720px column, no sidebar**. Wrong view.

### 4.7 `MasteryResult.tsx`

| Control | Issue |
|---|---|
| Status pill `bgBadge.replace('/10', '')` for the pulse dot | Hack. Classes like `bg-status-mastered/10` → `bg-status-mastered` may work; fragile. |
| Execution trace **concept column** | Shows `Q_` + first 6 chars of UUID. Stitch shows real concept names (“Projectile Range Formula”). Looks broken. |
| **Review Queue** primary button | `href="/dashboard"` — **wrong route.** Should be `/review`. Label lies. |
| Title “Diagnostic Results” | Stitch: “Kinematics Diagnostics” (topic-specific). Generic. |

### 4.8 `doubt/page.tsx`

| Control | Issue |
|---|---|
| **Double header** | App `Header` + local “Socratic Solver Instance” bar. Two notification buttons, two account icons. |
| **Attach file** | Button, **no handler**, no upload API. |
| `h-screen` inside a column that already has Header | Chat is too tall; input overlaps mobile bottom nav (`pb-20` on main vs `absolute bottom-6` on composer). Mobile: composer sits **on top of** bottom nav. |
| Shortcut hint `↵ Send` vs Stitch `⌘ + ↵` | Mismatch; actual code sends on Enter. Fine, but copy is inconsistent. |
| “Neural Engine Ready” pulse | Decorative. Does not reflect API health. |
| Empty assistant bubble | `MathRenderer` with `' '` while streaming — extra blank line before tokens. |
| No stop / abort UI | AbortController exists in code, no button. |

### 4.9 `src/app/page.tsx` (marketing — not Stitch)

| Control | Issue |
|---|---|
| Sign Up | Goes to `/sign-up` while app auth is bypassed. Confusing. |
| **Master** step card | `href="#"` — **dead.** |
| **Quiz** step | Links to `/learn`, not a quiz. |
| “Wrong Answer Book” feature card | **No such product surface.** |
| Uses old `Button`/`Card` + lucide | Completely different visual language from the app. |

### 4.10 Review page

Not fake, but **wrong view**: leftover `max-w-3xl` + `Card` + `Button` + lucide `PartyPopper`. No page padding from parent (`flex-1` with no `p-6`). Content can hug the header. Empty state is OK functionally.

`tabIndex={-1}` on Links wrapping Buttons — keyboard users skip the action.

---

## 5. Formatting, layout, and CSS errors (line-level)

### 5.1 `globals.css`

- `* { margin: 0; padding: 0 }` fights Tailwind preflight; lists/markdown padding is harder to reason about.
- `body { overflow-x: hidden }` hides heatmap overflow instead of letting it scroll cleanly.
- `--color-primary: #a855f7` vs DESIGN `#3B82F6` vs hardcoded blues.
- `--color-secondary: #4edea3` (mint). DESIGN.md primary accent is blue; secondary is used for PYQ badges. OK if intentional; clashes with “one accent.”
- Headlines → Inter (wrong family).
- No `--text-display-lg` / type scale tokens (see §3.3).
- No `--radius-sm` / `--radius-lg` (Button/Card rely on them).
- No `.skip-link` styles — skip link is **visible garbage** in the top-left of every page (or unstyled inline link).
- No `prefers-reduced-motion` (old brief required it; timers/pulses ignore it).
- KaTeX display: DESIGN wants `1.5rem` vertical padding; live uses `1.25rem` + 8px radius (DESIGN: 4px cards).
- Material Symbols globally `FILL: 1` — Stitch Learn wants FILL 0 by default, fill only when active. All icons look “on.”
- Focus ring uses `var(--color-primary)` (purple). Inputs in Header hardcode blue focus. Two focus languages.

### 5.2 `layout.tsx` (root)

- Manual `<head>` + Google Fonts `<link>` instead of `next/font` (layout shift, no Geist).
- `className="dark"` with `@custom-variant dark (&:is(.dark *))` — OK.
- No `ClerkProvider` — sign-in pages may hydrate oddly; app doesn’t use user anyway.

### 5.3 `(app)/layout.tsx`

- `min-h-screen flex` + Sidebar `fixed` + main `desktop-main-layout` — OK structurally.
- `pb-20 md:pb-0` for mobile nav, but Doubt composer also wants bottom space → collision.
- Cannot hide chrome per route.

### 5.4 Radius / density vs DESIGN.md

DESIGN: buttons/cards **4px**; heatmap **2px**; no playful pills except status.

Live mixes `rounded`, `rounded-lg` (8px in default Tailwind), `rounded-xl`, `rounded-2xl` (user bubbles), `rounded-full` (timer). Stitch HTML also mixes this — the export is not clean. A rebuild must **normalize**, not copy every radius from HTML.

### 5.5 Shadows / glow (DESIGN forbids, Stitch reintroduced)

DESIGN.md: no ambient shadows; no glow.

Live/Stitch copied anyway:

- Quiz Next: `shadow-[0_0_15px_rgba(59,130,246,0.2)]`
- Results Review Queue: `shadow-[0_0_15px_rgba(59,130,246,0.3)]`
- Doubt composer: `shadow-[0_8px_30px_rgb(0,0,0,0.5)]` + `backdrop-blur-xl` (glass — DESIGN allows only for palettes/modals)
- App Header: `backdrop-blur-md` (glass navbar — **explicitly banned** in the old redesign brief *and* DESIGN says glass is palette/modal only)
- Curriculum “Up Next”: `blur-2xl` blue orb

So even “faithful Stitch” violates DESIGN.md. Pick DESIGN.md or pick the HTML. Not both.

### 5.6 Homepage vs app contrast

Landing: `rounded-xl` icons, `text-6xl` hero, lucide, `bg-muted/30` bands, `text-primary-foreground` (undefined).  
App: Material icons, 48px display, mono labels.  
Feels like two products.

### 5.7 Auth duplication

- `src/app/sign-in` and `src/app/(auth)/sign-in` both exist.
- Middleware (`src/proxy.ts`) **always `NextResponse.next()`** — Clerk matcher is unused. Combined with `mock_user_123`, the whole auth UI is a facade.

### 5.8 Loading views don’t match the screens they replace

- Study loading: `max-w-4xl` + old Card tabs — study is `max-w-[720px]`.
- Quiz loading: `max-w-3xl` + `rounded-xl` — quiz is 720px, `rounded-lg`.
- Layout shift on load.

### 5.9 Accessibility / semantics

- Chapter titles are `<h3 onClick>` not links — not keyboard-activatable as links, no `role="button"`.
- Fake buttons are real `<button>`s without `disabled` or `aria-disabled` — screen readers announce actions that do nothing.
- Heatmap cells are empty `<div>`s, not buttons, `title` only (not accessible names).
- `aria-valuenow` on Progress uses raw `value` not clamped percent (minor).
- Mobile nav labels: “Doubt Solver” may overflow `w-16`.

### 5.10 Content / markdown

- Blockquotes always retitled **“Pro Tip for JEE”** even if the markdown was a different callout.
- MathRenderer does not use `remark-gfm` / `remark-breaks` (Study does). Quiz/doubt math/markdown will render lists/tables differently from study.

---

## 6. Screen-by-screen: live vs Stitch vs product truth

### 6.1 Learn / Curriculum Browser

**Stitch:** 12-col bento; chapter **cards in a 2-col grid**; 3 example subtopics each; right rail stats; subject segmented control.

**Live:** Same header/tabs idea, but chapters are **full-width rows** with up to 8 subtopic links. Closer to a data table than the designed cards.

**Wrong:** Fake mastery, fake PYQs, fake Up Next, View All doesn’t expand, no search despite the header promising it.

**Product gap:** Curriculum fetch is real. Mastery is not joined. Should color dots from `student_mastery`, not `chapIdx`.

### 6.2 Dashboard

**Stitch:** 300px purple-border sidebar, “Blogs” back link, breadcrumb “Physics / Mechanics Overview”, 100 random heatmap cells, named priority rows (Rotational Dynamics, etc.).

**Live:** 256px sidebar, real stats API, generic priority labels, fake velocity, fake Generate/Sync, no breadcrumbs in Header (Header search instead).

**Wrong view:** Header search on Dashboard is Learn chrome. Stitch Dashboard header is breadcrumbs + icons only.

### 6.3 Study

**Stitch:** 240px **icon** sidebar; **no** top search bar; 4-level breadcrumbs; named prev/next.

**Live:** Dot-list sidebar + search header; 3-level breadcrumb with hardcoded Physics; dead prev/next; `prose` dead.

**Reading width:** Both intend 720px. Live header+article are 720px **inside** a padded main that also has a 256px sidebar — OK on desktop, cramped on tablet when sidebar collapses.

### 6.4 Quiz

**Stitch:** No sidebar, no global header, 720px column, blue Next, cosmetic timer.

**Live:** Sidebar + Header + extra `max-w-3xl` wrapper + inner 720px. Student takes a quiz next to “Start Review Queue” and a search box. **Wrong view. Highest-severity layout bug after color.**

Also: page is `'use client'` for the whole route — no server metadata; loading.tsx may never show the way you think.

### 6.5 Quiz results

Reasonably close in structure (bento + table + 3 actions). Data quality is poor (UUID concepts). Primary CTA routes wrong. Still has sidebar (Stitch does too here). Glow on primary button vs DESIGN.

### 6.6 Doubt

Structure is close. **Double chrome** and **attach** and **mobile overlap** ruin it. `h-screen` vs nested header math is wrong.

### 6.7 Review (no Stitch)

Looks like 2024 shadcn leftover. Must be redesigned in Neural Precision, not left as the destination of the main sidebar CTA.

### 6.8 Marketing `/`

Not in Stitch. Either make a Stitch-quality marketing page or make `/` redirect to `/learn` for the logged-in (currently everyone) user. Shipping this landing next to the app guarantees “two UIs.”

---

## 7. Stitch export problems (do not copy blindly)

The export is a **set of disconnected mockups**, not a design system implementation.

1. **Primary is different per HTML file:** purple `#a855f7`, electric `#3B82F6`, Material `#adc6ff`.
2. **Four sidebar designs.**
3. **“Blogs” back button** — not a product feature.
4. **Settings / Support / notifications / account / Cmd+K / attach / Generate Report / Sync / Study Velocity** are all mock chrome.
5. **Quiz timer comment in the HTML itself:** “Simple timer logic for visual effect.”
6. **Heatmap is `Math.random()` in a `<script>`.**
7. **Learn chapter grid is dummy three cards**, not 455 subtopics — that’s why the React version’s long list looks “uglier than the mock.” The mock never had real density.
8. DESIGN.md vs HTML: glass headers, glows, `rounded-lg` 8px, purple dashboard — HTML already violated the spec.

**Implication:** Pixel-copying Stitch will still look inconsistent. Lock DESIGN.md tokens + one sidebar component, then re-layout each page to the **structure** of the HTML, with **real data** and **no dead chrome**.

---

## 8. Severity backlog (fix order)

### P0 — identity and chrome (do first or nothing else matters)

1. Set `--color-primary` to `#3B82F6`; remove purple; one accent.
2. Load **Geist**; map `--font-headline-*` and `--font-display-lg` to Geist; add real `--text-*` size tokens so `text-display-lg` works.
3. Define missing shadcn tokens **or delete** `components/ui` usage and stop mixing kits.
4. Add `.skip-link` (visually hidden until focus).
5. **Route-aware shell:** hide Sidebar/Header on quiz; hide Header on study (or replace with in-page only); Doubt uses one header not two.
6. Sidebar width = 240px (or 288px — pick one) matching `ml-*`.
7. Kill marketing-vs-app split: redirect `/` or restyle landing.

### P1 — stop lying to the user

8. Remove or implement: search, Cmd+K, notifications, account, Settings, Support, attach, Generate Report, Sync Data, Start Review (curriculum), Previous/Next, Study Velocity.
9. Wire curriculum/dashboard numbers to `/api/progress` (or show “—” / empty, never 42% / +14%).
10. Fix Review Queue CTA → `/review`.
11. Fix breadcrumbs (subject + chapter from DB).
12. Fix quiz title from subtopic/subject.
13. Heatmap cell → `/learn/[id]`; priority rows → `/review` or weak topic.
14. “View All” expands list or opens chapter view — do not fake-navigate.
15. PYQ counts from `pyqFrequency` or hide the chip.

### P2 — layout / formatting

16. Quiz fullscreen 720px canvas.
17. Learn: decide card grid vs dense list; don’t half-copy both.
18. Install typography plugin **or** drop `prose-*` and use `.content-markdown` only.
19. Normalize radius to 4px / 2px.
20. Remove colored glows if following DESIGN.md.
21. Doubt: `flex-1 min-h-0` not `h-screen`; composer `bottom` above mobile nav.
22. Review page padding + Neural Precision styling.
23. Loading skeletons match 720px / 1200px layouts.
24. Deduplicate sign-in routes; restore Clerk or hide Sign Up.

### P3 — product surfaces Stitch never designed

25. Real review queue in Stitch language.
26. Empty / error / not-found in the same system.
27. Command palette only if you’re going to build search.
28. Quiz: timer tied to policy (auto-submit or remove the countdown).
29. Results: concept names not UUID slices; click row to see the question.
30. Delete `public/test*.html/css`.
31. Don’t advertise Wrong Answer Book until it exists.

---

## 9. Component inventory: keep vs rewrite vs delete

| Piece | Recommendation |
|---|---|
| `Sidebar.tsx` | **Rewrite once**, used everywhere except quiz. Icon+label 240px (Study/Doubt) is cleaner than “Table of Content” dots. |
| `Header.tsx` | **Rewrite** as a thin context bar (breadcrumbs only). No fake search until search exists. |
| `CurriculumView.tsx` | **Rewrite** data layer (real mastery); keep subject tabs. |
| `StudyPageClient.tsx` | Keep tabs/renderer; fix crumbs/nav; drop dead `prose` or add plugin. |
| `QuizPresenter.tsx` | Keep interaction; restyle as fullscreen; real title; honest timer. |
| `MasteryResult.tsx` | Keep layout; fix links and concept labels. |
| `MasteryHeatmap.tsx` | Keep real stats; delete fake widgets; make cells/priorities links. |
| `doubt/page.tsx` | Keep streaming; remove duplicate header and attach. |
| `components/ui/index.tsx` | Either **finish tokens** and use everywhere, or **stop using it** on Review/Home so one visual language remains. |
| `src/app/page.tsx` | Replace or redirect. |
| `review/page.tsx` | Restyle to match Dashboard cards. |
| Stitch `code.html` | Reference only. Do not paste more HTML into React. |
| `public/test*` | Delete. |

---

## 10. Suggested rebuild sequence (when you say go)

1. **Tokens + fonts + skip-link** (`globals.css`, `layout.tsx`) — one afternoon, unlocks every screen.
2. **App shell** (one Sidebar, one Header, chrome variants for quiz/study/doubt).
3. **Strip every dead control** (faster visual win than new pixels).
4. **Bind real progress** on Learn + Dashboard.
5. **Quiz + results** as focused flows.
6. **Review + marketing** last.

Do not run another “make it look like Stitch” pass on top of the current CSS. That is how this file got here.

---

## 11. Appendix — hardcoded / mock strings to grep and kill

```
42% Mastery
28% Mastered
Review: Friction
Physics Practice
Physics          (breadcrumb)
+14%
3.2h/day
Target: 5h
Generate Report
Sync Data
Table of Content
Elite Rank Track
Socratic Solver Instance
Q_${questionId.substring
mock_user_123
subtopics.length * 15
activeSubjectIdx === 0
timeRemaining = 165
href="#"
```

---

*End of audit. Next step: you confirm §0 source of truth (DESIGN.md + 240px icon sidebar + `#3B82F6`, vs pixel-copy a specific HTML file), then we execute P0→P1 without leaving fake chrome behind.*
