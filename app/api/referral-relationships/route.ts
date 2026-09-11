import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { referralRelationships } from '@/lib/db/schema/referralRelationships';
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
      .from(referralRelationships)
      .where(all ? undefined : eq(referralRelationships.isActive, true))
      .orderBy(referralRelationships.name);

    return NextResponse.json({ relationships: results });
  } catch (error) {
    console.error('Get Referral Relationships Error:', error);
    return NextResponse.json({ error: 'Failed to fetch referral relationships' }, { status: 500 });
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
    await db.insert(referralRelationships).values({
      id,
      name,
      isActive: true,
    });
    return NextResponse.json({ success: true, relationship: { id, name } });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'This referral relationship already exists' },
        { status: 409 }
      );
    }
    console.error('Create Referral Relationship Error:', error);
    return NextResponse.json(
      { error: err.message || 'Failed to create referral relationship' },
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
      .update(referralRelationships)
      .set({
        name: name !== undefined ? name : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      })
      .where(eq(referralRelationships.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Referral Relationship Error:', error);
    return NextResponse.json({ error: 'Failed to update referral relationship' }, { status: 500 });
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
      .update(referralRelationships)
      .set({ isActive: false })
      .where(eq(referralRelationships.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Referral Relationship Error:', error);
    return NextResponse.json({ error: 'Failed to delete referral relationship' }, { status: 500 });
  }
}
