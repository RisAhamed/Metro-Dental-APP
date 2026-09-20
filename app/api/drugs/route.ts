import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { drugs } from '@/lib/db/schema/drugs';
import { canManageClinical, canViewClinical, getPrimaryClinicId, isSuperAdmin } from '@/lib/auth/claims';
import { and, asc, eq, ilike, isNull, or, type SQL } from 'drizzle-orm';

function idFromName(name: string) {
  return `drug_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48)}`;
}

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.trim();
  const clinicId = searchParams.get('clinicId') || getPrimaryClinicId(sessionClaims);
  const limit = Math.min(Number(searchParams.get('limit') || 50) || 50, 100);

  const conditions: SQL[] = [eq(drugs.isActive, true)];
  if (clinicId && !isSuperAdmin(sessionClaims)) {
    const clinicFilter = or(isNull(drugs.clinicId), eq(drugs.clinicId, clinicId));
    if (clinicFilter) conditions.push(clinicFilter);
  } else if (clinicId) {
    const clinicFilter = or(isNull(drugs.clinicId), eq(drugs.clinicId, clinicId));
    if (clinicFilter) conditions.push(clinicFilter);
  }
  if (search) conditions.push(ilike(drugs.name, `%${search}%`));

  try {
    const list = await db
      .select()
      .from(drugs)
      .where(and(...conditions))
      .orderBy(asc(drugs.name))
      .limit(limit);

    return NextResponse.json({ drugs: list });
  } catch (error) {
    console.error('Get Drugs Error:', error);
    return NextResponse.json({ error: 'Failed to fetch drugs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManageClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Drug name is required' }, { status: 400 });

  const id = body.id ? String(body.id) : idFromName(name);
  const clinicId = body.clinicId ? String(body.clinicId) : getPrimaryClinicId(sessionClaims);

  try {
    await db
      .insert(drugs)
      .values({
        id,
        name,
        defaultStrength: body.defaultStrength ? String(body.defaultStrength) : null,
        defaultStrengthUnit: body.defaultStrengthUnit ? String(body.defaultStrengthUnit) : null,
        defaultDuration: body.defaultDuration ? String(body.defaultDuration) : null,
        defaultDurationUnit: body.defaultDurationUnit ? String(body.defaultDurationUnit) : null,
        defaultFrequency: body.defaultFrequency ? String(body.defaultFrequency) : null,
        clinicId: clinicId || null,
      })
      .onConflictDoNothing();

    const created = await db.select().from(drugs).where(eq(drugs.id, id)).limit(1);
    return NextResponse.json({ success: true, drug: created[0] }, { status: 201 });
  } catch (error) {
    console.error('Create Drug Error:', error);
    return NextResponse.json({ error: 'Failed to create drug' }, { status: 500 });
  }
}
