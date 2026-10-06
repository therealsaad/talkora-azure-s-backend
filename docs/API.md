# Talkora Backend — API Reference

Base URL: `http://localhost:5000/api` (dev) — configurable via `PORT`.

All responses follow:

```json
{ "success": true, "data": { ... } }
```
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

Paginated list responses additionally include:
```json
{ "success": true, "data": [...], "pagination": { "page": 1, "limit": 20, "total": 42, "pages": 3 } }
```

Authenticated requests: `Authorization: Bearer <token>`.

---

## Auth — `/api/auth`

### `POST /api/auth/school/login`
Public. Rate-limited (20/15min).
Body: `{ schoolCode, password }` → `{ token, school: { id, name, code } }`

### `POST /api/auth/teacher/login`
Public. Rate-limited.
Body: `{ email, password }` → `{ token, teacher: { id, name, email, schoolId } }`

### `POST /api/auth/student/school`
Public. Rate-limited. Step 1 of student login.
Body: `{ schoolCode }` → `{ schoolId, schoolName, students: [{ _id, fullName, grade, className, avatar }] }`

### `POST /api/auth/student/login`
Public. Rate-limited. Step 2 of student login.
Body: `{ schoolCode, studentId, studentCode }` → `{ token, student: { id, fullName, grade, className } }`

### `GET /api/auth/me`
Auth required (any role). Returns the current identity resolved from the token.

### `POST /api/auth/logout`
Auth required. Records a `logout` learning event for students; JWTs are stateless so the client
should simply discard the token.

---

## Schools — `/api/schools`

### `POST /api/schools/register`
Public (rate-limited). Body: `{ name, code?, password, contactEmail?, location? }` → creates a
school, auto-generating a `code` if omitted. `201`.

### `GET /api/schools/overview`
Role: `SCHOOL_ADMIN`, `TEACHER`. Per-student rollup (xp, completed levels, accuracy) for the
caller's school. Same as `/api/analytics/overview`.

---

## Teachers — `/api/teachers`
Role: `SCHOOL_ADMIN`.

- `GET /` — list teachers in the school.
- `POST /` — `{ name, email, password }` → `201`.

---

## Students — `/api/students`

### Student self-service (role: `STUDENT`)
- `GET /me` — own profile.
- `GET /me/progress?grade=<n>` — own `Progress` for their grade's class (grade optional; defaults
  to the student's own grade).

### School/teacher management (role: `SCHOOL_ADMIN`, `TEACHER`)
- `GET /` — query: `search, grade, className, status, page, limit, sort` → paginated list, scoped
  to the caller's school.
- `POST /` — `{ fullName, rollNumber, grade, className?, teacherId?, avatar? }` → `201`,
  `{ student, studentCode }`. `studentCode` is returned once, in plaintext, at creation.
- `GET /:id` — scoped to the caller's school (cross-school id → `404`).
- `PATCH /:id` — partial update.
- `DELETE /:id` — hard delete.
- `POST /:id/deactivate` — soft delete (`status: inactive`).
- `POST /:id/reset-code` — issues a new student code, returned once in plaintext.

---

## Curriculum — `/api/classes`, `/api/levels`, `/api/lessons`, `/api/activities`
Auth required (any role).

- `GET /api/classes` — active `CurriculumClass` list, ordered.
- `GET /api/classes/:id`
- `GET /api/classes/:classId/levels` — for a `STUDENT` token, each level is annotated with that
  student's `status` (`locked | unlocked | in-progress | completed`).
- `GET /api/levels/:id` — for a `STUDENT` token, throws `422 BUSINESS_RULE_ERROR` if locked.
- `GET /api/levels/:levelId/lessons`
- `GET /api/lessons/:id`
- `GET /api/lessons/:lessonId/activities` — student tokens never receive `answer`/`answerConfig`;
  teacher/school tokens do (curriculum authoring/review).
- `GET /api/activities/:id` — same answer-stripping rule.

---

## Progress — `/api/progress`
Role: `STUDENT`.

### `POST /api/progress/activities/:activityId/attempts`
Body: `{ answer, startedAt (ISO datetime), hintsUsed?, idempotencyKey? }`

- Identity is the token's student id — never a body field.
- Rejects with `422 BUSINESS_RULE_ERROR` if the activity's level is locked for this student.
- Rejects with `404` if the activity doesn't exist.
- Backend computes `correct`, `score` (0-100), and `xpAwarded` — the client cannot set these.
- Supplying the same `idempotencyKey` twice returns the original result
  (`alreadyProcessed: true`) instead of double-scoring.
- Response: `{ attempt, progress, alreadyProcessed, xpAwarded?, score? }`.

### `GET /api/progress/classes/:classId`
Returns (and lazily creates, with Level 1 unlocked) the caller's `Progress` document for that class.

---

