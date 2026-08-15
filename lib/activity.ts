import { db } from '@/lib/db';
import { activityLogs } from '@/lib/db/schema/activityLogs';
import { sql } from 'drizzle-orm';

export interface LogActivityInput {
  clinicId: string;
  type: string;
  message: string;
  userId: string;
  userName: string;
  userRole?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
  date?: Date;
}

const toISTDateString = (date: Date): string => {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

// Writes an entry to activity_logs. Best-effort: failures are logged, not thrown.
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('activity_logs', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const logId = `LOG-${String(next).padStart(5, '0')}`;
    const at = input.date || new Date();

    await db.insert(activityLogs).values({
      logId,
      clinicId: input.clinicId,
      dateString: toISTDateString(at),
      type: input.type,
      message: input.message,
      userId: input.userId,
      userName: input.userName,
      userRole: input.userRole || null,
      relatedEntityType: input.relatedEntityType || null,
      relatedEntityId: input.relatedEntityId || null,
      metadata: input.metadata || null,
      createdAt: at,
    });
  } catch (error) {
    console.error('logActivity error:', error);
  }
}
