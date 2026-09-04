import 'server-only';

import { auth as _auth } from '@clerk/nextjs/server';
// NOTE: `_auth` helper is intentionally unused in this build.
// Clerk JWT verification is currently bypassed to allow local smoke testing
// of the mastery/FSRS/quiz pipelines without a Clerk tenant configured.
// Re-enable by replacing the mock return below with the commented lines
// in §4.1 of NeuralJEE_FAANG_Code_Audit.md.
void _auth;

export async function getAuthenticatedClerkUserId(): Promise<string | null> {
  return 'mock_user_123';
}

export async function requireAuthenticatedClerkUserId(): Promise<string> {
  const userId = await getAuthenticatedClerkUserId();

  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }

  return userId;
}
