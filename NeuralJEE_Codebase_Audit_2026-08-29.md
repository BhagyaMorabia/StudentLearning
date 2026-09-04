# NeuralJEE Codebase Audit - 2026-08-29

This audit is based on the current local workspace at:

`C:\Users\prsco\Desktop\bhagya\student`

It reconciles the stated NeuralJEE blueprint with the code, data files, tests, migrations, and scripts currently present in the repository.

## 1. Product Understanding

NeuralJEE is intended to be a cognitive AI tutor for IIT-JEE preparation, not a normal LMS.

The core product loop is:

1. Teach every JEE subtopic through a 4-page progressive textbook.
2. Test the student through server-validated JEE-style quiz questions.
3. Classify wrong answers into cognitive failure modes using telemetry.
4. Remediate using a Socratic RAG tutor grounded in verified curriculum content.
5. Schedule review using FSRS so each student reviews before predicted forgetting.

The intended differentiator is diagnosis, not content hosting. The platform should know whether a student failed because of a missing prerequisite, weak concept, procedural gap, formula confusion, careless mistake, guessing, or forgetting.

## 2. Current Technology Stack Observed

- Framework: Next.js 16.2.4 App Router, React 19.2.4.
- Database: Neon PostgreSQL through `@neondatabase/serverless`.
- ORM: Drizzle ORM and Drizzle Kit.
- Auth: Clerk is installed and partially used.
- AI: Google GenAI / Gemini in current code. The docs still mention Claude/Anthropic in several places.
- Embeddings: Gemini `text-embedding-004` in current code. Older docs still mention local Xenova/BGE.
- Spaced repetition: `ts-fsrs`.
- Styling: Tailwind CSS 4 with local UI primitives.
- Math rendering: KaTeX through `remark-math` and `rehype-katex`.
- Diagram rendering: Mermaid.
- Rate limiting/cache: Upstash Redis packages are present; rate limiting is optional and fails open.
- Python ingestion: `google-genai`, `psycopg2`, `PyMuPDF`, Node-based content validation.

## 3. Actual Data State

The local data files do not match the older project summaries.

### 3.1 4-page textbook content

Observed directory:

`python/data/content_v2`

Actual count:

- Files: 78 JSON files.
- Generated subtopics: 454.
- Pages: 1,816 total page records.
- Page validity flags: 1,816 valid, 0 invalid, 0 missing.
- By subject:
  - Physics: 181 subtopics.
  - Chemistry: 145 subtopics.
  - Mathematics: 128 subtopics.

The old summary saying "21 files", "Physics only", and "131 topics" is stale. The current content generation is almost complete, but still one subtopic short if the syllabus total is truly 455.

### 3.2 Prerequisite graph

Observed file:

`python/data/prerequisite_edges.json`

Actual count:

- Edges: 940.
- Unique edges: 940.
- Duplicate edges: 0.
- Missing IDs: 0.
- Self loops: 0.

The old summary saying "3,762 edges" is stale or refers to a different artifact not present here.

### 3.3 PYQ extraction

Observed directory:

`python/data/extracted_pyqs`

Actual local JSON extraction count:

- `test_physics_p20-22.json`: 10 questions.

Observed diagram assets:

- `public/diagrams`: 3,288 image files.

This is inconsistent: many diagram assets exist, but only one small extracted PYQ JSON file is present locally. The live database may contain more, but that was not verified in this audit.

## 4. Highest Priority Blockers

These are release blockers.

### P0-1. Authentication is still mocked in protected surfaces

Files with hardcoded `test-user-123`:

- `src/app/(app)/layout.tsx`
- `src/app/(app)/review/page.tsx`
- `src/app/api/progress/route.ts`
- `src/app/api/curriculum/route.ts`
- `src/app/api/ai/quiz/route.ts`
- `mock_auth.py`
- `python/ingest/seed_mock_user.py`

Impact:

- Signed-out users can pass the app layout's server-side auth check because it always returns a fake user.
- Multiple routes are not actually protected by Clerk.
- User isolation is invalid for dashboard/progress/review/quiz generation.
- This violates the central safety boundary of the product.

Required fix:

- Delete `mock_auth.py` or quarantine it outside the app repo.
- Replace every local `const auth = () => ...` with `auth()` from `@clerk/nextjs/server`.
- Add a single server helper such as `requireUser()` that:
  - requires Clerk auth,
  - resolves the internal `users.id`,
  - returns both `clerkUserId` and `internalUserId`,
  - fails closed if the user is not synced.
