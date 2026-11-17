# Baseline findings (2026-11-17)

Tested against the hosted DB with a throwaway account (`claude-redesign-test@liftdiary.app`) via a scripted headless Chromium at 390x844.

**Works:** login, Home, start workout, session load (7 exercises with recommendations), set logging with PR detection, finish (idempotent second PATCH), summary, History, Progress, Settings routes all return 200 with no console errors. `npm test` 7/7, `npm run build` succeeds. No horizontal overflow at 390px.

**Bugs / issues:**
1. `npm run lint` fails: 3 `react-hooks/purity` errors in `src/app/home/page.tsx:38,42` (`Date.now()` during render). Fixed by the Home rewrite (Task 5).
2. `POST /api/sessions/[id]/sets` accepts a second set with the same exercise + `setIndex` (a double tap creates two rows, inflating volume). Fix in Task 6: disable the button while submitting, and return 409 server-side for duplicates.
3. Progress page: a lift's trend chart rendered a single point for "Back Squat" despite 5 sessions (and a mostly empty chart frame). Investigate in Task 8.
4. Cosmetic (replaced by redesign): glass cards, blur blobs, nav overlapping content at the bottom, plain "Log Set" form-style logger.

**Not tested:** signup/onboarding UI (needs a fresh account; Task 9) and the screenshot-import route (needs OpenAI key, only on request).

**Found during Task 6:** logging a set for a swapped-in exercise was rejected (400 "Exercise not in this routine") and swapped sets never showed in the queue counts. Fixed: the API accepts library/own custom exercises outside the day, and the client tracks swapped sets locally. Verified via API: first set 201, duplicate 409, unknown id 400.
