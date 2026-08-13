import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema/notifications';
import { sql } from 'drizzle-orm';

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  clinicId?: string | null;
}

export async function notifyUser(input: NotifyInput): Promise<string> {
  const counterResult = await db.execute(
    sql`INSERT INTO counters (key, value) VALUES ('notifications', 1)
        ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
        RETURNING value`
  );
  const next = Number(counterResult[0]?.value ?? 1);
  const notifId = `NOTIF-${String(next).padStart(6, '0')}`;

  await db.insert(notifications).values({
    notifId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link || null,
    clinicId: input.clinicId || null,
    isRead: false,
    createdAt: new Date(),
  });

  return notifId;
}