# NeuralJEE Code Change Audit - 2026-08-29

This file is the code-level follow-up to the broader architecture audit. It focuses on actual implementation problems: mocks, AI-generated shortcuts, brittle workarounds, missing validation, inefficient paths, and places where the code does not yet match the NeuralJEE product thesis.

I reviewed the first-party Next.js app, API routes, database schema/query layer, RAG/AI layer, quiz/mastery logic, Python ingestion scripts, config, tests, and generated-data structure. Large generated assets such as PDFs, diagram images, and generated textbook JSON were audited by structure/counts rather than line-by-line prose review, because the code risk is in the producers/consumers and validation gates.

## Verification Snapshot

Commands run during the audit:

- `npm run lint`: fails with 27 errors and 8 warnings.
- `npm test`: fails 1 unit test in `tests/unit/spaced-rep.test.ts`.
- `tsc --noEmit`: passes.
- `npm run build`: fails because required env vars are missing, then fails on Google font fetch when dummy envs are supplied in the restricted environment.
- Python scripts could not be executed from this machine session because `python.exe` and `py -3` were blocked by OS access errors.

Generated data facts verified locally:

- `python/data/content_v2`: 78 JSON files, 454 generated subtopics, 1816 valid pages.
- Syllabus source: 455 unique subtopics.
- Missing generated subtopic: `Mathematics | Conic Sections | Hyperbola | Tangent and Normal to Hyperbola`.
- `python/data/prerequisite_edges.json`: 940 unique edges, not the older claimed 3,762.
- `public/diagrams`: 3288 image files.

## P0 - Security, Data Isolation, and Secret Handling

### 1. Remove all mocked auth from production code

Files:

- `src/app/(app)/layout.tsx:1`
- `src/app/(app)/review/page.tsx:2`
- `src/app/api/progress/route.ts:6`
- `src/app/api/curriculum/route.ts:1`
- `src/app/api/ai/quiz/route.ts:20`
- `mock_auth.py`
- `python/ingest/seed_mock_user.py`

Current problem:

Several routes and server components define or inject `const auth = () => ({ userId: 'test-user-123' })`. This is the single most dangerous code path in the project. It breaks user isolation, corrupts progress data, and makes any production deployment invalid.

Why it matters:

Every personalized system in NeuralJEE depends on a correct user identity: FSRS state, mastery, attempts, remediation history, and review scheduling. A fake shared user makes the cognitive model meaningless.

Required change:

- Replace every local mock with `auth()` from `@clerk/nextjs/server`.
- Create one shared helper, for example `requireUserId()`, that returns a Clerk user id or throws a consistent unauthorized response.
- Delete or quarantine `mock_auth.py`; it should never patch source files.
- Move demo/test users into explicit test fixtures, never production code.

### 2. Rotate the leaked database credential immediately

File:

- `python/ingest/seed_mock_user.py`

Current problem:

The file contains a hardcoded live Neon PostgreSQL connection string with credentials.

Why it matters:

The credential should be considered compromised once it exists in source. Even if the repo is local today, it can leak through git history, logs, screenshots, backups, or future pushes.

Required change:

- Rotate the Neon password now.
- Replace the string with `DATABASE_URL` loaded from environment.
- Add a secret-scanning gate such as `gitleaks` or GitHub secret scanning before commits.
- Add a test or CI check that fails on `postgresql://`, `postgres://`, `sk-`, `AIza`, and Clerk secret patterns in tracked source.

### 3. Enforce real route protection in `src/proxy.ts`

File:

- `src/proxy.ts`

Current problem:

The proxy handler accepts `request: any` and returns `NextResponse.next()` for everything. It does not protect application routes or APIs.

Why it matters:

The app uses Next.js 16, where `proxy.ts` replaces old `middleware.ts`. The local Next docs state proxy should perform lightweight request checks before application code runs. Today, the file gives the appearance of security but enforces none.

Required change:

- Use Clerk's server-side proxy/middleware integration for protected app and API paths.
- Keep proxy lightweight: auth checks and redirects only.
- Remove `any`; type the request as `NextRequest`.
- Exclude public/static paths explicitly.

### 4. Fix webhook secret naming mismatch

Files:

- `src/env.ts`
- `.env.example`
- `src/app/api/webhooks/clerk/route.ts`

Current problem:

`src/env.ts` validates `WEBHOOK_SECRET`, while `.env.example` and the route use `CLERK_WEBHOOK_SECRET`.

Why it matters:

The build fails before runtime, and the failure message points developers toward the wrong variable. This is a classic production-readiness leak: the secure path exists but is wired incorrectly.

Required change:

- Pick one variable name, preferably `CLERK_WEBHOOK_SECRET`.
- Validate that exact variable in `src/env.ts`.
- Use the same name in docs, examples, Vercel settings, and webhook code.

