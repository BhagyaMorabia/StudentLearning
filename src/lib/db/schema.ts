import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  jsonb,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
// NOTE: pgvector integration — requires `CREATE EXTENSION IF NOT EXISTS vector;`
// in your Neon SQL console before running migrations.
import { customType } from 'drizzle-orm/pg-core';

// ── pgvector custom type ────────────────────────────────────────────────────
// drizzle-orm/pg-core doesn't export `vector` yet; we define it as a custom type.
const vector = (name: string, config: { dimensions: number }) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${config.dimensions})`;
    },
    toDriver(value: number[]): string {
      return `[${value.join(',')}]`;
    },
    fromDriver(value: string): number[] {
      return value
        .replace('[', '')
        .replace(']', '')
        .split(',')
        .map(Number);
    },
  })(name);

// ── Enums ──────────────────────────────────────────────────────────────────

export const examTypeEnum = pgEnum('exam_type', [
  'JEE_MAINS',
  'JEE_ADVANCED',
  'BOTH',
]);

export const questionTypeEnum = pgEnum('question_type', [
  'MCQ',
  'MSQ',
  'INTEGER',
  'NUMERICAL',
]);

export const contentSourceEnum = pgEnum('content_source', [
  'NCERT',
  'NTA_PYQ',
  'AI_GENERATED',
  'EXPERT_VERIFIED',
]);

export const contentStatusEnum = pgEnum('content_status', [
  'PENDING_REVIEW',
  'VERIFIED',
  'REJECTED',
  'FLAGGED',
]);

export const masteryStatusEnum = pgEnum('mastery_status', [
  'NOT_STARTED',
  'WEAK',
  'NEEDS_REVIEW',
  'MASTERED',
]);

// ── Users (synced from Clerk via webhook) ─────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull(),
    name: text('name'),
    targetExam: examTypeEnum('target_exam').default('BOTH'),
    targetYear: integer('target_year'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => [uniqueIndex('users_clerk_id_idx').on(t.clerkId)],
);

// ── Curriculum Tree ────────────────────────────────────────────────────────

export const subjects = pgTable('subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // 'Physics', 'Chemistry', 'Mathematics'
  examType: examTypeEnum('exam_type').default('BOTH'),
  orderIndex: integer('order_index').notNull(),
});

export const chapters = pgTable(
  'chapters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    classYear: integer('class_year').notNull(), // 11 or 12
    orderIndex: integer('order_index').notNull(),
    jeeWeightagePct: real('jee_weightage_pct'), // Historical JEE frequency %
  },
  (t) => [index('chapters_subject_idx').on(t.subjectId)],
);

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chapterId: uuid('chapter_id')
      .notNull()
      .references(() => chapters.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    orderIndex: integer('order_index').notNull(),
    difficultyLevel: integer('difficulty_level').default(3), // 1-5
  },
  (t) => [index('topics_chapter_idx').on(t.chapterId)],
);

export const subtopics = pgTable(
  'subtopics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),

    // Expert-curated content
    keyFormulas: jsonb('key_formulas'), // [{latex: string, sympyVerified: bool, description: string}]
    commonMistakes: text('common_mistakes').array(),
    rawContent: text('raw_content'), // Full text from NCERT/source

    // JEE metadata
    pyqFrequency: integer('pyq_frequency').default(0), // Times in PYQs
    estimatedMinutes: integer('estimated_minutes').default(15),
    orderIndex: integer('order_index').notNull(),

    // RAG: vector embedding (BGE-small = 768 dimensions)
    // Populated by the Python ingestion pipeline
    embedding: vector('embedding', { dimensions: 768 }),

    contentStatus: contentStatusEnum('content_status').default('PENDING_REVIEW'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('subtopics_topic_idx').on(t.topicId),
    index('subtopics_status_idx').on(t.contentStatus),
  ],
);

// Prerequisite graph — adjacency table (replaces Neo4j)
// One row = one prerequisite relationship.
// Traverse with recursive CTE in retrieve.ts.
export const prerequisites = pgTable(
  'prerequisites',
  {
    fromSubtopicId: uuid('from_subtopic_id')
      .notNull()
      .references(() => subtopics.id, { onDelete: 'cascade' }),
    toSubtopicId: uuid('to_subtopic_id')
      .notNull()
      .references(() => subtopics.id, { onDelete: 'cascade' }),
    strength: integer('strength').default(1), // 1=helpful, 2=important, 3=required
  },
  (t) => [
    index('prereq_to_idx').on(t.toSubtopicId),
    index('prereq_from_idx').on(t.fromSubtopicId),
  ],
);

// ── Question Bank ──────────────────────────────────────────────────────────

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subtopicId: uuid('subtopic_id')
      .notNull()
      .references(() => subtopics.id, { onDelete: 'cascade' }),

    questionText: text('question_text').notNull(), // LaTeX supported via $$...$$
    questionType: questionTypeEnum('question_type').notNull(),

    // For MCQ/MSQ: [{id: string, text: string, isCorrect?: boolean}]
    // isCorrect is intentionally NOT exposed to client via API
    options: jsonb('options'),

    // CRITICAL: correctAnswer NEVER leaves the server
    // MCQ/INTEGER: {value: string}
    // MSQ: {values: string[]}
    // NUMERICAL: {value: number, tolerance: number}
    correctAnswer: jsonb('correct_answer').notNull(),

    // Step-by-step solution for remediation
    solutionSteps: jsonb('solution_steps'), // [{step: number, explanation: string, math: string}]

    difficultyLevel: integer('difficulty_level').default(3), // 1-5
    expectedTimeSeconds: integer('expected_time_seconds').default(120),
    conceptsTested: text('concepts_tested').array(), // Tags for weakness detection

    yearAppeared: integer('year_appeared'),
    source: contentSourceEnum('source').notNull(),
    status: contentStatusEnum('status').default('PENDING_REVIEW'),

    // For similarity search (find related questions for remediation)
    embedding: vector('embedding', { dimensions: 768 }),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('questions_subtopic_idx').on(t.subtopicId),
    index('questions_status_idx').on(t.status),
    index('questions_type_idx').on(t.questionType),
  ],
);

// ── AI-Generated Content Cache ─────────────────────────────────────────────
// Cache AI explanations so 5000 students don't each trigger a new API call.
// 1 row = 1 subtopic's full teaching JSON. TTL = 24h by default.

export const contentCache = pgTable(
  'content_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subtopicId: uuid('subtopic_id')
      .notNull()
      .references(() => subtopics.id, { onDelete: 'cascade' }),
    mode: text('mode').notNull(), // 'TEACH' | 'SUMMARY'
    content: jsonb('content').notNull(), // Full AI response JSON
    modelVersion: text('model_version').notNull(), // 'claude-sonnet-4-20250514'
    createdAt: timestamp('created_at').defaultNow(),
    expiresAt: timestamp('expires_at'), // Null = never expire
  },
  (t) => [
    index('content_cache_subtopic_mode_idx').on(t.subtopicId, t.mode),
  ],
);

// ── Student Learning State ─────────────────────────────────────────────────

export const studentMastery = pgTable(
  'student_mastery',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subtopicId: uuid('subtopic_id')
      .notNull()
      .references(() => subtopics.id, { onDelete: 'cascade' }),

    // Core mastery metrics
    questionsAttempted: integer('questions_attempted').default(0),
    questionsCorrect: integer('questions_correct').default(0),
    masteryScore: real('mastery_score').default(0), // 0–100
    status: masteryStatusEnum('status').default('NOT_STARTED'),

    // Weakness detection
    weakConceptTags: text('weak_concept_tags').array().default([]),
    avgTimePerQuestionMs: integer('avg_time_per_question_ms'),

    // SM-2 spaced repetition fields
    nextReviewAt: timestamp('next_review_at'),
    intervalDays: real('interval_days').default(1),
    easeFactor: real('ease_factor').default(2.5),
    repetitionCount: integer('repetition_count').default(0),

    lastAttemptAt: timestamp('last_attempt_at'),
    firstAttemptAt: timestamp('first_attempt_at'),
  },
  (t) => [
    uniqueIndex('mastery_user_subtopic_idx').on(t.userId, t.subtopicId),
    index('mastery_user_idx').on(t.userId),
    index('mastery_review_at_idx').on(t.nextReviewAt),
  ],
);

// ── Question Attempts (every answer stored here) ───────────────────────────
// Never aggregate in memory — always query this table for analytics.

export const questionAttempts = pgTable(
  'question_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    subtopicId: uuid('subtopic_id')
      .notNull()
      .references(() => subtopics.id),

    selectedAnswer: jsonb('selected_answer'), // What student chose (raw, not validated here)
    isCorrect: boolean('is_correct').notNull(),
    timeSpentMs: integer('time_spent_ms'),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('attempts_user_idx').on(t.userId),
    index('attempts_question_idx').on(t.questionId),
    index('attempts_subtopic_idx').on(t.subtopicId),
  ],
);

// ── Learning Events (analytics event log) ─────────────────────────────────
// Append-only. Never update rows. Use for drop-off analysis, time-on-task, etc.

export const learningEvents = pgTable(
  'learning_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subtopicId: uuid('subtopic_id').references(() => subtopics.id),

    // 'TEACH_STARTED' | 'TEACH_COMPLETED' | 'QUIZ_STARTED' |
    // 'QUESTION_ANSWERED' | 'MASTERY_ACHIEVED' | 'REVIEW_COMPLETED'
    eventType: text('event_type').notNull(),
    payload: jsonb('payload'), // Event-specific data
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    index('events_user_idx').on(t.userId),
    index('events_type_idx').on(t.eventType),
    index('events_created_idx').on(t.createdAt),
  ],
);

// ── Drizzle Relations ──────────────────────────────────────────────────────

export const subjectsRelations = relations(subjects, ({ many }) => ({
  chapters: many(chapters),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  subject: one(subjects, { fields: [chapters.subjectId], references: [subjects.id] }),
  topics: many(topics),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  chapter: one(chapters, { fields: [topics.chapterId], references: [chapters.id] }),
  subtopics: many(subtopics),
}));

export const subtopicsRelations = relations(subtopics, ({ one, many }) => ({
  topic: one(topics, { fields: [subtopics.topicId], references: [topics.id] }),
  questions: many(questions),
  mastery: many(studentMastery),
  prerequisitesFrom: many(prerequisites, { relationName: 'fromSubtopic' }),
  prerequisitesTo: many(prerequisites, { relationName: 'toSubtopic' }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  mastery: many(studentMastery),
  attempts: many(questionAttempts),
  events: many(learningEvents),
}));

// ── Inferred Types ─────────────────────────────────────────────────────────
// Use these throughout the app — don't re-define your own types.

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Subtopic = typeof subtopics.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type StudentMastery = typeof studentMastery.$inferSelect;
export type QuestionAttempt = typeof questionAttempts.$inferSelect;
export type LearningEvent = typeof learningEvents.$inferSelect;
