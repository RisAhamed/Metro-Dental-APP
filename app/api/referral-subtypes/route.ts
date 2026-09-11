import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { referralSubtypes } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getAuth } from '@clerk/nextjs/server';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const all = req.nextUrl.searchParams.get('all') === 'true';
    const where = all ? undefined : eq(referralSubtypes.isActive, true);
    const rows = await db
      .select()
      .from(referralSubtypes)
      .where(where)
      .orderBy(asc(referralSubtypes.name));
    return NextResponse.json({ subtypes: rows });
  } catch (error) {
    console.error('GET /api/referral-subtypes error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const name = (body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const id = slugify(name);
    const existing = await db.select().from(referralSubtypes).where(eq(referralSubtypes.id, id));
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Subtype already exists' }, { status: 409 });
    }

    const rows = await db.insert(referralSubtypes).values({ id, name }).returning();
    return NextResponse.json({ subtype: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/referral-subtypes error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, name, isActive } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const rows = await db
      .update(referralSubtypes)
      .set(updates)
      .where(eq(referralSubtypes.id, id))
      .returning();
    return NextResponse.json({ subtype: rows[0] });
  } catch (error) {
    console.error('PATCH /api/referral-subtypes error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await getAuth(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const rows = await db
      .update(referralSubtypes)
      .set({ isActive: false })
      .where(eq(referralSubtypes.id, id))
      .returning();
    return NextResponse.json({ subtype: rows[0] });
  } catch (error) {
    console.error('DELETE /api/referral-subtypes error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
