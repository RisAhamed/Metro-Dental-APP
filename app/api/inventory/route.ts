import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { inventoryItems } from '@/lib/db/schema/inventoryItems';
import { users } from '@/lib/db/schema/users';
import { canManageInventory, canConsumeInventory, getPrimaryClinicId } from '@/lib/auth/claims';
import { eq, and, ilike, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canConsumeInventory(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicParam = searchParams.get('clinicId');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const vendorId = searchParams.get('vendorId');
  const lowStock = searchParams.get('lowStock');
  const includeInactive = searchParams.get('includeInactive') === 'true';

  const role = (sessionClaims?.role as string) || '';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Staff are scoped to their own clinic. Super admin sees all clinics
  // (optionally filtered by the requested clinic).
  let clinicFilter: string | null = null;
  if (isSuperAdmin) {
    clinicFilter = clinicParam || null;
  } else {
    clinicFilter = getPrimaryClinicId(sessionClaims) || clinicParam || null;
  }

  try {
    const conditions = [
      includeInactive ? undefined : eq(inventoryItems.isActive, true),
      clinicFilter ? eq(inventoryItems.clinicId, clinicFilter) : undefined,
      category ? eq(inventoryItems.category, category) : undefined,
      vendorId ? eq(inventoryItems.vendorId, vendorId) : undefined,
      search ? ilike(inventoryItems.name, `%${search}%`) : undefined,
    ].filter(Boolean);

    const results = await db
      .select({
        item: inventoryItems,
        createdByName: users.name,
      })
      .from(inventoryItems)
      .leftJoin(users, eq(users.uid, inventoryItems.createdBy))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(inventoryItems.name);

    const items = results.map((r) => ({
      ...r.item,
      createdByName: r.createdByName || null,
    }));

    if (lowStock === 'true') {
      return NextResponse.json({
        items: items.filter(
          (item) => item.quantityInStock <= (item.reorderLevel ?? 0)
        ),
      });
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Get Inventory Error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  const canManage = canManageInventory(sessionClaims);
  if (!canConsumeInventory(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, category, unit, quantityInStock, reorderLevel, unitPrice, clinicId, vendorId } = body;

  if (!name || !category || !unit) {
    return NextResponse.json(
      { error: 'Missing required fields: name, category, unit' },
      { status: 400 }
    );
  }

  // Staff can only add to their own clinic; super admin chooses the clinic.
  const role = (sessionClaims?.role as string) || '';
  let itemClinicId = clinicId;
  if (role !== 'SUPER_ADMIN') {
    itemClinicId = getPrimaryClinicId(sessionClaims) || clinicId || 'clinic_a';
  }
  if (!itemClinicId) {
    return NextResponse.json(
      { error: 'A clinic must be selected' },
      { status: 400 }
    );
  }

  try {
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('inventory_items', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const itemId = `ITM-${String(next).padStart(4, '0')}`;

    const existing = await db
      .select({ itemId: inventoryItems.itemId })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.name, name),
          eq(inventoryItems.clinicId, itemClinicId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'An item with this name already exists for this clinic' },
        { status: 409 }
      );
    }

    await db.insert(inventoryItems).values({
      itemId,
      name,
      category,
      unit,
      quantityInStock: quantityInStock || 0,
      reorderLevel: reorderLevel || 10,
      // Only admins set prices/vendors; staff additions record 0 price
      unitPrice: canManage ? unitPrice || '0' : '0',
      clinicId: itemClinicId,
      vendorId: canManage ? vendorId || null : null,
      isActive: true,
      createdBy: userId,
    });

    return NextResponse.json({ success: true, itemId });
  } catch (error) {
    console.error('Create Inventory Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}
