# NeuralJEE — Complete Production Blueprint
## Full Codebase Audit + RAG System + Production Structure

---

## PART 1: WHAT YOUR CODEBASE ACTUALLY IS RIGHT NOW

### Every File, Assessed

```
StudentLearning/
├── eng.traineddata          ❌ DELETE — 24MB Tesseract model in git. Wrong tool.
├── extract.py               ❌ DELETE — OCR pipeline. Entire approach is wrong for JEE math.
├── extract_images.py        ❌ DELETE — Same.
├── ocr.js                   ❌ DELETE — Same.
├── ocr_output.txt           ❌ DELETE — Committed output file. Never commit generated files.
├── pdf_content.txt          ❌ DELETE — Same.
├── pdf_images/              ❌ DELETE — Committed image outputs.
├── scratch/                 ❌ DELETE — Prototype scratch work. Not production code.
├── AGENTS.md                ⚠ KEEP but READ — "This is NOT the Next.js you know".
│                              Next.js 16 has breaking changes vs 14/15.
├── CLAUDE.md                ⚠ UPDATE — Points to AGENTS.md. Add real project context.
├── next.config.ts           ⚠ FIX — Completely empty. Needs real config.
├── package.json             ⚠ FIX — Remove groq-sdk, @google/genai, tesseract.js, pdf-parse.
│                              Add @anthropic-ai/sdk, @clerk/nextjs, drizzle-kit config.
├── .gitignore               ⚠ UPDATE — Add .env.local, *.traineddata, /pdf_images, /scratch
├── src/                     ✓ RESTRUCTURE — Keep the Next.js app, rebuild everything inside it
├── public/                  ✓ KEEP — Static assets
├── tsconfig.json            ✓ KEEP — Add strict mode if not already on
├── eslint.config.mjs        ✓ KEEP
└── postcss.config.mjs       ✓ KEEP
```

### What the Dependencies Tell Us

**Remove immediately:**
- `@google/genai` — Gemini SDK. Conflicts with unified AI strategy.
- `groq-sdk` — Groq SDK. Same problem. Three AI clients = chaos.
- `tesseract.js` — OCR. Cannot handle LaTeX. Wrong for JEE content.
- `pdf-parse` — PDF text extraction. Only works on text PDFs, not math-heavy ones.

**Keep and use correctly:**
- `@neondatabase/serverless` + `drizzle-orm` — Perfect DB stack. Add pgvector.
- `katex` + `rehype-katex` + `remark-math` — Correct math rendering stack.
- `mermaid` — Correct for diagrams.
- `react-markdown` — Correct for rendering AI markdown output.
- `zod` v4 — Correct for validation.
- `zustand` — Correct for client state.
- `@radix-ui/*` — Correct accessible component primitives.
- All testing packages (`vitest`, `@testing-library/*`) — Correct, just never used.

**Add:**
- `@anthropic-ai/sdk` — Single AI provider.
- `@clerk/nextjs` — Authentication.
- `ai` (Vercel AI SDK) — Streaming UI responses from Claude.
- `@upstash/redis` + `@upstash/ratelimit` — Rate limiting.
- `sympy` (Python side only, not npm) — Math verification.

---

## PART 2: THE NEW FOLDER STRUCTURE

This is the complete production folder structure. Every file has a purpose.