## Achievements — `/api/achievements`
- `GET /api/achievements/catalog` — auth required, any role. Full achievement catalog (no per-student state).
- `GET /api/achievements/mine` — role `STUDENT`. Catalog joined with this student's unlock state/progress.

## Mistakes — `/api/mistakes`
- `GET /api/mistakes/mine` — role `STUDENT`. Unresolved `MistakeRecord`s, most recent first.

## Memory — `/api/memory`
- `GET /api/memory/mine` — role `STUDENT`. `StudentMemory` facts, most recently reinforced first.

---

## Voice — `/api/voice`

All voice endpoints require an authenticated `STUDENT` token and are rate-limited.

### `POST /api/voice/synthesize`
Body: `{ "text": string }`

The backend validates text and streams audio from the configured voice provider. With
`VOICE_PROVIDER=sarvam`, the stream uses Bulbul v3, the configured speaker/language/pace, and
the provider audio content type. Provider credentials and configuration cannot be selected by
the client. Provider failures are returned as sanitized `PROVIDER_ERROR` responses.

### `POST /api/voice/sessions`
Body: `{ "lessonId"?, "activityId"? }` -> creates an active pronunciation session.

### `POST /api/voice/sessions/:sessionId/transcript`
Body: `{ "transcript": string }` -> evaluates the server-owned activity target, stores the
transcript/evaluation, and submits progress with server-calculated score and XP. A session can
only be completed by its owning student.

### `POST /api/voice/sessions/:sessionId/cancel`
Marks an abandoned active voice session as cancelled. Ownership is checked against the
authenticated student and no progress or XP is awarded.

### `POST /api/voice/transcribe`
Body: `{ "audioBase64": string }` -> sends explicitly recorded audio to the configured speech
provider. With `SPEECH_PROVIDER=azure`, the backend uses Azure Speech fast transcription with
`AZURE_SPEECH_STT_LOCALE` (default `en-IN`) and returns a normalized transcript. Audio is not
persisted.

## AI (Miss Julie) — `/api/ai`
Role: `STUDENT`. Rate-limited (20/min).

### `POST /api/ai/miss-julie`
Body: `{ message, lessonId?, activityId?, context? }` where `context` is one of
`lesson_instruction | activity_feedback | hint | mistake_correction | encouragement | speaking |
pronunciation | review | level_completion | recommendation | general`.

Builds real learning context (progress, mistakes, memory) server-side, calls the configured
`AIProvider`, validates its structured response, persists the exchange to `Conversation`, and
applies any proposed `memoryUpdates`. Response shape:
```json
{
  "message": "string",
  "emotion": "welcome|encouraging|thinking|celebrating|concerned",
  "evaluation": { "correct": true, "score": 90, "feedback": "..." },
  "corrections": [],
  "hint": null,
  "memoryUpdates": [],
  "xpAwarded": 10,
  "recommendation": null
}
```

### `GET /api/ai/recommendation`
Rule-based (not AI-generated) recommendations from the student's real mistakes/progress signals.
Response: `{ recommendations: string[] }`.

---

## Voice — `/api/voice`
Rate-limited (15/min).

- `POST /api/voice/sessions` — role `STUDENT`. Body: `{ lessonId?, activityId? }` → `201`, a new `VoiceSession`.
- `POST /api/voice/sessions/:sessionId/transcript` — role `STUDENT`. Body: `{ transcript, expected? }` →
  completes the session; if `expected` is given, runs the configured `PronunciationProvider`.
- `POST /api/voice/synthesize` — any authenticated role. Body: `{ text }` → `{ audioUrl, available }`
  (`available: false` until a real TTS provider is configured).

---

## Analytics — `/api/analytics`
Role: `SCHOOL_ADMIN`, `TEACHER`.

- `GET /api/analytics/overview` — per-student rollup for the caller's school.
- `GET /api/analytics/weakest-skills` — top unresolved-mistake skills across the school.

## Daily challenges — `/api/daily-challenges`
- `GET /api/daily-challenges/today` — role `STUDENT`. Today's challenge for the student's grade's class, or `null`.

---

## Health check
- `GET /api/health` — public. `{ status: "ok", time }`.

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/params/query failed Zod validation |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token, or bad login credentials |
| `FORBIDDEN` | 403 | Authenticated, but not allowed to access this resource |
| `NOT_FOUND` | 404 | Resource doesn't exist (or isn't in the caller's school) |
| `CONFLICT` | 409 | Duplicate unique field (e.g. roll number, school code) |
| `BUSINESS_RULE_ERROR` | 422 | e.g. attempting a locked level |
| `RATE_LIMITED` | 429 | Too many requests in the current window |
| `PROVIDER_ERROR` | 502 | The AI/voice/speech provider failed or returned an unexpected shape |
| `INTERNAL_ERROR` | 500 | Unhandled server error |
