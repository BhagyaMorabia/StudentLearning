/**
 * retrieve.ts — RAG retrieval: vector search + prerequisite graph traversal
 *
 * The two retrieval strategies:
 * 1. GRAPH: Recursive CTE traverses the prerequisites adjacency table.
 *    "What do students need to know before learning this subtopic?"
 * 2. VECTOR: pgvector cosine similarity finds semantically related content.
 *    "What other subtopics are conceptually close to this one?"
 *
 * Both results feed into context-builder.ts which formats the final Claude prompt.
 */

import { db, neonSql } from '@/lib/db/client';
import { subtopics } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { embed } from './embed';
import type { Subtopic } from '@/lib/db/schema';

export interface RetrievedContext {
  /** The exact subtopic the student is learning */
  targetSubtopic: Subtopic;
  /** Prerequisite subtopics from the knowledge graph (up to 4 levels deep) */
  prerequisites: Subtopic[];
  /** Semantically similar subtopics from vector search */
  similarSubtopics: Subtopic[];
}

/**
 * Main RAG retrieval function.
 * Called by /api/ai/teach before constructing the Claude prompt.
 *
 * @param subtopicId  The subtopic the student wants to learn
 * @param queryText   Optional: if provided, runs vector similarity search too.
 *                    Usually the subtopic name + description.
 */
export async function retrieveContextForSubtopic(
  subtopicId: string,
  queryText?: string,
): Promise<RetrievedContext> {
  // ── 1. Fetch target subtopic ─────────────────────────────────────────────
  const [target] = await db
    .select()
    .from(subtopics)
    .where(eq(subtopics.id, subtopicId))
    .limit(1);

  if (!target) {
    throw new Error(`Subtopic not found: ${subtopicId}`);
  }

  // ── 2. Graph retrieval — prerequisite chain via recursive CTE ────────────
  // Traverses the prerequisites adjacency table up to 4 levels deep.
  // Returns all subtopics that this subtopic depends on (transitively).
  const prereqResult = await db.execute(sql`
    WITH RECURSIVE prereq_chain AS (
      -- Base case: direct prerequisites of the target subtopic
      SELECT from_subtopic_id, 1 AS depth
      FROM prerequisites
      WHERE to_subtopic_id = ${subtopicId}::uuid

      UNION ALL

      -- Recursive case: prerequisites of prerequisites
      SELECT p.from_subtopic_id, pc.depth + 1
      FROM prerequisites p
      JOIN prereq_chain pc ON pc.from_subtopic_id = p.to_subtopic_id
      WHERE pc.depth < 4  -- Max depth 4 prevents infinite loops
    )
    SELECT DISTINCT s.*
    FROM prereq_chain pc
    JOIN subtopics s ON s.id = pc.from_subtopic_id
    WHERE s.content_status = 'VERIFIED'
    ORDER BY s.name
  `);

  const prerequisites = prereqResult.rows as Subtopic[];

  // ── 3. Vector retrieval — semantic similarity search ────────────────────
  let similarSubtopics: Subtopic[] = [];

  if (queryText) {
    try {
      const queryEmbedding = await embed(queryText);
      // Format as pgvector literal: [0.1,0.2,...,0.768]
      const embeddingLiteral = `[${queryEmbedding.join(',')}]`;

      const similarResult = await db.execute(sql`
        SELECT *,
               1 - (embedding <=> ${embeddingLiteral}::vector) AS similarity
        FROM subtopics
        WHERE id != ${subtopicId}::uuid
          AND content_status = 'VERIFIED'
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingLiteral}::vector
        LIMIT 3
      `);

      similarSubtopics = similarResult.rows as Subtopic[];
    } catch (err) {
      // Don't fail the whole request if vector search fails (e.g., no embeddings yet)
      console.warn('[RAG] Vector search failed, falling back to graph-only:', err);
    }
  }

  return {
    targetSubtopic: target,
    prerequisites,
    similarSubtopics,
  };
}