```
StudentLearning/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout, ClerkProvider, fonts
│   │   ├── page.tsx                  # Landing page (marketing)
│   │   ├── (auth)/                   # Auth group (Clerk handles UI)
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (app)/                    # Protected routes group
│   │   │   ├── layout.tsx            # App shell with sidebar
│   │   │   ├── dashboard/page.tsx    # Student progress overview
│   │   │   ├── learn/
│   │   │   │   ├── page.tsx          # Chapter/subject browser
│   │   │   │   └── [subtopicId]/
│   │   │   │       ├── page.tsx      # Teaching view
│   │   │   │       └── quiz/page.tsx # Quiz view
│   │   │   ├── review/page.tsx       # Spaced repetition queue
│   │   │   └── doubt/page.tsx        # Free-form doubt solver
│   │   └── api/                      # API Routes
│   │       ├── ai/
│   │       │   ├── teach/route.ts    # POST: stream teaching content
│   │       │   ├── quiz/route.ts     # POST: generate quiz questions
│   │       │   ├── remediate/route.ts# POST: explain wrong answer
│   │       │   └── doubt/route.ts    # POST: Socratic doubt mode
│   │       ├── quiz/
│   │       │   └── submit/route.ts   # POST: server-side answer validation
│   │       ├── progress/
│   │       │   └── route.ts          # GET/POST: student mastery data
│   │       ├── curriculum/
│   │       │   └── route.ts          # GET: syllabus tree
│   │       └── webhooks/
│   │           └── clerk/route.ts    # POST: user sync from Clerk
│   ├── components/
│   │   ├── ui/                       # Radix-based primitives (shadcn pattern)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   ├── learn/
│   │   │   ├── TeachingPanel.tsx     # Streams AI teaching content
│   │   │   ├── MathRenderer.tsx      # KaTeX + react-markdown wrapper
│   │   │   ├── DiagramRenderer.tsx   # Mermaid.js wrapper
│   │   │   ├── FormulaCard.tsx       # Highlighted formula display
│   │   │   └── SubtopicProgress.tsx  # Progress indicator
│   │   ├── quiz/
│   │   │   ├── QuizPanel.tsx         # MCQ/MSQ/Integer/Numerical UI
│   │   │   ├── QuestionCard.tsx      # Single question with LaTeX
│   │   │   ├── AnswerOption.tsx      # Option with radio/checkbox
│   │   │   ├── MasteryResult.tsx     # Post-quiz mastery breakdown
│   │   │   └── RemediationPanel.tsx  # Wrong answer explanation
│   │   ├── dashboard/
│   │   │   ├── MasteryHeatmap.tsx    # Chapter × mastery grid
│   │   │   ├── WeakTopicsList.tsx    # Prioritized weak areas
│   │   │   ├── ReviewSchedule.tsx    # Upcoming spaced reps
│   │   │   └── ProgressStats.tsx     # Time studied, questions done
│   │   └── layout/
│   │       ├── Sidebar.tsx           # Subject/chapter nav
│   │       ├── Header.tsx            # User menu, search
│   │       └── BreadcrumbNav.tsx     # Learn > Physics > Kinematics
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts             # Drizzle schema (THE master schema)
│   │   │   ├── client.ts             # Neon + Drizzle client singleton
│   │   │   └── queries/              # Typed query functions
│   │   │       ├── curriculum.ts     # Fetch subjects/chapters/topics
│   │   │       ├── mastery.ts        # Read/write mastery scores
│   │   │       ├── questions.ts      # Fetch/cache question sets
│   │   │       └── review.ts         # Spaced repetition scheduler
│   │   ├── ai/
│   │   │   ├── client.ts             # Single Anthropic client instance
│   │   │   ├── prompts/              # ALL prompt templates
│   │   │   │   ├── teach.ts          # TEACH mode system prompt
│   │   │   │   ├── quiz.ts           # QUIZ mode system prompt
│   │   │   │   ├── remediate.ts      # REMEDIATE mode system prompt
│   │   │   │   └── doubt.ts          # DOUBT mode system prompt
│   │   │   ├── rag.ts                # RAG retrieval logic
│   │   │   └── schemas.ts            # Zod schemas for AI JSON output
│   │   ├── rag/
│   │   │   ├── embed.ts              # Generate query embeddings
│   │   │   ├── retrieve.ts           # Vector + graph search
│   │   │   └── context-builder.ts    # Build context string for prompt
│   │   ├── mastery/
│   │   │   ├── algorithm.ts          # Mastery score computation
│   │   │   ├── spaced-rep.ts         # SM-2 spaced repetition
│   │   │   └── weakness-detector.ts  # Extract weak concept tags
│   │   ├── cache/
│   │   │   └── redis.ts              # Upstash Redis client + helpers
│   │   ├── rate-limit/
│   │   │   └── index.ts              # Rate limiting middleware
│   │   └── auth/
│   │       └── server.ts             # Clerk auth helpers for server
│   ├── types/
│   │   ├── curriculum.ts             # Subject, Chapter, Topic, Subtopic types
│   │   ├── mastery.ts                # MasteryScore, QuestionAttempt types
│   │   ├── ai.ts                     # AI response JSON types
│   │   └── quiz.ts                   # Question, Answer, QuizResult types
│   ├── hooks/
│   │   ├── useTeaching.ts            # Streaming teaching state
│   │   ├── useQuiz.ts                # Quiz attempt state machine
│   │   ├── useMastery.ts             # Student mastery data
│   │   └── useReviewSchedule.ts      # Spaced rep queue
│   └── store/
│       └── learning.ts               # Zustand: current session state
├── python/                           # INGESTION PIPELINE (separate from Next.js)
│   ├── ingest/
│   │   ├── requirements.txt
│   │   ├── 01_pdf_to_markdown.py     # Marker: PDF → Markdown
│   │   ├── 02_extract_concepts.py    # Gemini Flash: Markdown → JSON graph
│   │   ├── 03_validate_math.py       # SymPy: verify all formulas
│   │   ├── 04_generate_embeddings.py # BGE-small: text → vectors
│   │   ├── 05_push_to_db.py          # Push verified data to Neon/Postgres
│   │   └── watcher.py                # Watchdog: auto-trigger on new PDF
│   ├── review/
│   │   └── review_ui.py              # Simple Streamlit UI for expert review
│   └── data/
│       ├── input_pdfs/               # Drop PDFs here
│       ├── markdown_output/          # Marker output
│       ├── concepts_json/            # Extracted concept graphs
│       └── archived/                 # Processed PDFs
├── drizzle/
│   └── migrations/                   # Auto-generated Drizzle migrations
├── tests/
│   ├── unit/
│   │   ├── mastery-algorithm.test.ts
│   │   ├── spaced-rep.test.ts
│   │   └── rag-retrieval.test.ts
│   ├── integration/
│   │   ├── api-quiz-submit.test.ts
│   │   └── api-teach.test.ts
│   └── e2e/
│       └── learning-loop.spec.ts     # Playwright: full student journey
├── .env.local                        # NEVER commit. All secrets here.
├── .env.example                      # Commit this. Template with no values.
├── .gitignore                        # Updated to exclude all the right things
└── package.json                      # Cleaned up dependencies
```

---

## PART 3: THE COMPLETE DRIZZLE SCHEMA

This is `src/lib/db/schema.ts` — the single source of truth for your entire database.

