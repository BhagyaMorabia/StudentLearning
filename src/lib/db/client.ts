import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Enable connection caching for serverless environments.
// This reuses connections across invocations, which is critical for Vercel/serverless.
neonConfig.fetchConnectionCache = true;

const databaseUrl = process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

// Create the Neon HTTP client
const sql = neon(databaseUrl);

// Create the Drizzle client with the full schema for type safety
export const db = drizzle(sql, { schema });

// Export sql for raw queries (needed for pgvector cosine similarity)
export { sql as neonSql };
