import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { clinicalNoteLookups } from '@/lib/db/schema/clinicalNoteLookups';
import { isStaff } from '@/lib/auth/claims';
import { eq, and, ilike } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search') || '';

  if (!category) {
    return NextResponse.json({ error: 'Missing category' }, { status: 400 });
  }

  try {
    const conditions = [
      eq(clinicalNoteLookups.category, category),
      eq(clinicalNoteLookups.isActive, true),
    ];
    if (search) {
      conditions.push(ilike(clinicalNoteLookups.name, `%${search}%`));
    }

    const results = await db
      .select()
      .from(clinicalNoteLookups)
      .where(and(...conditions))
      .orderBy(clinicalNoteLookups.name)
      .limit(50);

    return NextResponse.json({ lookups: results });
  } catch (error) {
    console.error('Get Clinical Note Lookups Error:', error);
    return NextResponse.json({ error: 'Failed to fetch lookups' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { category, name, clinicId } = body;

  if (!category || !name?.trim()) {
    return NextResponse.json({ error: 'Missing category or name' }, { status: 400 });
  }

  const validCategories = ['complaint', 'observation', 'diagnosis', 'investigation', 'note'];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  try {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const result = await db
      .insert(clinicalNoteLookups)
      .values({
        id,
        category,
        name: name.trim(),
        clinicId: clinicId || null,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ lookup: result[0] });
  } catch (error) {
    console.error('Create Clinical Note Lookup Error:', error);
    return NextResponse.json({ error: 'Failed to create lookup' }, { status: 500 });
  }
}