```typescript
import { pgTable, uuid, text, integer, real, jsonb, 
         boolean, timestamp, vector, pgEnum } from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────────────────────

export const examTypeEnum = pgEnum('exam_type', ['JEE_MAINS', 'JEE_ADVANCED', 'BOTH']);
export const questionTypeEnum = pgEnum('question_type', ['MCQ', 'MSQ', 'INTEGER', 'NUMERICAL']);
export const contentSourceEnum = pgEnum('content_source', ['NCERT', 'NTA_PYQ', 'AI_GENERATED', 'EXPERT_VERIFIED']);
export const contentStatusEnum = pgEnum('content_status', ['PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'FLAGGED']);
export const masteryStatusEnum = pgEnum('mastery_status', ['NOT_STARTED', 'WEAK', 'NEEDS_REVIEW', 'MASTERED']);

// ── Users (synced from Clerk via webhook) ─────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  targetExam: examTypeEnum('target_exam').default('BOTH'),
  targetYear: integer('target_year'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ── Curriculum Tree ────────────────────────────────────────────────────────

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),           // 'Physics', 'Chemistry', 'Mathematics'
  examType: examTypeEnum('exam_type').default('BOTH'),
  orderIndex: integer('order_index').notNull(),
});

export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id),
  name: text('name').notNull(),
  classYear: integer('class_year').notNull(),  // 11 or 12
  orderIndex: integer('order_index').notNull(),
  jeeWeightagePct: real('jee_weightage_pct'),  // Historical JEE frequency %
});

export const topics = pgTable('topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapterId: uuid('chapter_id').notNull().references(() => chapters.id),
  name: text('name').notNull(),
  orderIndex: integer('order_index').notNull(),
  difficultyLevel: integer('difficulty_level').default(3), // 1-5
});

export const subtopics = pgTable('subtopics', {
  id: uuid('id').primaryKey().defaultRandom(),
  topicId: uuid('topic_id').notNull().references(() => topics.id),
  name: text('name').notNull(),
  description: text('description'),
  keyFormulas: jsonb('key_formulas'),        // [{latex: string, sympyVerified: bool}]
  commonMistakes: text('common_mistakes').array(),
  pyqFrequency: integer('pyq_frequency').default(0),  // Times in PYQs
  estimatedMinutes: integer('estimated_minutes').default(15),
  orderIndex: integer('order_index').notNull(),
  
  // RAG fields
  embedding: vector('embedding', { dimensions: 768 }),  // pgvector BGE-small
  contentStatus: contentStatusEnum('content_status').default('PENDING_REVIEW'),
  rawContent: text('raw_content'),  // Expert-curated seed content
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Prerequisite graph (adjacency table — replaces Neo4j)
export const prerequisites = pgTable('prerequisites', {
  fromSubtopicId: uuid('from_subtopic_id').notNull().references(() => subtopics.id),
  toSubtopicId: uuid('to_subtopic_id').notNull().references(() => subtopics.id),
  strength: integer('strength').default(1),  // 1=helpful, 2=important, 3=required
});

// ── Question Bank ──────────────────────────────────────────────────────────

export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  subtopicId: uuid('subtopic_id').notNull().references(() => subtopics.id),
  questionText: text('question_text').notNull(),  // LaTeX supported
  questionType: questionTypeEnum('question_type').notNull(),
  options: jsonb('options'),                       // [{id, text, isCorrect}] for MCQ/MSQ
  correctAnswer: jsonb('correct_answer').notNull(), // {value, tolerance} for numerical
  solutionSteps: jsonb('solution_steps'),          // [{step, explanation, latex}]
  difficultyLevel: integer('difficulty_level').default(3), // 1-5
  expectedTimeSeconds: integer('expected_time_seconds').default(120),
  conceptsTested: text('concepts_tested').array(), // Tags for weakness detection
  yearAppeared: integer('year_appeared'),
  source: contentSourceEnum('source').notNull(),
  status: contentStatusEnum('status').default('PENDING_REVIEW'),
  
  // RAG: embed the question for similarity search
  embedding: vector('embedding', { dimensions: 768 }),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// ── AI-Generated Content Cache ─────────────────────────────────────────────
// Cache AI explanations so 5000 students don't each trigger a new API call

export const contentCache = pgTable('content_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  subtopicId: uuid('subtopic_id').notNull().references(() => subtopics.id),
  mode: text('mode').notNull(),  // 'TEACH' | 'SUMMARY'
  content: jsonb('content').notNull(),  // Full AI response JSON
  modelVersion: text('model_version').notNull(),  // 'claude-sonnet-4-20250514'
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'),  // Null = never expire
});

// ── Student Learning State ─────────────────────────────────────────────────

export const studentMastery = pgTable('student_mastery', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  subtopicId: uuid('subtopic_id').notNull().references(() => subtopics.id),
  
  // Core mastery metrics
  questionsAttempted: integer('questions_attempted').default(0),
  questionsCorrect: integer('questions_correct').default(0),
  masteryScore: real('mastery_score').default(0),  // 0-100
  status: masteryStatusEnum('status').default('NOT_STARTED'),
  
  // For weakness detection
  weakConceptTags: text('weak_concept_tags').array().default([]),
  avgTimePerQuestionMs: integer('avg_time_per_question_ms'),
  
  // Spaced repetition (SM-2)
  nextReviewAt: timestamp('next_review_at'),
  intervalDays: real('interval_days').default(1),
  easeFactor: real('ease_factor').default(2.5),
  repetitionCount: integer('repetition_count').default(0),
  
  lastAttemptAt: timestamp('last_attempt_at'),
  firstAttemptAt: timestamp('first_attempt_at'),
});

// ── Session + Event Log (analytics) ───────────────────────────────────────

export const learningEvents = pgTable('learning_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  subtopicId: uuid('subtopic_id').references(() => subtopics.id),
  eventType: text('event_type').notNull(),
  // 'TEACH_STARTED' | 'TEACH_COMPLETED' | 'QUIZ_STARTED' | 
  // 'QUESTION_ANSWERED' | 'MASTERY_ACHIEVED' | 'REVIEW_COMPLETED'
  payload: jsonb('payload'),  // Event-specific data
  createdAt: timestamp('created_at').defaultNow(),
});

export const questionAttempts = pgTable('question_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  questionId: uuid('question_id').notNull().references(() => questions.id),
  subtopicId: uuid('subtopic_id').notNull().references(() => subtopics.id),
  
  selectedAnswer: jsonb('selected_answer'),  // What student chose
  isCorrect: boolean('is_correct').notNull(),
  timeSpentMs: integer('time_spent_ms'),
  
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## PART 4: THE RAG SYSTEM

### How RAG Works in This Codebase

RAG = Retrieval-Augmented Generation. Instead of asking Claude to hallucinate JEE content from memory, you retrieve verified, curated knowledge from your database and give it to Claude as context. Claude then teaches FROM that context, not from its training data.

```
Student asks to learn "Magnetic Field of Toroid"
         ↓
