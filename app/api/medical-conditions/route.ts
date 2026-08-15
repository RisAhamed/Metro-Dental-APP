import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { medicalConditions } from '@/lib/db/schema/medicalConditions';
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

  try {
    const results = await db
      .select()
      .from(medicalConditions)
      .where(all ? undefined : eq(medicalConditions.isActive, true))
      .orderBy(medicalConditions.name);

    return NextResponse.json({ conditions: results });
  } catch (error) {
    console.error('Get Medical Conditions Error:', error);
    return NextResponse.json({ error: 'Failed to fetch medical conditions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageLookups(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
  }

  try {
    const id = slugify(name);
    await db.insert(medicalConditions).values({
      id,
      name,
      isActive: true,
    });
    return NextResponse.json({ success: true, condition: { id, name } });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'This medical condition already exists' },
        { status: 409 }
      );
    }
    console.error('Create Medical Condition Error:', error);
    return NextResponse.json(
      { error: err.message || 'Failed to create medical condition' },
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
  const { id, name, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    await db
      .update(medicalConditions)
      .set({
        name: name !== undefined ? name : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      })
      .where(eq(medicalConditions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Medical Condition Error:', error);
    return NextResponse.json({ error: 'Failed to update medical condition' }, { status: 500 });
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
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    await db
      .update(medicalConditions)
      .set({ isActive: false })
      .where(eq(medicalConditions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Medical Condition Error:', error);
    return NextResponse.json({ error: 'Failed to delete medical condition' }, { status: 500 });
  }
}
