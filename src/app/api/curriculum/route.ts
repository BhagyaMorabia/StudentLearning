import { auth } from '@clerk/nextjs/server';
import { getFullCurriculum } from '@/lib/db/queries/curriculum';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const curriculum = await getFullCurriculum();
  return Response.json({ success: true, data: curriculum });
}
