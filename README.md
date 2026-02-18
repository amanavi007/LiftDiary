# LiftDiary MVP

Mobile-first workout assistant with hybrid recommendations (calibration mode + deterministic fallback + lightweight ML regression).

## Stack

- Next.js App Router + TypeScript + Tailwind
- Prisma + Postgres schema
- Cookie session auth (JWT + bcrypt)
- Recharts for PR trend charts
- Vitest for core logic tests

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

## Component Map

- `src/components/auth-form.tsx` — signup/login form
- `src/components/onboarding-form.tsx` — onboarding + routine builder + custom exercises
- `src/components/start-workout-client.tsx` — day picker + session start
- `src/components/workout-session-client.tsx` — set logger, mark-failed, rest timer
- `src/components/pr-chart.tsx` — trend chart rendering
- `src/components/settings-form.tsx` — units/style/goal/calibration editor
- `src/components/mobile-nav.tsx` + `src/components/screen-shell.tsx` — mobile shell/navigation

## API Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/exercises?q=...`
- `POST /api/exercises` (custom exercise)
- `GET /api/onboarding?splitType=...&goal=...` (split recommendations)
- `POST /api/onboarding` (save user + routine)
- `GET /api/routines/current`
- `POST /api/workouts/start`
- `GET /api/sessions/[sessionId]` (includes recommendations)
- `PATCH /api/sessions/[sessionId]` (finish session)
- `POST /api/sessions/[sessionId]/sets`
- `GET /api/history?routineDayId=...`
- `GET /api/dashboard/pr`
- `GET/PATCH /api/settings`

## Recommendation Logic (MVP)

- Calibration mode until `workoutsCompletedInCalibration >= calibrationLength`.
- Feature signals include:
	- prior working weight
	- achieved reps
	- moving estimated 1RM
	- days since last trained
	- goal + coaching style encoding
- Uses ML (`ml-linear-v1`) when sample count and fit quality are sufficient.
- Fallback (`deterministic-v1`) applies progression rules + safety caps.

## Exercise Seed Dataset

- `prisma/seed.ts` builds a large searchable library by combining core movements with variations.
- Includes metadata: `muscleGroup`, `movementType`, `equipment`, `defaultRestSec`, `fatigueFactor`.
- Also seeds a demo user and baseline routine.

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
