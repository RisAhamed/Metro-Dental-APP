import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { treatmentPlans } from '@/lib/db/schema/treatmentPlans';
import { patients } from '@/lib/db/schema/patients';
import { patientPayments } from '@/lib/db/schema/patientPayments';
import { users } from '@/lib/db/schema/users';
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
  const body = await req.json();
  const amount = Number(body.amount);
  const procedureIndices: number[] | undefined = body.procedureIndices;

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
  }

  try {
    const rows = await db.select().from(treatmentPlans).where(eq(treatmentPlans.planId, planId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Treatment plan not found' }, { status: 404 });
    }

    const plan = rows[0];
    const procedures = [...(plan.procedures as Array<{
      procedureId: string;
      procedureName: string;
      qty: number;
      unitCost: number;
      discount: number;
      total: number;
      amountPaid?: number;
      status?: string;
    }> | null || [])];

    if (procedures.length === 0) {
      return NextResponse.json({ error: 'No procedures in plan' }, { status: 400 });
    }

    // Determine target indices
    let targets: number[];
    if (Array.isArray(procedureIndices) && procedureIndices.length > 0) {
      targets = procedureIndices.filter((i) => i >= 0 && i < procedures.length);
      if (targets.length === 0) {
        return NextResponse.json({ error: 'Invalid procedure indices' }, { status: 400 });
      }
    } else {
      // Default: distribute to procedures with remaining balance in order
      targets = procedures.map((_, i) => i);
    }

    let remaining = amount;
    for (const idx of targets) {
      if (remaining <= 0) break;
      const proc = procedures[idx];
      const total = Number(proc.total || 0);
      const paid = Number(proc.amountPaid || 0);
      const due = Math.max(total - paid, 0);
      if (due <= 0) continue;
      const toPay = Math.min(due, remaining);
      proc.amountPaid = paid + toPay;
      remaining -= toPay;
    }

    if (remaining > 0 && targets.length === procedures.length) {
      // If still remaining and all were targeted, it means plan is fully paid; extra is just ignored
      // Alternatively keep remaining as overpayment not applied
    }

    const totalPaid = procedures.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
    const grandTotal = procedures.reduce((sum, p) => sum + Number(p.total || 0), 0);

    await db
      .update(treatmentPlans)
      .set({
        procedures: procedures as unknown as typeof plan.procedures,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(treatmentPlans.planId, planId));

    // Sync patient ledger: create a patient payment record (best-effort)
    try {
      const patientRows = await db.select().from(patients).where(eq(patients.patientId, plan.patientId)).limit(1);
      const userRows = await db.select().from(users).where(eq(users.uid, userId)).limit(1);
      const applied = amount - remaining;
      if (patientRows.length > 0 && applied > 0) {
        const paymentId = await nextId('patient_payments', 'PAY-', 5);
        await db.insert(patientPayments).values({
          paymentId,
          patientId: plan.patientId,
          patientName: patientRows[0].name,
          clinicId: plan.clinicId,
          amount: String(applied),
          mode: 'CASH',
          date: new Date(),
          notes: `Payment for treatment plan ${plan.planId} (${targets.map((i) => procedures[i].procedureName).join(', ')})`,
          recordedBy: userId,
          recordedByName: userRows[0]?.name || 'Staff',
        });
      }
    } catch (e) {
      console.error('Patient ledger sync error:', e);
    }

    const updated = await db.select().from(treatmentPlans).where(eq(treatmentPlans.planId, planId)).limit(1);

    const balanceDue = Math.max(grandTotal - totalPaid, 0);
    const paymentStatus = totalPaid >= grandTotal && grandTotal > 0 ? 'PAID' : totalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

    return NextResponse.json({
      success: true,
      plan: updated[0],
      summary: { totalPaid, grandTotal, balanceDue, paymentStatus },
    });
  } catch (error) {
    console.error('Record Payment Error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
