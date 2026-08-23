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
    | 'CLINICAL_NOTE'
    | 'INVOICE'
    | 'VITAL_SIGNS';
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

      // Vital signs entry
      if (
        v.vitalSigns &&
        Object.values(v.vitalSigns).some((val) => val !== null && val !== undefined && val !== '')
      ) {
        entries.push({
          id: `vitals_${v.visitId}`,
          type: 'VITAL_SIGNS',
          date: new Date(v.visitDate).toISOString(),
          title: 'Vital Signs recorded',
          details: {
            vitalSigns: v.vitalSigns,
            doctorsInvolved: v.doctorsInvolved || [],
          },
        });
      }

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
            injectionGiven: v.injectionGiven,
            toothNumbers: (v.dentalChartEntries || [])
              .map((c) => c.toothNumber)
              .filter(Boolean),
            doctorsInvolved: v.doctorsInvolved || [],
          },
        });
      }

      // Invoice entry (derived from visit billing)
      if (Number(v.treatmentCost || 0) > 0) {
        const total = Number(v.treatmentCost);
        const paid = Math.min(Number(v.amountPaid || 0), total);
        const due = Math.max(total - paid, 0);
        entries.push({
          id: `inv_${v.visitId}`,
          type: 'INVOICE',
          date: new Date(v.visitDate).toISOString(),
          title: `Invoice for ${(v.visitType || 'VISIT').replace(/_/g, ' ').toLowerCase()} session`,
          details: {
            invoiceNumber: `INV-${v.visitId.slice(-6).toUpperCase()}`,
            total,
            paid,
            due,
            status:
              v.paymentStatus ||
              (paid >= total ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'),
            procedures: (v.dentalChartEntries || []).map((c) => c.procedureDone),
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

      // Completed procedures from the treatment plan
      for (const [i, proc] of (p.procedures || []).entries()) {
        if (proc.status === 'COMPLETED') {
          entries.push({
            id: `proc_${p.planId}_${i}`,
            type: 'PROCEDURE',
            date: proc.completedAt
              ? new Date(proc.completedAt).toISOString()
              : new Date(p.updatedAt || p.createdAt).toISOString(),
            title: proc.procedureName,
            details: {
              toothNumbers: proc.toothNumbers,
              isFullMouth: proc.isFullMouth,
              cost: proc.qty * proc.unitCost,
              discount: proc.discount,
              total: proc.total,
              completedBy: proc.completedByName || null,
              notes: proc.notes,
              planId: p.planId,
              planTitle: p.title,
            },
          });
        }
      }
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
