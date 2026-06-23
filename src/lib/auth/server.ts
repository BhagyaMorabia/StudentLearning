/**
 * Auth server helpers — wrappers around Clerk for server-side use.
 *
 * Use these in API routes and Server Components to get the current user.
 * Never use Clerk's auth() directly in multiple places — centralizing
 * here makes it easy to add logging, error handling, or swap auth providers.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get the Clerk userId from the current request.
 * Throws a 401-compatible error if the user is not authenticated.
 */
export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }
  return userId;
}

/**
 * Get the internal DB userId from a Clerk userId.
 * Returns null if the user hasn't been synced yet (webhook pending).
 */
export async function getInternalUserId(clerkId: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user?.id ?? null;
}

/**
 * Sync a Clerk user to the database.
 * Called by the webhook route (/api/webhooks/clerk).
 * Safe to call multiple times — upserts on clerkId.
 */
export async function syncUserToDb(clerkId: string): Promise<void> {
  const clerkUser = await currentUser();
  if (!clerkUser) return;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
  const name = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || null;

  await db
    .insert(users)
    .values({
      clerkId,
      email,
      name,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { email, name, updatedAt: new Date() },
    });
}