- Add tests or static checks that fail CI on `test-user-123` and local `const auth =`.

### P0-2. Clerk middleware/proxy is not enforcing protection

File:

- `src/proxy.ts`

Current behavior:

- It returns `NextResponse.next()` for everything.
- It does not use Clerk middleware.
- It does not protect routes.

Impact:

- Route protection depends entirely on each page/API remembering to call `auth()`.
- Several pages/routes already forgot and are mocked.

Required fix:

- Implement Clerk protection using the correct Next.js 16-compatible Clerk middleware/proxy pattern.
- Protect `/dashboard`, `/learn`, `/review`, `/doubt`, and all user-specific `/api/*` routes except Clerk webhooks and public health checks.

### P0-3. Environment validation is broken and inconsistent

Files:

- `src/env.ts`
- `.env.example`
- `src/app/api/webhooks/clerk/route.ts`

Observed mismatch:

- `src/env.ts` requires `WEBHOOK_SECRET`.
- `.env.example` documents `CLERK_WEBHOOK_SECRET`.
- The Clerk webhook route reads `CLERK_WEBHOOK_SECRET`.

Build result:

- `npm.cmd run build` fails immediately because `CLERK_SECRET_KEY` and `WEBHOOK_SECRET` are missing.

Impact:

- Production and local builds can fail even if the correct Clerk webhook secret is configured.
- The name mismatch hides the real problem and makes deployment unreliable.

Required fix:

- Rename `WEBHOOK_SECRET` in `src/env.ts` to `CLERK_WEBHOOK_SECRET`.
- Do not import full server env validation into `next.config.ts` unless all build-time variables are intentionally required.
- Split build-time env validation from runtime server env validation.

### P0-4. Current schema and migration SQL are out of sync

Files:

- `src/lib/db/schema.ts`
- `drizzle/migrations/0000_amused_ink.sql`

Observed mismatch:

- Current schema has `studentMastery.fsrsState` as JSONB.
- Migration SQL has old columns: `fsrs_stability`, `fsrs_difficulty`, `fsrs_retrievability`.
- Current schema defines HNSW indexes for embeddings.
- Migration SQL does not create those HNSW indexes.
- Migration SQL uses `vector(768)` but does not run `CREATE EXTENSION IF NOT EXISTS vector`.

Impact:

- A database created from the checked-in migration will not match the current application.
- `/api/quiz/submit` expects `fsrs_state` to exist and will fail against migrated DBs.
- Vector search may be slow or fail depending on extension/index state.

Required fix:

- Generate and commit a new migration matching the current schema.
- Explicitly include `CREATE EXTENSION IF NOT EXISTS vector;`.
- Verify HNSW index creation works on Neon.
- Add migration drift checks to CI.

### P0-5. Quiz submit does not verify that submitted questions belong to the submitted subtopic

File:

- `src/app/api/quiz/submit/route.ts`

Current behavior:

- Fetches questions by IDs.
- Accepts a `subtopicId` from the client.
- Does not reject answers whose `question.subtopicId` differs from the submitted `subtopicId`.

Impact:

- A client can submit question IDs from one subtopic while updating mastery for another subtopic.
- This corrupts mastery, FSRS state, analytics, and review scheduling.

Required fix:

- Require every fetched question to have `question.subtopicId === subtopicId`.
- Reject duplicate question IDs.
- Derive the subtopic from the server-side questions when possible.

### P0-6. The diagnostic router is not integrated into the main quiz submission

Files:

- `src/components/quiz/QuizPresenter.tsx`
- `src/components/quiz/QuizContainer.tsx`
- `src/app/api/quiz/submit/route.ts`
- `src/app/api/quiz/evaluate/route.ts`
- `src/components/quiz/QuizEngine.tsx`

Current behavior:

- Active quiz route uses `QuizContainer` and `QuizPresenter`.
- `QuizPresenter` records selected answer and time.
- It does not record or submit `optionSwitchCount`.
- `/api/quiz/submit` saves attempts but does not compute or store `detectedFailureMode`.
- `/api/quiz/evaluate` can classify one answer, but it is not part of the main quiz completion loop.
- `QuizEngine` contains a richer diagnostic state machine, but it is not wired into the active quiz page.

Impact:

- The flagship "7 cognitive failure modes" loop is mostly not operational for normal quiz submissions.
- Stored attempts do not contain the diagnostic data needed for remediation analytics.

