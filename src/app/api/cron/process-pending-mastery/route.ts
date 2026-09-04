import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { learningEvents, quizSubmissions, studentMastery } from '@/lib/db/schema';
import { eq, inArray, and, lte } from 'drizzle-orm';
import { computeNextReview } from '@/lib/mastery/spaced-rep';

export async function GET(req: NextRequest) {
  // Only allow Vercel Cron or authorized admin requests
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-vercel-cron');
  
  if (cronHeader !== '1' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Process records that have been stuck for at least 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Fetch up to 50 pending or failed submissions
    const stuckSubmissions = await db
      .select()
      .from(quizSubmissions)
      .where(
        and(
          inArray(quizSubmissions.status, ['PENDING_MASTERY', 'FAILED']),
          lte(quizSubmissions.createdAt, fiveMinutesAgo)
        )
      )
      .limit(50);

    if (stuckSubmissions.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'No stuck submissions found' });
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const submission of stuckSubmissions) {
      try {
        if (!submission.subtopicId) {
          // Chapter-level submissions are aggregated by subtopic inside the
          // per-question questionResults. Skip: chapter-level rows are written
          // exclusively by the submit/after() worker path.
          results.failed++;
          results.errors.push(`Submission ${submission.id}: chapter-level, no subtopicId (skipped by cron)`);
          continue;
        }
        const subtopicIdNonNull: string = submission.subtopicId;

        await db.transaction(async (tx) => {
          // Re-verify it hasn't been processed by another worker
          const [current] = await tx
            .select({ status: quizSubmissions.status })
            .from(quizSubmissions)
            .where(eq(quizSubmissions.id, submission.id))
            .limit(1)
            .for('update');

          if (current?.status === 'PROCESSED') return;

          const resultData = submission.result as { masteryScore: number; totalAttempted: number; totalCorrect: number; status: 'WEAK' | 'NEEDS_REVIEW' | 'MASTERED'; weakConceptTags: string[]; avgTimeMs?: number; questionResults?: { failureMode: string }[] };
          if (!resultData || typeof resultData.masteryScore !== 'number') {
            throw new Error(`Invalid result data for submission ${submission.id}`);
          }

          const [existingMastery] = await tx
            .select()
            .from(studentMastery)
            .where(
              and(
                eq(studentMastery.userId, submission.userId),
                eq(studentMastery.subtopicId, subtopicIdNonNull),
              ),
            )
            .limit(1);

          const now = new Date();
          const newCard = computeNextReview(existingMastery?.fsrsState, resultData.masteryScore);

          if (!existingMastery) {
            await tx.insert(studentMastery).values({
              userId: submission.userId,
              subtopicId: subtopicIdNonNull,
              questionsAttempted: resultData.totalAttempted,
              questionsCorrect: resultData.totalCorrect,
              masteryScore: resultData.masteryScore,
              status: resultData.status,
              weakConceptTags: resultData.weakConceptTags,
              avgTimePerQuestionMs: resultData.avgTimeMs ?? 0,
              firstAttemptAt: now,
              lastAttemptAt: now,
              fsrsState: newCard,
              nextReviewAt: newCard.due,
            });
          } else {
            await tx
              .update(studentMastery)
              .set({
                questionsAttempted: (existingMastery.questionsAttempted ?? 0) + resultData.totalAttempted,
                questionsCorrect: (existingMastery.questionsCorrect ?? 0) + resultData.totalCorrect,
                masteryScore: resultData.masteryScore,
                status: resultData.status,
                weakConceptTags: resultData.weakConceptTags,
                avgTimePerQuestionMs: resultData.avgTimeMs ?? existingMastery.avgTimePerQuestionMs,
                lastAttemptAt: now,
                fsrsState: newCard,
                nextReviewAt: newCard.due,
              })
              .where(eq(studentMastery.id, existingMastery.id));
          }

          const failureModes = Array.isArray(resultData.questionResults)
            ? resultData.questionResults.map((qr) => qr.failureMode ?? 'NONE')
            : [];

          await tx.insert(learningEvents).values({
            userId: submission.userId,
            subtopicId: subtopicIdNonNull,
            eventType: 'QUIZ_COMPLETED',
            payload: {
              score: resultData.masteryScore,
              status: resultData.status,
              totalAttempted: resultData.totalAttempted,
              totalCorrect: resultData.totalCorrect,
              failureModes,
              isCronRecovery: true
            },
          });

          await tx
            .update(quizSubmissions)
            .set({
              status: 'PROCESSED',
              error: null,
              processedAt: now,
            })
            .where(eq(quizSubmissions.id, submission.id));
        });

        results.processed++;
      } catch (err) {
        console.error(`Failed to process stuck submission ${submission.id}:`, err);
        results.failed++;
        results.errors.push(`ID ${submission.id}: ${err instanceof Error ? err.message : String(err)}`);
        
        // Update to FAILED so we can track the error message, but still pick it up next time
        await db
          .update(quizSubmissions)
          .set({
            status: 'FAILED',
            error: err instanceof Error ? err.message : String(err),
          })
          .where(eq(quizSubmissions.id, submission.id));
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    console.error('Mastery Cron Job Failed:', err);
    return NextResponse.json(
      { error: 'Internal server error during mastery sweep', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