## P0 - Build and Runtime Correctness

### 5. Stop importing runtime env validation in `next.config.ts`

Files:

- `next.config.ts`
- `src/env.ts`

Current problem:

`next.config.ts` imports `./src/env.ts`, forcing server runtime secrets to exist while loading Next config.

Why it matters:

This makes builds fail in contexts that do not need runtime secrets yet, and it couples configuration loading to app execution secrets. It also makes preview/build diagnostics noisy.

Required change:

- Keep Next config pure.
- Move runtime env validation to server-only modules used by API handlers and DB/AI clients.
- Optionally create separate `env.build.ts` and `env.server.ts` if build-time and runtime variables differ.

### 6. Replace placeholder DB and AI clients with fail-fast factories

Files:

- `src/lib/db/client.ts`
- `src/lib/ai/client.ts`

Current problem:

The DB client falls back to a placeholder Postgres URL. The Gemini client falls back to `placeholder_for_build`.

Why it matters:

Placeholders hide real misconfiguration. They let the app start or build in a fake-good state and then fail later inside user-facing routes.

Required change:

- Use `server-only` modules for DB and AI clients.
- Throw a clear configuration error when required env vars are missing.
- For build tooling that must import modules without secrets, split types/constants away from live clients.

### 7. Fix Google font build fragility

File:

- `src/app/layout.tsx`

Current problem:

The build attempts to fetch Inter from Google through `next/font/google`. In restricted or offline build environments this fails.

Why it matters:

Production CI should be deterministic. A font fetch should not decide whether the app can build.

Required change:

- Vendor the font and use `next/font/local`, or allow the build environment reliable network access.
- Keep font loading out of the critical path for backend verification.

## P0 - Database Schema and Migration Drift

### 8. Bring Drizzle migration SQL back in sync with `schema.ts`

Files:

- `src/lib/db/schema.ts`
- `drizzle/migrations/0000_amused_ink.sql`

Current problem:

The TypeScript schema uses modern fields such as `fsrs_state` JSON and vector indexes. The migration still contains older columns such as `fsrs_stability`, `fsrs_difficulty`, and `fsrs_retrievability`, and does not match the current schema shape.

Why it matters:

If a new database is created from migrations, it will not match the application code. This causes runtime failures that TypeScript cannot catch.

Required change:

- Generate a fresh migration from the current schema.
- Add a migration test that creates a temporary database/schema and verifies all app queries compile/run.
- Treat migrations as the source of deployment truth, not just `schema.ts`.

### 9. Add pgvector extension creation to migrations

File:

- `drizzle/migrations/0000_amused_ink.sql`

Current problem:

The migration does not explicitly create the `vector` extension.

Why it matters:

The schema depends on pgvector. A clean Neon branch may fail to apply vector columns or indexes unless the extension already exists.

Required change:

- Add `CREATE EXTENSION IF NOT EXISTS vector;` before vector columns/indexes.
- Add deployment docs confirming extension availability on Neon.

### 10. Decide and enforce Row Level Security

Files:

- `drizzle/meta/0000_snapshot.json`
- `src/lib/db/schema.ts`

Current problem:

The migration snapshot indicates RLS is disabled. The app relies entirely on application code to isolate student data.

Why it matters:

For a high-scale educational product with sensitive student performance data, application-only isolation is a single layer of defense. One missed `where userId = ...` becomes a data leak.

Required change:

- Enable RLS for student-owned tables if direct database roles can be scoped safely.
- At minimum, create a policy decision document explaining why RLS is or is not used with Neon/Drizzle/serverless.
- Add query tests that prove every student-owned query includes user isolation.

## P0 - Quiz Submission and Cognitive Diagnostics

### 11. Make `/api/quiz/submit` idempotent

File:

- `src/app/api/quiz/submit/route.ts`

Current problem:

The submit route writes attempts and mastery synchronously without an idempotency key.

Why it matters:

Mobile retries, browser double-clicks, network retries, and Vercel replays can duplicate attempts and distort FSRS/mastery.

Required change:

- Require a client-generated `submissionId`.
- Add a unique database constraint on `(student_id, submission_id)`.
- Return the existing result on duplicate submissions.

### 12. Verify submitted question ownership

File:

- `src/app/api/quiz/submit/route.ts`

Current problem:

The route accepts a `subtopicId` plus arbitrary question ids but does not prove every question belongs to that subtopic before scoring.

Why it matters:

A malformed or malicious client can submit unrelated question ids, poisoning mastery for the wrong topic.

Required change:

- Query questions by `id IN (...) AND subtopic_id = submittedSubtopicId`.
- Reject the whole submission if any submitted question is missing or mismatched.

### 13. Store the diagnostic failure fields on attempts

Files:

- `src/app/api/quiz/submit/route.ts`
- `src/lib/mastery/algorithm.ts`
- `src/lib/db/schema.ts`

Current problem:

The schema has fields such as `detectedFailureMode`, `activatedMisconceptionId`, and `remediationTriggered`, but the submit route does not compute/store them.

Why it matters:

This is the core NeuralJEE differentiator. Without persisted failure-mode data, the platform becomes an ordinary quiz tracker.

Required change:

- Call `classifyFailureMode` per incorrect attempt.
- Persist the result on `question_attempts`.
- Persist the misconception/prerequisite trap when activated.
- Emit a learning event containing the diagnostic result.

### 14. Capture option switching on the real quiz UI

Files:

- `src/components/quiz/QuizPresenter.tsx`
- `src/components/quiz/QuizContainer.tsx`

Current problem:

The backend model expects option-switch telemetry, but the active UI only submits selected answer and time spent.

Why it matters:

The failure classifier cannot distinguish indecision, formula confusion, guessing, and careful incorrect work without behavior telemetry.

Required change:

- Track first selection, final selection, number of option changes, and answer clear events.
- Submit `optionSwitchCount` per answer.
- Store this telemetry in `question_attempts`.

### 15. Consolidate duplicate quiz evaluation logic

Files:

- `src/app/api/quiz/submit/route.ts`
- `src/app/api/quiz/evaluate/route.ts`
- `src/lib/quiz/QuizEngine.ts`

Current problem:

There are multiple scoring/evaluation paths. `/api/quiz/evaluate` has failure-mode logic, `/api/quiz/submit` has persistence, and `QuizEngine` contains unused/hardcoded behavior.

Why it matters:

Multiple paths drift. The student may see one result while the database stores another.

Required change:

- Create one server-side quiz domain service, for example `evaluateSubmission()`.
- Make both API routes call that service, or delete the unused route.
- Move placeholder UI-side engine code into tests or remove it.

### 16. Add full question type support

File:

- `src/app/api/quiz/evaluate/route.ts`

Current problem:

Answer validation handles MCQ, numerical, and integer style checks, but does not fully support MSQ/multiple-correct patterns even though JEE uses them.

Why it matters:

JEE Advanced behavior is not accurately modeled without multi-select correctness, partial marking decisions, and negative marking rules.

Required change:

- Add explicit validation for MCQ, MSQ, INTEGER, NUMERICAL.
- Add marking-scheme support per question.
- Store raw answer shape in a typed JSON column or strongly typed attempt field.

### 17. Replace brittle failure-mode heuristics with calibrated rules

File:

- `src/lib/mastery/algorithm.ts`

Current problem:

The classifier uses hard-coded thresholds such as `timeSpentSeconds < 15` for guessing and uses `lapses > 0` as a proxy for low retrievability.

Why it matters:

The product claims precise cognitive diagnosis. Hard-coded thresholds are acceptable for v0, but they should be versioned, measured, and calibrated.

Required change:

- Move thresholds into a versioned diagnostic config.
- Store `diagnosticVersion` on attempts/events.
- Use actual FSRS retrievability where available, not inferred lapses.
- Add tests for all 7 failure modes and edge cases.

### 18. Fix the failing FSRS test or implementation mismatch

Files:

- `src/lib/mastery/spaced-rep.ts`
- `tests/unit/spaced-rep.test.ts`

Current problem:

`npm test` fails because a score of 30 does not increment `lapses` as the test expects.

Why it matters:

The memory engine is a core product promise. Tests and implementation must agree on the rating boundary.

Required change:

- Decide whether 30 means `Again` or `Hard`.
- Update the score-to-rating mapping or the test.
- Add boundary tests for 0, 30, 31, 60, 61, 85, 86, and 100.

## P0 - RAG and Tutor Grounding

### 19. Make `/api/ai/teach` actually use vector retrieval

Files:

- `src/app/api/ai/teach/route.ts`
- `src/lib/rag/retrieve.ts`

Current problem:

`retrieveContextForSubtopic(subtopicId)` is called without query text, so the vector retrieval branch does not execute.

Why it matters:

The route claims hybrid RAG but currently uses mostly structural context. That is weaker and can miss the most relevant explanation.

Required change:

- Pass the student's question or teaching objective as `queryText`.
- Use vector results to select contextual chunks.
- Log retrieval metadata for evaluation.

### 20. Stop building tutor prompts from stale `rawContent`

File:

- `src/lib/rag/context-builder.ts`

Current problem:

The prompt builder reads `targetSubtopic.rawContent` instead of the V2 fields: `contentFoundation`, `contentDeepConcepts`, `contentFormulas`, and `contentPractice`.

Why it matters:

The generated 4-page textbook content exists, but the tutor path may ignore it.

Required change:

