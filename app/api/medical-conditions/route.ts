import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { medicalConditions } from '@/lib/db/schema/medicalConditions';
import { canManageLookups } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '-');

export async function GET() {
  const { sessionClaims } = await auth();
  if (!canManageLookups(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  try {
    const results = await db
      .select()
      .from(medicalConditions)
      .where(eq(medicalConditions.isActive, true))
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