Required fix:

- Extend submit payload with `optionSwitchCount`.
- Compute failure mode inside `/api/quiz/submit` for every incorrect answer.
- Store `detectedFailureMode`, `activatedMisconceptionId`, and `remediationTriggered`.
- Return failure-mode metadata to the frontend.
- Either wire `QuizEngine` into the real quiz flow or remove it until it is production-ready.

### P0-7. RAG does not use the 4-page textbook content in AI teaching

Files:

- `src/app/api/ai/teach/route.ts`
- `src/lib/rag/retrieve.ts`
- `src/lib/rag/context-builder.ts`

Current behavior:

- `StaticContentPanel` displays `contentFoundation`, `contentDeepConcepts`, `contentFormulas`, and `contentPractice`.
- `buildTeachingContext()` uses `targetSubtopic.rawContent`.
- `retrieveContextForSubtopic(subtopicId)` is called without `queryText`, so vector retrieval never runs.
- `similarSubtopics` are fetched only if `queryText` is provided, then not used by the prompt builder.

Impact:

- The visible textbook and AI tutor can teach from different sources.
- The "hybrid search" claim is not true in the teach flow.
- If `rawContent` is empty but V2 content exists, the AI receives "Expert content pending" and may teach from model memory.

Required fix:

- Build RAG context from the four V2 columns.
- Pass a query string such as subtopic name + description + formulas.
- Include retrieved similar subtopics in the prompt only when relevant and bounded.
- Use content chunking rather than dumping entire long pages.

## 5. High Priority Product Gaps

### P1-1. Remediation endpoint is not failure-mode aware

File:

- `src/app/api/ai/remediate/route.ts`

Current behavior:

- Accepts only `questionId` and `selectedAnswer`.
- Does not accept or retrieve `failureMode`.
- Does not retrieve prerequisite chain or student mastery state.
- Sends the correct answer directly into the prompt.

Impact:

- The AI tutor cannot tailor intervention to prerequisite gap vs forgetting vs carelessness.
- The system may reveal the answer instead of Socratically remediating.

Required fix:

- Accept an `attemptId` or create attempt before remediation.
- Load the stored failure mode, misconception, question, solution, prerequisite state, and FSRS state server-side.
- Use prompt variants per failure mode.
- Avoid giving the full answer until the Socratic interaction reaches the correct stage.

### P1-2. Doubt solver is not grounded in RAG

File:

- `src/app/api/ai/doubt/route.ts`

Current behavior:

- Accepts optional `subtopicId` in schema, but ignores it.
- Streams a generic Gemini response from conversation history.

Impact:

- Doubt solving can hallucinate and is not forced to use verified curriculum.

Required fix:

- If `subtopicId` is provided, retrieve curriculum context.
- For free-form doubts, classify/route to likely subtopics before answering.
- Add citation/context boundaries in the prompt.

### P1-3. Quiz generation endpoint does not generate questions

File:

- `src/app/api/ai/quiz/route.ts`

Current behavior:

- The comment says it generates questions.
- The implementation only fetches existing verified DB questions.

Impact:

- If the DB has no verified questions, quiz flow is empty.
- The code behavior and product claim diverge.

Required fix:

- Either rename this endpoint to `/api/quiz/questions` and keep it DB-only, or implement generation, validation, persistence, and answer stripping.
- Prefer DB-only for production until AI-generated questions have automated quality gates.

### P1-4. `stripAnswerFromQuestion` may leak option explanations and trap metadata

File:

- `src/lib/db/queries/questions.ts`

Current behavior:

- Removes `correctAnswer`, `embedding`, and `options[].isCorrect`.
- Leaves all other option properties intact, including possible `explanation`, `prerequisiteTrapId`, `misconceptionType`, `imageUrl`, etc.

Impact:

- If wrong option explanations or trap IDs exist in `options`, the browser can receive answer hints and diagnostic labels before submission.

Required fix:

- Whitelist client option fields: `id`, `text`, `imageUrl`.
- Do not use object rest for sensitive option objects.
- Add a regression test proving `correctAnswer`, `isCorrect`, `explanation`, `prerequisiteTrapId`, and `misconceptionType` never leave the server.

### P1-5. FSRS implementation and tests need correction

Files:

- `src/lib/mastery/spaced-rep.ts`
- `tests/unit/spaced-rep.test.ts`

Test result:

- `npm.cmd test` fails: expected `failedState.lapses` to be `1`, received `0`.

Likely reason:

- A mastery score of 30 maps to `Rating.Hard`, not `Rating.Again`, so FSRS does not count it as a lapse.

Impact:

- Review scheduling assumptions are not mathematically verified.
- "WEAK" does not necessarily mean "failed" in the FSRS model.

Required fix:

- Decide the product mapping:
  - If score 30 is a failure, map it to `Again`.
  - If score 30 is "hard but recalled", update the test.
- Add tests for all score thresholds and same-day repeated reviews.

### P1-6. The mastery algorithm is too simple for the claimed cognitive engine

File:

- `src/lib/mastery/algorithm.ts`

Current behavior:

- Mastery is a weighted score: accuracy 60%, consistency 25%, time 15%.
- Failure mode priority checks guessing/procedural/forgetting/formula/prereq/conceptual.

Risks:

- `timeSpentSeconds < 15` classifies as guessing regardless of question expected time.
- Any `optionSwitchCount >= 1` becomes formula confusion before prerequisite trap detection.
- Prerequisite trap should probably outrank formula switching when a tagged trap was selected.
- Retrievability is approximated from `lapses > 0`, not actual FSRS retrievability.

Required fix:

- Use expected-time-relative thresholds.
- Put explicit tagged traps before generic option switching.
- Calculate true FSRS retrievability at answer time.
- Add tests for all 7 failure modes and priority collisions.

## 6. Python Pipeline Issues

### P1-7. `seed_full_curriculum.py` reads old content path

File:

- `python/ingest/seed_full_curriculum.py`

Current behavior:

- Reads `python/data/concepts_json`.
- Does not ingest V2 content columns from `python/data/content_v2`.

Impact:

- The main seed path does not populate the flagship 4-page textbook.

Required fix:

- Merge curriculum seeding and V2 content ingestion into one idempotent pipeline, or clearly split:
  - `seed_curriculum_structure.py`
  - `push_content_v2.py`
  - `push_questions.py`
  - `build_embeddings.py`

### P1-8. `push_content_v2.py --dry-run` appears broken

File:

- `python/ingest/push_content_v2.py`

Current behavior:

- In dry-run branch, it calls `push_v2_content(None, args.subject, dry_run=True)`.
- `push_v2_content()` immediately executes `cursor = conn.cursor()`.

Impact:

- Dry run should not require a DB connection, but currently does.

Required fix:

- Move `cursor = conn.cursor()` below the dry-run-only path or provide a connection even for dry run.

### P1-9. `push_content_v2.py` marks AI-generated content as `VERIFIED`

File:

- `python/ingest/push_content_v2.py`

Current behavior:

- Updates `content_status = 'VERIFIED'`.

Impact:

- "Verified" becomes meaningless.
- RAG filters trust content that has not passed human or rigorous automated review.

Required fix:

- Use `AI_GENERATED` after generation.
- Move to `VERIFIED` only after expert review or a stricter automated validation + sampling workflow.

### P1-10. V2 content push does not generate embeddings

File:

- `python/ingest/push_content_v2.py`

Current behavior:

- Updates four content columns only.
- Does not populate `embedding`.

Impact:

- Vector retrieval cannot work on V2 content unless another missing process fills embeddings.

Required fix:

- Generate embeddings from a compact canonical text per subtopic:
  - name,
  - description,
  - formulas,
  - page summaries,
  - key misconception tags.
- Do not embed all 10,000+ words into one vector and expect good retrieval.
- Add chunk-level embeddings for precise RAG.

### P1-11. Python execution is blocked locally

Verification result:

- `python.exe` failed with "file cannot be accessed by the system".
- `py -3` failed with "Access is denied".

Impact:

- Python ingestion cannot currently be verified or run from this environment.

Required fix:

- Fix local Python install/permissions.
- Add a checked `python -m py_compile` step once Python works.
- Add smoke scripts that do not require network or DB.

## 7. Database Architecture Gaps

### P1-12. No database-level tenant isolation

Current state:

- All user isolation is application-level.
- No Row Level Security policies are present in the migration snapshot.

Impact:

- A future route bug can leak/corrupt user data.

Required fix:

- At minimum, centralize all user-scoped queries through helper functions.
- For stronger isolation, evaluate PostgreSQL RLS with session variables if compatible with Neon/serverless access patterns.

### P1-13. Event logs are not strongly typed

Files:

- `src/lib/db/schema.ts`
- `src/app/api/progress/route.ts`
- `src/app/api/quiz/submit/route.ts`

Current behavior:

- `learningEvents.eventType` is plain text.
- POST `/api/progress` allows a small enum that excludes `QUIZ_COMPLETED`, while `/api/quiz/submit` writes `QUIZ_COMPLETED`.

Impact:

- Analytics consistency will degrade quickly.

Required fix:

- Add a `learning_event_type` enum.
- Create typed event payload schemas.
- Add ingestion/analytics contracts for events.

### P1-14. Question attempts need stronger indexes

Current indexes:

- `attempts_user_idx`
- `attempts_question_idx`
- `attempts_subtopic_idx`

Missing useful indexes:

- `(user_id, subtopic_id, created_at desc)`
- `(user_id, created_at desc)`
- `(user_id, detected_failure_mode)`

Impact:

- Dashboard, review, and weakness analytics will slow as attempts grow.

### P1-15. Vector search should be chunk based

Current schema:

- One embedding on `subtopics`.
- One embedding on `questions`.

Impact:

- One vector per 4-page textbook subtopic is too coarse.
- RAG cannot retrieve exact paragraphs, formulas, derivation sections, or worked examples.

Required addition:

- Add `content_chunks` table:
  - `id`
  - `subtopic_id`
  - `page_type`
  - `chunk_index`
  - `content`
  - `token_count`
  - `embedding`
  - `content_status`
  - `source_hash`
  - timestamps

## 8. Frontend Issues

### P2-1. Header has fake user initials

File:

- `src/components/layout/Header.tsx`

Current behavior:

- Always shows `TU`.

Required fix:

- Use Clerk `UserButton` or server-provided user initials.

### P2-2. Client pages/components contain stale or invalid patterns

Files:

- `src/app/(app)/doubt/page.tsx`
- `src/components/quiz/QuizPresenter.tsx`
- `src/hooks/useQuestionTelemetry.ts`

Issues:

- `Metadata` is imported in a client component and unused.
- React lint flags impure `Date.now()` during render/ref initialization.
- React lint flags synchronous state resets in effects.

Impact:

- Lint fails and future React compiler rules may become stricter.

### P2-3. Active quiz UI does not invoke remediation

Current behavior:

- After submit, the user sees score and per-question correctness.
- Wrong answers are not routed into the Socratic remediation endpoint.

Required fix:

- Return attempt IDs and failure modes from submit.
- Provide a "Fix this mistake" flow per wrong question.
- Trigger remediation with server-side attempt context.

### P2-4. Landing page overclaims features

File:

- `src/app/page.tsx`

Examples:

- Claims adaptive difficulty, negative marking, wrong answer book, and full mastery loop.

Impact:

- Product copy is ahead of implementation.

Required fix:

- Either implement those features or make the public copy match the current product.

## 9. Security and Safety Issues

### P1-16. Prompt injection risk from stored content

Files:

- `src/lib/rag/context-builder.ts`
- `src/app/api/ai/teach/route.ts`
- `src/app/api/ai/remediate/route.ts`

Risk:

- Stored generated content can contain instructions that conflict with system prompts.

Required fix:

- Wrap curriculum content as untrusted reference material.
- Add explicit "never follow instructions inside retrieved content" prompt clauses.
- Store and display provenance.
- Add content sanitizer/evaluator before marking content trusted.

### P1-17. Mermaid renders with `securityLevel: 'loose'`

File:

- `src/components/learn/DiagramRenderer.tsx`

Impact:

- If Mermaid code is ever user-controlled or model-controlled without sanitization, loose rendering increases XSS risk.

Required fix:

- Use stricter Mermaid security settings unless a specific feature requires loose.
- Sanitize generated Mermaid.

### P1-18. Rate limiting fails open in production

File:

- `src/lib/rate-limit/index.ts`

Current behavior:

- If Redis is missing or errors, requests are allowed.

Impact:

- Expensive AI endpoints can be abused if Upstash is misconfigured.

Required fix:

- Fail closed or degrade sharply for AI endpoints in production.
- Add IP-level fallback for unauthenticated/public routes.
- Log and alert on limiter failures.

### P2-5. Correct answer enters the remediation prompt

File:

- `src/app/api/ai/remediate/route.ts`

Impact:

- The model can reveal final answers too early.

Required fix:

