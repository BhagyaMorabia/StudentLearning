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

import { db } from '@/lib/db/client';
import { subtopics } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { embed } from './embed';
import type { ContentChunk, Subtopic } from '@/lib/db/schema';

function mapToSubtopic(row: Record<string, unknown>): Subtopic {
  return {
    id: row.id as Subtopic['id'],
    topicId: row.topic_id as Subtopic['topicId'],
    name: row.name as Subtopic['name'],
    description: row.description as Subtopic['description'],
    keyFormulas: row.key_formulas as Subtopic['keyFormulas'],
    commonMistakes: row.common_mistakes as Subtopic['commonMistakes'],
    rawContent: row.raw_content as Subtopic['rawContent'],
    contentFoundation: row.content_foundation as Subtopic['contentFoundation'],
    contentDeepConcepts: row.content_deep_concepts as Subtopic['contentDeepConcepts'],
    contentFormulas: row.content_formulas as Subtopic['contentFormulas'],
    contentPractice: row.content_practice as Subtopic['contentPractice'],
    pyqFrequency: row.pyq_frequency as Subtopic['pyqFrequency'],
    estimatedMinutes: row.estimated_minutes as Subtopic['estimatedMinutes'],
    orderIndex: row.order_index as Subtopic['orderIndex'],
    contentStatus: row.content_status as Subtopic['contentStatus'],
    createdAt: row.created_at as Subtopic['createdAt'],
    embedding: (row.embedding ?? null) as unknown as Subtopic['embedding'],
  };
}

export interface RetrievedChunk
  extends Pick<ContentChunk, 'id' | 'subtopicId' | 'pageType' | 'chunkIndex' | 'content' | 'wordCount'> {
  similarity: number;
}

export interface RetrievedContext {
  /** The exact subtopic the student is learning */
  targetSubtopic: Subtopic;
  /** Prerequisite subtopics from the knowledge graph (up to 4 levels deep) */
  prerequisites: Subtopic[];
  /** Semantically similar subtopics from vector search */
  similarSubtopics: Subtopic[];
  /** Most relevant verified page chunks from chunk-level vector search */
  relevantChunks: RetrievedChunk[];
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

  const prerequisites = prereqResult.rows.map(mapToSubtopic);

  // ── 3. Vector retrieval — semantic similarity search ────────────────────
  let similarSubtopics: Subtopic[] = [];
  let relevantChunks: RetrievedChunk[] = [];

  const semanticQuery = queryText ?? [target.name, target.description].filter(Boolean).join('\n');

  if (semanticQuery) {
    try {
      const queryEmbedding = await embed(semanticQuery);
      if (queryEmbedding.length !== 768) {
        throw new Error(`Expected 768-dimensional embedding, received ${queryEmbedding.length}`);
      }
      // Format as pgvector literal: [0.1,0.2,...,0.768]
      const embeddingLiteral = `[${queryEmbedding.join(',')}]`;

      const chunkResult = await db.execute(sql`
        SELECT id,
               subtopic_id AS "subtopicId",
               page_type AS "pageType",
               chunk_index AS "chunkIndex",
               content,
               word_count AS "wordCount",
               1 - (embedding <=> ${embeddingLiteral}::vector) AS similarity
        FROM content_chunks
        WHERE subtopic_id = ${subtopicId}::uuid
          AND content_status IN ('AI_GENERATED', 'VERIFIED')
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingLiteral}::vector
        LIMIT 8
      `);

      relevantChunks = chunkResult.rows as unknown as RetrievedChunk[];

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

      similarSubtopics = similarResult.rows.map(mapToSubtopic);
    } catch (err) {
      // Don't fail the whole request if vector search fails (e.g., no embeddings yet)
      console.warn('[RAG] Vector search failed, falling back to graph-only:', err);
    }
  }

  return {
    targetSubtopic: target,
    prerequisites,
    similarSubtopics,
    relevantChunks,
  };
}
