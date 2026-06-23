import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

import { subjects, chapters, topics } from './schema';

async function seed() {
  console.log('Seeding subjects, chapters, and topics...');

  // 1. Clean existing data (optional, but good for clean slate)
  // Note: cascades will handle topics and subtopics if table truncate is clean, but let's do safe inserts.

  // 2. Insert Subjects
  const physicsSubjectId = 'a1e944db-6fb9-4869-a994-a28dd316ccaa'; // Static UUIDs to keep it predictable
  const mathSubjectId = 'b2e944db-6fb9-4869-a994-a28dd316ccab';

  console.log('Inserting subjects...');
  await db.insert(subjects).values([
    {
      id: physicsSubjectId,
      name: 'Physics',
      examType: 'BOTH',
      orderIndex: 1,
    },
    {
      id: mathSubjectId,
      name: 'Mathematics',
      examType: 'BOTH',
      orderIndex: 2,
    },
  ]).onConflictDoNothing();

  // 3. Insert Chapters
  const gravitationChapterId = 'c3e944db-6fb9-4869-a994-a28dd316ccac';
  const heightsChapterId = 'd4e944db-6fb9-4869-a994-a28dd316ccad';

  console.log('Inserting chapters...');
  await db.insert(chapters).values([
    {
      id: gravitationChapterId,
      subjectId: physicsSubjectId,
      name: 'Gravitation',
      classYear: 11,
      orderIndex: 1,
      jeeWeightagePct: 4.5,
    },
    {
      id: heightsChapterId,
      subjectId: mathSubjectId,
      name: 'Heights and Distances',
      classYear: 11,
      orderIndex: 1,
      jeeWeightagePct: 2.0,
    },
  ]).onConflictDoNothing();

  // 4. Insert Topics (which act as parents for subtopics in PDF ingestion)
  const classicalGravitationTopicId = 'e5e944db-6fb9-4869-a994-a28dd316ccae';
  const trigAppsTopicId = 'f6e944db-6fb9-4869-a994-a28dd316ccaf';

  console.log('Inserting topics...');
  await db.insert(topics).values([
    {
      id: classicalGravitationTopicId,
      chapterId: gravitationChapterId,
      name: 'Classical Gravitation & Satellite Motion',
      orderIndex: 1,
      difficultyLevel: 3,
    },
    {
      id: trigAppsTopicId,
      chapterId: heightsChapterId,
      name: 'Trigonometric Applications',
      orderIndex: 1,
      difficultyLevel: 2,
    },
  ]).onConflictDoNothing();

  console.log('Seeding completed successfully!');
  console.log('\nUse these Topic IDs for your PDF ingestion pipeline:');
  console.log(`Physics - Gravitation Topic ID:     ${classicalGravitationTopicId}`);
  console.log(`Mathematics - Heights Topic ID:     ${trigAppsTopicId}`);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
