import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { patientGroups } from '@/lib/db/schema/patientGroups';
import { canManageLookups } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '-');

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManageLookups(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === 'true';
  const clinicId = all
    ? undefined
    : searchParams.get('clinicId') ||
      (sessionClaims?.primaryClinicId as string) ||
      undefined;

  try {
    const results = await db
      .select()
      .from(patientGroups)
      .where(clinicId ? eq(patientGroups.clinicId, clinicId) : undefined)
      .orderBy(patientGroups.name);

    return NextResponse.json({ groups: results });
  } catch (error) {
    console.error('Get Groups Error:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageLookups(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  const body = await req.json();
  const { name, clinicId } = body;

  if (!name || !clinicId) {
    return NextResponse.json(
      { error: 'Missing required fields: name, clinicId' },
      { status: 400 }
    );
  }

  try {
    const id = slugify(name);
    await db.insert(patientGroups).values({
      id,
      name: name.toUpperCase(),
      clinicId,
      patientCount: 0,
      createdBy: userId,
    });
    return NextResponse.json({ success: true, group: { id, name: name.toUpperCase(), clinicId } });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Create Group Error:', error);
    return NextResponse.json(
      { error: err.message || 'Failed to create group' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageLookups(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  const body = await req.json();
  const { id, name } = body;

  if (!id || !name) {
    return NextResponse.json(
      { error: 'Missing required fields: id, name' },
      { status: 400 }
    );
  }

  try {
    await db
      .update(patientGroups)
      .set({ name: name.toUpperCase() })
      .where(eq(patientGroups.id, id));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Rename Group Error:', error);
    return NextResponse.json(
      { error: err.message || 'Failed to rename group' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageLookups(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  const body = await req.json();
  const { id, name } = body;

  if (!id || !name) {
    return NextResponse.json(
      { error: 'Missing required fields: id, name' },
      { status: 400 }
    );
  }

  try {
    await db
      .update(patientGroups)
      .set({ name: name.toUpperCase() })
      .where(eq(patientGroups.id, id));
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Rename Group Error:', error);
    return NextResponse.json(
      { error: err.message || 'Failed to rename group' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageLookups(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing group ID' }, { status: 400 });
  }

  try {
    await db.delete(patientGroups).where(eq(patientGroups.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Group Error:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
