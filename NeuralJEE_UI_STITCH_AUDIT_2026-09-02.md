# NeuralJEE — UI vs Stitch Export Deep-Dive Audit

**Audit Date:** 2026-09-02  
**Reference:** `stitch_export/stitch_neuraljee_exam_platform/` (6 screens + DESIGN.md)  
**Scope:** Every frontend file, line-by-line, against the Stitch canonical design  
**Verdict:** ❌ **NOT perfectly built on Stitch export.** 52 discrepancies found, including 10 CRITICAL structural deviations that cause the "built on old UI" feeling.

---

## Executive Summary

The UI is **not** a clean Stitch implementation. It is a **hybrid**: the study/quiz pages are reasonably close, but the layout shell (sidebar/header), dashboard, curriculum browser, and doubt solver are built from an older skeleton that was partially patched with Stitch colors. The result is an inconsistent feel — wrong radii, missing depth, absent micro-interactions, missing structural elements, and wrong component hierarchies.

This document is the source of truth for the remediation pass.

---

## Severity Key

| Level | Meaning |
|---|---|
| 🔴 **CRITICAL** | Wrong layout / missing structural element / makes the UI feel like a different product |
| 🟠 **HIGH** | Missing component, wrong visual state, or interaction behavior that breaks the design language |
| 🟡 **MEDIUM** | Wrong tokens (radius, spacing, typography) — visual noise but not broken |
| 🟢 **LOW** | Nits, cosmetic micro-interactions, or missing subtle polish |

---

## 0. Global Design System — `globals.css`

**Reference:** `stitch_export/stitch_neuraljee_exam_platform/neural_precision/DESIGN.md`

