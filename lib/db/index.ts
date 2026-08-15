import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// prepare: false is required for CockroachDB compatibility (no prepared statements)
// max: 1 keeps a single connection per serverless instance to avoid exhausting
// CockroachDB's connection limit on shared/serverless instances.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 15,
});
export const db = drizzle(client, { schema });

export type DB = typeof db;
