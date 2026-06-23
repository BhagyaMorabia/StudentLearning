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

// ── Full curriculum tree ────────────────────────────────────────────────────
// Joins all levels. Useful for sidebar navigation.

export interface CurriculumTree {
  subject: Subject;
  chapters: Array<{
    chapter: Chapter;
    topics: Array<{
      topic: Topic;
      subtopics: Subtopic[];
    }>;
  }>;
}

export async function getFullCurriculum(): Promise<CurriculumTree[]> {
  const allSubjects = await getSubjects();
  const allChapters = await db.select().from(chapters).orderBy(asc(chapters.orderIndex));
  const allTopics = await db.select().from(topics).orderBy(asc(topics.orderIndex));
  const allSubtopics = await db
    .select()
    .from(subtopics)
    .orderBy(asc(subtopics.orderIndex));

  return allSubjects.map((subject) => ({
    subject,
    chapters: allChapters
      .filter((c) => c.subjectId === subject.id)
      .map((chapter) => ({
        chapter,
        topics: allTopics
          .filter((t) => t.chapterId === chapter.id)
          .map((topic) => ({
            topic,
            subtopics: allSubtopics.filter((s) => s.topicId === topic.id),
          })),
      })),
  }));
}
