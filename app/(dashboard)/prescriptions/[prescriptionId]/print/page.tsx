import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { prescriptions, type PrescriptionMedicine } from '@/lib/db/schema/prescriptions';
import { patients } from '@/lib/db/schema/patients';
import { clinics } from '@/lib/db/schema/clinics';
import { canViewClinical } from '@/lib/auth/claims';
import { PrescriptionPrint } from '@/components/prescriptions/PrescriptionPrint';

function legacyMedicines(rx: typeof prescriptions.$inferSelect): PrescriptionMedicine[] {
  if (rx.medicines?.length) return rx.medicines;
  return rx.drugs.map((d) => ({
    drugName: d.drugName,
    strength: d.dosage,
    strengthUnit: '',
    duration: d.duration,
    durationUnit: '',
    morning: '',
    noon: '',
    night: '',
    beforeAfterFood: '',
    instruction: d.instructions,
  }));
}

export default async function PrescriptionPrintPage({
  params,
}: {
  params: Promise<{ prescriptionId: string }>;
}) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) notFound();

  const { prescriptionId } = await params;
  const [rx] = await db.select().from(prescriptions).where(eq(prescriptions.prescriptionId, prescriptionId)).limit(1);
  if (!rx) notFound();

  const [patient] = await db.select().from(patients).where(eq(patients.patientId, rx.patientId)).limit(1);
  const [clinic] = await db.select().from(clinics).where(eq(clinics.clinicId, rx.clinicId)).limit(1);
  if (!patient) notFound();

  return (
    <PrescriptionPrint
      prescription={{
        prescriptionId: rx.prescriptionId,
        date: rx.date.toISOString(),
        doctorName: rx.doctorName,
        notes: rx.notes,
        medicines: legacyMedicines(rx),
      }}
      patient={{
        patientId: patient.patientId,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        primaryPhone: patient.primaryPhone,
      }}
      clinic={clinic ? {
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        email: clinic.email,
      } : null}
    />
  );
}