RAG Retrieval (src/lib/rag/retrieve.ts):
  1. Embed the query with BGE-small → 768-dim vector
  2. Vector search: find the 5 most similar subtopics in DB
  3. Graph search: find all prerequisites for this subtopic
  4. Fetch the raw_content, key_formulas, common_mistakes from DB
         ↓
Context Builder (src/lib/rag/context-builder.ts):
  Formats retrieved data into a structured context string
         ↓
Claude API Call (src/lib/ai/prompts/teach.ts):
  System prompt includes:
  - The retrieved subtopic content
  - The prerequisite chain
  - Student's weak topics from their mastery history
  - Output JSON schema
         ↓
Claude generates explanation GROUNDED IN YOUR DATA
  → Not hallucinated. Verified content only.
```

### RAG Retrieval Code (`src/lib/rag/retrieve.ts`)

```typescript
import { db } from '@/lib/db/client';
import { subtopics, prerequisites } from '@/lib/db/schema';
import { embed } from '@/lib/rag/embed';
import { sql, eq } from 'drizzle-orm';

export interface RetrievedContext {
  targetSubtopic: typeof subtopics.$inferSelect;
  prerequisites: typeof subtopics.$inferSelect[];
  similarSubtopics: typeof subtopics.$inferSelect[];
}

export async function retrieveContextForSubtopic(
  subtopicId: string,
  queryText?: string
): Promise<RetrievedContext> {
  
  // 1. Get the target subtopic with its content
  const [target] = await db
    .select()
    .from(subtopics)
    .where(eq(subtopics.id, subtopicId))
    .limit(1);
  
  if (!target) throw new Error(`Subtopic ${subtopicId} not found`);

  // 2. Get prerequisites via recursive graph traversal
  const prereqResult = await db.execute(sql`
    WITH RECURSIVE prereq_chain AS (
      SELECT from_subtopic_id, 1 AS depth
      FROM prerequisites
      WHERE to_subtopic_id = ${subtopicId}
      
      UNION ALL
      
      SELECT p.from_subtopic_id, pc.depth + 1
      FROM prerequisites p
      JOIN prereq_chain pc ON pc.from_subtopic_id = p.to_subtopic_id
      WHERE pc.depth < 4  -- Max 4 levels deep to avoid infinite recursion
    )
    SELECT DISTINCT s.*
    FROM prereq_chain pc
    JOIN subtopics s ON s.id = pc.from_subtopic_id
    WHERE s.content_status = 'VERIFIED'
    ORDER BY s.name
  `);
  
  const prereqSubtopics = prereqResult.rows as typeof subtopics.$inferSelect[];

  // 3. Optional: vector similarity search for related content
  let similarSubtopics: typeof subtopics.$inferSelect[] = [];
  if (queryText) {
    const queryEmbedding = await embed(queryText);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    
    const similarResult = await db.execute(sql`
      SELECT *, 1 - (embedding <=> ${embeddingStr}::vector) AS similarity
      FROM subtopics
      WHERE id != ${subtopicId}
        AND content_status = 'VERIFIED'
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT 3
    `);
    
    similarSubtopics = similarResult.rows as typeof subtopics.$inferSelect[];
  }

  return {
    targetSubtopic: target,
    prerequisites: prereqSubtopics,
    similarSubtopics,
  };
}
```

### Context Builder (`src/lib/rag/context-builder.ts`)

```typescript
import type { RetrievedContext } from './retrieve';

