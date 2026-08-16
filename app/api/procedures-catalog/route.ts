import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { proceduresCatalog } from '@/lib/db/schema/proceduresCatalog';
import { canViewClinical } from '@/lib/auth/claims';
import { eq, ilike, or, and, isNull, type SQL } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const clinicId = searchParams.get('clinicId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '25') || 25, 100);

  try {
    const conditions: SQL[] = [eq(proceduresCatalog.isActive, true)];
    if (clinicId) {
      const clinicFilter = or(eq(proceduresCatalog.clinicId, clinicId), isNull(proceduresCatalog.clinicId));
      if (clinicFilter) conditions.push(clinicFilter);
    }
    if (search) conditions.push(ilike(proceduresCatalog.name, `%${search}%`));

    const results = await db
      .select()
      .from(proceduresCatalog)
      .where(and(...conditions))
      .orderBy(proceduresCatalog.name)
      .limit(limit);

    return NextResponse.json({ procedures: results });
  } catch (error) {
    console.error('Get Procedures Catalog Error:', error);
    return NextResponse.json({ error: 'Failed to fetch procedures' }, { status: 500 });
  }
}