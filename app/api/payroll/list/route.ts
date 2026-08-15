import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { monthlyPayroll } from '@/lib/db/schema/monthlyPayroll';
import { isSuperAdmin } from '@/lib/auth/claims';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isSuperAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  if (!clinicId || !month || !year) {
    return NextResponse.json(
      { error: 'Missing clinicId, month, year' },
      { status: 400 }
    );
  }

  try {
    const records = await db
      .select()
      .from(monthlyPayroll)
      .where(
        and(
          eq(monthlyPayroll.clinicId, clinicId),
          eq(monthlyPayroll.month, month),
          eq(monthlyPayroll.year, year)
        )
      )
      .orderBy(asc(monthlyPayroll.userName));

    return NextResponse.json({ records });
  } catch (error) {
    console.error('List Payroll Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 });
  }
}