export function buildTeachingContext(
  context: RetrievedContext,
  studentWeakTopics: string[]
): string {
  const { targetSubtopic, prerequisites } = context;
  
  const formulasStr = (targetSubtopic.keyFormulas as any[])
    ?.map(f => `  - ${f.latex} (${f.sympyVerified ? 'verified' : 'unverified'})`)
    .join('\n') ?? 'No formulas loaded';
    
  const prereqStr = prerequisites.length > 0
    ? prerequisites.map(p => `  - ${p.name}: ${p.description ?? ''}`).join('\n')
    : '  - None required';
    
  const mistakesStr = targetSubtopic.commonMistakes?.join('\n  - ') ?? 'None listed';
  const weakStr = studentWeakTopics.length > 0 
    ? studentWeakTopics.join(', ')
    : 'No weak topics identified yet';

  return `
=== VERIFIED KNOWLEDGE BASE CONTEXT ===

TARGET SUBTOPIC: ${targetSubtopic.name}
${targetSubtopic.description ?? ''}

RAW CONTENT FROM VERIFIED SOURCE:
${targetSubtopic.rawContent ?? 'Expert content pending. Use your knowledge carefully.'}

KEY FORMULAS (use exactly as listed, all LaTeX-formatted):
${formulasStr}

PREREQUISITE KNOWLEDGE (student should already know):
${prereqStr}

COMMON STUDENT MISTAKES FOR THIS TOPIC:
  - ${mistakesStr}

JEE RELEVANCE: This topic appears in ~${targetSubtopic.pyqFrequency ?? 0} PYQ questions.

STUDENT'S CURRENT WEAK AREAS: ${weakStr}

=== END CONTEXT ===

INSTRUCTIONS: Teach ${targetSubtopic.name} using the verified content above as your PRIMARY source. 
Do not introduce formulas not listed above. Do not contradict the verified content.
Adapt explanations to address the student's known weak areas where relevant.
`;
}
```

### Teaching Prompt (`src/lib/ai/prompts/teach.ts`)

```typescript
export const TEACH_SYSTEM_PROMPT = `
You are an expert JEE educator with 15 years of experience coaching students 
to IIT ranks under 1000. You are teaching a specific subtopic.

CRITICAL RULES:
1. All mathematics MUST use LaTeX notation wrapped in $$...$$
2. Never introduce formulas not in the provided knowledge base context
3. Keep explanation under 500 words — concise beats comprehensive
4. Every concept needs an intuition-first explanation, then the formal math
5. Include exactly ONE worked example showing a JEE-style application
6. Flag any diagram that would help with "NEEDS_DIAGRAM: [description]"
7. Output ONLY valid JSON matching the schema below. No prose outside JSON.

OUTPUT SCHEMA (strict JSON, no markdown wrapper):
{
  "hook": "One sentence that makes the student curious about this topic",
  "intuition": "Plain English explanation of the core idea (no math yet)",
  "core_concept": "Formal explanation with LaTeX formulas",
  "worked_example": {
    "problem": "A JEE-style problem statement",
    "solution": [
      {"step": 1, "explanation": "...", "math": "$$LaTeX$$"}
    ],
    "jee_tip": "What to watch for in JEE questions on this"
  },
  "diagram_spec": {
    "type": "force_diagram | flowchart | graph | circuit | orbital | null",
    "mermaid_code": "Mermaid.js code string or null",
    "description": "What this diagram shows"
  },
  "common_mistakes": ["mistake 1", "mistake 2"],
  "jee_context": "How often this appears and in what question formats",
  "key_takeaways": ["point 1", "point 2", "point 3"]
}
`;
```

---

## PART 5: THE API ROUTES

### Teaching Route (`src/app/api/ai/teach/route.ts`)

```typescript
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { anthropic } from '@/lib/ai/client';
import { retrieveContextForSubtopic } from '@/lib/rag/retrieve';
import { buildTeachingContext } from '@/lib/rag/context-builder';
import { TEACH_SYSTEM_PROMPT } from '@/lib/ai/prompts/teach';
import { getStudentWeakTopics } from '@/lib/db/queries/mastery';
import { checkRateLimit } from '@/lib/rate-limit';
import { getCachedContent, setCachedContent } from '@/lib/cache/redis';

const RequestSchema = z.object({
  subtopicId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  // 1. Auth
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  // 2. Rate limiting
  const rateLimitResult = await checkRateLimit(`teach:${userId}`, 30, '1h');
  if (!rateLimitResult.success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  // 3. Validate input
  const body = await req.json();
  const { subtopicId } = RequestSchema.parse(body);
  
  // 4. Check cache first (AI calls are expensive — cache by subtopicId)
  const cacheKey = `teach:${subtopicId}`;
  const cached = await getCachedContent(cacheKey);
  if (cached) {
    return Response.json({ success: true, data: cached, cached: true });
  }
  
  // 5. RAG retrieval
  const context = await retrieveContextForSubtopic(subtopicId);
  const weakTopics = await getStudentWeakTopics(userId);
  const ragContext = buildTeachingContext(context, weakTopics);
  
  // 6. Claude API call (streaming)
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: TEACH_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `${ragContext}\n\nNow teach me: ${context.targetSubtopic.name}`
    }]
  });
  
  // 7. Stream the response
  return new Response(
    new ReadableStream({
      async start(controller) {
        let fullText = '';
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            fullText += chunk.delta.text;
          }
        }
        // Cache the full response for future students
        try {
          const parsed = JSON.parse(fullText);
          await setCachedContent(cacheKey, parsed, 86400); // 24hr cache
        } catch {}
        controller.close();
      }
    }),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
}
```

### Quiz Submission (Server-validated, `src/app/api/quiz/submit/route.ts`)

```typescript
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { questions, questionAttempts } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { computeMastery } from '@/lib/mastery/algorithm';
import { upsertMastery } from '@/lib/db/queries/mastery';

