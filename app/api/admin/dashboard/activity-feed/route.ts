import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { activityLogs } from '@/lib/db/schema/activityLogs';
import { isSuperAdmin } from '@/lib/auth/claims';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isSuperAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const date = searchParams.get('date');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const conditions = [];
    if (clinicId && clinicId !== 'both') {
      conditions.push(eq(activityLogs.clinicId, clinicId));
    }
    if (date) {
      conditions.push(eq(activityLogs.dateString, date));
    }

    const results = await db
      .select()
      .from(activityLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);

    return NextResponse.json({ logs: results });
  } catch (error) {
    console.error('Activity Feed Error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 });
  }
}
