import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labWorkTypes } from '@/lib/db/schema/labWorkTypes';
import { isStaff, isDoctor } from '@/lib/auth/claims';
import { eq, ilike, asc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const includeInactive = searchParams.get('includeInactive') === 'true';

  try {
    if (search) {
      const results = await db
        .select()
        .from(labWorkTypes)
        .where(ilike(labWorkTypes.name, `%${search}%`))
        .orderBy(asc(labWorkTypes.name));
      // Filter active unless includeInactive
      const filtered = includeInactive ? results : results.filter((r) => r.isActive);
      return NextResponse.json({ workTypes: filtered });
    }

    const results = await db.select().from(labWorkTypes).orderBy(asc(labWorkTypes.name));
    const filtered = includeInactive ? results : results.filter((r) => r.isActive);
    return NextResponse.json({ workTypes: filtered });
  } catch (error) {
    console.error('Get Lab Work Types Error:', error);
    return NextResponse.json({ error: 'Failed to fetch work types' }, { status: 500 });
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isDoctor(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Doctors only' }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Work type name is required' }, { status: 400 });
  }

  const id = body.id || `wt_${slugify(name)}`;

  try {
    await db
      .insert(labWorkTypes)
      .values({
        id,
        name,
        isActive: true,
      })
      .onConflictDoNothing();

    const created = await db.select().from(labWorkTypes).where(eq(labWorkTypes.id, id)).limit(1);
    return NextResponse.json({ success: true, workType: created[0] || { id, name } }, { status: 201 });
  } catch (error) {
    console.error('Create Lab Work Type Error:', error);
    return NextResponse.json({ error: 'Failed to create work type' }, { status: 500 });
  }
}
