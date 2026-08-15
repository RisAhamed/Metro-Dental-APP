import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { sundayTasks } from '@/lib/db/schema/sundayTasks';
import { isSuperAdmin } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, amount, isActive, description } = body;

  try {
    await db
      .update(sundayTasks)
      .set({
        name: name ?? undefined,
        amount: amount !== undefined && amount !== '' ? String(Number(amount)) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        description: description !== undefined ? (description || null) : undefined,
      })
      .where(eq(sundayTasks.id, id));

    const updated = await db
      .select()
      .from(sundayTasks)
      .where(eq(sundayTasks.id, id))
      .limit(1);

    return NextResponse.json({ success: true, task: updated[0] || null });
  } catch (error) {
    console.error('Update Sunday Task Error:', error);
    return NextResponse.json({ error: 'Failed to update Sunday task' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Soft delete: deactivate so past records stay meaningful
    await db
      .update(sundayTasks)
      .set({ isActive: false })
      .where(eq(sundayTasks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Sunday Task Error:', error);
    return NextResponse.json({ error: 'Failed to delete Sunday task' }, { status: 500 });
  }
}