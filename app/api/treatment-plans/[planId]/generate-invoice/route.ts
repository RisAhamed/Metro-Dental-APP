import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { treatmentPlans } from '@/lib/db/schema/treatmentPlans';
import { patients } from '@/lib/db/schema/patients';
import { canManageClinical } from '@/lib/auth/claims';
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

    // Compute invoice totals from procedures
    const procedures = (plan.procedures as Array<{ procedureName: string; qty: number; unitCost: number; discount: number; total: number }> | null) || [];
    const totalCost = procedures.reduce((sum, p) => sum + Number(p.qty * p.unitCost || 0), 0);
    const totalDiscount = procedures.reduce((sum, p) => sum + Number(p.discount || 0), 0);
    const grandTotal = totalCost - totalDiscount;

    // Generate a pseudo invoice number (in-memory, not persisted)
    const invoiceId = `INV-${planId.slice(-5).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const invoiceNumber = invoiceId;

    // In a full implementation, you would insert into an `invoices` table here:
    // await db.insert(invoices).values({ invoiceId, planId, patientId: targetPatientId, clinicId: plan.clinicId, ... })
    // For now, return the derived invoice data

    return NextResponse.json({
      success: true,
      invoiceId,
      invoiceNumber,
      patientId: targetPatientId,
      patientName,
      planId: plan.planId,
      planTitle: plan.title,
      procedures,
      totalCost,
      totalDiscount,
      grandTotal,
      status: 'UNPAID',
      createdAt: new Date().toISOString(),
      message: 'Invoice generated successfully',
    });
  } catch (error) {
    console.error('Generate Invoice Error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
