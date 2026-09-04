import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import 'server-only';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for database access');
}

// Create the Neon Serverless client (WebSocket pool) to support transactions
const pool = new Pool({ connectionString: databaseUrl });

// Global singleton to prevent hot-reloading connection exhaustion in dev
const globalForDb = globalThis as unknown as {
  dbPool: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

export const db = globalForDb.dbPool ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbPool = db;
}

