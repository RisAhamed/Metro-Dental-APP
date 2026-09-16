import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { invoices, type Invoice } from '@/lib/db/schema/invoices';
import { invoicePayments } from '@/lib/db/schema/invoicePayments';
import { patients } from '@/lib/db/schema/patients';
import { clinics } from '@/lib/db/schema/clinics';
import { users } from '@/lib/db/schema/users';
import { canViewClinical, canManageClinical } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { invoiceId } = await params;

  try {
    const rows = await db.select().from(invoices).where(eq(invoices.invoiceId, invoiceId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = rows[0];

    // Fetch patient, clinic and doctor details for print header
    const [patientRows, clinicRows, doctorRows] = await Promise.all([
      db.select().from(patients).where(eq(patients.patientId, invoice.patientId)).limit(1),
      db.select().from(clinics).where(eq(clinics.clinicId, invoice.clinicId)).limit(1),
      db.select({ name: users.name }).from(users).where(eq(users.uid, invoice.createdBy)).limit(1),
    ]);

    const doctorName = doctorRows[0]?.name || null;

    return NextResponse.json({
      invoice,
      patient: patientRows[0] || null,
      clinic: clinicRows[0] || null,
      doctorName,
    });
  } catch (error) {
    console.error('Get Invoice Error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canManageClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { invoiceId } = await params;
  const body = await req.json();
  const { amountPaid } = body;

  try {
    const rows = await db.select().from(invoices).where(eq(invoices.invoiceId, invoiceId)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = rows[0];
    const grandTotal = parseFloat(invoice.grandTotal) || 0;
    const previousPaid = parseFloat(invoice.amountPaid) || 0;
    const newPaid = parseFloat(amountPaid) || 0;
    const delta = newPaid - previousPaid;
    
    let paymentStatus: Invoice['paymentStatus'] = 'UNPAID';
    if (newPaid >= grandTotal) paymentStatus = 'PAID';
    else if (newPaid > 0) paymentStatus = 'PARTIALLY_PAID';

    // Insert payment entry if there's a positive delta
    if (delta > 0) {
      const userRows = await db.select({ name: users.name }).from(users).where(eq(users.uid, userId || '')).limit(1);
      const userName = userRows[0]?.name || 'Unknown';
      
      await db.insert(invoicePayments).values({
        paymentId: `INVPAY-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        invoiceId,
        patientId: invoice.patientId,
        amount: delta.toString(),
        date: new Date(),
        recordedBy: userId || '',
        recordedByName: userName,
      });
    }

    const result = await db
      .update(invoices)
      .set({
        amountPaid: newPaid.toString(),
        paymentStatus,
      })
      .where(eq(invoices.invoiceId, invoiceId))
      .returning();

    return NextResponse.json({ invoice: result[0] });
  } catch (error) {
    console.error('Update Invoice Error:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}
