/**
 * POST /api/webhooks/clerk
 *
 * Receives Clerk webhook events and syncs users to our database.
 * SECURITY: Verify the svix signature before processing any event.
 * An unsigned request to this endpoint could insert arbitrary users.
 *
 * Setup in Clerk Dashboard:
 * 1. Webhooks → Add endpoint → your-domain/api/webhooks/clerk
 * 2. Subscribe to: user.created, user.updated, user.deleted
 * 3. Copy the Signing Secret → CLERK_WEBHOOK_SECRET in .env.local
 */

import { NextRequest } from 'next/server';
import { Webhook } from 'svix';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Svix webhook event types we handle
interface ClerkUserEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export async function POST(req: NextRequest) {
  // ── 1. Verify svix signature ─────────────────────────────────────────────
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[webhook/clerk] CLERK_WEBHOOK_SECRET not set');
    return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const svixId = req.headers.get('svix-id');
  const svixTimestamp = req.headers.get('svix-timestamp');
  const svixSignature = req.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await req.text(); // Must read as text for signature verification

  let event: ClerkUserEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent;
  } catch (err) {
    console.error('[webhook/clerk] Signature verification failed:', err);
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── 2. Handle event types ────────────────────────────────────────────────
  const { type, data } = event;

  try {
    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const primaryEmail = data.email_addresses.find(
          (e) => e.id === data.primary_email_address_id,
        );
        const email = primaryEmail?.email_address ?? data.email_addresses[0]?.email_address ?? '';
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;

        await db
          .insert(users)
          .values({ clerkId: data.id, email, name })
          .onConflictDoUpdate({
            target: users.clerkId,
            set: { email, name, updatedAt: new Date() },
          });

        console.log(`[webhook/clerk] Synced user ${data.id} (${type})`);
        break;
      }

      case 'user.deleted': {
        // Soft-delete: cascade deletes from users → all related data
        await db.delete(users).where(eq(users.clerkId, data.id));
        console.log(`[webhook/clerk] Deleted user ${data.id}`);
        break;
      }
    }
  } catch (err) {
    console.error('[webhook/clerk] DB operation failed:', err);
    return Response.json({ error: 'Database error' }, { status: 500 });
  }

  return Response.json({ success: true });
}
