import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// Generate the next sequential ID for a given counter key + prefix
// e.g. nextId('visits', 'VIS-') => VIS-00001
export async function nextId(counterKey: string, prefix: string, padLength = 5): Promise<string> {
  const counterResult = await db.execute(
    sql`INSERT INTO counters (key, value) VALUES (${counterKey}, 1)
        ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
        RETURNING value`
  );
  const next = Number(counterResult[0]?.value ?? 1);
  return `${prefix}${String(next).padStart(padLength, '0')}`;
}