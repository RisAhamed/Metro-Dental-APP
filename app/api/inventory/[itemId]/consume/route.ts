import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { inventoryItems } from '@/lib/db/schema/inventoryItems';
import { inventoryConsumptions } from '@/lib/db/schema/inventoryConsumptions';
import { users } from '@/lib/db/schema/users';
import { canConsumeInventory, getPrimaryClinicId } from '@/lib/auth/claims';
import { eq, sql } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canConsumeInventory(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { itemId } = await params;
  const body = await req.json();
  const { quantity, takenBy, notes } = body;

  const takeQty = Number(quantity);
  if (!takeQty || takeQty <= 0) {
    return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
  }

  // Staff can only take items out of their own clinic's inventory.
  const role = (sessionClaims?.role as string) || '';
  const itemSnap = await db
    .select({ clinicId: inventoryItems.clinicId })
    .from(inventoryItems)
    .where(eq(inventoryItems.itemId, itemId))
    .limit(1);
  if (itemSnap.length === 0) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  if (role !== 'SUPER_ADMIN') {
    const userClinic = getPrimaryClinicId(sessionClaims);
    if (userClinic && itemSnap[0].clinicId !== userClinic) {
      return NextResponse.json(
        { error: 'You can only take items out of your own clinic' },
        { status: 403 }
      );
    }
  }

  // Resolve who took it: default to current user, allow selecting another staff member
  const takenByUid = takenBy || userId;
  let takenByName = '';
  const userSnap = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.uid, takenByUid))
    .limit(1);
  if (userSnap[0]?.name) {
    takenByName = userSnap[0].name;
  } else {
    try {
      const { clerkClient } = await import('@clerk/nextjs/server');
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(takenByUid);
      takenByName = clerkUser.fullName || clerkUser.firstName || takenByUid;
    } catch (error) {
      console.error('Error resolving consumer name:', error);
      takenByName = takenByUid;
    }
  }

  try {
    const itemResults = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.itemId, itemId))
      .limit(1);

    if (itemResults.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = itemResults[0];
    const current = item.quantityInStock || 0;
    if (takeQty > current) {
      return NextResponse.json(
        { error: `Cannot take ${takeQty} - only ${current} in stock` },
        { status: 400 }
      );
    }

    const remaining = current - takeQty;

    // Decrement stock
    await db
      .update(inventoryItems)
      .set({
        quantityInStock: sql`${inventoryItems.quantityInStock} - ${takeQty}`,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.itemId, itemId));

    // Record the consumption
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('inventory_consumptions', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const consumptionId = `CONS-${String(next).padStart(6, '0')}`;

    await db.insert(inventoryConsumptions).values({
      consumptionId,
      itemId,
      itemName: item.name,
      quantity: takeQty,
      remainingAfter: remaining,
      takenBy: takenByUid,
      takenByName,
      clinicId: item.clinicId,
      notes: notes || null,
    });

    return NextResponse.json({
      success: true,
      consumptionId,
      remaining,
      takenByName,
    });
  } catch (error) {
    console.error('Consume Inventory Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to record consumption' },
      { status: 500 }
    );
  }
}
