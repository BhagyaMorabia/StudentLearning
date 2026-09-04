CREATE TABLE "content_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subtopic_id" uuid NOT NULL,
	"page_type" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"word_count" integer NOT NULL,
	"source_hash" text NOT NULL,
	"embedding" vector(768),
	"content_status" "content_status" DEFAULT 'AI_GENERATED',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quiz_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subtopic_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'PENDING_MASTERY' NOT NULL,
	"result" jsonb NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "content_chunks" ADD CONSTRAINT "content_chunks_subtopic_id_subtopics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_submissions" ADD CONSTRAINT "quiz_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_submissions" ADD CONSTRAINT "quiz_submissions_subtopic_id_subtopics_id_fk" FOREIGN KEY ("subtopic_id") REFERENCES "public"."subtopics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_chunks_subtopic_page_chunk_idx" ON "content_chunks" USING btree ("subtopic_id","page_type","chunk_index");--> statement-breakpoint
CREATE INDEX "content_chunks_subtopic_idx" ON "content_chunks" USING btree ("subtopic_id");--> statement-breakpoint
CREATE INDEX "content_chunks_status_idx" ON "content_chunks" USING btree ("content_status");--> statement-breakpoint
CREATE INDEX "content_chunks_embedding_hnsw_idx" ON "content_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_submissions_user_idempotency_idx" ON "quiz_submissions" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "quiz_submissions_user_created_idx" ON "quiz_submissions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "quiz_submissions_status_created_idx" ON "quiz_submissions" USING btree ("status","created_at");