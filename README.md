# Talkora Backend

The real backend engine for Talkora — a full-stack English-learning platform for school
students in Classes 4–10. This is a **separate service** from the existing Next.js frontend
(built by v0). It does not modify, redesign, or replace the frontend in any way.

Node.js · Express · TypeScript · MongoDB Atlas (Mongoose) · Zod · JWT

## 1. What this is (and isn't)

- Real MongoDB persistence. No in-memory database, no mock data as production storage.
- Real authentication (school / teacher / student), with JWT-based sessions.
- Server-owned business rules: scoring, level unlocking, achievements, and XP are all computed
  and enforced on the backend — the frontend never dictates a score or unlock state.
- A curriculum **engine**, not hardcoded lessons: Classes → Levels → Lessons → Activities are
  all database-driven. Only Class 4 / Level 1 ("Word Explorer") is fully authored with 10 real
  activities, per the current product scope; the rest of the structure (Classes 4–10, 10 levels
  each) is seeded and ready for further authoring.
- Provider abstractions for AI (Miss Julie), voice synthesis, speech recognition, and
  pronunciation scoring — so real vendors can be swapped in later without touching business logic.
  Until real credentials are configured, voice/speech/pronunciation providers return
  `available: false` rather than fake results.

## 2. Getting started

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/talkora?retryWrites=true&w=majority
JWT_SECRET=<a long random string>
CLIENT_URL=http://localhost:3000   # your Next.js frontend origin

AI_PROVIDER=groq          # groq | openai | mock
GROQ_API_KEY=...          # required if AI_PROVIDER=groq
OPENAI_API_KEY=...        # required if AI_PROVIDER=openai

VOICE_PROVIDER=sarvam     # sarvam | kokoro | mock
SARVAM_API_KEY=...        # server-side only; never use NEXT_PUBLIC_
SARVAM_TTS_MODEL=bulbul:v3
SARVAM_TTS_SPEAKER=ishita
SARVAM_TTS_LANGUAGE=en-IN
SARVAM_TTS_PACE=0.92
SARVAM_TTS_TEMPERATURE=0.6
SARVAM_TIMEOUT_MS=15000
SARVAM_STT_MODEL=saaras:v2.5
SARVAM_STT_LANGUAGE=en-IN
```

MongoDB Atlas is required (not a local standalone `mongod`) because `ProgressService` relies
on multi-document consistency patterns designed for a replica set, which Atlas clusters are by
default. A free M0 Atlas cluster is sufficient for development.

Seed the database (demo school, teacher, 8 students, Classes 4–10 with 10 levels each, and
fully-authored Class 4 / Level 1 activities):

```bash
npm run seed
```

The seed script prints demo credentials to the console. **Do not use these in production** —
they exist purely so you can immediately log in and test the whole flow:

```
School code:      DEMO001
School password:  talkora123
Teacher email:    teacher@demo.talkora.dev
Teacher password: teacher123
Student codes:    printed per-student, regenerated every reseed
```

Run the dev server:

```bash
npm run dev        # ts-node/tsx with watch, http://localhost:5000
npm run build       # compile to dist/
npm start           # run compiled output
npm test            # jest — see note below on integration tests
```

## 3. Tests

`npm test` runs both unit tests (no database needed — password hashing, JWT, validation,
error shaping) and integration tests (real Express app + an in-memory MongoDB instance via
`mongodb-memory-server`, covering auth, student data isolation, locked-level enforcement, and
idempotent achievement unlocking).

**Note:** `mongodb-memory-server` downloads a MongoDB binary on first run
(`https://fastdl.mongodb.org`). This requires outbound internet access. In network-restricted
environments (e.g. a sandboxed CI runner with an egress allowlist), only the unit tests will
run; the integration tests will fail with a download error, not a code error. Run them on a
normal developer machine or a CI runner with open network access, or point
`mongodb-memory-server` at an already-installed local MongoDB binary
(see its `binary.systemBinary` option) if you need offline test runs.