- Build context from the 4 progressive pages.
- Select pages based on intent: foundation for prerequisite gaps, formulas for formula confusion, practice for procedural errors.
- Keep `rawContent` only as a legacy fallback, if it remains in schema.

### 21. Add chunk-level retrieval

Files:

- `src/lib/db/schema.ts`
- `src/lib/rag/retrieve.ts`
- `python/ingest/push_content_v2.py`

Current problem:

Embeddings appear to be stored at the subtopic/page level, not at fine-grained chunks.

Why it matters:

A JEE subtopic page can be long and multi-concept. One vector for a huge page is too coarse for precise RAG and wastes prompt tokens.

Required change:

- Add `content_chunks` with `subtopic_id`, `page_type`, `chunk_index`, `text`, `concept_tags`, `embedding`, and provenance.
- Retrieve top chunks, not whole blobs.
- Keep page-level summaries for fast overview prompts.

### 22. Do not send correct answers into remediation prompts by default

File:

- `src/app/api/ai/remediate/route.ts`

Current problem:

The remediation route includes the correct answer in the prompt.

Why it matters:

The Socratic tutor should remediate without giving away the answer too early. Including the answer increases leakage risk.

Required change:

- Send the correct answer only to a hidden evaluator step if needed.
- Prompt the tutor with the student's selected answer, failure mode, misconception, and relevant context.
- Add a policy: never reveal final answer until the student has attempted the guided step.

### 23. Fix streaming JSON misuse in AI routes

Files:

- `src/app/api/ai/teach/route.ts`
- `src/app/api/ai/remediate/route.ts`

Current problem:

Routes stream model text to the client and then attempt full JSON parsing/validation after the stream has already been emitted.

Why it matters:

Once invalid JSON is streamed, server-side validation is too late. The client receives malformed or untrusted output.

Required change:

- Use either structured non-streaming JSON with schema validation, or stream newline-delimited events with typed event envelopes.
- Validate before sending when the client expects JSON.
- For tutor text streams, stream plain text/markdown and do not pretend the route returns JSON.

### 24. Ground `/api/ai/doubt` in curriculum context

File:

- `src/app/api/ai/doubt/route.ts`

Current problem:

The route accepts `subtopicId` but ignores it and does not retrieve curriculum context.

Why it matters:

An ungrounded doubt solver can hallucinate, teach off-syllabus methods, or ignore the student's current weakness.

Required change:

- If `subtopicId` is present, retrieve V2 content/chunks and prerequisite context.
- If absent, classify the doubt into candidate subtopics before answering.
- Add citations/provenance to internal logs and optionally to the student UI.

### 25. Whitelist question fields returned to clients

File:

- `src/lib/db/queries/questions.ts`

Current problem:

The query strips only a few fields such as `correctAnswer`, but returns the rest object. This can leak explanations, trap metadata, misconception tags, or future scoring details.

Why it matters:

For quizzes, accidental leakage destroys assessment validity.

Required change:

- Return an explicit public question DTO with only id, prompt, options, type, marks, diagrams, and display metadata.
- Keep explanation, correct answer, traps, and embeddings server-only.
- Add a unit test that fails if private fields appear in the public payload.

## P1 - Async Processing and Reliability

### 26. Use a durable job queue for post-submit work

File:

- `src/app/api/quiz/submit/route.ts`

Current problem:

The route does all FSRS, mastery, attempt logging, and revalidation synchronously.

Why it matters:

This can slow the UI and makes retries harder. Next's `after()` can help with after-response work, but it is not a durable queue guarantee.

Required change:

- Return the immediate scoring result synchronously.
- Move non-critical analytics and remediation-prep jobs to a durable queue such as Inngest, Trigger.dev, QStash, or a small Postgres job table.
- Use Next `after()` only for best-effort after-response work.

### 27. Add transactional boundaries and retry strategy

Files:

- `src/app/api/quiz/submit/route.ts`
- `src/lib/db/queries/mastery.ts`

Current problem:

The route updates multiple tables, but there is no explicit retry/idempotency strategy around transient serverless database failures.

Why it matters:

Serverless Postgres connections can fail transiently. Without safe retry and idempotency, retries can duplicate writes.

Required change:

- Use one transaction for authoritative attempt/mastery writes.
- Add idempotency first.
- Retry only safe transaction blocks.
- Avoid `revalidatePath` in the critical submit path unless the stale UI problem is proven.

### 28. Rework rate limiting from fail-open to environment-aware

File:

- `src/lib/rate-limit/index.ts`

Current problem:

Rate limiting fails open if Redis is missing or errors.

Why it matters:

For AI routes, fail-open can become a cost and abuse incident.

Required change:

- In production, fail closed or degrade to a stricter in-memory limiter per instance.
- In development, allow fail-open with a clear log.
- Add separate limits for tutor, quiz generation, doubt solving, and ingestion/admin APIs.

