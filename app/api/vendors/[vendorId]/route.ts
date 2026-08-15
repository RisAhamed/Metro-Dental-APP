import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { vendors } from '@/lib/db/schema/vendors';
import { canManageInventory } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canManageInventory(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { vendorId } = await params;
  const body = await req.json();
  const { name, address, phone, email, contactPerson, isActive } = body;

  try {
    await db
      .update(vendors)
      .set({
        name: name ?? undefined,
        address: address ?? null,
        phone: phone ?? null,
        email: email ?? null,
        contactPerson: contactPerson ?? null,
        isActive: isActive ?? undefined,
      })
      .where(eq(vendors.vendorId, vendorId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Vendor Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canManageInventory(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { vendorId } = await params;

  try {
    await db
      .update(vendors)
      .set({ isActive: false })
      .where(eq(vendors.vendorId, vendorId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Vendor Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}
