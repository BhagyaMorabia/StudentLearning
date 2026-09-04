import { z } from 'zod';

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  // Fail-fast startup if Gemini or CRON secrets missing; AI routes + cron recovery
  // will 500 at request-time otherwise and the operator won't know why.
  GEMINI_API_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(16),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  UPSTASH_VECTOR_REST_URL: z.string().url().optional(),
  UPSTASH_VECTOR_REST_TOKEN: z.string().min(1).optional(),
  UPSTASH_VECTOR_LLM_CACHE_NAMESPACE: z.string().min(1).optional(),
  HELICONE_API_KEY: z.string().min(1).optional(),
  REDIS_KEY_PREFIX: z.string().min(1).default('NEURALJEE'),
});

const clientSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
});

function createEnv() {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) {
      console.error('❌ Invalid server environment variables:', parsed.error.flatten().fieldErrors);
      throw new Error('Invalid server environment variables');
    }
  }

  const parsedClient = clientSchema.safeParse({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });

  if (!parsedClient.success) {
    console.error('❌ Invalid client environment variables:', parsedClient.error.flatten().fieldErrors);
    throw new Error('Invalid client environment variables');
  }

  return {
    ...process.env,
  };
}

export const env = createEnv();
