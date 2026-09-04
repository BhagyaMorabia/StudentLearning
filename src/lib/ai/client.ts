import { GoogleGenAI } from '@google/genai';
import 'server-only';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for AI routes');
  }

  geminiClient ??= new GoogleGenAI({ apiKey });
  return geminiClient;
}

export const GEMINI_MODEL = 'gemini-2.5-flash';
