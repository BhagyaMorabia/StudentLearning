import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY || 'placeholder_for_build';

// Single Anthropic client — used across all API routes.
// Do NOT create multiple instances; this is the singleton.
export const anthropic = new Anthropic({
  apiKey: apiKey,
});

// Current production model. Update here to upgrade everywhere.
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
