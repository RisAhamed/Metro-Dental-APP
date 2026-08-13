import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appointmentCategories } from '@/lib/db/schema/appointmentCategories';
import { isStaff } from '@/lib/auth/claims';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');

  try {
    const conditions = [eq(appointmentCategories.isActive, true)];

    if (clinicId) {
      conditions.push(eq(appointmentCategories.clinicId, clinicId));
    }

    const results = await db
      .select()
      .from(appointmentCategories)
      .where(and(...conditions))
      .orderBy(asc(appointmentCategories.name));
    return NextResponse.json({ categories: results });
  } catch (error) {
    console.error('Get Categories Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const role = (sessionClaims?.role as string) || '';
  if (!['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, color, clinicId } = body;

  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  try {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await db.insert(appointmentCategories).values({
      id,
      name: name.toUpperCase(),
      color: color || '#6B7280',
      clinicId: clinicId || null,
      isActive: true,
      createdAt: new Date(),
    });
    return NextResponse.json({ success: true, category: { id, name, color } });
  } catch (error) {
    console.error('Create Category Error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}