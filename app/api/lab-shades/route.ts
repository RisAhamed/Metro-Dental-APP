import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labShades } from '@/lib/db/schema/labShades';
import { isStaff, isDoctor } from '@/lib/auth/claims';
import { eq, ilike, asc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');

  try {
    let results;
    if (search) {
      results = await db
        .select()
        .from(labShades)
        .where(ilike(labShades.name, `%${search}%`))
        .orderBy(asc(labShades.name))
        .limit(30);
    } else {
      results = await db.select().from(labShades).orderBy(asc(labShades.name));
    }
    const active = results.filter((r) => r.isActive);
    return NextResponse.json({ shades: active });
  } catch (error) {
    console.error('Get Lab Shades Error:', error);
    return NextResponse.json({ error: 'Failed to fetch shades' }, { status: 500 });
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isDoctor(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Doctors only' }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Shade name is required' }, { status: 400 });
  }

  const id = body.id || `shade_${slugify(name)}`;
  const hexColor = body.hexColor ? String(body.hexColor) : null;

  try {
    await db
      .insert(labShades)
      .values({
        id,
        name,
        hexColor,
        isActive: true,
      })
      .onConflictDoNothing();

    const created = await db.select().from(labShades).where(eq(labShades.id, id)).limit(1);
    return NextResponse.json({ success: true, shade: created[0] || { id, name, hexColor } }, { status: 201 });
  } catch (error) {
    console.error('Create Lab Shade Error:', error);
    return NextResponse.json({ error: 'Failed to create shade' }, { status: 500 });
  }
}
