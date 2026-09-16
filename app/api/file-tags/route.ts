import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { fileTags } from '@/lib/db/schema/fileTags';
import { canManagePatients } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManagePatients(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');

  try {
    const conditions = [eq(fileTags.isActive, true)];
    if (clinicId) conditions.push(eq(fileTags.clinicId, clinicId));

    const results = await db
      .select()
      .from(fileTags)
      .where(conditions.length > 0 ? undefined : undefined);

    return NextResponse.json({ tags: results });
  } catch (error) {
    console.error('Get File Tags Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManagePatients(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, clinicId } = body;

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
  }

  try {
    const id = `FTAG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const result = await db
      .insert(fileTags)
      .values({
        id,
        name: name.trim(),
        clinicId: clinicId || null,
      })
      .returning();

    return NextResponse.json({ tag: result[0] });
  } catch (error) {
    console.error('Create File Tag Error:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}