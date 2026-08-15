import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { surgeryTypes } from '@/lib/db/schema/surgeryTypes';
import { isSuperAdmin, isStaff } from '@/lib/auth/claims';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const records = await db
      .select()
      .from(surgeryTypes)
      .orderBy(asc(surgeryTypes.name));

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Get Surgery Types Error:', error);
    return NextResponse.json({ error: 'Failed to fetch surgery types' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { id, name } = body;

  if (!id || !name) {
    return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });
  }

  try {
    await db
      .insert(surgeryTypes)
      .values({ id, name, isActive: true })
      .onConflictDoNothing();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Create Surgery Type Error:', error);
    return NextResponse.json({ error: 'Failed to create surgery type' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, isActive } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    await db
      .update(surgeryTypes)
      .set({
        name: name ?? undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      })
      .where(eq(surgeryTypes.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Surgery Type Error:', error);
    return NextResponse.json({ error: 'Failed to update surgery type' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    await db.delete(surgeryTypes).where(eq(surgeryTypes.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Surgery Type Error:', error);
    return NextResponse.json({ error: 'Failed to delete surgery type' }, { status: 500 });
  }
}