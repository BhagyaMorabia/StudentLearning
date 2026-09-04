import { getFullCurriculum } from '@/lib/db/queries/curriculum';
import { getAuthenticatedClerkUserId } from '@/lib/auth/server';

export async function GET() {
  const userId = await getAuthenticatedClerkUserId();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const curriculum = await getFullCurriculum();
  return Response.json({ success: true, data: curriculum });
}
