import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { purchases } from '@/lib/db/schema/purchases';
import { vendors } from '@/lib/db/schema/vendors';
import { canConsumeInventory } from '@/lib/auth/claims';
import { desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canConsumeInventory(sessionClaims)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  if (!q) return NextResponse.json({ vendors: [], products: [], purchases: [] });
  try {
    const [allPurchases, allVendors] = await Promise.all([
      db.select().from(purchases).orderBy(desc(purchases.purchaseDate)).limit(200),
      db.select().from(vendors).limit(100),
    ]);
    const matchedVendors = allVendors
      .filter((v) => v.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map((v) => ({ vendorId: v.vendorId, name: v.name }));
    const productMap = new Map<string, number>();
    for (const p of allPurchases) {
      const items = (p.lineItems as Array<{ itemName?: string }> | null) || [];
      for (const li of items) {
        if (li.itemName?.toLowerCase().includes(q)) {
          productMap.set(li.itemName, (productMap.get(li.itemName) || 0) + 1);
        }
      }
    }
    const products = [...productMap.entries()].slice(0, 5).map(([itemName, purchaseCount]) => ({ itemName, purchaseCount }));
    const matchedPurchases = allPurchases
      .filter(
        (p) =>
          p.purchaseNumber.toLowerCase().includes(q) ||
          p.vendorName.toLowerCase().includes(q) ||
          p.invoiceNumber?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((p) => ({ purchaseId: p.purchaseId, purchaseNumber: p.purchaseNumber, vendorName: p.vendorName }));
    return NextResponse.json({ vendors: matchedVendors, products, purchases: matchedPurchases });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
