import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { reminders } from '@/lib/db/schema/reminders';
import { isStaff } from '@/lib/auth/claims';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');

  if (!clinicId) {
    return NextResponse.json({ error: 'Missing clinicId' }, { status: 400 });
  }

  try {
    const results = await db
      .select()
      .from(reminders)
      .where(eq(reminders.clinicId, clinicId))
      .orderBy(desc(reminders.startDate));

    return NextResponse.json({ reminders: results });
  } catch (error) {
    console.error('Get Reminders Error:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { clinicId, title, doctorId, doctorName, isAllDay, startDate, endDate } = body;

  if (!clinicId || !title || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing required fields: clinicId, title, startDate, endDate' },
      { status: 400 }
    );
  }

  try {
    // Generate reminder ID
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('reminders', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const reminderId = `REM-${String(next).padStart(5, '0')}`;

    await db.insert(reminders).values({
      reminderId,
      clinicId,
      title,
      doctorId: doctorId || null,
      doctorName: doctorName || null,
      isAllDay: isAllDay || false,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdBy: userId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      reminderId,
    });
  } catch (error) {
    console.error('Create Reminder Error:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}