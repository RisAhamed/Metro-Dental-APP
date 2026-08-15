import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { patientPayments, paymentModeEnum } from '@/lib/db/schema/patientPayments';
import { patients } from '@/lib/db/schema/patients';
import { users } from '@/lib/db/schema/users';
import { canManagePatients } from '@/lib/auth/claims';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManagePatients(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patientId');
  const clinicId = searchParams.get('clinicId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const conditions = [];
    if (patientId) conditions.push(eq(patientPayments.patientId, patientId));
    if (clinicId) conditions.push(eq(patientPayments.clinicId, clinicId));
    if (startDate) conditions.push(gte(patientPayments.date, new Date(`${startDate}T00:00:00.000Z`)));
    if (endDate) conditions.push(lte(patientPayments.date, new Date(`${endDate}T23:59:59.999Z`)));

    const results = await db
      .select()
      .from(patientPayments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(patientPayments.date));

    return NextResponse.json({ payments: results });
  } catch (error) {
    console.error('Get Payments Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManagePatients(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { patientId, patientName, clinicId, amount, mode, date, visitId, notes } = body;

  if (!patientId || !clinicId || !amount) {
    return NextResponse.json(
      { error: 'Missing required fields: patientId, clinicId, amount' },
      { status: 400 }
    );
  }

  const parsedAmount = Number(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  if (!paymentModeEnum.enumValues.includes(mode)) {
    return NextResponse.json(
      { error: `Invalid mode. Must be one of: ${paymentModeEnum.enumValues.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('patient_payments', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const paymentId = `PAY-${String(next).padStart(5, '0')}`;

    let recordedByName = 'Unknown';
    const userSnap = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);
    if (userSnap[0]?.name) recordedByName = userSnap[0].name;

    const paymentDate = date ? new Date(date) : new Date();

    await db.insert(patientPayments).values({
      paymentId,
      patientId,
      patientName: patientName || 'Unknown Patient',
      clinicId,
      amount: parsedAmount.toFixed(2),
      mode,
      date: paymentDate,
      visitId: visitId || null,
      notes: notes || null,
      recordedBy: userId,
      recordedByName,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Keep patient aggregate totals in sync
    const patientSnap = await db
      .select()
      .from(patients)
      .where(eq(patients.patientId, patientId))
      .limit(1);

    if (patientSnap.length > 0) {
      const patient = patientSnap[0];
      const newTotalPaid = Number(patient.totalPaid || 0) + parsedAmount;
      const newTotalDue = Math.max(0, Number(patient.totalDue || 0) - parsedAmount);
      const newAdvance = Number(patient.advanceBalance || 0) + Math.max(0, parsedAmount - Number(patient.totalDue || 0));

      await db
        .update(patients)
        .set({
          totalPaid: newTotalPaid.toFixed(2),
          totalDue: newTotalDue.toFixed(2),
          advanceBalance: newAdvance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(patients.patientId, patientId));
    }

    await logActivity({
      clinicId,
      type: 'PAYMENT_RECORDED',
      message: `Payment of ₹${parsedAmount.toLocaleString('en-IN')} (${mode}) received from ${patientName || patientId}`,
      userId,
      userName: recordedByName,
      userRole: (sessionClaims?.role as string) || undefined,
      relatedEntityType: 'payment',
      relatedEntityId: paymentId,
      metadata: { patientId, amount: parsedAmount, mode },
      date: paymentDate,
    });

    return NextResponse.json({
      success: true,
      paymentId,
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('Create Payment Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}
