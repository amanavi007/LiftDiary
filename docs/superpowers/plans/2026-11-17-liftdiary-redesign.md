# LiftDiary Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the glass/blob look with the approved Iron-serif design system (near-black, lime accent, Instrument Serif + DM Sans, WHOOP-style layout), verify and fix existing functionality, and add readiness, per-lift trends and a few small features.

**Architecture:** Keep the Next.js routes, API handlers, Prisma schema and recommendation engine. Add a design-token layer plus a small `src/components/ui/` kit, rebuild each screen on it, and add two pure, unit-tested functions in `src/lib/` (readiness, lift trend) that the Home and Summary screens consume.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, Prisma + Postgres, Recharts, Vitest, `next/font/google`.

**Spec:** `docs/superpowers/specs/2026-11-17-liftdiary-redesign-design.md`

## Global Constraints

- Colors (exact): base `#101114`, surface `#181a1f`, border `#23252b`, text `#ece9e4`, muted `#7b7d86` and `#9a9ca5`, accent lime `#c6ff3d` (text on lime is `#101114`), warn amber `#ffb020`, danger `#ff5d4d`. Amber/red only for meaningful signals.
- Fonts: Instrument Serif (headlines, numerals) and DM Sans (body, labels) via `next/font/google`. Numerals use tabular figures.
- Phone-first, content max width about 448px (`max-w-md`), safe-area insets respected, tap targets in the logger at least 52px tall.
- Do not create test data in the hosted Neon database from `.env`. Use a local Postgres; Prisma CLI reads `.env`, so pass `DATABASE_URL=...` inline for db commands and use `.env.local` for `next dev`.
- No rewrite of `recommendation.ts`, auth, or `prisma/schema.prisma` unless a bug found in Task 1 requires it.
- No light theme, no social features, no badges. Streak stays small.
- Commit after each task; commit messages end with the Co-Authored-By line given in the session.

## Review Focus

- A brand-new user (zero sessions) opens Home: readiness shows a neutral "Getting started" state, never `NaN` or a fake score.
- Double-tapping the set check button logs one set, not two.
- Rest timer stays correct after the phone sleeps or the tab is backgrounded (computed from an end timestamp, not a decrementing counter).
- Users on KG see KG everywhere, including trend labels and plate suggestions.
- A routine with no days or an exercise with no history renders Home and Summary without crashing ("new" instead of up/down).
- Very long exercise names and 4-digit weights do not break the set rows or the list.
- Day boundaries use the user's local day (streak and weekly strip), not UTC.

---

### Task 1: Baseline functionality pass

**Files:**
- Create: `docs/superpowers/plans/baseline-findings.md`
- Create: `.env.local` (git-ignored; local `DATABASE_URL`, copy `JWT_SECRET`; leave `OPENAI_API_KEY` as is)

**Interfaces:**
- Produces: a list of confirmed bugs (route, steps, expected vs actual) that later tasks fix or schedule.

- [ ] **Step 1:** Start a local Postgres (Docker `postgres:16` or Homebrew), create a `liftdiary_dev` database, and run `DATABASE_URL=<local> npx prisma db push && DATABASE_URL=<local> npm run db:seed`.
- [ ] **Step 2:** Run `npm test`, `npm run lint`, `npm run build`. Expected: record exact results (tests currently 7 passing).
- [ ] **Step 3:** Start `npm run dev` and, with the browser tool at 390x844, walk: signup, onboarding (including skipping the screenshot import), Home, start workout, log 3 sets on 2 exercises (include one failed set), swap/skip/reorder an exercise, finish, summary, History, Progress, Settings (change units and coaching style), logout, login. Screenshot each screen to the scratchpad directory.
- [ ] **Step 4:** Write every defect to `baseline-findings.md`; fix any that block the happy path (auth, logging, finishing) now, each with a regression test where the code is pure, and note the rest for the screen task that owns the file.
- [ ] **Step 5:** Commit.

### Task 2: Design tokens and fonts

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Test: `npm run build` plus visual check

**Interfaces:**
- Produces: Tailwind theme colors `bg`, `surface`, `line`, `ink`, `muted`, `accent`, `warn`, `danger` (usable as `bg-surface`, `text-accent`, etc.) and font utilities `font-serif` (Instrument Serif) and `font-sans` (DM Sans), plus `.tabular` (`font-variant-numeric: tabular-nums`).

- [ ] **Step 1:** In `layout.tsx` replace Geist with `Instrument_Serif` (weight 400, normal and italic) and `DM_Sans` (400, 500, 700) exposed as CSS variables.
- [ ] **Step 2:** In `globals.css` define the tokens in `@theme inline` using the exact values in Global Constraints, set body background to flat `bg` (remove the radial gradients), and keep the old `.glass-*` classes temporarily so unconverted screens still render.
- [ ] **Step 3:** Run `npm run build`; expected: success. Load `/login` and confirm the new fonts and flat background.
- [ ] **Step 4:** Commit.

