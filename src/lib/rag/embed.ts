/**
 * embed.ts — Generate text embeddings using @xenova/transformers (BGE-base)
 *
 * BGE-base produces 768-dimensional vectors, matching the pgvector schema.
 * The model is downloaded once (~90MB) and cached in .cache/ on first use.
 * Subsequent calls are fast (model stays in memory during the process lifetime).
 *
 * This runs server-side only (Node.js). Never import this in a client component.
 */

// We use dynamic import so Next.js doesn't try to bundle this for the browser.
// @xenova/transformers is in serverExternalPackages in next.config.ts.

let pipeline: ((input: string | string[], options?: object) => Promise<{ data: Float32Array }>) | null = null;

async function getPipeline() {
  if (pipeline) return pipeline;

  // Dynamic import — only runs on the server
  const { pipeline: createPipeline, env } = await import('@xenova/transformers');

  // Cache the model in the project root .cache/ directory
  env.cacheDir = './.cache';

  // BAAI/bge-small-en-v1.5 — 768 dimensions, excellent for semantic search
  // Using 'feature-extraction' task with mean pooling + normalize
  pipeline = (await createPipeline(
    'feature-extraction',
    'Xenova/bge-base-en-v1.5',
    { quantized: true }, // Use ONNX quantized model — 4x smaller, still accurate
  )) as any;

  return pipeline;
}

/**
 * Embed a text string into a 768-dimensional vector.
 * Used in the RAG retrieval pipeline for:
 * 1. Query-time: embed the subtopic name/description to find similar content
 * 2. Ingestion-time (Python script also embeds — this is for query only)
 */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getPipeline();

  if (!extractor) {
    throw new Error('Failed to initialize embedding pipeline');
  }

  // BGE models expect a specific prefix for retrieval queries
  const prefixedText = `Represent this sentence for searching relevant passages: ${text}`;

  const result = await extractor(prefixedText, {
    pooling: 'mean',
    normalize: true,
  });

  // Convert Float32Array to regular number[]
  return Array.from(result.data);
}
