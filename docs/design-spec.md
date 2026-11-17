# LiftDiary redesign: design

Date: 2026-11-17. Status: implemented.

## Intent and why

LiftDiary is an older personal project: a mobile-first Next.js app that logs workouts and recommends weights. The original visual design (dark glass cards with red/orange blur blobs) was weak, and it was unclear how well the functionality held up. The goal: a full visual redesign chosen from mockups, then a functionality check, then some useful new features. The app is used at the gym on a phone, mid-set, often one-handed.

## Decisions (from mockups and UX research)

- **Layout:** WHOOP-style. The first screen answers one question ("what do I do today and am I ready?"), then drills down: today, then trends, then per-lift detail.
- **Typography:** Instrument Serif for headlines and numerals, DM Sans for body and labels. (Chosen over Barlow Condensed, Archivo Expanded, and Space Grotesk/JetBrains Mono.)
- **Color:** near-black base `#101114`, surface `#181a1f`, borders `#23252b`, off-white text `#ece9e4`, muted text `#7b7d86`/`#9a9ca5`, one accent **lime `#c6ff3d`** (dark text on lime). Warm amber `#ffb020` and red `#ff5d4d` only as meaningful signals (down/failed), never decoration.
- **Screens shown in mockups (target look):** Home (wordmark, "Today" + day title, readiness ring with one-line coach note, lift list showing last time vs today with up/hold/down, big Start button), workout logger (exercise title, coach suggestion line, set rows with big weight/rep boxes and a large check button, current set outlined in lime, auto-starting rest timer with +15s/Skip, "Next: …" bar in the thumb zone), post-workout summary (time/volume/PR tiles, PR highlight with mini trend, per-lift up/hold/down list).
- **Build approach: B.** Build shared building blocks first, then rebuild each screen on them.

## Added requirement: works on any device

The app currently shows the phone layout on every screen size. It must be usable on laptop and phone. Design : below 1024px keep the phone layout with the bottom tab bar; at 1024px and up replace it with a left sidebar (wordmark and the four destinations), widen the content column (max about 1024px), and use two columns where it helps: Home (readiness and plan beside the lift list), the logger (exercise queue beside the active exercise), History and Progress (card grids). Tap targets stay large; hover and keyboard focus states are added for desktop.

## Approaches considered

- A. Restyle in place: fastest but leaves old glass styles and the 1,000-line logger tangled.
- **B. Shared primitives, then rebuild screens (chosen).** Consistent look, easy to add features, more up-front work.
- C. Full rewrite: cleanest, but risks breaking the working recommendation engine and API (7 tests pass today).

## Goals

1. Every screen uses one coherent design system; no remaining glass/blur/blob styling.
2. Logger is fast and readable mid-set: tap targets well above 48px, large numerals, primary actions in the lower half of the screen, weight/reps pre-filled from the recommendation or last session, one tap to log a set, rest timer starts automatically.
3. Home leads with today's decision and a readiness score tied to the coach's suggestion.
4. Verify and fix existing functionality before and after the restyle.
5. Add a small set of genuinely useful features (below).

## Non-goals

- No rewrite of the recommendation engine, auth, or Prisma schema unless a bug requires it.
- No social features, leaderboards, or badges.
- No light theme in this pass.

## Anti-goals (would be a failure even if it works)

- Over-gamification (streak shaming, popups, badge spam). Streak stays small; the ring is forgiving.
- Decorative color: color must mean something.
- Cramming stats above the Start button.
- Visual polish that regresses logging speed.

## Constraints

- Existing stack: Next.js 16 App Router, React 19, Tailwind 4, Prisma on Postgres, Recharts, Vitest. Fonts via `next/font/google` (Instrument Serif, DM Sans).
- `.env` may point at a hosted Postgres. **Avoid creating test data there.** Prefer a separate local Postgres for testing.
- Phone-first, max width about 448px, safe-area insets respected, tabular numerals for weights.

## Work breakdown (order)

1. **Baseline functionality pass** (before restyling): run the app against a local DB, click through signup, onboarding, a complete workout, summary, history, progress, settings; run tests, lint, and a production build. Write down bugs; fix the real ones.
2. **Design system:** tokens in `globals.css`/Tailwind theme, fonts, and shared components: Card, Button (primary/ghost), Ring, StatTile, SetRow, Pill, SectionLabel, BottomNav, ScreenShell. Remove `glass-*` classes once nothing uses them.
3. **Rebuild screens in order:** Home, logger, summary, history, progress, settings, auth, onboarding.
4. **Readiness score** (new): 0 to 100 on Home, derived from days since the last session for that muscle group/day type, recent volume trend, and recent failed sets; computed in a pure, unit-tested function in `src/lib`. Copy is plain ("Good to push", "Take it easy"). Must be explainable in one line and never block a workout.
5. **Up/hold/down per lift:** compare today's recommended weight to last session's top set on Home; compare this session's top set to the previous on the summary.
6. **Verification:** tests for new logic, browser walk-through at phone size, screenshots compared to mockups.

## Proposed extra features (all optional)

- Estimated 1RM shown on the progress page and PR highlights.
- Undo last set / edit a logged set in place.
- Plate calculator for barbell lifts.
- Weekly strip (which days were trained this week) on Home.
- Deload suggestion when readiness stays low across sessions.
- Export workout history as CSV.

I will propose a final shortlist after the functionality pass, based on what the app lacks.

## Left to the builder

Exact component API and file layout; spacing and radius scale within the tokens above; animation details (check-mark pop on set completion, ring fill); chart styling on the progress page (Recharts, lime on dark); empty and loading states; how to compute readiness weights (start simple, tune against seed data).
