import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { referralSources } from '@/lib/db/schema/referralSources';
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
      .from(referralSources)
      .where(eq(referralSources.isActive, true))
      .orderBy(referralSources.name);

    return NextResponse.json({ sources: results });
  } catch (error) {
    console.error('Get Referral Sources Error:', error);
    return NextResponse.json({ error: 'Failed to fetch referral sources' }, { status: 500 });
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
    await db.insert(referralSources).values({
      id,
      name,
      isActive: true,
    });
    return NextResponse.json({ success: true, source: { id, name } });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'This referral source already exists' },
        { status: 409 }
      );
    }
    console.error('Create Referral Source Error:', error);
    return NextResponse.json(
      { error: err.message || 'Failed to create referral source' },
      { status: 500 }
    );
  }
}
