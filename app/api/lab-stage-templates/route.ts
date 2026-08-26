import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labStageTemplates } from '@/lib/db/schema/labStageTemplates';
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
    let results;
    if (search) {
      results = await db
        .select()
        .from(labStageTemplates)
        .where(ilike(labStageTemplates.name, `%${search}%`))
        .orderBy(asc(labStageTemplates.name))
        .limit(20);
    } else {
      results = await db.select().from(labStageTemplates).orderBy(asc(labStageTemplates.name)).limit(50);
    }
    const filtered = includeInactive ? results : results.filter((r) => r.isActive);
    return NextResponse.json({ templates: filtered });
  } catch (error) {
    console.error('Get Lab Stage Templates Error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
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
  const description = String(body.description || '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
  }

  const id = body.id || `st_${slugify(name)}`;

  try {
    await db
      .insert(labStageTemplates)
      .values({
        id,
        name,
        description: description || null,
        clinicId: body.clinicId || null,
        isActive: true,
      })
      .onConflictDoNothing();

    const created = await db.select().from(labStageTemplates).where(eq(labStageTemplates.id, id)).limit(1);
    return NextResponse.json({ success: true, template: created[0] || { id, name, description } }, { status: 201 });
  } catch (error) {
    console.error('Create Lab Stage Template Error:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
