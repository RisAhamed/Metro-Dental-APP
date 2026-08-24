import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { treatmentPlans } from '@/lib/db/schema/treatmentPlans';
import { patients } from '@/lib/db/schema/patients';
import { invoices } from '@/lib/db/schema/invoices';
import { canManageClinical } from '@/lib/auth/claims';
import { nextId } from '@/lib/utils/ids';
import { eq } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canManageClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const { planId } = await params;
  const body = await req.json().catch(() => ({}));
  const patientId = body.patientId as string | undefined;

  try {
    const planRows = await db
      .select()
      .from(treatmentPlans)
      .where(eq(treatmentPlans.planId, planId))
      .limit(1);

    if (planRows.length === 0) {
      return NextResponse.json({ error: 'Treatment plan not found' }, { status: 404 });
    }

    const plan = planRows[0];
    const targetPatientId = patientId || plan.patientId;

    // Optionally fetch patient for invoice header
    let patientName = 'Patient';
    if (targetPatientId) {
      const pRows = await db
        .select({ name: patients.name, patientId: patients.patientId, age: patients.age, gender: patients.gender })
        .from(patients)
        .where(eq(patients.patientId, targetPatientId))
        .limit(1);
      if (pRows.length > 0) patientName = pRows[0].name;
    }

    // Compute invoice totals from selected procedures (or all if none specified)
    const allProcedures = (plan.procedures as Array<{
      procedureId: string;
      procedureName: string;
      qty: number;
      unitCost: number;
      discount: number;
      total: number;
      toothNumbers?: number[] | null;
      notes?: string | null;
    }> | null) || [];

    const selectedIndices: number[] | undefined = body.selectedIndices;
    const procedures =
      Array.isArray(selectedIndices) && selectedIndices.length > 0
        ? selectedIndices
            .filter((idx) => idx >= 0 && idx < allProcedures.length)
            .map((idx) => allProcedures[idx])
        : allProcedures;

    if (procedures.length === 0) {
      return NextResponse.json({ error: 'No procedures selected' }, { status: 400 });
    }

    const subtotal = procedures.reduce((sum, p) => sum + Number(p.qty * p.unitCost || 0), 0);
    const totalDiscount = procedures.reduce((sum, p) => sum + Number(p.discount || 0), 0);
    const grandTotal = subtotal - totalDiscount;

    const invoiceId = await nextId('invoices', 'INV-', 5);
    const invoiceNumber = invoiceId;

    await db.insert(invoices).values({
      invoiceId,
      invoiceNumber,
      patientId: targetPatientId,
      patientName,
      clinicId: plan.clinicId,
      planId: plan.planId,
      visitId: null,
      procedures: procedures.map((p) => ({
        procedureId: p.procedureId,
        procedureName: p.procedureName,
        qty: p.qty,
        unitCost: p.unitCost,
        discount: p.discount,
        total: p.total,
        toothNumbers: p.toothNumbers || null,
        notes: p.notes || null,
      })),
      subtotal: String(subtotal),
      totalDiscount: String(totalDiscount),
      grandTotal: String(grandTotal),
      amountPaid: '0',
      paymentStatus: 'UNPAID',
      createdBy: userId,
    });

    return NextResponse.json({
      success: true,
      invoiceId,
      invoiceNumber,
      patientId: targetPatientId,
      patientName,
      planId: plan.planId,
      planTitle: plan.title,
      procedures,
      subtotal,
      totalDiscount,
      grandTotal,
      paymentStatus: 'UNPAID',
      createdAt: new Date().toISOString(),
      message: 'Invoice generated successfully',
    });
  } catch (error) {
    console.error('Generate Invoice Error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
