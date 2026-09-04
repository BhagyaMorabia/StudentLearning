/**
 * Generate 768-dimensional query embeddings with Gemini.
 */

import { GoogleGenAI } from '@google/genai';
import 'server-only';

let embeddingClient: GoogleGenAI | null = null;

function getEmbeddingClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for embedding generation');
  }

  embeddingClient ??= new GoogleGenAI({ apiKey });
  return embeddingClient;
}

export async function embed(text: string): Promise<number[]> {
  try {
    const response = await getEmbeddingClient().models.embedContent({
      model: 'text-embedding-004',
      contents: `Represent this sentence for searching relevant passages: ${text}`,
      config: {
        outputDimensionality: 768,
      },
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length !== 768) {
      throw new Error(`Expected 768-dimensional embedding, received ${values?.length ?? 0}`);
    }

    return values;
  } catch (error) {
    console.error('[Embedding Error]: Failed to generate vector with Gemini', error);
    throw new Error('Failed to generate embedding');
  }
}
