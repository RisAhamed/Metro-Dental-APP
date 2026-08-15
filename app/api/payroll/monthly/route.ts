import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { monthlyPayroll } from '@/lib/db/schema/monthlyPayroll';
import { isStaff } from '@/lib/auth/claims';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const clinicId = searchParams.get('clinicId');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  if (!userId || !clinicId || !month || !year) {
    return NextResponse.json(
      { error: 'Missing userId, clinicId, month, year' },
      { status: 400 }
    );
  }

  try {
    const payroll = await db
      .select()
      .from(monthlyPayroll)
      .where(
        and(
          eq(monthlyPayroll.userId, userId),
          eq(monthlyPayroll.clinicId, clinicId),
          eq(monthlyPayroll.month, month),
          eq(monthlyPayroll.year, year)
        )
      )
      .limit(1);

    return NextResponse.json({ payroll: payroll[0] || null });
  } catch (error) {
    console.error('Get Monthly Payroll Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 });
  }
}