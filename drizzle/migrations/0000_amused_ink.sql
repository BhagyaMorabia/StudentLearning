CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."content_source" AS ENUM('NCERT', 'NTA_PYQ', 'AI_GENERATED', 'EXPERT_VERIFIED');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('PENDING_REVIEW', 'AI_GENERATED', 'VERIFIED', 'REJECTED', 'FLAGGED');--> statement-breakpoint
CREATE TYPE "public"."exam_type" AS ENUM('JEE_MAINS', 'JEE_ADVANCED', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."mastery_status" AS ENUM('NOT_STARTED', 'WEAK', 'NEEDS_REVIEW', 'MASTERED');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('MCQ', 'MSQ', 'INTEGER', 'NUMERICAL');--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"name" text NOT NULL,
	"class_year" integer NOT NULL,
	"order_index" integer NOT NULL,
	"jee_weightage_pct" real
);
--> statement-breakpoint
CREATE TABLE "content_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subtopic_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"content" jsonb NOT NULL,
	"model_version" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "learning_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subtopic_id" uuid,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prerequisites" (
	"from_subtopic_id" uuid NOT NULL,
	"to_subtopic_id" uuid NOT NULL,
	"strength" integer DEFAULT 1,
	CONSTRAINT "prerequisites_from_subtopic_id_to_subtopic_id_pk" PRIMARY KEY("from_subtopic_id","to_subtopic_id")
);
--> statement-breakpoint
CREATE TABLE "question_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"subtopic_id" uuid NOT NULL,
	"selected_answer" jsonb,
	"is_correct" boolean NOT NULL,
	"time_spent_ms" integer,
	"option_switch_count" integer DEFAULT 0,
	"detected_failure_mode" text,
	"activated_misconception_id" text,
	"remediation_triggered" boolean DEFAULT false,
	"near_transfer_passed" boolean,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subtopic_id" uuid NOT NULL,
	"question_text" text NOT NULL,
	"question_type" "question_type" NOT NULL,
	"options" jsonb,
	"correct_answer" jsonb NOT NULL,
	"solution_steps" jsonb,
	"difficulty_level" integer DEFAULT 3,
	"expected_time_seconds" integer DEFAULT 120,
	"concepts_tested" text[],
	"year_appeared" integer,
	"source" "content_source" NOT NULL,
	"status" "content_status" DEFAULT 'PENDING_REVIEW',
	"embedding" vector(768),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subtopic_id" uuid NOT NULL,
	"questions_attempted" integer DEFAULT 0,
	"questions_correct" integer DEFAULT 0,
	"mastery_score" real DEFAULT 0,
	"status" "mastery_status" DEFAULT 'NOT_STARTED',
	"weak_concept_tags" text[] DEFAULT '{}',
	"avg_time_per_question_ms" integer,
	"next_review_at" timestamp,
	"fsrs_state" jsonb,
	"last_attempt_at" timestamp,
	"first_attempt_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"exam_type" "exam_type" DEFAULT 'BOTH',
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtopics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"key_formulas" jsonb,
	"common_mistakes" text[],
	"raw_content" text,
	"content_foundation" text,
	"content_deep_concepts" text,
	"content_formulas" text,
	"content_practice" text,
	"pyq_frequency" integer DEFAULT 0,
	"estimated_minutes" integer DEFAULT 15,
	"order_index" integer NOT NULL,
	"embedding" vector(768),
	"content_status" "content_status" DEFAULT 'PENDING_REVIEW',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"name" text NOT NULL,
	"order_index" integer NOT NULL,
	"difficulty_level" integer DEFAULT 3
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"target_exam" "exam_type" DEFAULT 'BOTH',
	"target_year" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_cache" ADD CONSTRAINT "content_cache_subtopic_id_subtopics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_subtopic_id_subtopics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prerequisites" ADD CONSTRAINT "prerequisites_from_subtopic_id_subtopics_id_fk" FOREIGN KEY ("from_subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prerequisites" ADD CONSTRAINT "prerequisites_to_subtopic_id_subtopics_id_fk" FOREIGN KEY ("to_subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_subtopic_id_subtopics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subtopic_id_subtopics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_mastery" ADD CONSTRAINT "student_mastery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_mastery" ADD CONSTRAINT "student_mastery_subtopic_id_subtopics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtopics" ADD CONSTRAINT "subtopics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapters_subject_idx" ON "chapters" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "content_cache_subtopic_mode_idx" ON "content_cache" USING btree ("subtopic_id","mode");--> statement-breakpoint
CREATE INDEX "events_user_idx" ON "learning_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "learning_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "events_created_idx" ON "learning_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "prereq_to_idx" ON "prerequisites" USING btree ("to_subtopic_id");--> statement-breakpoint
CREATE INDEX "prereq_from_idx" ON "prerequisites" USING btree ("from_subtopic_id");--> statement-breakpoint
CREATE INDEX "attempts_user_idx" ON "question_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attempts_question_idx" ON "question_attempts" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "attempts_subtopic_idx" ON "question_attempts" USING btree ("subtopic_id");--> statement-breakpoint
CREATE INDEX "questions_subtopic_idx" ON "questions" USING btree ("subtopic_id");--> statement-breakpoint
CREATE INDEX "questions_status_idx" ON "questions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "questions_type_idx" ON "questions" USING btree ("question_type");--> statement-breakpoint
CREATE INDEX "questions_embedding_hnsw_idx" ON "questions" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "mastery_user_subtopic_idx" ON "student_mastery" USING btree ("user_id","subtopic_id");--> statement-breakpoint
CREATE INDEX "mastery_user_idx" ON "student_mastery" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mastery_review_at_idx" ON "student_mastery" USING btree ("next_review_at");--> statement-breakpoint
CREATE INDEX "subtopics_topic_idx" ON "subtopics" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "subtopics_status_idx" ON "subtopics" USING btree ("content_status");--> statement-breakpoint
CREATE INDEX "subtopics_embedding_hnsw_idx" ON "subtopics" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "topics_chapter_idx" ON "topics" USING btree ("chapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_id");