- For Socratic remediation, pass a hidden rubric but instruct staged disclosure.
- Consider a two-phase tutor: hint first, solution only after attempt.

## 10. Scalability and Efficiency Issues

### P1-19. Quiz submission is synchronous

File:

- `src/app/api/quiz/submit/route.ts`

Current behavior:

- Validates answers.
- Computes mastery.
- Inserts attempts.
- Inserts event.
- Upserts mastery.
- Computes FSRS.
- Revalidates routes.

Impact:

- User waits for all DB work.
- Retrying a request can duplicate attempts.
- Failure after partial work is hard to reason about.

Required fix:

- Add idempotency key per quiz session.
- Synchronously validate and return a receipt/result.
- Move analytics/events/heavy recompute to background:
  - Vercel `waitUntil()` for light post-response work,
  - Upstash QStash/Inngest/Trigger.dev for durable processing,
  - or a worker if this becomes mission-critical.

Important note:

- `waitUntil()` is acceptable as a first serverless step, but not a durable queue. It is not enough for guaranteed processing under retries, deploy interrupts, provider timeouts, or long AI calls.

### P1-20. Full curriculum query loads everything

File:

- `src/lib/db/queries/curriculum.ts`

Current behavior:

- Loads all subjects, chapters, topics, and subtopics, then filters in memory.

Impact:

- Fine at 455 subtopics, but not ideal as content grows.

Required fix:

- Use relational query or a single join and assemble tree.
- Cache public curriculum aggressively.
- Do not require auth for public/static curriculum unless progress is included.

### P1-21. AI streaming JSON is hard for clients to consume safely

Files:

- `src/app/api/ai/teach/route.ts`
- `src/app/api/ai/remediate/route.ts`

Current behavior:

- Streams raw JSON text.
- Validates only after the stream completes.
- If invalid, warning is logged but client already received bad data.

Required fix:

- For structured AI responses, either:
  - do non-streaming JSON generation and validate before returning, or
  - stream NDJSON/event chunks with explicit chunk schema.
- Add repair/retry logic before user-visible failure.

## 11. Documentation Drift

Files:

- `system_architecture.md`
- `NeuralJEE_Complete_Production_Blueprint.md`
- `README.md`

Observed problems:

- `system_architecture.md` says graph has 3,762 edges; actual file has 940.
- It says content has 21 files and 131 Physics subtopics; actual content has 78 files and 454 subtopics.
- It says embeddings use Xenova/BGE; current code uses Gemini.
- It says `/api/ai/teach` is missing; current code has it.
- README is still default create-next-app text.
- Some docs say Next.js 15, package uses Next.js 16.2.4.

Required fix:

- Make this audit the new source of truth until corrected docs are written.
- Update README with:
  - setup,
  - env variables,
  - local dev,
  - DB migration,
  - ingestion pipeline,
  - tests,
  - known limitations.
- Add an "Architecture Reality" section that distinguishes implemented, partial, and planned.

## 12. Verification Results

Commands run:

### `npm.cmd run lint`

Result:

- Failed.
- 27 errors and 8 warnings.

Major categories:

- `any` usage in API routes and FSRS.
- React purity/set-state-in-effect lint errors.
- `validate_content.js` CommonJS require linted by app ESLint.
- Empty interfaces in UI primitives.
- Unused imports/vars.

### `npm.cmd test`

Result:

- Failed.
- 13 tests passed.
- 1 test failed.

Failure:

- `tests/unit/spaced-rep.test.ts`: failed attempt test expected `lapses = 1`, got `0`.

### `.\node_modules\.bin\tsc.cmd --noEmit`

Result:

- Passed.

### `npm.cmd run build`

Result:

- Failed immediately because env validation required missing `CLERK_SECRET_KEY` and `WEBHOOK_SECRET`.

### `npm.cmd run build` with dummy env values

Result:

- Failed because `next/font/google` could not fetch Inter under restricted network.

Interpretation:

- TypeScript compilation alone is not enough. Lint/test/build currently block a production-quality release.

### Python checks

Attempted:

- `python.exe`
- `py -3`

Result:

- Blocked by local Windows access errors.

## 13. What Is Good

The repo has a strong foundation:

- The schema models curriculum, questions, attempts, mastery, events, prerequisites, and embeddings.
- Server-side answer validation exists for `/api/quiz/submit`.
- `correctAnswer` is not directly returned by the main quiz question query.
- V2 content display works conceptually through `StaticContentPanel`.
- FSRS is integrated at the code level.
- Clerk webhook signature verification exists.
- The generated content files are much more complete than the old summary suggested.
- The project already has tests for mastery and spaced repetition.
- The UI direction is clean and focused.

