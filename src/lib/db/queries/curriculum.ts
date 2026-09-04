import { db } from '@/lib/db/client';
import { subjects, chapters, topics, subtopics } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { Subject, Chapter, Topic, Subtopic } from '@/lib/db/schema';

// ── Subjects ───────────────────────────────────────────────────────────────

export async function getSubjects(): Promise<Subject[]> {
  return db.select().from(subjects).orderBy(asc(subjects.orderIndex));
}

// ── Chapters ───────────────────────────────────────────────────────────────

export async function getChaptersBySubject(subjectId: string): Promise<Chapter[]> {
  return db
    .select()
    .from(chapters)
    .where(eq(chapters.subjectId, subjectId))
    .orderBy(asc(chapters.orderIndex));
}
export async function getChapter(chapterId: string): Promise<Chapter | null> {
  const [result] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  return result ?? null;
}

// ── Topics ─────────────────────────────────────────────────────────────────

export async function getTopicsByChapter(chapterId: string): Promise<Topic[]> {
  return db
    .select()
    .from(topics)
    .where(eq(topics.chapterId, chapterId))
    .orderBy(asc(topics.orderIndex));
}

// ── Subtopics ──────────────────────────────────────────────────────────────

export async function getSubtopicsByTopic(topicId: string): Promise<Subtopic[]> {
  return db
    .select()
    .from(subtopics)
    .where(eq(subtopics.topicId, topicId))
    .orderBy(asc(subtopics.orderIndex));
}

export async function getSubtopic(subtopicId: string): Promise<Subtopic | null> {
  const [result] = await db
    .select()
    .from(subtopics)
    .where(eq(subtopics.id, subtopicId))
    .limit(1);
  return result ?? null;
}

export interface SubtopicNeighbor {
  id: string;
  name: string;
}

export interface SubtopicContext {
  subtopic: Subtopic;
  subjectName: string;
  chapterName: string;
  previous: SubtopicNeighbor | null;
  next: SubtopicNeighbor | null;
}

export async function getSubtopicContext(subtopicId: string): Promise<SubtopicContext | null> {
  const [row] = await db
    .select({
      subtopic: subtopics,
      topicId: topics.id,
      chapterName: chapters.name,
      subjectName: subjects.name,
    })
    .from(subtopics)
    .innerJoin(topics, eq(subtopics.topicId, topics.id))
    .innerJoin(chapters, eq(topics.chapterId, chapters.id))
    .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
    .where(eq(subtopics.id, subtopicId))
    .limit(1);

  if (!row) return null;

  const siblings = await db
    .select({
      id: subtopics.id,
      name: subtopics.name,
    })
    .from(subtopics)
    .where(eq(subtopics.topicId, row.topicId))
    .orderBy(asc(subtopics.orderIndex));

  const index = siblings.findIndex((s) => s.id === subtopicId);

  return {
    subtopic: row.subtopic,
    subjectName: row.subjectName,
    chapterName: row.chapterName,
    previous: index > 0 ? siblings[index - 1] : null,
    next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null,
  };
}

// ── Full curriculum tree ────────────────────────────────────────────────────
// Single-query joined tree via drizzle `withRelations`.  4x fewer DB round
// trips vs the legacy N+1 pattern.  Column whitelist strips the 768-dim
// `embedding` vector plus all heavy content columns from both the wire
// payload and server memory on every curriculum browser / sidebar load.

type _SubtopicLite = Pick<
  Subtopic,
  | 'id'
  | 'topicId'
  | 'name'
  | 'description'
  | 'orderIndex'
  | 'contentStatus'
>;

export interface CurriculumTree {
  subject: Subject;
  chapters: Array<{
    chapter: Chapter;
    topics: Array<{
      topic: Topic;
      subtopics: _SubtopicLite[];
    }>;
  }>;
}

type _SubjectCols = { id: true; name: true; examType: true; orderIndex: true };
type _ChapterCols = {
  id: true; subjectId: true; name: true; classYear: true;
  orderIndex: true; jeeWeightagePct: true;
};
type _TopicCols = {
  id: true; chapterId: true; name: true; orderIndex: true; difficultyLevel: true;
};
type _SubtopicCols = {
  id: true; topicId: true; name: true; description: true;
  orderIndex: true; contentStatus: true;
};

export async function getFullCurriculum(): Promise<CurriculumTree[]> {
  const rows = await db.query.subjects.findMany({
    columns: { id: true, name: true, examType: true, orderIndex: true } satisfies _SubjectCols,
    with: {
      chapters: {
        columns: {
          id: true, subjectId: true, name: true, classYear: true,
          orderIndex: true, jeeWeightagePct: true,
        } satisfies _ChapterCols,
        orderBy: asc(chapters.orderIndex),
        with: {
          topics: {
            columns: {
              id: true, chapterId: true, name: true, orderIndex: true,
              difficultyLevel: true,
            } satisfies _TopicCols,
            orderBy: asc(topics.orderIndex),
            with: {
              subtopics: {
                columns: {
                  id: true, topicId: true, name: true, description: true,
                  orderIndex: true, contentStatus: true,
                } satisfies _SubtopicCols,
                orderBy: asc(subtopics.orderIndex),
              },
            },
          },
        },
      },
    },
    orderBy: asc(subjects.orderIndex),
  });

  return rows.map(({ chapters: relChapters, ...subject }) => ({
    subject: subject as Subject,
    chapters: relChapters.map(({ topics: relTopics, ...chapter }) => ({
      chapter: chapter as Chapter,
      topics: relTopics.map(({ subtopics: relSubtopics, ...topic }) => ({
        topic: topic as Topic,
        subtopics: relSubtopics as _SubtopicLite[],
      })),
    })),
  }));
}
