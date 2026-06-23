import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function getOrCreateTopic(subjectName: string, classYear: number, chapterNum: number) {
  // 1. Subject
  let subject = await db.query.subjects.findFirst({
    where: eq(schema.subjects.name, subjectName)
  });
  if (!subject) {
    const id = uuidv4();
    await db.insert(schema.subjects).values({
      id, name: subjectName, examType: 'BOTH', orderIndex: subjectName === 'Physics' ? 1 : subjectName === 'Mathematics' ? 2 : 3
    });
    subject = { id } as any;
  }

  // 2. Chapter
  const chapterName = `Chapter ${chapterNum}`;
  let chapter = await db.query.chapters.findFirst({
    where: and(
      eq(schema.chapters.subjectId, subject!.id),
      eq(schema.chapters.classYear, classYear),
      eq(schema.chapters.orderIndex, chapterNum)
    )
  });
  if (!chapter) {
    const id = uuidv4();
    await db.insert(schema.chapters).values({
      id, subjectId: subject!.id, name: chapterName, classYear, orderIndex: chapterNum, jeeWeightagePct: 2.0
    });
    chapter = { id } as any;
  }

  // 3. Topic
  const topicName = `${subjectName} Class ${classYear} Chapter ${chapterNum}`;
  let topic = await db.query.topics.findFirst({
    where: eq(schema.topics.chapterId, chapter!.id)
  });
  if (!topic) {
    const id = uuidv4();
    await db.insert(schema.topics).values({
      id, chapterId: chapter!.id, name: topicName, orderIndex: 1, difficultyLevel: 3
    });
    topic = { id } as any;
  }

  console.log(topic!.id);
  process.exit(0);
}

const args = process.argv.slice(2);
const subject = args[0];
const classYear = parseInt(args[1]);
const chapterNum = parseInt(args[2]);

getOrCreateTopic(subject, classYear, chapterNum).catch(err => {
  console.error(err);
  process.exit(1);
});
