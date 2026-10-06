# Talkora Backend — Architecture Notes

## Layering

```
routes/        → thin HTTP wiring, validation, role checks
controllers/    → thin: pull identity from req.auth, call a service, shape the response
services/       → business logic, the only layer that touches multiple models together
providers/      → external vendor boundaries (AI, voice, speech, pronunciation)
models/         → Mongoose schemas — the only layer that touches MongoDB directly
```

Controllers never contain business logic (scoring rules, unlock rules, achievement criteria) —
that all lives in `services/`, so it's testable independent of HTTP and reusable if a second
transport (e.g. a GraphQL layer, or a background job) is ever added.

## Identity and trust boundary

Every authenticated request carries a JWT with `{ sub, role, schoolId }`. `middleware/auth.ts`
verifies it and sets `req.auth`. From that point on:

- Student-scoped services take `studentId` as an explicit parameter, and controllers always pass
  `req.auth.id` — never a value from `req.body` or `req.params` — for that parameter.
- School/teacher-scoped services take `schoolId` as an explicit parameter for the same reason,
  and `student.service.ts` includes `schoolId` in every Mongo filter, so a cross-school id
  simply doesn't match any document (404) instead of leaking another school's data.

## Scoring formula

`ProgressService.computeScore` (paraphrased):

```
if not correct: score = 0
score = 100
score -= min(30, (attemptNumber - 1) * 10)          # repeated attempts cost up to 30
if timeTaken > 1.5x expected: score -= min(20, ...)  # excessive time costs up to 20
score -= min(20, hintsUsed * 5)                       # hints cost up to 20 total
score = max(10, round(score))                         # a correct answer keeps at least 10
```

XP awarded = `round(activity.xp * score / 100)`.

This is intentionally simple and fully documented in one function so it's easy to tune per
activity type later (e.g. giving `SPEAKING`/`PRONUNCIATION` activities a different weighting
once real pronunciation scores are available) without hunting logic across the codebase.

Open-ended activity types (`SPEAKING`, `CONVERSATION`, `PRONUNCIATION`) don't have a single
fixed `answer` to string-match — `Activity.answer` is optional. For those, the current
`submitAttempt` path marks them `correct: false` unless a matching `answer` is provided; the
intended integration point for AI/pronunciation-scored correctness is `MissJulieService` /
`VoiceService`, which independently record `LearningEvent`s (`speaking_attempt`,
`pronunciation_attempt`) that `AchievementService` and `RecommendationService` already consume.
Wiring those results back into `ActivityAttempt`/`Progress` for XP purposes is a natural next
increment once the voice pipeline has a real provider.

## Level unlocking

`Progress.levels` is an array of per-level progress, seeded (via `ensureProgress`) with Level 1
`unlocked` and everything else `locked` the first time a student's progress is requested for a
class. `assertLevelAccessible` is called at the very top of `submitAttempt`, so a request against
a locked level's activity is rejected with `422 BUSINESS_RULE_ERROR` before any attempt is
persisted or scored — this is enforced regardless of what the frontend's UI allows the student
to click.

A level is marked `completed` when every lesson under it (currently one per level, per the
seeded curriculum, but the code does not assume this) has all its activities answered correctly
at least once. Completing a level immediately unlocks the next level in `order` for that class.

## Achievements

`Achievement.criteria` is a small typed object (`{ type: 'activities_completed', count: 10 }`,
etc.) interpreted by `computeProgressForCriteria`. `AchievementService.evaluateForStudent` is
called after every processed attempt; it recomputes every achievement's progress percentage and
flips `AchievementUnlock.unlocked` the first time it crosses 100, recording a `LearningEvent` of
type `achievement_unlocked`. The frontend only ever reads `AchievementUnlock` — there is no
endpoint that lets a client unlock an achievement directly.

## Miss Julie / AI

`MissJulieService.buildContext` gathers: student first name + grade, the current level/lesson/
activity titles, the student's 5 most recent *unresolved* mistakes, and their 5 most recently
reinforced memory facts — then hands that to whichever `AIProvider` is configured
(`GroqProvider`, `OpenAIProvider`, or `MockAIProvider` for local dev). The provider's raw JSON
response is validated against `aiStructuredResponseSchema` (Zod) before it's trusted — a
malformed or off-shape AI response surfaces as a `502 PROVIDER_ERROR`, never as silently-wrong
data reaching the student. Miss Julie is not a single generic `/chat` endpoint: the `context`
field (`lesson_instruction`, `hint`, `mistake_correction`, `encouragement`, `speaking`, ...) is
part of the request contract, giving the AI provider explicit signal about *why* it's being
called, matching the range of moments the product spec calls out (instructions, feedback, hints,
encouragement, review, level completion, recommendations).

## Voice / speech / pronunciation providers

Three separate interfaces (`VoiceProvider` for TTS, `SpeechRecognitionProvider` for transcription,
`PronunciationProvider` for scoring) so a real vendor can be swapped in per-capability without
entangling them. Their only current implementation is a `Mock*` class that returns
`available: false` and a `null`/empty result — explicitly not a fake success, so the frontend
(or an integration test) can tell the difference between "the provider says this was wrong" and
"there is no provider configured yet." Sarvam streaming is proxied through Express; raw audio is
never persisted and `VoiceSession` stores only
the resulting transcript and evaluation.

## Idempotency and consistency

`ActivityAttempt` has a unique `(studentId, activityId, attemptNumber)` index (so attempt numbers
can't collide) and a separate unique, sparse `(studentId, idempotencyKey)` index. If a client
retries a submission with the same `idempotencyKey` (e.g. after a timeout where the first request
actually succeeded server-side), `submitAttempt` returns the original attempt and progress
instead of creating a second one — this is what the "double-submit test" in
`tests/integration/achievement.test.ts` exercises.
