# LiftDiary MVP

Workout log and coach that works on phone and laptop, with hybrid recommendations (calibration mode + deterministic fallback + lightweight ML regression), a readiness score, per-lift trends, undo, and CSV export.

## Stack

- Next.js App Router + TypeScript + Tailwind
- Prisma + Postgres schema
- Cookie session auth (JWT + bcrypt)
- Recharts for PR trend charts
- Vitest for core logic tests

## Design system

Dark, flat UI: near-black `#101114`, one lime accent `#c6ff3d`, Instrument Serif (headlines and numerals) and DM Sans (body). Tokens live in `src/app/globals.css` (`bg`, `surface`, `line`, `ink`, `muted`, `accent`, `warn`, `danger`); shared pieces are in `src/components/ui/`. Below 1024px the app uses a phone layout with a bottom tab bar; at 1024px and up it uses a left sidebar and two-column screens.

Pure, unit-tested logic worth knowing: `src/lib/readiness.ts` (0-100 readiness score), `trend.ts` (up/hold/down), `streak.ts`, `week.ts`, `progress.ts`, `deload.ts`, `csv.ts`, `rest-timer.ts`, `workout-helpers.ts`.

## System Architecture

- **Frontend (Next.js App Router)**
	- Mobile-first screens for onboarding, home, workout logging, history, PR dashboard, settings.
	- Fast set logging UX with manual `Start Rest` timer and one-handed controls.
- **API Layer (Route Handlers)**
	- Auth routes (`/api/auth/*`), onboarding/routine, exercises, session logging, history, settings, dashboard.
	- JSON contracts designed for low-friction client updates.
- **Data Layer (Prisma + Postgres)**
	- Relational entities for `User`, `Exercise`, `Routine`, `RoutineDay`, `RoutineDayExercise`, `WorkoutSession`, `SetEntry`, `Recommendation`.
- **Recommendation Engine (Hybrid)**
	- Calibration mode for first N workouts.
	- Lightweight ML path: linear regression over recent performance features when sufficient data exists.
	- Deterministic safety fallback for sparse data or low confidence.

## Prisma Data Model

Defined in `prisma/schema.prisma` with enums and relations for:

- User profile + coaching preferences + calibration status
- Massive exercise library + custom exercises
- Routine split and day-exercise targets
- Session + set-by-set logs (including `isFailed`)
- Recommendation snapshots with confidence and reason text

## Setup

1. Configure env in `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/liftdiary?sslmode=require"
JWT_SECRET="replace-with-strong-random-secret"
```

2. Install and generate client:

```bash
npm install
npm run db:generate
```

3. Push schema + seed:

```bash
npm run db:push
npm run db:seed
```

4. Run app:

```bash
npm run dev
```

## Local development against a throwaway database

`.env` may point at a hosted database. For experiments, run a local Postgres and start the app with `DATABASE_URL=postgresql://... npm run dev`, after `DATABASE_URL=... npm run db:push && DATABASE_URL=... npm run db:seed`. `npx tsx scripts/create-test-account.ts` creates a demo account (email and password are printed when it finishes).

## Tests

```bash
npm test
```

Includes core tests for recommendation behavior and PR math.

## Deploy to Vercel (Phone Testing)

1. Create a hosted Postgres DB (Neon/Supabase/Vercel Postgres).
2. In Vercel project settings, add env vars:
	- `DATABASE_URL`
	- `JWT_SECRET`
3. In your local terminal, initialize the hosted DB with your schema + seed:

```bash
DATABASE_URL="<your-hosted-postgres-url>" npm run db:push
DATABASE_URL="<your-hosted-postgres-url>" npm run db:seed
```

4. Push this repo to GitHub and import it into Vercel.
5. Deploy and open the Vercel URL on your phone.

### Notes

- This project now targets PostgreSQL for production deployment.
- If tutorial video embed fails for a specific exercise, use the fallback YouTube link shown in-session.