const SubmitSchema = z.object({
  subtopicId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedAnswer: z.unknown(),
    timeSpentMs: z.number().int().positive(),
  }))
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  const body = await req.json();
  const { subtopicId, answers } = SubmitSchema.parse(body);
  
  // Fetch the real correct answers from DB (never trust client)
  const questionIds = answers.map(a => a.questionId);
  const dbQuestions = await db
    .select()
    .from(questions)
    .where(inArray(questions.id, questionIds));
  
  const questionMap = new Map(dbQuestions.map(q => [q.id, q]));
  
  // Server-side validation
  const attempts = answers.map(answer => {
    const question = questionMap.get(answer.questionId);
    if (!question) throw new Error(`Question ${answer.questionId} not found`);
    
    const isCorrect = validateAnswer(question, answer.selectedAnswer);
    
    return {
      questionId: answer.questionId,
      isCorrect,
      timeSpentMs: answer.timeSpentMs,
      conceptsTested: question.conceptsTested ?? [],
      expectedTimeSeconds: question.expectedTimeSeconds ?? 120,
    };
  });
  
  // Compute mastery score
  const masteryResult = computeMastery(attempts);
  
  // Save attempts to DB
  await db.insert(questionAttempts).values(
    attempts.map(a => ({
      userId,
      questionId: a.questionId,
      subtopicId,
      selectedAnswer: answers.find(ans => ans.questionId === a.questionId)?.selectedAnswer,
      isCorrect: a.isCorrect,
      timeSpentMs: a.timeSpentMs,
    }))
  );
  
  // Update mastery
  await upsertMastery(userId, subtopicId, masteryResult);
  
  return Response.json({ success: true, data: masteryResult });
}

function validateAnswer(question: any, selectedAnswer: unknown): boolean {
  const correct = question.correctAnswer;
  
  switch (question.questionType) {
    case 'MCQ':
      return selectedAnswer === correct.value;
    case 'MSQ':
      const selected = new Set(selectedAnswer as string[]);
      const expected = new Set(correct.values as string[]);
      return selected.size === expected.size && [...selected].every(v => expected.has(v));
    case 'INTEGER':
      return Number(selectedAnswer) === Number(correct.value);
    case 'NUMERICAL':
      const tolerance = correct.tolerance ?? 0.01;
      return Math.abs(Number(selectedAnswer) - Number(correct.value)) <= tolerance;
    default:
      return false;
  }
}
```

---

## PART 6: THE MASTERY ALGORITHM

### `src/lib/mastery/algorithm.ts`

```typescript
export interface QuestionAttempt {
  questionId: string;
  isCorrect: boolean;
  timeSpentMs: number;
  conceptsTested: string[];
  expectedTimeSeconds: number;
}

export interface MasteryResult {
  masteryScore: number;          // 0–100
  status: 'WEAK' | 'NEEDS_REVIEW' | 'MASTERED';
  weakConceptTags: string[];     // Concepts that appeared in wrong answers
  consistencyScore: number;
  timeConfidenceScore: number;
  accuracy: number;
}

export function computeMastery(attempts: QuestionAttempt[]): MasteryResult {
  if (attempts.length === 0) {
    return { masteryScore: 0, status: 'WEAK', weakConceptTags: [], 
             consistencyScore: 0, timeConfidenceScore: 0, accuracy: 0 };
  }
  
  const correct = attempts.filter(a => a.isCorrect);
  const accuracy = correct.length / attempts.length;
  
  // Consistency: penalize lucky guesses on wrong previous attempts
  // Uses a sliding window — consistent correct answers score higher
  const consistencyScore = computeConsistency(attempts);
  
  // Time confidence: too fast = guessing, too slow = struggling
  const timeConfidenceScore = computeTimeConfidence(attempts);
  
  // Weighted composite score
  const masteryScore = Math.round(
    (accuracy * 0.60 + consistencyScore * 0.25 + timeConfidenceScore * 0.15) * 100
  );
  
  // Extract concepts from wrong answers
  const weakConceptTags = extractWeakConcepts(attempts);
  
  const status = masteryScore >= 85 ? 'MASTERED' 
    : masteryScore >= 60 ? 'NEEDS_REVIEW' 
    : 'WEAK';
  
  return { masteryScore, status, weakConceptTags, 
           consistencyScore, timeConfidenceScore, accuracy };
}

function computeConsistency(attempts: QuestionAttempt[]): number {
  if (attempts.length <= 1) return attempts[0]?.isCorrect ? 1 : 0;
  
  // Look at pairs of questions testing the same concept
  // If student alternates right/wrong, penalize consistency
  let totalScore = 0;
  let comparisons = 0;
  
  for (let i = 1; i < attempts.length; i++) {
    const prev = attempts[i - 1];
    const curr = attempts[i];
    // Same result = consistent
    if (prev.isCorrect === curr.isCorrect) {
      totalScore += curr.isCorrect ? 1 : 0;
    } else {
      // Inconsistent: partial credit
      totalScore += 0.3;
    }
    comparisons++;
  }
  
  return comparisons > 0 ? totalScore / comparisons : 0;
}