## 14. FAANG-Level Target Architecture

To make this product genuinely scalable and reliable, move toward this architecture:

### 14.1 Request layer

- Clerk-protected routes by default.
- Central `requireUser()` helper.
- Zod validation at every API boundary.
- Idempotency keys for quiz submissions.
- Structured response helpers.
- API logging with request IDs.

### 14.2 Data layer

- Drizzle migrations kept in lockstep with schema.
- Explicit `vector` extension migration.
- HNSW indexes verified.
- Chunk-level content embeddings.
- Strict DB constraints for question/subtopic relationships.
- Optional PostgreSQL RLS or equivalent tenant safety.

### 14.3 Learning engine

- One canonical quiz submission route.
- Failure mode classification stored with every attempt.
- FSRS retrievability computed explicitly.
- Mastery recomputed from attempt history or durable events, not only latest batch.
- Review queue query optimized for user + due date.

### 14.4 AI layer

- RAG retrieves from verified/chunked V2 content.
- Prompt injection defenses.
- AI output evals and schema validation before display when structured.
- Model/provider abstraction.
- Cost budget and rate limit fail-closed behavior for production.
- AI traces with redaction.

### 14.5 Ingestion layer

- Idempotent, resumable scripts.
- Dry-run mode that actually works.
- Separate structure, content, question, embedding, and graph validation steps.
- Content status lifecycle:
  - `PENDING_REVIEW`
  - `AI_GENERATED`
  - `AUTO_VALIDATED`
  - `EXPERT_VERIFIED`
  - `FLAGGED`
- Graph validation:
  - orphan IDs,
  - cycle detection,
  - topological checks,
  - prerequisite coverage per subtopic.

### 14.6 Observability

- Log every quiz submission, failure mode, remediation start/completion, and review completion.
- Track:
  - AI latency,
  - AI token/cost usage,
  - DB latency,
  - quiz abandonment,
  - remediation success,
  - near-transfer pass rate,
  - review retention.
- Add dashboards and alerts before launch.

## 15. Execution Plan

### Phase 1: Make it secure and buildable

1. Remove all auth mocks.
2. Implement Clerk route protection.
3. Fix env variable mismatch.
4. Regenerate Drizzle migrations.
5. Make `npm run lint`, `npm test`, and `npm run build` pass.

### Phase 2: Make data ingestion real

1. Fix Python runtime access.
2. Fix `push_content_v2.py --dry-run`.
3. Seed all 455 syllabus subtopics.
4. Identify and generate the one missing content subtopic.
5. Push V2 content as `AI_GENERATED`, not `VERIFIED`.
6. Build chunk-level embeddings.
7. Validate graph edge count and coverage.

### Phase 3: Make the diagnostic loop real

1. Add option switch telemetry to active quiz UI.
2. Classify each wrong answer in `/api/quiz/submit`.
3. Store failure mode and activated misconception.
4. Return attempt IDs and remediation metadata.
5. Make remediation load context from attempts, not client-provided diagnosis.
6. Implement near-transfer questions.

### Phase 4: Make RAG trustworthy

1. Use V2 content columns in `buildTeachingContext`.
2. Add chunk retrieval.
3. Use graph + vector + exact concept tags.
4. Add prompt-injection boundaries.
5. Add AI output evals and content provenance.

### Phase 5: Make it scalable

1. Add idempotency keys.
2. Move non-critical post-submit work to `waitUntil()` or durable queue.
3. Add caching for curriculum and AI responses.
4. Add production observability.
5. Add load tests for quiz submission and review queue.

## 16. Bottom Line

NeuralJEE has the bones of an excellent cognitive tutor, but it is not yet production-safe or FAANG-level.

The biggest issue is not missing ambition. It is integration integrity:

- Auth is partial.
- Migrations are stale.
- RAG does not use the flagship V2 textbook content.
- The diagnostic router is not wired into the real quiz flow.
- The ingestion scripts and docs disagree with the actual data.
- Build/lint/test are not green.

The next correct move is to stop adding new features and stabilize the core loop:

real user -> protected app -> real curriculum -> safe quiz -> server grading -> failure mode stored -> FSRS updated -> targeted remediation -> review scheduled.

Once that loop is correct, the product becomes worth scaling.
