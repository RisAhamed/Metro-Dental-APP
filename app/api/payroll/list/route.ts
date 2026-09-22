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
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!clinicId || ((!month || !year) && (!startDate || !endDate))) {
    return NextResponse.json(
      { error: 'Missing clinicId and (month/year or startDate/endDate)' },
      { status: 400 }
    );
  }

  try {
    if (startDate && endDate) {
      const suffix = `_${clinicId}_${startDate}_${endDate}`;
      const records = await db
        .select()
        .from(monthlyPayroll)
        .where(eq(monthlyPayroll.clinicId, clinicId))
        .orderBy(asc(monthlyPayroll.userName));
      const filtered = records.filter((r) => r.payrollId.endsWith(suffix));
      return NextResponse.json({ records: filtered });
    }
    const records = await db
      .select()
      .from(monthlyPayroll)
      .where(
        and(
          eq(monthlyPayroll.clinicId, clinicId),
          eq(monthlyPayroll.month, month!),
          eq(monthlyPayroll.year, year!)
        )
      )
      .orderBy(asc(monthlyPayroll.userName));

    return NextResponse.json({ records });
  } catch (error) {
    console.error('List Payroll Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 });
  }
}