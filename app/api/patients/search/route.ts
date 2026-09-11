import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { patients } from '@/lib/db/schema/patients';
import { or, like } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!sessionClaims) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';

  if (query.length < 2) {
    return NextResponse.json({ patients: [] });
  }

  try {
    const results = await db
      .select({
        patientId: patients.patientId,
        name: patients.name,
        gender: patients.gender,
        age: patients.age,
        primaryPhone: patients.primaryPhone,
      })
      .from(patients)
      .where(
        or(
          like(patients.name, `%${query}%`),
          like(patients.patientId, `%${query}%`),
          like(patients.primaryPhone, `%${query}%`)
        )
      )
      .limit(10);

    return NextResponse.json({ patients: results });
  } catch (error) {
    console.error('Search Patients Error:', error);
    return NextResponse.json({ error: 'Failed to search patients' }, { status: 500 });
  }
}
