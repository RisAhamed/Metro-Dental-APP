import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labs } from '@/lib/db/schema/labs';
import { isStaff } from '@/lib/auth/claims';
import { eq, asc, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get('active');

  try {
    const conditions = [];
    if (activeOnly === 'true') {
      conditions.push(eq(labs.isActive, true));
    }

    const results = await db
      .select()
      .from(labs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(labs.name));

    return NextResponse.json({ labs: results });
  } catch (error) {
    console.error('Get Labs Error:', error);
    return NextResponse.json({ error: 'Failed to fetch labs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, address, phone, email, contactPerson } = body;

  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  try {
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('labs', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const labId = `LAB-${String(next).padStart(4, '0')}`;

    await db.insert(labs).values({
      labId,
      name,
      address: address || null,
      phone: phone || null,
      email: email || null,
      contactPerson: contactPerson || null,
      isActive: true,
      createdBy: userId,
    });

    return NextResponse.json({ success: true, labId, name });
  } catch (error) {
    console.error('Create Lab Error:', error);
    return NextResponse.json({ error: 'Failed to create lab' }, { status: 500 });
  }
}