function computeTimeConfidence(attempts: QuestionAttempt[]): number {
  const scores = attempts.map(a => {
    const expectedMs = a.expectedTimeSeconds * 1000;
    const ratio = a.timeSpentMs / expectedMs;
    
    if (ratio < 0.2) return 0.3;    // Way too fast = guessing
    if (ratio < 0.5) return 0.7;    // Fast = could be guessing
    if (ratio <= 1.5) return 1.0;   // Normal speed = confident
    if (ratio <= 2.5) return 0.8;   // Slightly slow = thinking
    return 0.5;                       // Very slow = struggling
  });
  
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function extractWeakConcepts(attempts: QuestionAttempt[]): string[] {
  const conceptCounts = new Map<string, { wrong: number; total: number }>();
  
  for (const attempt of attempts) {
    for (const concept of attempt.conceptsTested) {
      const current = conceptCounts.get(concept) ?? { wrong: 0, total: 0 };
      conceptCounts.set(concept, {
        wrong: current.wrong + (attempt.isCorrect ? 0 : 1),
        total: current.total + 1,
      });
    }
  }
  
  // Return concepts where >50% of attempts were wrong
  return [...conceptCounts.entries()]
    .filter(([_, counts]) => counts.wrong / counts.total > 0.5)
    .map(([concept]) => concept);
}
```

---

## PART 7: THE INGESTION PIPELINE (Python)

### Setup (`python/ingest/requirements.txt`)

```
marker-pdf==0.4.0          # PDF → Markdown (free, runs locally)
llama-index-core==0.12.0   # Orchestration framework
google-generativeai==0.8.0 # Gemini Flash for extraction (free tier)
sentence-transformers==3.0 # BGE-small embeddings (free, local)
sympy==1.13.0              # Math verification (free)
psycopg2-binary==2.9.9     # PostgreSQL connection
python-dotenv==1.0.0       # Load .env
watchdog==4.0.0            # File watcher
tqdm==4.66.0               # Progress bars
```

### Step 2: Extract Concepts (`python/ingest/02_extract_concepts.py`)

```python
import json
import google.generativeai as genai
from pathlib import Path
import time

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-1.5-flash')

EXTRACTION_PROMPT = """
You are an expert JEE curriculum designer. Read the following textbook content 
and extract a JSON array of MicroConcepts.

For each MicroConcept, output:
{
  "name": "exact concept name",
  "description": "2-3 sentence explanation suitable for JEE students",
  "key_formulas": [
    {
      "latex": "$$F = ma$$",
      "sympy_expr": "F = m*a",  // SymPy-parseable form
      "description": "Newton's second law"
    }
  ],
  "common_mistakes": ["mistake 1", "mistake 2"],
  "prerequisites": ["concept name 1", "concept name 2"],
  "jee_frequency": 3  // 1-5: how often this appears in JEE
}

Return ONLY a valid JSON array. No prose. No markdown code blocks.
Content: {content}
"""

def extract_concepts(markdown_text: str, chapter_name: str) -> list[dict]:
    # Split into ~3000 token chunks to stay within context
    chunks = chunk_text(markdown_text, max_chars=8000)
    all_concepts = []
    
    for i, chunk in enumerate(chunks):
        print(f"  Processing chunk {i+1}/{len(chunks)}...")
        
        response = model.generate_content(
            EXTRACTION_PROMPT.format(content=chunk)
        )
        
        try:
            concepts = json.loads(response.text.strip())
            all_concepts.extend(concepts)
        except json.JSONDecodeError as e:
            print(f"  Warning: JSON parse error in chunk {i+1}: {e}")
            # Log for human review
            with open('review_needed.txt', 'a') as f:
                f.write(f"Chapter: {chapter_name}, Chunk: {i+1}\n{response.text}\n\n")
        
        # Respect Gemini free tier: 15 RPM → wait 4 seconds between calls
        time.sleep(4)
    
    return deduplicate_concepts(all_concepts)
```

### Step 3: Validate Math (`python/ingest/03_validate_math.py`)

```python
import sympy
from sympy.parsing.sympy_parser import parse_expr

def validate_formula(sympy_expr: str) -> tuple[bool, str]:
    """
    Try to parse and simplify a SymPy expression.
    Returns (is_valid, error_message).
    """
    try:
        # Try to parse
        expr = parse_expr(sympy_expr, transformations='all')
        # Try to simplify (catches some semantic errors)
        sympy.simplify(expr)
        return True, ''
    except Exception as e:
        return False, str(e)

def validate_all_formulas(concepts: list[dict]) -> list[dict]:
    flagged = []
    
    for concept in concepts:
        for formula in concept.get('key_formulas', []):
            sympy_expr = formula.get('sympy_expr', '')
            if not sympy_expr:
                continue
                
            is_valid, error = validate_formula(sympy_expr)
            formula['sympy_verified'] = is_valid
            
            if not is_valid:
                formula['sympy_error'] = error
                flagged.append({
                    'concept': concept['name'],
                    'formula': formula['latex'],
                    'error': error
                })
    
    print(f"Validated {sum(len(c.get('key_formulas',[])) for c in concepts)} formulas.")
    print(f"Flagged {len(flagged)} formulas for human review.")
    return concepts
```

---

## PART 8: SECURITY CHECKLIST

### Rate Limiting (`src/lib/rate-limit/index.ts`)

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

const limiters = {
  teach: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1h') }),
  quiz:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1m') }),
  doubt: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1h') }),
  auth:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '15m') }),
};

export async function checkRateLimit(
  key: string, 
  limit: number, 
  window: string
): Promise<{ success: boolean; remaining: number }> {
  const limiterKey = key.split(':')[0] as keyof typeof limiters;
  const result = await limiters[limiterKey]?.limit(key);
  return result ?? { success: true, remaining: 999 };
}
```

### Environment Variables (`.env.example`)

```bash
# Next.js
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...
DATABASE_URL_UNPOOLED=postgresql://...

# AI (Anthropic only — no Gemini/Groq in production)
ANTHROPIC_API_KEY=sk-ant-...

# Cache (Upstash Redis)
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## PART 9: WHAT TO DO IN ORDER — WEEK BY WEEK

### Week 1: Cleanup + Foundation
```
Day 1: Make repo private. Delete all wrong files (eng.traineddata, extract.py, 
       extract_images.py, ocr.js, ocr_output.txt, pdf_content.txt, pdf_images/, scratch/).
       
Day 2: Clean package.json — remove @google/genai, groq-sdk, tesseract.js, pdf-parse.
       npm install @anthropic-ai/sdk @clerk/nextjs ai @upstash/redis @upstash/ratelimit.
       
Day 3: Set up Drizzle schema (copy schema.ts above). 
       Run first migration against your Neon DB.
       Enable pgvector: `CREATE EXTENSION IF NOT EXISTS vector;` in Neon console.
       
Day 4: Set up Clerk. Add ClerkProvider to layout.tsx. Protect all /app routes.
       Add webhook: /api/webhooks/clerk → sync users to your users table.
       
Day 5: Seed the curriculum tree. Write a seed script that inserts the JEE syllabus
       structure (subjects → chapters → topics) — no content yet, just the taxonomy.
       Test that the DB queries return correct data.
```

### Week 2: RAG Pipeline
```
Day 1-2: Set up Python ingestion environment. Install requirements.
          Run Marker on NCERT Physics Part 1 (Class 11) PDF.
          Inspect the markdown output.
          
Day 3:   Run concept extraction (02_extract_concepts.py) on one chapter.
          Review the JSON output manually. Fix the prompt if needed.
          
Day 4:   Run SymPy validation. Review flagged formulas.
          Run embedding generation.
          
Day 5:   Push first chapter's data to Neon with pgvector.
          Test vector similarity search from Next.js.
          Verify prereq traversal with recursive CTE.
```

### Week 3: AI Teaching Engine
```
Day 1-2: Single Anthropic client. TEACH mode prompt. 
          API route: /api/ai/teach with RAG retrieval.
          Test: does Claude actually use the verified content?
          
Day 3:   Streaming UI. TeachingPanel.tsx streams response to student.
          MathRenderer.tsx renders LaTeX with KaTeX.
          DiagramRenderer.tsx renders Mermaid specs.
          
Day 4-5: Content cache. If 100 students all request "Newton's First Law",
          serve cached response. Set 24hr TTL.
```

### Week 4: Quiz Engine + Mastery
```
Day 1-2: QUIZ mode prompt. Generate questions server-side.
          QuizPanel.tsx: MCQ, MSQ, Integer, Numerical UI.
          
Day 3:   /api/quiz/submit: server-side answer validation.
          Mastery algorithm. Update student_mastery table.
          
Day 4:   MasteryResult.tsx: show breakdown after quiz.
          WeakConceptTags: what to remediate.
          
Day 5:   REMEDIATE mode: explain wrong answer, generate similar questions.
```

### Week 5-6: Dashboard + Spaced Repetition + Polish
```
SM-2 spaced repetition scheduler.
Student dashboard: mastery heatmap, review schedule, weak topics list.
Rate limiting on all routes.
Full test suite (mastery-algorithm.test.ts is most important).
Accessibility audit (KaTeX has good a11y, verify Radix components).
Load test with k6.
```

---

## PART 10: UPDATED next.config.ts

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://api.anthropic.com https://*.neon.tech",
            ].join('; ')
          },
        ],
      },
    ];
  },
  
  // Server components can call DB directly
  experimental: {
    serverComponentsExternalPackages: ['@neondatabase/serverless'],
  },
  
  // Don't bundle these on client
  serverExternalPackages: ['drizzle-orm'],
};

export default nextConfig;
```

---

## SUMMARY: THE 5 THINGS TO DO THIS WEEK

1. **Delete 7 files.** eng.traineddata, extract.py, extract_images.py, ocr.js, 
   ocr_output.txt, pdf_content.txt, scratch/ — they have zero value in production.

2. **Fix package.json.** Remove 4 wrong packages. Add 5 correct ones.

3. **Copy the schema.ts above into src/lib/db/schema.ts.** This IS the production schema.
   Run migration. Enable pgvector in Neon.

4. **Add Clerk.** Without auth, nothing is production. Takes 2 hours.

5. **Run Marker on NCERT Physics Part 1.** This is your first real content.
   The ingestion pipeline can start this week, in parallel with the app work.
