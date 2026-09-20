import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { prescriptionTemplates } from '@/lib/db/schema/prescriptionTemplates';
import { canDeletePrescriptionTemplate, canManageClinical } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canManageClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const existing = await db.select().from(prescriptionTemplates).where(eq(prescriptionTemplates.templateId, id)).limit(1);
    if (existing.length === 0) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    const patch: Partial<typeof prescriptionTemplates.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
      patch.name = name;
    }
    if (body.description !== undefined) patch.description = body.description ? String(body.description).trim() : null;
    if (body.medicines !== undefined) {
      if (!Array.isArray(body.medicines) || body.medicines.length === 0) {
        return NextResponse.json({ error: 'At least one medicine is required' }, { status: 400 });
      }
      patch.medicines = body.medicines;
    }
    if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes).trim() : null;

    await db.update(prescriptionTemplates).set(patch).where(eq(prescriptionTemplates.templateId, id));
    const updated = await db.select().from(prescriptionTemplates).where(eq(prescriptionTemplates.templateId, id)).limit(1);
    return NextResponse.json({ success: true, template: updated[0] });
  } catch (error) {
    console.error('Update Prescription Template Error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await params;

  try {
    const existing = await db.select().from(prescriptionTemplates).where(eq(prescriptionTemplates.templateId, id)).limit(1);
    if (existing.length === 0) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    if (!canDeletePrescriptionTemplate(sessionClaims, userId, existing[0].createdBy)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await db
      .update(prescriptionTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(prescriptionTemplates.templateId, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Prescription Template Error:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
