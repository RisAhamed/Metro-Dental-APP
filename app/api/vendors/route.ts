import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { vendors } from '@/lib/db/schema/vendors';
import { canManageInventory } from '@/lib/auth/claims';
import { eq, and, sql } from 'drizzle-orm';

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '-');

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManageInventory(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const active = searchParams.get('active');

  try {
    // Vendors are shared globally across admins (no clinicId filtering).
    const conditions = [];
    if (active === 'true') conditions.push(eq(vendors.isActive, true));

    const results = await db
      .select()
      .from(vendors)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(vendors.name);

    return NextResponse.json({ vendors: results });
  } catch (error) {
    console.error('Get Vendors Error:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageInventory(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, address, phone, email, contactPerson, clinicId } = body;

  if (!name) {
    return NextResponse.json(
      { error: 'Missing required fields: name' },
      { status: 400 }
    );
  }

  // Vendors are shared globally, so store under a shared clinic id.
  const sharedClinicId = clinicId || 'shared';

  try {
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('vendors', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const vendorId = `VND-${String(next).padStart(4, '0')}`;

    const existing = await db
      .select({ vendorId: vendors.vendorId })
      .from(vendors)
      .where(sql`${vendors.name} = ${name}`)
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A vendor with this name already exists' },
        { status: 409 }
      );
    }

    await db.insert(vendors).values({
      vendorId,
      name,
      address: address || null,
      phone: phone || null,
      email: email || null,
      contactPerson: contactPerson || null,
      clinicId: sharedClinicId,
      isActive: true,
      createdBy: userId,
    });

    return NextResponse.json({ success: true, vendorId, slug: slugify(name) });
  } catch (error) {
    console.error('Create Vendor Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to create vendor' },
      { status: 500 }
    );
  }
}
