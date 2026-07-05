import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || 'placeholder_for_build';

// Single Gemini client — used across all API routes.
// Do NOT create multiple instances; this is the singleton.
export const gemini = new GoogleGenAI({
  apiKey: apiKey,
});

// Current production model. Update here to upgrade everywhere.
export const GEMINI_MODEL = 'gemini-2.5-flash';