### Task 3: UI kit

**Files:**
- Create: `src/components/ui/{card,button,ring,stat-tile,pill,section-label,set-row,bottom-nav}.tsx`
- Modify: `src/components/screen-shell.tsx` (drop blob divs, use `BottomNav`), delete `src/components/mobile-nav.tsx` once replaced
- Create: `src/app/dev/ui/page.tsx` (a visual gallery, removed in Task 11)

**Interfaces:**
- Produces: `Card({children, tone?: "default"|"accent"})`, `Button({variant: "primary"|"ghost", size?: "md"|"lg", ...buttonProps})`, `Ring({value: number|null, label: string})` (null renders an empty track and an em dash), `StatTile({value: string, label: string, tone?: "default"|"accent"})`, `Pill({tone?: "default"|"accent"|"warn"})`, `SectionLabel`, `SetRow({index, weight, reps, done, active, units, onWeightChange, onRepsChange, onToggle})`, `BottomNav` (Home, History, Progress, Settings; active item uses `text-accent`).

- [ ] **Step 1:** Build each component to match the approved mockups (set row: two boxes with serif numerals and a small LB/REPS caption, 56px check button; lime outline on the active set).
- [ ] **Step 2:** Build `/dev/ui` showing every component and state; screenshot at phone width and compare with the mockups in `.superpowers/brainstorm/*/content/serif-accent.html`.
- [ ] **Step 3:** Commit.

### Task 4: Readiness and lift-trend logic (TDD)

**Files:**
- Create: `src/lib/readiness.ts`, `src/lib/readiness.test.ts`, `src/lib/trend.ts`, `src/lib/trend.test.ts`

**Interfaces:**
- Produces: `computeReadiness(args: { now: Date; targetDayId: string; sessions: Array<{ startedAt: Date; endedAt: Date | null; routineDayId: string; sets: Array<{ weight: number; reps: number; isFailed: boolean }> }> }): { score: number | null; label: "Getting started" | "Good to push" | "Steady" | "Take it easy"; note: string }`
- Produces: `liftTrend(todayWeight: number, lastWeight: number | null): "up" | "hold" | "down" | "new"`

- [ ] **Step 1:** Write failing tests: no completed sessions returns `{score: null, label: "Getting started"}`; a session finished 3 days ago with no failed sets scores at least 70 ("Good to push"); a session finished earlier today scores lower than one finished 3 days ago; a last session with half its sets failed scores lower than one with none; a week with volume more than 1.3x the prior 3-week weekly average lowers the score; score is always an integer in 0..100; `liftTrend(135, 130)` is `"up"`, `(130, 130)` `"hold"`, `(125, 130)` `"down"`, `(135, null)` `"new"`.
- [ ] **Step 2:** Run `npx vitest run src/lib/readiness.test.ts src/lib/trend.test.ts`; expected: FAIL (modules missing).
- [ ] **Step 3:** Implement. Starting rule (tune later): base 100; minus 25 if the last completed session was less than 1 day ago, minus 10 if 1 to 2 days ago; minus `round(40 * failedSetRatio)` of the last session; minus 15 for the volume spike above; clamp and round. Labels: at least 70 "Good to push", 45 to 69 "Steady", below 45 "Take it easy". `note` is one plain sentence naming the main factor. Only completed sessions count; `targetDayId` sessions are preferred for "last session" when any exist.
- [ ] **Step 4:** Run the tests; expected: PASS. Run `npm test`; expected: all pass.
- [ ] **Step 5:** Commit.

### Task 5: Home screen

**Files:**
- Modify: `src/app/home/page.tsx`, `src/components/home-today-plan-client.tsx`

