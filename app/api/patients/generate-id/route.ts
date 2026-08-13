import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { canManagePatients } from '@/lib/auth/claims';
import { sql } from 'drizzle-orm';

export async function GET() {
  const { sessionClaims } = await auth();
  if (!canManagePatients(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  try {
    // Atomically increment the counter (CockroachDB supports upsert + RETURNING)
    const result = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('patients', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );

    const next = Number(result[0]?.value ?? 1);
    const patientId = `P-${String(next).padStart(5, '0')}`;
    return NextResponse.json({ patientId });
  } catch (error) {
    console.error('Generate Patient ID Error:', error);
    return NextResponse.json({ error: 'Failed to generate ID' }, { status: 500 });
  }
}