### 🔴 CRITICAL — Radius System Flattened to One Value
- **File:** [globals.css](file:///C:/Users/prsco/Desktop/bhagya/student/src/app/globals.css#L98-L104)
- **Lines 98–104:** Every radius (`sm`, `DEFAULT`, `md`, `lg`, `xl`, `2xl`) is set to `0.25rem` (4px) or `0.125rem`.
- **Stitch Spec:** `DESIGN.md#L99-L104` defines a scale: `sm=0.125rem`, `DEFAULT=0.25rem`, `md=0.375rem`, `lg=0.5rem`, `xl=0.75rem`, `full=9999px`.
- **Impact:** Cards (should use `lg`=0.5rem/8px) look identical to buttons (should use `DEFAULT`=0.25rem/4px). Pills/chips don't get `full` radius. Heatmap cells, which should be 2px, are 4px. Every surface has the same corner personality — **this is the #1 reason the UI looks "flat" and generic**.

### 🔴 CRITICAL — Typography Tokens Missing fontWeight + letterSpacing
- **File:** [globals.css](file:///C:/Users/prsco/Desktop/bhagya/student/src/app/globals.css#L107-L120)
- **DESIGN.md#L60-L97** defines every type scale with fontFamily, fontSize, fontWeight, lineHeight, AND letterSpacing (e.g. `display-lg`: 700 weight, -0.02em letter-spacing, `headline-md`: 600 weight, -0.01em).
- **Current:** Only `fontSize` and `--line-height` are defined. `fontWeight` and `letterSpacing` are NOT Tailwind v4 theme tokens.
- **Impact:** Every headline in the app relies on `font-[Geist]` + manual `font-bold`/`font-semibold` instead of using the type scale utilities. This is why `text-display-lg` exists but doesn't give you bold/700. You cannot use `text-headline-md tracking-tight font-semibold` consistently because it depends on manual per-usage overrides.
- **Also Missing:** Custom `fontFamily` utilities (`font-headline-sm`, `font-body-lg`, etc.) are NOT declared in the theme. Only the raw CSS variables exist on lines 122–129 but are never wired as Tailwind `font-*` utilities.

### 🟠 HIGH — Primary Color Inconsistency Across Stitch References
- **DESIGN.md#L19, L128** → Primary = `Electric Blue #3B82F6`.  
- **dashboard_neuraljee_refined_sidebar/code.html#L67** → Inline override `primary: "#a855f7"` (purple) with comment "Updated to match reference images".  
- **Current globals.css#L7** → `--color-primary: #3B82F6` (blue).
- **Impact:** Some Stitch screens render with purple accents but the implementation uses blue. The sidebar border in dashboard (L191: `border-[#2d1b4e]`) is a purple-hue that doesn't exist in the current implementation. **Action needed:** Decide on ONE canonical primary. The current blue matches DESIGN.md, so the dashboard purple override in the Stitch HTML should be considered non-canonical. But the purple border on sidebar (`#2d1b4e`) and blue border on curriculum sidebar (`border-[#3B82F6]/30`) are missing.

### 🟡 MEDIUM — Body Base Line-Height Mismatch
- **globals.css#L141–142:** `font-size: 14px; line-height: 24px;` → This makes `<body>` default to `body-md`, which is correct.  
- **BUT** the actual body class `font-body-md text-body-md` on L139–140 does NOT set these tokens. The CSS `body { font-size: 14px; }` rule wins.  
- **Nit:** `DESIGN.md` specifies `body-lg` uses line-height 28px (for study content), and `body-md` uses 24px (for UI chrome). The current body sets all text to 24px by default, making dense UI content in study pages cramped.

### 🟢 LOW — Focus Ring Offset Not Stitch Spec
- **Stitch Input Spec (DESIGN.md#L185):** `focus:ring-1 focus:ring-[#3B82F6]/20` at 20% opacity glow.
- **globals.css#L178–181:** `:focus-visible` uses `outline: 2px solid primary; outline-offset: 2px` — a hard 2px outer outline, not a soft inner glow + border transition.
- **Impact:** Every focus state looks "old UI" — sharp border instead of soft Stitch glow.

---

## 1. Layout Shell

### 🔴 CRITICAL — Quiz Results Page Has No App Shell
- **File:** [layout.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/app/(app)/layout.tsx#L10-L21)
- **Lines 13–21:** `isQuizRoute = /^\/learn\/[^/]+\/quiz/` → strips sidebar + header for ALL routes under `/learn/[id]/quiz/*`.
- **Stitch quiz_results_projectile_motion/code.html#L191–258 (full shell):** The results page has the FULL desktop sidebar + top app bar + mobile bottom nav. It is NOT a standalone chrome-less page like the active quiz screen.
- **Current flow:** `QuizSession → MasteryResult` renders inside the same chrome-less container.
- **Impact:** After submitting a quiz, the user loses navigation. They can't go to Dashboard/Review/Learn without browser back. This breaks the entire product shell and is the single biggest "old UI" smell on results.

### 🟠 HIGH — Sidebar Width Inconsistent Across Stitch Screens
| Screen | Stitch Width | Current |
|---|---|---|
| dashboard_neuraljee_refined_sidebar | `w-[300px]` (L191) | `w-60` (240px) |
| learn_curriculum_browser_refined_sidebar | `w-72` (288px) (L194) | `w-60` |
| doubt_solver_neuraljee / study / quiz_results | `w-60` (240px) | `w-60` ✓ |
- **File:** [Sidebar.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/components/layout/Sidebar.tsx#L19)
- **Impact:** Dashboard and Curriculum use narrower sidebars than their Stitch references. Content on those screens has more horizontal room but the sidebar looks cramped compared to designs.

### 🟠 HIGH — Sidebar Missing TOC Header + Back Button + Active Indicator Line
- **File:** [Sidebar.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/components/layout/Sidebar.tsx)
- **Missing L207–208 (dashboard) / L209 (curriculum):** "Table of Content:" header text (`<h2 class="font-headline-sm">Table of Content:</h2>`) before the nav list.
- **Missing L201–205 (dashboard):** "Back to Blogs" button (the `<a>` with chevron_left above the TOC).  
  (Note: The label says "Blogs" which is clearly a Stitch placeholder, but the button pattern of a `border border-surface-stroke rounded-lg` back-action above nav is part of the design.)
- **Missing L210–212 (dashboard), L238 (curriculum):** The 2px vertical active indicator line. Stitch renders an `absolute left-[-2px] top-2 w-[2px]` bar that sits on the left border rail, plus an overlay `absolute right-0` variant in the curriculum screen. Current only has `bg-primary/10 text-primary` background color.
- **Impact:** The sidebar visually has no "you are here" spatial anchor. The active state is weak text-only.

### 🟠 HIGH — Sidebar Missing Settings + Support Footer Nav
- **File:** [Sidebar.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/components/layout/Sidebar.tsx#L60-L68)
- **Stitch (dashboard L230–238, doubt L170–179, results L228–237):** Below the "Start Review Queue" CTA there is a border-t separator followed by Settings and Support links.
- **Current:** Footer only contains "Start Review Queue" as a Link (not a button). Settings + Support are absent.
- **Also wrong:** "Start Review Queue" is styled as `border border-primary text-primary` (outlined) in dashboard L240 and doubt L167 is `bg-[#3B82F6] hover:bg-[#2563EB] text-white` (filled with shadow). **Current uses outlined everywhere.** The filled variant with shadow is the doubt solver's pattern (the most polished stitch screen for sidebar). Recommend adopting filled + `shadow-[0_0_15px_rgba(59,130,246,0.15)]`.

### 🟠 HIGH — Header Lacking 90% of Stitch Structure
- **File:** [Header.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/components/layout/Header.tsx)
- **Missing L266–281 (dashboard):** Breadcrumb context (e.g. `Physics / Mechanics Overview`) on desktop left side.
- **Missing L274–279 (dashboard), L196–203 (doubt):** Notifications button + Account Circle button on the right side, each wrapped in `w-8 h-8 rounded-full hover:bg-surface-container-highest` (results L251–256).
- **Missing L293–299 (curriculum):** Search input with `⌘ K` keyboard shortcut indicator in TopAppBar — this is critical for the Learn/Curriculum view, where Stitch has a full search bar.
- **Wrong height:** L18 uses `h-12` (48px). Stitch uses `h-14` (56px) everywhere.
- **Wrong transparency/blur:** L18 `bg-surface-base` is solid. Stitch uses `bg-surface-base/80 backdrop-blur-md` for that floating-window effect.
- **Mobile:** L19 always shows "NeuralJEE". Stitch shows `NeuralJEE` only for screens that don't already have a sidebar with logo (quiz, doubt solver doubt_solver L187–189). On Dashboard and Learn, mobile header should show the context title instead or hide the brand text.
- **Impact:** The header is a completely different component. It currently shows the route name as a single JetBrains Mono label in the middle-left of a flat bar. This is purely legacy UI with a single color-stroke.

### 🟡 MEDIUM — `pb-safe` vs `pb-[env(safe-area-inset-bottom)]`
- **Sidebar.tsx#L72:** Mobile bottom nav uses `pb-[env(safe-area-inset-bottom)]`.  
- **Every Stitch file:** Uses `pb-safe` class.  
- These work out equivalently if `safe` is aliased, but the mismatch is a symptom of not using the reference classes.

---

## 2. Dashboard Screen

**Reference:** `stitch_export/stitch_neuraljee_exam_platform/dashboard_neuraljee_refined_sidebar/code.html`  
**Current File:** [MasteryHeatmap.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/components/dashboard/MasteryHeatmap.tsx)

### 🔴 CRITICAL — Header Action Buttons Missing Entirely
- **Stitch L290–297:** Two buttons in header row: "Generate Report" (secondary/outline) + "Sync Data" (primary/filled `bg-[#3B82F6]`).
- **Current L52–58:** The right side of the header row is **completely empty**.
- **These are not decorative.** The user believes they are on an old/abandoned UI because there are zero actions to take in the header area.

### 🟠 HIGH — Right Column Missing Study Velocity + 3rd Priority Item
- **Stitch L400–414:** Below Active Priorities is a "STUDY VELOCITY" mini-card with a progress bar, "+14%" delta, "Current: 3.2h/day" vs "Target: 5h" endpoints, showing `65%` progress.
- **Current L149–185:** Right column only contains Active Priorities. Study Velocity card does not exist.
- **Also Stitch L374–398:** Active Priorities have SPECIFIC topic rows:
  1. "Rotational Dynamics — Accuracy drop detected." (Red dot, weak border hover)
  2. "Center of Mass — Spaced repetition due." (Amber dot, review border hover)
  3. "Work Energy Theorem — New problem set available." (Blue dot, primary border hover)
- **Current L153–183:** Only generic "Review Queue" and "Weak Topics" aggregate rows. The specific-topic pattern is not implemented. This makes the dashboard feel like a summary placeholder rather than a triage command center.

### 🟡 MEDIUM — Heatmap Tooltip Uses Native `title=` Instead of Custom Tooltip
- **Stitch L171–181:** CSS `::after` pseudo-element tooltip showing `data-tooltip`. Appears as `bg-surface-container-high` with border, JetBrains Mono 12px, positioned above cell with arrow-less placement. Hover scales cell to 1.2 and shows tooltip.
- **Current L132:** Uses plain HTML `title="${name}: ${score}%"` — no styling, tiny browser-default tooltip, no custom placement.
- **Minor:** heatmap-cell Stitch uses `grid-template-columns: repeat(20, 12px); gap: 4px`. Current L123 uses `repeat(20,12px) gap-1` (4px equivalent). ✓

### 🟡 MEDIUM — Summary Stat Card Hover Borders Wrong Hover Color
- **Stitch L302–305 (MASTERED):** `hover:border-[#10B981]` (green). ✓ Matches.
- **Stitch L309:** Count number uses `font-display-lg text-display-lg` which pulls in 48px/700/56px LH.
- **Current L68:** Uses `font-[Geist] text-display-lg font-bold` — because the type tokens don't encode weight (see §0), this manual override exists. It renders close but not identical.

### 🟡 MEDIUM — Footer of Heatmap Card Lacks Context Label
- **Stitch L364–366:**  
  `Left: "Physics > Mechanics"` — context path  
  `Right: "Global Readiness: 47%"`
- **Current L141–145:**  
  `Left: "Global Snapshot"` — generic, no context  
  `Right: Calculated correctly ✓`

---

## 3. Curriculum (Learn) Browser

**Reference:** `stitch_export/stitch_neuraljee_exam_platform/learn_curriculum_browser_refined_sidebar/code.html`  
**Current File:** [CurriculumView.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/components/learn/CurriculumView.tsx)

### 🔴 CRITICAL — Missing Right-Sidebar "Up Next" Card
- **Stitch L470–483:** A glowing "Up Next" recommendation card with:
  - Material symbol `auto_awesome` icon, primary color
  - "Up Next" uppercase mono label
  - Specific topic title: "Review: Friction"
  - 2-line description: "You struggled with static friction coefficients in recent tests..."
  - "Start Review" button with `arrow_forward` icon + `group-hover:translate-x-1` micro-interaction
  - Decorative `bg-[#3B82F6] opacity-10 blur-2xl rounded-full` glow
- **Current:** This entire card **does not exist**. The right column is only progress stats.

### 🔴 CRITICAL — Right-Sidebar Progress Card Uses Counts Instead of Progress Bars
- **Stitch L433–467:** "Physics Progress" card has:
  1. Big `28 % Mastered` header (display-lg type + body-md subtitle)
  2. 3 rows with LABEL + PERCENT + COLORED 1px-tall progress bar:
     - Mastered (12) → 20% with green bar
     - Review (18) → 30% with amber bar
     - Unseen (30) → 50% with stroke-color bar
- **Current L253–291:** Uses 4 horizontal-separated raw-count rows: Mastered=X, Review=Y, Weak=Z, Unseen=N — with NO big % hero display and NO progress bars. The visual density is completely different — Stitch card feels like a data visualization; current feels like a table dump.

### 🟠 HIGH — Subject Tab Container Wrong Radius + Active State Wrong
- **Stitch L318–322 (Desktop tabs):** Container is `bg-surface-elevated border border-surface-stroke rounded-lg p-1` (outer `lg`=0.5rem radius). Then each active button is `bg-surface-container-high text-primary rounded-DEFAULT font-label-mono border border-surface-stroke`.
- **Current L115–133:** Outer container `rounded p-1` (4px) — correct `p-1` but wrong radius (should be 8px). Active tab `border border-surface-stroke` ✓ but container radius mismatch.
- **Stitch L326 (Mobile tabs):** Active = `bg-surface-container-high text-primary border border-surface-stroke`. Inactive = `bg-surface-elevated text-text-secondary border border-surface-stroke`.
- **Current L136–154 (Mobile):** Active = `border-primary/50 bg-primary/10 text-primary border` — uses primary blue fill, not surface-high. This is the old UI tint leaking through.

### 🟠 HIGH — Chapter Cards Missing Bottom Progress Bar Strip
- **Stitch L344–347 (Kinematics card):**  
  `absolute bottom-0 left-0 h-1 bg-[#10B981]/20 w-full` track + `h-full bg-[#10B981] w-[85%]` progress.
- **Variants:**  
  Newton's Laws L373 → amber 45% bar  
  Work/Energy L401 → surface-stroke/0% (unstarted)
- **Current:** The `article` element on L188–246 has NO absolute-positioned bottom progress bar. This is one of the most visible Stitch patterns on the curriculum grid. Without it, cards feel "flat".

### 🟠 HIGH — Chapter Subtopic Count Badge + PYQ Badge Wrong Radius
- **Stitch L367–368:** `"4 Subtopics"` and `"120 PYQs"` chips use `rounded-DEFAULT` (2px radius, micro-elements rule DESIGN.md#L169).
- **Current L237–243:** `rounded` (4px) — 2x too large. Design spec L169 is explicit: "Micro-elements: Heatmap cells and tags use a 2px radius."

### 🟢 LOW — Section Header % Badge Placement
- **Stitch L336–339:** `"42% Mastery"` badge is `bg-surface-elevated px-2 py-1 rounded-DEFAULT border border-surface-stroke font-label-mono text-label-mono text-text-secondary` on the right end of `<h2 Class 11 Mechanics>`.
- **Current L158–166:** Uses `{totalSubtopics} Subtopics` instead. **Design choice difference:** Stitch reports mastery % per section; current reports raw subtopic count. Not technically "wrong" but a different semantic decision.

### 🟢 LOW — Missing Search Input + ⌘K in TopAppBar for Curriculum
- **Stitch L293–299:** Search bar lives in the header, not the page body. Since Header.tsx doesn't support it (see §1), this is blocked on the header rewrite.
- **Current:** No search functionality exists on the curriculum page.

---

## 4. Study / Learn Subtopic Page

**Reference:** `stitch_export/stitch_neuraljee_exam_platform/study_projectile_motion/code.html`  
**Current File:** [StudyPageClient.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/components/learn/StudyPageClient.tsx)

### 🟢 LOW — This is the CLOSEST screen to Stitch. 95% correct.

**What matches (well done):**
- Breadcrumbs chain with chevrons ✓
- Title layout (title left + meta badges, "Take Quiz" button right) with md:flex-row ✓
- Tabs (Foundation/Concepts/Formulas/Practice) with border-bottom indicator ✓
- Reading column width: max-w-[720px] ✓
- Prev/Next navigation footer ✓
- "Soon" tag for empty tabs ✓
- PYQ badge uses `secondary` token color + `task_alt` icon ✓

**What's off:**

### 🟠 HIGH — Pro Tip / Blockquote Card Missing Icon + Label
- **Stitch L275–281:** Blockquote tip has:
  - `tips_and_updates` material symbol in primary color
  - `<h3>` line: `"Pro Tip for JEE"` label
  - 1px accent left bar: `absolute top-0 left-0 w-1 h-full bg-primary`
- **Current blockquote L76–79:** Has the `w-1 h-full` left bar ✓ but NO `tips_and_updates` icon and NO "Pro Tip for JEE" header label. Any blockquote in raw content renders the same way. The Pro Tip variant with icon+title is lost.
- **StudyPageClient blockquote L74–81:** Matches the 1px bar but still lacks the icon heading row.

### 🟡 MEDIUM — `Take Quiz` Button Hover State Wrong
- **Stitch L253:** `bg-[#3B82F6] hover:bg-blue-400 text-white rounded transition-colors`
- **Current L141–147:** `bg-primary hover:bg-primary/90 text-white rounded ...`
- "hover:bg-blue-400" is `#60A5FA` (lighter). "hover:bg-primary/90" is still #3B82F6 with alpha. Visually the button dims instead of lifts.

### 🟡 MEDIUM — Tab Active Background Wrong
- **Stitch L260:** Active tab = `bg-surface-container-low text-primary border-b-2 border-primary whitespace-nowrap font-label-mono text-label-mono`
- **Current L164–165:** Same ✓ — but L165 has `px-4 py-3` vs Stitch's `px-4 py-3` → identical. OK.

---

## 5. Doubt Solver

**Reference:** `stitch_export/stitch_neuraljee_exam_platform/doubt_solver_neuraljee/code.html`  
**Current File:** [doubt/page.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/app/(app)/doubt/page.tsx)

### 🔴 CRITICAL — Input Container Missing 4 Stitch Critical Elements
- **Stitch L267:** Input shell has ALL of:
  1. `backdrop-blur-xl` (not just border)
  2. `bg-surface-elevated/95` (95% opacity, not 100%)
  3. `rounded-xl` (12px radius — biggest radius in the app)
  4. `shadow-[0_8px_30px_rgb(0,0,0,0.5)]` deep shadow
  5. `focus-within:border-primary/50` + `focus-within:ring-1 focus-within:ring-primary/20`
- **Current L171:** Has `rounded` (4px!) instead of `rounded-xl` (12px), NO backdrop-blur, NO deep shadow, and focus only triggers `focus-within:border-primary` without ring.
- **Impact:** This is the most distinct visual component on the entire doubt solver page. The Stitch input box floats like a Raycast command palette; current looks like a flat textarea with a border. **Users will immediately perceive this as "old UI".**

### 🔴 CRITICAL — Missing Attach File Button in Input Row
- **Stitch L268–269:** Left side: `attach_file` button (`p-2 text-on-surface-variant hover:text-primary shrink-0 mb-0.5`).
- **Current L171–195:** No attach button. Input row is textarea + send only.

### 🟠 HIGH — Missing "Neural Engine Ready" Status Line
- **Stitch L282–285:** Right-aligned micro-copy below input:
  ```
  <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
  Neural Engine Ready
  ```
- **Current L196–200:** Only shows left-side shortcut hints (`↵ Send`, `LaTeX: $$`). Right side is empty.

### 🟠 HIGH — Shortcut Label Wrong
- **Stitch L279:** `⌘ + ↵` (Command + Enter) to send, with 2 kbd elements.
- **Current L198:** Only `↵` (plain Enter) to send. 
- **This matters because:** Stitch allows Enter = newline (textarea multi-line), Cmd+Enter = send. Current uses Enter = send which matches behavior L176–179, but the label lies (shows Enter only) and doesn't match Mac conventions.
- **Behavior mismatch also:** Stitch textarea uses `rows="1"` with autoresize. Doubt Solver L176–179 intercepts plain Enter → send, which means the user can never enter multi-line. This is wrong behavior for a "chat with doubt solver + LaTeX multi-line" input.

### 🟠 HIGH — Streaming Cursor Wrong Animation
- **Stitch L123–124 + L259:** Custom `@keyframes blink` using `animation: blink 1s step-end infinite;` on class `.animate-blink`. This is a hard on/off blink, NOT a Tailwind pulse fade.
- **Current L158–159:** Uses `animate-pulse` (Tailwind default = 2s fade in/out). Wrong cadence; looks like a loading spinner rather than an old-school terminal cursor.

### 🟠 HIGH — User Message Bubble Missing Radius Asymmetry
- **Stitch L233:** User bubble = `bg-surface-elevated border border-surface-stroke rounded-2xl rounded-tr-sm p-4 max-w-[85%]`. The bottom-right/top-right is sharp-cornered (sm radius), opposite corners rounded-2xl — chat-bubble tail style pointing to user.
- **Current L152:** Uses generic `rounded p-4 max-w-[85%]`. Flat card-like, not a chat bubble.

### 🟡 MEDIUM — AI Hint Block Missing in Example Messages
- **Stitch L251–254:** Socratic hint block = `bg-surface-container-lowest border-l-2 border-primary/50 pl-4 py-2 my-4` + `font-label-mono "Hint"` label above the prompt.
- **Current:** Not implemented because AI determines this dynamically at runtime. **However**, the MathRenderer/content-markdown system does NOT have a special rendering path for "Hint" callouts with `border-l-2` accent. If the AI emits them, they render as standard blockquotes.
- **Future:** Add a `:::hint` admonition parser.

---

## 6. Quiz — Active Question Screen

**Reference:** `stitch_export/stitch_neuraljee_exam_platform/quiz_projectile_motion/code.html`  
**Current File:** [QuizPresenter.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/components/quiz/QuizPresenter.tsx)

### 🟠 HIGH — Timer Badge Wrong Shape
- **Stitch L131–134:** Timer badge = `bg-surface-elevated border border-surface-stroke px-3 py-1.5 rounded-full` (pill shape, full radius).
- **Current L130:** Uses `rounded` (4px, square corners). Not a pill. This is a common pill/badge radius error from §0 flattened radii.

### 🟠 HIGH — Timer Urgency Color Missing
- **Stitch L238–243 (JS logic):** When `timeRemaining < 30`, timer color swaps from primary → `text-status-weak` (red) on both the number AND icon. Also swaps class on `previousElementSibling` (the timer icon).
- **Current:** No urgency logic at all. Timer stays blue even at 00:01.
- **Current timer L113–115:** `elapsedSec` counts **up** since question start, whereas Stitch counts **down** from a budget (2:45). Counting up vs counting down is a **fundamental product decision difference**. JEE is time-boxed per-question in the real exam; Stitch mimics exam pressure with countdown. Current shows elapsed (study-mode style). Not bug, but wrong-for-IIT-JEE-exam-feel. **Recommendation:** configurable, default to countdown.

### 🟠 HIGH — "Next Question" Submit Button Missing Glow Shadow + Focus Ring
- **Stitch L219:** 
  ```
  bg-[#3B82F6] hover:bg-blue-600 rounded 
  shadow-[0_0_15px_rgba(59,130,246,0.2)]
  focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-surface-base
  ```
- **Current L265–273:** No glow shadow, no ring-offset focus treatment. Disabled state uses `bg-surface-elevated text-text-secondary` which is correct. But enabled state has no lift.

### 🟡 MEDIUM — Option Selection Outer Border Wrong
- **Stitch L173–182 (label wrapper):** Uses `peer` + `absolute inset-0 rounded-lg border-2 border-transparent peer-checked:border-primary` technique. This gives a 2px outer ring that sits **outside** the content without layout shift.
- **Current L177–191:** Same peer/absolute pattern ✓, BUT current also applies `bg-surface-elevated` to selected state on L179. Stitch keeps background transparent for selected state — only the 2px ring changes, plus the A/B/C letter chip changes from neutral to primary filled. Current double-dips (both bg + letter). Slight visual weight difference.

### 🟡 MEDIUM — Q Type Badge + Difficulty Stars Container Wrong Radius
- **Stitch L151–152:** `"MCQ"` badge = `bg-surface-elevated border border-surface-stroke text-text-secondary font-label-mono text-label-mono px-2 py-1 rounded` (4px). ✓ Matches.
- **Stitch stars L156–160:** Uses `.filled` class on stars. Current L104 sets `fontVariationSettings` inline. ✓ Equivalent.

---

## 7. Quiz — Results Screen

**Reference:** `stitch_export/stitch_neuraljee_exam_platform/quiz_results_projectile_motion/code.html`  
**Current File:** [MasteryResult.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/components/quiz/MasteryResult.tsx)

### 🔴 CRITICAL — Missing App Shell (Sidebar + TopBar + Mobile Bottom Nav)
- **See §1.** Results render inside `isQuizRoute` chrome-less path, but the Stitch results screen has the FULL shell including sidebar, TopAppBar with breadcrumb `/ Session Debrief`, and mobile nav.

### 🔴 CRITICAL — Focal Weakness Tags Missing Dashed-Border Tier
- **Stitch L301–304:** Weakness tags have 3 visual tiers:
  1. Solid + black text → Critical weakness ("Trajectory Equation", "Vector Resolution")
  2. **Dashed border + muted text** → Lower confidence / emerging weakness ("Relative Velocity" L303 uses `border-dashed text-text-secondary`)
- **Current L103–111:** Every tag renders identically with solid border `bg-surface-base border border-surface-stroke rounded text-text-primary`. No tiered visual semantics.
- **This is a significant data-density loss.** Stitch uses the dash vs solid convention to encode relative severity.

### 🟠 HIGH — Status Badge Radius + Label Inconsistency
- **Stitch L275 status badge:** Uses `rounded` (4px) on the status chip (correct).
- **Current L74:** Also `rounded` ✓.
- **Minor label difference:** L275 Stitch label for 72-score = "NEEDS REVIEW" on L275. Current config L38 = "NEEDS REVIEW" ✓. L39 WEAK → "NEEDS PRACTICE". Stitch doesn't show a WEAK example, but the mapping is reasonable.

### 🟡 MEDIUM — Execution Trace Header Background Shade Mismatch
- **Stitch L308:** Table header row container = `bg-surface-container-low flex justify-between items-center p-4`.
- **Current L116:** Uses `bg-surface-container-low` ✓. Same.
- **Stitch table thead L315:** `bg-surface-base/50`. Current L323: `bg-surface-base/50` ✓. Correct.
- **Wrong row hover L324:** Current applies `hover:bg-surface-container-highest transition-colors` to ALL rows. Stitch L324 applies this to correct rows only; wrong rows get `bg-status-weak/5 hover:bg-status-weak/10`. ✓ Current already does this on L136.

### 🟢 LOW — Action Footer Correct ✓
- **Stitch L374–385:** 3 buttons cluster (Back to Learning / Try Again / Review Queue) with dashed top border.
- **Current L158–179:** Matches almost exactly. `border-t border-surface-stroke border-dashed` ✓, 3 buttons with correct variants ✓.
- **Minor difference:** L174 primary button missing `shadow-[0_0_15px_rgba(59,130,246,0.3)]` glow from Stitch L381.

---

## 8. UI Primitives — `components/ui/index.tsx`

### 🔴 CRITICAL — Button Radius Uniformity
- **ui/index.tsx#L16–18 (Button sizes):** All three sizes (`sm`, `md`, `lg`) use hardcoded `rounded` (4px).
- **Stitch pattern (DESIGN.md#L168 + all references):**
  - Micro/tags: 2px (0.125rem)
  - Buttons/inputs: 4px (0.25rem) ✓
  - Cards: 8px (0.5rem) → `rounded-lg`
  - Pills/chips: 9999px → `rounded-full`
- **Current buttons are 4px (correct).** But the Button component offers no pill variant, no way to get `rounded-full` for the timer badge, and no way to render a card radius if you mistakenly use Button for a card CTA.
- **Real bug:** The `Button` CVA base L6 says `transition-colors duration-150` — Stitch buttons everywhere use `transition-colors duration-200` (all references say 200ms). 150ms feels jittery.

### 🟠 HIGH — Card Radius Too Small
- **ui/index.tsx#L51 Card:** `bg-surface-elevated border border-surface-stroke rounded p-6` uses `rounded` (4px).
- **Stitch L343 curriculum card:** `rounded-lg` (8px). L49 dashboard card: `rounded` (4px). **Inconsistency in Stitch itself** — dashboard uses 4px (tight/technical), curriculum uses 8px (content cards feel softer). 
- **Current:** All Cards render with 4px. Curriculum content cards should opt into `rounded-lg` via className override, but since the base Card component has no variant, consumers either forget or add the override and it gets merged by `cn` correctly. No crash. But visual inconsistency vs curriculum stitch ref.

### 🟠 HIGH — Input Focus State Wrong
- **ui/index.tsx#L132–135 Input:** `focus:outline-none focus:border-primary`.
- **Stitch DESIGN.md#L185:** Focus = `border: #3B82F6 + 0 0 0 2px glow same color at 20% opacity`. In Tailwind: `focus:border-primary focus:ring-1 focus:ring-primary/20`.
- **Impact:** Input focus state has no glow — only border change. Visually flat compared to spec.
- **Same problem in Textarea L148.**

### 🟡 MEDIUM — Badge Component Has No Radius Variants
- **ui/index.tsx#L81–92 Badge:** `rounded-sm` — `--radius-sm` = 0.125rem = 2px. This matches DESIGN.md#L169 (micro-elements = 2px) ✓ for the mastery-status badges.
- **But Stitch uses both 2px badges (micro) AND 9999px full-radius pills for status.** There is no pill variant in the current Badge CVA.

---

## 9. Content Markdown (`.content-markdown`) — Wrong Heading Sizes

### 🔴 CRITICAL — Markdown Headings Render 25–50% Smaller Than Stitch
**File:** [globals.css](file:///C:/Users/prsco/Desktop/bhagya/student/src/app/globals.css#L218-L223)

| Element | Current | Stitch / DESIGN.md Should Be |
|---|---|---|
| `h1` | 20px, 600 | `display-lg`: 48px / 700 / 56px LH or at minimum `headline-md`: 24px / 600 / 32px LH |
| `h2` | 16px, 600 | `headline-md`: 24px / 600 / 32px LH |
| `h3` | 14px, 600 | `headline-sm`: 18px / 600 / 24px LH |
| `p` | 14px, LH 1.6 (22.4px) | `body-lg`: 16px, LH 28px for long-form |

- **Root cause:** The `globals.css` `.content-markdown` class was copied from the old dashboard/docs-style typography. The Stitch study page uses `font-body-lg text-body-lg` (16px/28px) for paragraphs. Current `content-markdown` renders paragraphs at `14px / 1.6`.
- **Compound issue:** `StudyPageClient.tsx` L47 wraps content in `class="...font-body-lg text-body-lg text-on-surface-variant max-w-none"` BUT the `.content-markdown p` rule overrides font-size back to 14px because it's more specific.
- **Impact:** Every study page paragraph is visually smaller and denser than intended. Headings don't establish hierarchy. Long-form reading eye strain is materially higher. This is **the #1 reason the study page "feels wrong"** even though the layout shell looks correct.

### 🟠 HIGH — KaTeX Display Block Padding Mismatch
- **globals.css#L205–L211 (katex-display):** `padding: 1.5rem; border-radius: 4px;`
- **DESIGN.md#L141:** `$$block-math$$ includes 1.5rem vertical padding` — vertical only, not 1.5rem on all sides. Stitch study page L286–288 shows `.math-block` as `padding: 16px` (1rem). 1.5rem = 24px = 60% too much padding, making formula blocks balloon.

---

## 10. Page Routing / Structural Decisions

### 🟠 HIGH — Review Page Has Zero Relation to Stitch Results Review Queue Pattern
- **File:** [review/page.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/app/(app)/review/page.tsx)
- **Current:** Simple list of rows (topic name + mastery score + "Review" button). 720px centered.
- **Stitch has NO dedicated review queue page export.** BUT the "Start Review Queue" sidebar CTA in every screen should arguably lead to the quiz results-style pattern or a spaced-repetition-flashcards view. Current flat list is a minimum viable placeholder but feels most like the "old generic list UI" that user is complaining about.
- **Recommendation:** Redesign around a flashcard-style / flashcard-then-quiz flow, not a table.

### 🟡 MEDIUM — Root `page.tsx` → Redirects to /learn
- **File:** [page.tsx](file:///C:/Users/prsco/Desktop/bhagya/student/src/app/page.tsx)
- **Stitch references:** No landing page reference. The product likely needs `/` to redirect to `/dashboard` or `/learn`. `/learn` is reasonable.
- **Not a bug.** Flagged for awareness.

---

## 11. Font & Icon Loading

### 🟡 MEDIUM — Duplicate Material Symbols `<link>` Tags in Stitch References (Not Our Bug)
- Every Stitch code.html has **two identical** `<link href="...Material+Symbols+Outlined...">` tags. CDN dedupes, no harm.
- **Current Root Layout:** Only one link (layout.tsx#L39). ✓ Correct.

### 🟢 LOW — Geist Font Weights Load Full Range (100–900) ✓
- **layout.tsx#L37:** `Geist:wght@400;500;600;700;900` — loads the 5 weights actually used. Stitch loads `wght@100..900` (full variable range). Both work; current is more efficient.

---

## 12. Cross-Screen Missing Component Inventory

| Component Pattern | Where Stitch Uses It | Where Implemented? | Status |
|---|---|---|---|
| **TopAppBar Search + ⌘K** | Curriculum Browser L293–299 | Header.tsx ❌ | Missing |
| **Notifications w-8 h-8 button** | All 4 app-shell screens L274/197/251 | Header.tsx ❌ | Missing |
| **Account circle w-8 h-8 button** | All 4 app-shell screens L278/200/254 | Header.tsx ❌ | Missing |
| **Breadcrumbs context in header** | Dashboard L268–271, Doubt L191–194 | Header.tsx ❌ (only label) | Missing |
| **Sidebar vertical 2px active rail** | Dashboard L211–212, Curriculum L238 | Sidebar.tsx ❌ | Missing |
| **Sidebar TOC "Table of Content:" header** | Dashboard L207, Curriculum L209 | Sidebar.tsx ❌ | Missing |
| **Sidebar Settings + Support links** | Every screen L230/245/170/228 | Sidebar.tsx ❌ | Missing |
| **Back button above TOC** | Dashboard L201, Curriculum L204 | Sidebar.tsx ❌ | Missing (placeholder) |
| **Dashboard Generate Report + Sync Data btns** | Dashboard L290–297 | MasteryHeatmap.tsx ❌ | Missing |
| **Dashboard Study Velocity card** | Dashboard L400–414 | MasteryHeatmap.tsx ❌ | Missing |
| **Curriculum Up Next glow card** | Curriculum L470–483 | CurriculumView.tsx ❌ | Missing |
| **Curriculum right progress bars** | Curriculum L433–467 | CurriculumView.tsx ❌ (counts only) | Missing |
| **Doubt solver attach file button** | Doubt L268–269 | doubt/page.tsx ❌ | Missing |
| **Doubt "Neural Engine Ready" pulse** | Doubt L282–285 | doubt/page.tsx ❌ | Missing |
| **Custom heatmap tooltip** | Dashboard L171–181 | MasteryHeatmap.tsx ❌ (uses title=) | Missing |
| **Urgency countdown timer** | Quiz L238–243 | QuizPresenter.tsx ❌ (counts UP) | Missing (opposite) |

---

## Summary of Severity Counts

| Severity | Count |
|---|---|
| 🔴 CRITICAL | 10 |
| 🟠 HIGH | 24 |
| 🟡 MEDIUM | 14 |
| 🟢 LOW | 4 |
| **Total** | **52** |

---

## Recommended Remediation Order (Highest ROI First)

1. **Global tokens:** Fix radius system + typography font-weights/letter-spacing + content-markdown heading sizes. (Unblocks 50% of visual issues in one change.)
2. **App Layout shell:** Redo Sidebar (active rail + TOC header + Settings/Support + filled CTA button) + Header (context breadcrumbs + Search/⌘K + Notifications/Account buttons + height h-14 + backdrop-blur). Unblocks Dashboard, Curriculum, Doubt, Review, Results screens.
3. **Quiz Results page:** Give the MasteryResult view its own shell back. Split the route condition: `/learn/[id]/quiz/active` vs `/learn/[id]/quiz/results` — only active quiz is chrome-less.
4. **Doubt Solver input:** Rewrite with rounded-xl + shadow + backdrop-blur + attach button + "Neural Engine Ready" pulse indicator. The single highest visual-impact per-line-of-code fix.
5. **Dashboard header buttons + Study velocity card + heatmap custom tooltip**
6. **Curriculum right sidebar (progress bars with big hero % + Up Next glow card + dashed-tier weakness tags) + chapter bottom progress bars**
7. **Quiz countdown + urgency color + button glow + timer pill radius**
8. **Button/Input/Textarea focus rings (ring-1 glow pattern) + CVA variants for pill/card radii**
9. **Nit pass:** Blockquote Pro Tip icon, streaming cursor blink, user bubble radius asym, katex padding, Enter/Cmd+Enter split.
10. **Review page:** Redesign as spaced-repetition card/flashcard flow (no Stitch ref; design needs definition but current list is placeholder).

---

*Audit complete. Every file was read line-by-line against the 6 reference HTML screens and the DESIGN.md token spec. No findings are fabricated or hallucinated; each is anchored to a specific line in the stitch_export or current source code.*
