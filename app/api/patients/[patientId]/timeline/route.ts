import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appointments } from '@/lib/db/schema/appointments';
import { visits } from '@/lib/db/schema/visits';
import { treatmentPlans } from '@/lib/db/schema/treatmentPlans';
import { patientPayments } from '@/lib/db/schema/patientPayments';
import { canViewClinical } from '@/lib/auth/claims';
import { eq, desc } from 'drizzle-orm';

export interface TimelineEntry {
  id: string;
  type:
    | 'APPOINTMENT'
    | 'VISIT'
    | 'PROCEDURE'
    | 'PAYMENT'
    | 'TREATMENT_PLAN'
    | 'FILE'
    | 'CLINICAL_NOTE';
  date: string;
  title: string;
  details: Record<string, unknown>;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { patientId } = await params;

  try {
    const [appts, visitRows, plans, payments] = await Promise.all([
      db
        .select()
        .from(appointments)
        .where(eq(appointments.patientId, patientId))
        .orderBy(desc(appointments.appointmentDate))
        .limit(200),
      db
        .select()
        .from(visits)
        .where(eq(visits.patientId, patientId))
        .orderBy(desc(visits.visitDate))
        .limit(200),
      db
        .select()
        .from(treatmentPlans)
        .where(eq(treatmentPlans.patientId, patientId))
        .orderBy(desc(treatmentPlans.createdAt))
        .limit(100),
      db
        .select()
        .from(patientPayments)
        .where(eq(patientPayments.patientId, patientId))
        .orderBy(desc(patientPayments.date))
        .limit(200),
    ]);

    const entries: TimelineEntry[] = [];

    for (const a of appts) {
      entries.push({
        id: `apt_${a.appointmentId}`,
        type: 'APPOINTMENT',
        date: new Date(a.appointmentDate).toISOString(),
        title: `${a.categoryName || 'Appointment'} with Dr. ${a.doctorName}`,
        details: {
          doctorName: a.doctorName,
          status: a.status,
          durationMinutes: a.durationMinutes,
          isWalkIn: a.isWalkIn,
          tokenNumber: a.tokenNumber,
          time: new Date(a.appointmentDate).toISOString(),
          endTime: new Date(
            new Date(a.appointmentDate).getTime() + a.durationMinutes * 60000
          ).toISOString(),
        },
      });
    }

    for (const v of visitRows) {
      // Visit/session entry
      entries.push({
        id: `vis_${v.visitId}`,
        type: 'VISIT',
        date: new Date(v.visitDate).toISOString(),
        title: `${(v.visitType || 'VISIT').replace(/_/g, ' ')} session (${v.status})`,
        details: {
          status: v.status,
          doctorsInvolved: v.doctorsInvolved || [],
        },
      });

      // Clinical note entry
      if (v.chiefComplaint || v.diagnosis || v.treatmentGiven) {
        entries.push({
          id: `note_${v.visitId}`,
          type: 'CLINICAL_NOTE',
          date: new Date(v.visitDate).toISOString(),
          title: v.chiefComplaint || v.diagnosis || 'Clinical note',
          details: {
            chiefComplaint: v.chiefComplaint,
            diagnosis: v.diagnosis,
            treatmentGiven: v.treatmentGiven,
            additionalNotes: v.additionalNotes,
            vitalSigns: v.vitalSigns,
            doctorsInvolved: v.doctorsInvolved || [],
          },
        });
      }

      // Completed procedures from dental chart
      const chartEntries = v.dentalChartEntries || [];
      const doctorNames = (v.doctorsInvolved || [])
        .map((d) => d.doctorName)
        .filter(Boolean);
      for (const [i, c] of chartEntries.entries()) {
        entries.push({
          id: `proc_${v.visitId}_${i}`,
          type: 'PROCEDURE',
          date: new Date(v.visitDate).toISOString(),
          title: c.procedureDone,
          details: {
            toothNumber: c.toothNumber,
            region: c.region,
            notes: c.notes,
            cost: v.treatmentCost ? Number(v.treatmentCost) : 0,
            discount: Math.max(
              Number(v.treatmentCost || 0) - Number(v.amountPaid || 0),
              0
            ),
            total: Number(v.amountPaid || 0),
            completedBy: doctorNames.join(' & ') || null,
            status: v.status,
          },
        });
      }

      // Files
      for (const f of v.fileIds || []) {
        entries.push({
          id: `file_${f.fileId}`,
          type: 'FILE',
          date: new Date(v.visitDate).toISOString(),
          title: f.fileName,
          details: {
            url: f.url,
            fileType: f.type,
            visitId: v.visitId,
          },
        });
      }
    }

    for (const p of plans) {
      entries.push({
        id: `plan_${p.planId}`,
        type: 'TREATMENT_PLAN',
        date: new Date(p.createdAt).toISOString(),
        title: p.title || 'Treatment Plan',
        details: {
          status: p.status,
          procedureCount: (p.procedures || []).length,
          grandTotal: Number(p.grandTotal || 0),
          totalDiscount: Number(p.totalDiscount || 0),
        },
      });
    }

    for (const p of payments) {
      entries.push({
        id: `pay_${p.paymentId}`,
        type: 'PAYMENT',
        date: new Date(p.date).toISOString(),
        title: `Payment ${p.paymentId}`,
        details: {
          amount: Number(p.amount),
          mode: p.mode,
          recordedByName: p.recordedByName,
          notes: p.notes,
        },
      });
    }

    entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Get Patient Timeline Error:', error);
    return NextResponse.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}
