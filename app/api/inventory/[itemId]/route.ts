import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { inventoryItems } from '@/lib/db/schema/inventoryItems';
import { inventoryConsumptions } from '@/lib/db/schema/inventoryConsumptions';
import { users } from '@/lib/db/schema/users';
import { canManageInventory, canConsumeInventory, getPrimaryClinicId } from '@/lib/auth/claims';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canConsumeInventory(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { itemId } = await params;

  try {
    const itemResults = await db
      .select({
        item: inventoryItems,
        createdByName: users.name,
      })
      .from(inventoryItems)
      .leftJoin(users, eq(users.uid, inventoryItems.createdBy))
      .where(eq(inventoryItems.itemId, itemId))
      .limit(1);

    if (itemResults.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Staff are scoped to their own clinic (super admin sees all).
    const role = (sessionClaims?.role as string) || '';
    if (role !== 'SUPER_ADMIN') {
      const userClinic = getPrimaryClinicId(sessionClaims);
      if (userClinic && itemResults[0].item.clinicId !== userClinic) {
        return NextResponse.json(
          { error: 'You can only view your own clinic inventory' },
          { status: 403 }
        );
      }
    }

    const consumptionResults = await db
      .select()
      .from(inventoryConsumptions)
      .where(eq(inventoryConsumptions.itemId, itemId))
      .orderBy(desc(inventoryConsumptions.createdAt))
      .limit(20);

    return NextResponse.json({
      item: { ...itemResults[0].item, createdByName: itemResults[0].createdByName || null },
      consumptions: consumptionResults,
    });
  } catch (error) {
    console.error('Get Inventory Item Error:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canManageInventory(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { itemId } = await params;
  const body = await req.json();
  const { name, category, unit, quantityInStock, reorderLevel, unitPrice, vendorId, isActive } = body;

  try {
    await db
      .update(inventoryItems)
      .set({
        name: name ?? undefined,
        category: category ?? undefined,
        unit: unit ?? undefined,
        quantityInStock: quantityInStock ?? undefined,
        reorderLevel: reorderLevel ?? undefined,
        unitPrice: unitPrice ?? undefined,
        vendorId: vendorId ?? null,
        isActive: isActive ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.itemId, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Inventory Item Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to update item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canManageInventory(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { itemId } = await params;

  try {
    await db
      .update(inventoryItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(inventoryItems.itemId, itemId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Inventory Item Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to delete item' },
      { status: 500 }
    );
  }
}