**Interfaces:**
- Consumes: Task 3 kit, Task 4 `computeReadiness` and `liftTrend`, `buildRecommendation` (existing).
- Produces: Home rendering wordmark, day label and title, readiness `Ring` with coach note, a lift list (name, "Last: W x R", today's recommended weight x rep range, trend arrow), Start button, resume banner, small streak pill, weekly strip (7 dots Mon to Sun, local time; see Review Focus), calibration card only while calibrating.

- [ ] **Step 1:** Write a failing test for any new pure helper (week-strip builder: `weekStrip(now: Date, sessionDates: Date[]): Array<{label: string; trained: boolean; isToday: boolean}>`) in `src/lib/week.test.ts`, including a session at 23:30 local time landing on the correct day.
- [ ] **Step 2:** Implement `src/lib/week.ts`; run its test to pass.
- [ ] **Step 3:** In `page.tsx` load recent completed sessions with sets, call `computeReadiness`, and compute per-lift `liftTrend` from the recommendation and last top set; pass serializable props to the client component. Keep day switching and the exercise preview.
- [ ] **Step 4:** Verify in the browser: new user, user with history, KG user, user with an in-progress session. Screenshot against the mockup.
- [ ] **Step 5:** Commit.

### Task 6: Workout logger

**Files:**
- Modify: `src/components/workout-session-client.tsx` (split into `src/components/workout/{exercise-header,set-list,rest-timer,plate-sheet,swap-sheet,tutorial-modal,next-bar}.tsx` plus a slimmer container)
- Create: `src/lib/rest-timer.ts`, `src/lib/rest-timer.test.ts`

**Interfaces:**
- Produces: `secondsRemaining(endsAtMs: number, nowMs: number): number` (never negative), used by the timer so it survives backgrounding.

- [ ] **Step 1:** Test `secondsRemaining`: future end returns whole seconds rounded up, past end returns 0.
- [ ] **Step 2:** Implement it, switch the rest timer to an end-timestamp with a 250ms tick, auto-start after a logged set using `preferredRestSeconds` or the exercise default, add +15s and Skip.
- [ ] **Step 3:** Split the container into the listed components, restyle on the kit, keep every existing behavior (swap, skip, reorder, tutorial video, plates, PR toast, finish). Pre-fill each new set from the coach suggestion or the previous set. Guard `logSet` against double submit (disable while `submittingSetFor` is set).
- [ ] **Step 4:** Browser-test: log sets with a double-tap on the check, let the timer run with the tab hidden for 20s, swap an exercise, finish. Compare with the logger mockup.
- [ ] **Step 5:** Commit.

### Task 7: Summary page

**Files:**
- Modify: `src/app/workout/summary/[sessionId]/page.tsx`

**Interfaces:**
- Consumes: `liftTrend`, `StatTile`, `Card`, `summarizeExercisePRs`.

- [ ] **Step 1:** Rebuild to the summary mockup: time, volume, PR count tiles; PR highlight card with a small trend bar series; per-lift list with up/hold/down against the previous session (amber for down).
- [ ] **Step 2:** Verify a session with zero sets, a session with no previous history, and a KG session render sensibly. Screenshot.
- [ ] **Step 3:** Commit.

### Task 8: History and Progress

**Files:**
- Modify: `src/app/history/page.tsx`, `src/app/dashboard/page.tsx`, `src/components/pr-chart.tsx`

- [ ] **Step 1:** Restyle History as session cards on the kit with collapsible lifts; restyle Progress with `StatTile`s, a lime Recharts line on the dark surface, and estimated 1RM next to each PR (`estimated1RM` already exists in `src/lib/pr.ts`).
- [ ] **Step 2:** Verify empty states (no sessions) and a long history. Screenshot.
- [ ] **Step 3:** Commit.

### Task 9: Settings, auth, onboarding

**Files:**
- Modify: `src/components/settings-form.tsx`, `src/components/auth-form.tsx`, `src/components/onboarding-form.tsx` (948 lines; split by step into `src/components/onboarding/` if the restyle makes that cheaper than editing in place), `src/app/{login,signup,onboarding,settings}/page.tsx`

- [ ] **Step 1:** Restyle all four on the kit; keep validation and API contracts unchanged.
- [ ] **Step 2:** Walk signup through onboarding to Home with a fresh user, including a validation error and the screenshot-import path (that route needs `OPENAI_API_KEY`; verify the UI state, and only run the real call if the owner agrees).
- [ ] **Step 3:** Commit.

### Task 10: Extra features shortlist

**Files:**
- Modify/Create as needed under `src/app/api/` and `src/components/`

**Interfaces:**
- Plate calculator and estimated 1RM already exist; this task only adds what is missing.

- [ ] **Step 1:** Present a final shortlist to the owner based on Task 1 findings. Default candidates: undo or edit the last logged set (needs a `DELETE`/`PATCH` on `/api/sessions/[sessionId]/sets`), deload hint on Home when readiness is below 45 for two consecutive sessions, CSV export of history from Settings. Implement only the approved ones, each with a test for its pure logic or API validation.
- [ ] **Step 2:** Commit per feature.

### Task 11: Cleanup and final verification

**Files:**
- Modify: `src/app/globals.css` (delete `.glass-*`, `.glass-slider` if no longer used), delete `src/app/dev/ui/page.tsx`, add `.superpowers/` to `.gitignore`

- [ ] **Step 1:** `grep -rn "glass-" src` returns nothing; remove the dead CSS.
- [ ] **Step 2:** Run `npm test`, `npm run lint`, `npm run build`; expected: all succeed.
- [ ] **Step 3:** Final browser walk at 390x844 through every screen with a fresh account and a seeded account; screenshots compared to the mockups; update `README.md` stack/setup notes (local DB instructions, new design system).
- [ ] **Step 4:** Commit.