### 29. Use existing cache utilities for expensive AI paths

Files:

- `src/lib/cache/redis.ts`
- `src/lib/db/schema.ts`
- `src/app/api/ai/*.ts`

Current problem:

The cache helper and `content_cache` table exist but are not meaningfully used in AI routes.

Why it matters:

Repeated teaching/remediation prompts for the same subtopic can be expensive and slow.

Required change:

- Cache stable textbook-derived summaries.
- Cache embedding results by content hash.
- Do not cache personalized tutoring output unless it is keyed by user, subtopic, failure mode, and prompt version.

## P1 - Python Ingestion Pipeline

### 30. Delete the "always valid" validation workaround

File:

- `python/ingest/validate_content.js:30`

Current problem:

The validator returns `valid: true` unconditionally "to unblock pipeline".

Why it matters:

This is explicit AI-fluff/workaround code. It makes the quality gate meaningless and can push bad curriculum into production.

Required change:

- Implement real schema validation with Zod/Ajv.
- Validate required pages, minimum length, LaTeX sanity, source/provenance fields, and forbidden hallucination markers.
- Fail the pipeline on invalid content unless explicitly running in a marked quarantine mode.

### 31. Fix `push_content_v2.py` dry-run crash

File:

- `python/ingest/push_content_v2.py`

Current problem:

The script calls `conn.cursor()` before checking dry-run behavior. The dry-run path passes `None`, so it can crash before doing useful validation.

Why it matters:

Dry-run should be the safest way to validate a massive ingestion job before touching production.

Required change:

- Split validation and database write phases.
- In dry-run, parse files, validate schema, estimate rows, and report changes without opening a cursor.
- Add a small fixture test for dry-run.

### 32. Do not mark generated content `VERIFIED` on ingest

File:

- `python/ingest/push_content_v2.py`

Current problem:

The script marks generated AI content as verified during push.

Why it matters:

"Generated" and "human/automated verified" are different trust states. The tutor should know what content has passed quality checks.

Required change:

- Use statuses such as `GENERATED`, `AUTO_VALIDATED`, `HUMAN_REVIEWED`, `VERIFIED`.
- Promote status only after validation/review gates pass.
- Store validator version and review timestamp.

### 33. Replace old seed path with V2 content path

File:

- `python/ingest/seed_full_curriculum.py`

Current problem:

The script reads older content paths/fields instead of the `content_v2` page model.

Why it matters:

The database seed path can populate stale or incomplete fields even though the V2 content exists locally.

Required change:

- Make `content_v2` the authoritative source.
- Seed all four content page columns.
- Seed embeddings/chunks in the same run or in a deterministic follow-up job.

### 34. Remove fallback correct answer "A" in PDF parser

File:

- `python/ingest/parse_pdf_questions.py`

Current problem:

When an answer cannot be extracted, the parser falls back to option A.

Why it matters:

Wrong answer keys poison mastery, remediation, and student trust.

Required change:

- Mark missing-answer questions as `NEEDS_REVIEW`.
- Do not insert them into active quiz pools.
- Track extraction confidence and answer-source provenance.

### 35. Stop logging full model responses from question extraction

File:

- `python/ingest/parse_pdf_questions.py`

Current problem:

The script prints full Gemini responses.

Why it matters:

This bloats logs and can expose copyrighted extracted content or answer keys in terminal logs.

Required change:

- Log only counts, ids, confidence, and errors.
- Save detailed extraction artifacts to controlled files when debug mode is enabled.

### 36. Remove hardcoded Vertex project fallback

File:

- `python/ingest/parse_pdf_questions.py`

Current problem:

The script contains a hardcoded Vertex project fallback.

Why it matters:

Production ingestion should be portable across environments and should not silently bill the wrong cloud project.

Required change:

- Require `GOOGLE_CLOUD_PROJECT` or explicit CLI argument.
- Fail fast if missing.
- Print the active project id before any paid operation.

### 37. Expand PYQ standardization to all 7 failure modes

File:

- `python/ingest/standardize_tags.py`

Current problem:

The standardization script maps fewer failure modes than the application model claims.

Why it matters:

If the offline tags and runtime classifier disagree, remediation prompts become inconsistent.

Required change:

- Use the same enum source across Python and TypeScript.
- Add a generated JSON schema or shared constants file.
- Validate every tagged PYQ against the full 7-mode taxonomy.

### 38. Validate prerequisite graph quality after AI generation

Files:

- `python/ingest/generate_prerequisites.py`
- `python/ingest/translate_edges.py`
- `python/data/prerequisite_edges.json`

Current problem:

The graph generation relies heavily on model output and current verified count is 940 edges, while docs still mention 3,762.

Why it matters:

The DAG drives prerequisite remediation. Missing, cyclic, or stale edges cause wrong tutoring paths.

Required change:

- Add deterministic graph validation: no cycles, no missing ids, no self-loops, coverage per subtopic, max/min edge thresholds.
- Store generation version and model used.
- Update docs to the verified edge count or regenerate the graph if 3,762 was expected.

### 39. Quarantine paid-token smoke scripts

File:

- `python/ingest/test_vertex.py`

Current problem:

This script can execute paid model calls and appears beside normal ingestion utilities.

Why it matters:

It is too easy to run accidentally.

Required change:

- Move it under `python/ingest/devtools/` or delete it.
- Require an explicit `--spend-token` flag.
- Print estimated cost/risk before execution.

## P1 - Frontend Correctness and Product Integrity

### 40. Replace fake header user UI with Clerk UI

File:

- `src/components/layout/Header.tsx`

Current problem:

The header shows a fake `TU` user indicator.

Why it matters:

The app visually implies a logged-in user without being connected to real identity state.

Required change:

- Use Clerk `UserButton` or a server-provided user profile.
- Show loading/unauthenticated states consistently.

### 41. Fix dashboard heatmap data shape

Files:

- `src/components/dashboard/MasteryHeatmap.tsx`
- `src/app/api/progress/route.ts`
- `src/lib/db/queries/mastery.ts`

Current problem:

The heatmap expects display fields such as subtopic names, but the progress API appears to return mastery rows without guaranteed joined names.

Why it matters:

The dashboard cannot be a reliable cognitive map if the displayed labels are missing or stale.

Required change:

- Return a typed dashboard DTO from the API.
- Join subtopic names/chapter/subject server-side.
- Add empty/error/loading states that do not mask backend failure.

### 42. Do not hide most curriculum subtopics on learn page

File:

- `src/app/(app)/learn/page.tsx`

Current problem:

The UI shows only `subtopics.slice(0, 3)` per chapter.

Why it matters:

This hides most of the 455-subtopic curriculum and makes the product look incomplete.

Required change:

- Add expansion, search, filters, or paginated chapter detail.
- Show progress summary while keeping the list scannable.

### 43. Remove mojibake and broken Unicode from UI source

Files:

- Multiple TSX and docs files, especially `src/components/learn/StaticContentPanel.tsx`

Current problem:

Several files contain broken mojibake sequences such as corrupted arrows and emoji.

Why it matters:

Broken characters in UI are visible product quality defects.

Required change:

- Normalize files to UTF-8.
- Replace decorative emoji with lucide icons where appropriate.
- Keep UI source mostly ASCII unless the product intentionally needs Unicode.

### 44. Harden Mermaid rendering

File:

- `src/components/learn/DiagramRenderer.tsx`

Current problem:

The component uses loose Mermaid security settings, `dangerouslySetInnerHTML`, `Math.random` ids, arbitrary timeout rendering, and an unused ref.

Why it matters:

Rendering user- or AI-produced diagram text can become an XSS or stability problem.

Required change:

- Use strict Mermaid security settings unless diagrams are fully trusted.
- Use React `useId()` or stable deterministic ids.
- Remove arbitrary timeout and render on deterministic content changes.
- Sanitize SVG output or limit diagram syntax.

### 45. Add accessibility semantics to content tabs

File:

- `src/components/learn/StaticContentPanel.tsx`

Current problem:

The tabs are visual buttons without complete tablist/tab/tabpanel relationships.

Why it matters:

High-quality education software needs keyboard and screen-reader usability.

Required change:

- Add `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, and matching panels.
- Preserve focus behavior across tab changes.

### 46. Fix quiz render purity issues

File:

- `src/components/quiz/QuizPresenter.tsx`

Current problem:

Lint flags `Date.now()` during render and state reset inside effects.

Why it matters:

React 19 compiler/purity rules expect render to be deterministic. Violations can cause subtle UI bugs.

Required change:

- Initialize timing in event handlers or refs.
- Reset state at question transition boundaries through keyed components or reducers.
- Add tests for timer and answer transitions.

### 47. Remove unused alternate quiz/tutor components or wire them properly

Files:

- `src/lib/quiz/QuizEngine.ts`
- `src/components/quiz/NumericalQuestion.tsx`
- `src/components/quiz/SocraticTutor.tsx`

Current problem:

These files contain hardcoded text, placeholder callbacks, inconsistent visual language, and behavior not wired into the main flow.

Why it matters:

Dead/parallel UI paths confuse future work and make it easy to ship the wrong flow.

Required change:

- Either wire them into the real quiz/remediation flow or move them to prototypes.
- Remove hardcoded responses and fake "transfer test" behavior.
- Align styling with the app design system.

### 48. Fix doubt page streaming robustness

File:

- `src/app/(app)/doubt/page.tsx`

Current problem:

The client does not consistently check HTTP status before streaming, has no abort controller, can double-submit, and keys messages by array index.

Why it matters:

Tutor chat must feel reliable under slow AI responses, cancellations, and errors.

Required change:

- Disable submit while streaming.
- Use `AbortController`.
- Check `response.ok` before reading the stream.
- Give messages stable ids.

### 49. Remove unimplemented claims from landing page

File:

- `src/app/page.tsx`

Current problem:

The landing page claims features such as adaptive difficulty, negative marking, and wrong-answer book behavior that are not fully implemented.

Why it matters:

Product copy should not outrun system behavior, especially for an education product making strong performance claims.

Required change:

- Either implement the claims or mark them as upcoming/internal.
- Make the authenticated app the primary experience.
- Avoid `new Date()` in render if lint/purity rules apply.

## P1 - Data Access and Query Efficiency

### 50. Replace `SELECT *` in vector retrieval

File:

- `src/lib/rag/retrieve.ts`

Current problem:

Vector retrieval selects broad rows and computes similarity in-line.

Why it matters:

Wide row reads waste bandwidth and memory, especially when content fields are large.

Required change:

- Select only ids, titles, short summaries, page identifiers, and similarity score in the retrieval step.
- Fetch full content only for final selected chunks.
- Add query timing logs in development.

### 51. Use safe vector parameterization helpers

File:

- `src/lib/rag/retrieve.ts`

Current problem:

The query builds a vector literal string for similarity search.

Why it matters:

Embedding arrays are generated internally, so the injection risk is lower than raw user strings, but production-grade code should still avoid hand-built SQL literals where possible.

Required change:

- Use Drizzle/pgvector helper patterns if available.
- Validate embedding length exactly 768 before querying.
- Keep all user text out of raw SQL fragments.

### 52. Add server DTO boundaries

Files:

- `src/lib/db/queries/*.ts`
- `src/app/api/**/*.ts`

Current problem:

Several routes pass database rows or lightly modified rows directly to clients.

Why it matters:

Database models contain private fields, internal statuses, embeddings, and future fields that should not become public API by accident.

Required change:

- Define explicit DTO builders for dashboard, quiz, learn, remediation, and review APIs.
- Unit test DTOs for field leaks.
- Keep DB schema types internal to the server.

## P2 - Testing Gaps

### 53. Add API route tests

Files:

- `src/app/api/**/*.ts`
- `tests/**`

Current problem:

Tests cover some algorithm code but not the API behavior that protects data and drives the product.

Why it matters:

The most dangerous bugs are in route auth, payload validation, private-field leakage, and persistence.

Required change:

- Test unauthorized requests return 401.
- Test question DTOs do not leak answers.
- Test quiz submit rejects mismatched question/subtopic ids.
- Test duplicate submission idempotency.

### 54. Add RAG golden tests

Files:

- `src/lib/rag/*.ts`
- `tests/**`

Current problem:

No tests prove that the tutor receives the right page/chunk/prerequisite context.

Why it matters:

The platform's tutor quality depends on retrieval quality.

Required change:

- Create a small fixture syllabus with prerequisite edges and chunks.
- Verify prerequisite traversal.
- Verify the prompt uses V2 page content and excludes unrelated content.

### 55. Add ingestion fixture tests

Files:

- `python/ingest/*.py`
- `python/data/content_v2/*.json`

Current problem:

The ingestion pipeline handles high-value generated content but lacks executable fixture tests in this environment.

Why it matters:

Bad ingestion silently contaminates the whole tutor and quiz system.

Required change:

- Add small local fixture JSON files.
- Test dry-run, validation, missing-answer handling, status transitions, and graph validation.
- Run these in CI with no paid API calls.

## P2 - Tooling and Repo Hygiene

### 56. Fix ESLint scope for utility scripts

Files:

- `eslint.config.mjs`
- `python/ingest/validate_content.js`

Current problem:

The JS validator is linted under frontend TypeScript rules and fails for CommonJS `require`.

Why it matters:

Lint should catch real code quality issues, not drown the signal in tooling mismatch.

Required change:

- Convert the validator to ESM, or add a scoped lint override for Node utility scripts.
- Keep the validation logic real; do not ignore the file just to hide errors.

### 57. Narrow TypeScript project boundaries

File:

- `tsconfig.json`

Current problem:

`allowJs: true` and broad includes can pull unintended files into the TypeScript project.

Why it matters:

Large repos need clear compiler boundaries so app code, scripts, and tests do not accidentally affect each other.

Required change:

- Disable `allowJs` unless needed.
- Use separate configs for app, tests, and scripts if necessary.
- Keep generated files out of the app compiler scope.

### 58. Update Python requirements to match actual embedding architecture

File:

- `python/ingest/requirements.txt`

Current problem:

The requirements still mention/local-support embedding dependencies that do not match the current Gemini embedding flow.

Why it matters:

Dependency drift slows setup and can create conflicting code paths.

Required change:

- Separate runtime ingestion dependencies from optional local-embedding experiments.
- Pin versions for reproducibility.
- Document required environment variables.

## P2 - Product/Architecture Additions Worth Building

### 59. Add a curriculum/content admin review surface

Current gap:

The system generates content but has no first-class review workflow for humans or automated validators.

Why it matters:

For exam-prep trust, every explanation, formula, and answer key needs provenance and status.

Recommended build:

- Internal admin page for content status, validator warnings, source links, and diff history.
- Per-page approval: Foundation, Deep Concepts, Formulas, Practice.
- Block unverified content from high-stakes tutor flows.

### 60. Add observability for cognitive decisions

Current gap:

There is no clear trace that explains why a student got a review, a failure mode, or a remediation prompt.

Why it matters:

When parents/students ask "why am I reviewing this?", the system should answer with evidence.

Recommended build:

- Store diagnostic traces with version, input signals, thresholds, FSRS state, and selected remediation plan.
- Add admin/dev viewer for one student's learning event timeline.
- Track model, prompt version, retrieval ids, and latency for AI calls.

### 61. Add model/provider abstraction with policy controls

Current gap:

AI code is directly coupled to provider clients and model names.

Why it matters:

Model availability, cost, safety, and quality will change. A production tutor needs controlled switching.

Recommended build:

- Central model registry: purpose, provider, model id, max tokens, cost tier, JSON capability, streaming capability.
- Prompt versioning and evaluation fixtures.
- Provider timeout/retry/circuit-breaker policy.

### 62. Add a safety layer for student-facing AI

Current gap:

The tutor prompts exist, but there is no explicit safety/moderation boundary around student input or model output.

Why it matters:

Students may ask off-topic, self-harm, abuse, cheating, or prompt-injection questions. The tutor must respond safely and remain curriculum-bound.

Recommended build:

- Input classification before tutor routes.
- Output guardrails for answer leakage, unsafe content, and off-syllabus claims.
- Prompt-injection tests against RAG context.

### 63. Add experiment/version control for algorithms

Current gap:

FSRS and diagnostic changes are not clearly versioned in persisted data.

Why it matters:

If mastery scores change after an algorithm update, you need to explain and migrate them.

Recommended build:

- Store `fsrsSchedulerVersion`, `masteryAlgorithmVersion`, and `diagnosticVersion`.
- Add migration/replay tooling for learning events.
- Keep raw events immutable; derive current mastery from events when needed.

## Files to Delete, Quarantine, or Rewrite

- `mock_auth.py`: delete after real Clerk auth is restored.
- `python/ingest/seed_mock_user.py`: rewrite without secrets and move test seeding to fixtures.
- `python/ingest/validate_content.js`: rewrite; current validation is intentionally fake.
- `python/ingest/test_vertex.py`: move to explicit devtools or delete.
- `src/lib/quiz/QuizEngine.ts`: delete or wire into the real quiz domain service.
- `src/components/quiz/SocraticTutor.tsx`: delete, prototype-quarantine, or connect to `/api/ai/remediate`.
- `src/components/quiz/NumericalQuestion.tsx`: either integrate into the active presenter or remove.

## Recommended Execution Order

1. Rotate leaked DB credentials.
2. Replace all mocked auth and protect app/API routes with Clerk.
3. Fix env naming and remove runtime env import from `next.config.ts`.
4. Regenerate/fix Drizzle migrations and pgvector extension setup.
5. Make quiz submission idempotent and persist diagnostic fields.
6. Fix question DTO leakage before any real quiz use.
7. Update RAG to use V2 pages and chunk-level retrieval.
8. Replace fake validators/fallbacks in ingestion.
9. Add route tests for auth, DTO leakage, submit validation, and idempotency.
10. Add durable background processing for analytics/remediation preparation.

## Definition of "Perfect Enough to Ship a Private Beta"

NeuralJEE should not be exposed to real students until these gates pass:

- No hardcoded users or secrets.
- `npm run lint`, `npm test`, `tsc --noEmit`, and `npm run build` pass in CI.
- A clean database can be created from migrations.
- Quiz clients cannot receive correct answers or private trap metadata.
- Quiz submit is authenticated, idempotent, and validates question ownership.
- Failure modes are persisted and visible in learning-event traces.
- Tutor responses are grounded in V2 content/chunks and do not reveal final answers prematurely.
- Ingestion refuses invalid content instead of marking it verified.
- At least one end-to-end path works with a real Clerk user: learn topic, take quiz, store attempt, update mastery, trigger remediation, schedule review.