## 4. Authentication flow

- **School**: `POST /api/auth/school/login` with `{ schoolCode, password }`.
- **Teacher**: `POST /api/auth/teacher/login` with `{ email, password }`.
- **Student** (two-step, matching the frontend's school-code → profile-select → code flow):
  1. `POST /api/auth/student/school` with `{ schoolCode }` → returns the list of active student
     profiles in that school (name, grade, avatar — no secrets).
  2. `POST /api/auth/student/login` with `{ schoolCode, studentId, studentCode }` → returns a JWT.
- All three return `{ token, ... }`. Send the token as `Authorization: Bearer <token>` on every
  subsequent request.
- `GET /api/auth/me` returns the current identity from the token (survives a page refresh as
  long as the frontend persists the token, e.g. in an httpOnly-adjacent storage strategy of your
  choice — this backend does not prescribe frontend storage).
- Identity is **always** derived from the verified token server-side. No endpoint trusts a
  client-supplied `studentId`/`schoolId` in the request body to determine whose data to touch.

## 5. Authorization model

Three roles: `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`.

- `authenticate` — verifies the JWT, attaches `req.auth = { id, role, schoolId }`.
- `requireRole(...)` — restricts a route to specific roles.
- School/teacher routes over student records are scoped by `req.auth.schoolId` in every query
  (see `student.service.ts`), so a teacher from School A can never read or write School B's data
  — the record simply won't be found (404), not silently leaked.
- Student self-service routes (`/api/students/me`, `/api/progress/...`, `/api/ai/miss-julie`,
  `/api/voice/...`) always use `req.auth.id` as the student id. There is no route that accepts a
  student id in the body for a student-authenticated request.

## 6. Curriculum contract (frontend integration)

The frontend's current mock types (`services/types.ts`, `services/lessons.ts`) map onto this
backend as follows:

| Frontend mock type | Backend model / endpoint |
|---|---|
| `TalkoraClass` | `CurriculumClass` — `GET /api/classes` |
| `TalkoraLevel` (`place`, `number`, `status`) | `Level`, with per-student `status` (locked/unlocked/in-progress/completed) attached by `GET /api/classes/:classId/levels` when called with a student token |
| `TalkoraLesson` | `Lesson` — `GET /api/levels/:levelId/lessons` |
| `LessonActivity` (`type`, `prompt`, `target`, `choices`, `answer`, `hint`, `xp`) | `Activity` — `GET /api/lessons/:lessonId/activities`. **`answer` is stripped for student tokens** — the backend evaluates answers, not the client. |
| `LearningProgress` | `Progress` — `GET /api/progress/classes/:classId` |
| `Achievement` | `AchievementUnlock` joined with `Achievement` — `GET /api/achievements/mine` |
| `StudentMemory` | `GET /api/memory/mine` |
| `AIResponse` | `POST /api/ai/miss-julie` |
| `ActivityAttempt` | `POST /api/progress/activities/:activityId/attempts` |

The `lib/db/schema.ts` and `lib/auth.ts` (better-auth + Drizzle/Postgres) files present in the
uploaded frontend ZIP are leftover v0 scaffolding and are **not** used by this backend — this
backend is MongoDB + Mongoose + a custom JWT flow, per the architectural decision in the spec.
They can be removed from the frontend once it's wired to this API, or left inert.

## 7. Project structure

```
src/
  config/       env loading, MongoDB connection
  controllers/  HTTP layer — thin, calls services
  services/     business logic (scoring, unlocking, achievements, AI context building)
  models/       Mongoose schemas
  providers/    AI / voice / speech / pronunciation vendor abstractions
  middleware/   auth, validation, rate limiting, centralized error handling
  schemas/      Zod request validation
  routes/       Express routers
  seed/         seed script + Class 4 Level 1 activity content
  app.ts        Express app wiring (no listen())
  server.ts     process entrypoint (connects DB, calls app.listen())
tests/
  unit/         no database required
  integration/  real Express app + in-memory MongoDB
docs/
  API.md               full endpoint reference
  architecture.md       design notes: scoring rules, unlocking, achievements, AI/voice pipeline
  Talkora.postman_collection.json
```

## 8. Miss Julie voice

Miss Julie speech uses the provider selected by `VOICE_PROVIDER`. The production provider is
Sarvam Bulbul v3 with `en-IN` and the `ishita` voice by default. The browser calls
`POST /api/voice/synthesize` with an authenticated student token; Talkora validates the text,
keeps the Sarvam key server-side, and proxies the provider's binary audio stream to the browser.
The endpoint is rate-limited and does not accept provider, model, speaker, language, or student
identity from the client.

Use `VOICE_PROVIDER=mock` for local work without audio credentials. `VOICE_PROVIDER=kokoro` is
reserved for the existing local provider when configured. Hindi readiness is handled through the
same `SARVAM_TTS_LANGUAGE` setting; Hindi UI behavior is intentionally not enabled yet.

The microphone pronunciation flow remains server-owned: a voice session is tied to the JWT
student, the activity target is loaded from the database, and pronunciation evaluation happens
before progress is submitted. The client cannot submit score, XP, or authoritative expected text.
Abandoned recordings can be marked `cancelled`; cancellation never submits progress or awards XP.
Set `SPEECH_PROVIDER=azure` to use Azure Speech fast transcription for explicitly recorded
audio. `SPEECH_PROVIDER=sarvam`, `groq`, and `python` select their respective STT providers;
`SPEECH_PROVIDER=mock` remains the no-credential fallback.

## 9. Scoring, unlocking, and achievements — where the rules live

- **Scoring**: `ProgressService` (`computeScore` in `src/services/progress.service.ts`).
  Deterministic: correctness, attempt count, time-over-budget, and hints used all affect the
  0–100 score; XP awarded is `activity.xp * (score / 100)`, rounded. See `docs/architecture.md`
  for the exact formula and rationale.
- **Level unlocking**: also in `ProgressService`. Completing every lesson in a level unlocks the
  next level in `order`. `assertLevelAccessible` is called before *any* attempt is accepted, so
  a student cannot bypass the map by directly requesting a locked level's activity.
- **Achievements**: `AchievementService.evaluateForStudent` re-evaluates every achievement's
  `criteria` after each attempt and unlocks any that just crossed 100%. Achievements are defined
  as data (`Achievement.criteria`), not hardcoded per-achievement logic, so new ones can be added
  via the database without a code change (as long as their `criteria.type` is one already
  implemented in `computeProgressForCriteria`).
- **Idempotency**: `ActivityAttempt` has a unique `(studentId, idempotencyKey)` index. If the
  frontend retries a submission with the same key (e.g. after a flaky network response), the
  backend returns the original result instead of double-scoring or double-awarding XP.

## 9. Security notes

- Passwords (school, teacher, student code) are hashed with bcrypt (12 rounds), never stored or
  returned in plaintext after creation.
- `helmet`, `cors` (locked to `CLIENT_URL`), and tiered rate limiting (general / auth / AI /
  voice) are applied in `app.ts`.
- Zod validates every request body/params/query before it reaches a controller.
- Centralized error handler never leaks stack traces, secrets, or internal error messages to
  the client in production.
- `.env` is git-ignored; only `.env.example` (no real secrets) is committed.

## 10. What's intentionally not built yet

Per the spec's own scope guidance (`daily challenges` section): daily challenges have a clean
model/service/route (`DailyChallenge`, `DailyChallengeService`) but no admin authoring UI or
scheduler — that's for a later pass once the frontend needs it. Voice/speech/pronunciation
providers are real, swappable interfaces, but their only implementation today is `Mock*`, which
explicitly returns `available: false` — wiring a real vendor (ElevenLabs, OpenAI Realtime, etc.)
is a follow-up task once those API decisions are made, not a fake implementation to unblock the
frontend now.
