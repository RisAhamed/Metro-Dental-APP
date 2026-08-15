import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { inventoryCategories } from '@/lib/db/schema/inventoryCategories';
import { canConsumeInventory } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function GET() {
  const { sessionClaims } = await auth();
  if (!canConsumeInventory(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const results = await db
      .select()
      .from(inventoryCategories)
      .where(eq(inventoryCategories.isActive, true))
      .orderBy(inventoryCategories.name);

    return NextResponse.json({ categories: results });
  } catch (error) {
    console.error('Get Inventory Categories Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
