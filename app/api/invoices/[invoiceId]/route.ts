import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema/invoices';
import { patients } from '@/lib/db/schema/patients';
import { clinics } from '@/lib/db/schema/clinics';
import { canViewClinical } from '@/lib/auth/claims';
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

    // Fetch patient and clinic details for print header
    const [patientRows, clinicRows] = await Promise.all([
      db.select().from(patients).where(eq(patients.patientId, invoice.patientId)).limit(1),
      db.select().from(clinics).where(eq(clinics.clinicId, invoice.clinicId)).limit(1),
    ]);

    return NextResponse.json({
      invoice,
      patient: patientRows[0] || null,
      clinic: clinicRows[0] || null,
    });
  } catch (error) {
    console.error('Get Invoice Error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}
