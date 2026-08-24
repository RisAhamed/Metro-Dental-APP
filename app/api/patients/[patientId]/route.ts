import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { patients } from '@/lib/db/schema/patients';
import { canManagePatients } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!canManagePatients(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  const { patientId } = await params;

  try {
    const result = await db
      .select()
      .from(patients)
      .where(eq(patients.patientId, patientId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({ patient: result[0] });
  } catch (error) {
    console.error('Get Patient Error:', error);
    return NextResponse.json({ error: 'Failed to fetch patient' }, { status: 500 });
  }
}

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const BLOOD_GROUPS = [
  'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-',
  'A1+', 'A1-', 'A1B+', 'A1B-', 'A2+', 'A2-', 'A2B+', 'A2B-', 'B1+',
];

function toDateOrNull(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { sessionClaims, userId } = await auth();
  if (!canManagePatients(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  const { patientId } = await params;
  const body = await req.json();

  try {
    const existing = await db
      .select()
      .from(patients)
      .where(eq(patients.patientId, patientId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: userId,
    };

    if (body.name !== undefined) {
      if (!String(body.name).trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updateFields.name = String(body.name).trim();
    }
    if (body.gender !== undefined) {
      if (!GENDERS.includes(body.gender)) {
        return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
      }
      updateFields.gender = body.gender;
    }
    if (body.dateOfBirth !== undefined) updateFields.dateOfBirth = toDateOrNull(body.dateOfBirth);
    if (body.anniversary !== undefined) updateFields.anniversary = toDateOrNull(body.anniversary);
    if (body.age !== undefined)
      updateFields.age = body.age === null || body.age === '' ? null : Math.max(0, Number(body.age) || 0);
    if (body.primaryPhone !== undefined) {
      const phone = String(body.primaryPhone).trim();
      if (!phone) {
        return NextResponse.json({ error: 'Primary phone cannot be empty' }, { status: 400 });
      }
      updateFields.primaryPhone = phone;
    }
    if (body.secondaryPhone !== undefined)
      updateFields.secondaryPhone = String(body.secondaryPhone).trim() || null;
    if (body.email !== undefined) {
      const email = String(body.email).trim() || null;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
      }
      updateFields.email = email;
    }
    if (body.bloodGroup !== undefined) {
      if (body.bloodGroup && !BLOOD_GROUPS.includes(body.bloodGroup)) {
        return NextResponse.json({ error: 'Invalid blood group' }, { status: 400 });
      }
      updateFields.bloodGroup = body.bloodGroup || null;
    }
    if (body.languagePreference !== undefined)
      updateFields.languagePreference = String(body.languagePreference).trim() || 'English';
    if (body.referredByName !== undefined)
      updateFields.referredByName = String(body.referredByName).trim() || null;
    if (body.address !== undefined) {
      const a = body.address;
      updateFields.address =
        a && (a.street || a.locality || a.city || a.pincode)
          ? {
              street: String(a.street || ''),
              locality: String(a.locality || ''),
              city: String(a.city || ''),
              pincode: String(a.pincode || ''),
            }
          : null;
    }
    if (body.medicalHistory !== undefined) {
      if (!Array.isArray(body.medicalHistory)) {
        return NextResponse.json({ error: 'medicalHistory must be an array' }, { status: 400 });
      }
      updateFields.medicalHistory = body.medicalHistory.map(String);
    }
    if (body.otherHistory !== undefined)
      updateFields.otherHistory = String(body.otherHistory).trim() || null;
    if (body.groups !== undefined) {
      if (!Array.isArray(body.groups)) {
        return NextResponse.json({ error: 'groups must be an array' }, { status: 400 });
      }
      updateFields.groups = body.groups.map(String);
    }
    if (body.familyMembers !== undefined) {
      if (!Array.isArray(body.familyMembers)) {
        return NextResponse.json({ error: 'familyMembers must be an array' }, { status: 400 });
      }
      updateFields.familyMembers = body.familyMembers;
    }
    if (body.pastDiseases !== undefined) {
      if (!Array.isArray(body.pastDiseases)) {
        return NextResponse.json({ error: 'pastDiseases must be an array' }, { status: 400 });
      }
      updateFields.pastDiseases = body.pastDiseases.map(String);
    }
    if (body.allergies !== undefined) {
      if (!Array.isArray(body.allergies)) {
        return NextResponse.json({ error: 'allergies must be an array' }, { status: 400 });
      }
      updateFields.allergies = body.allergies.map(String);
    }
    if (body.previousMedicineIntake !== undefined)
      updateFields.previousMedicineIntake =
        String(body.previousMedicineIntake).trim() || null;
    if (body.baselineVitals !== undefined) {
      const bv = body.baselineVitals;
      updateFields.baselineVitals =
        bv && typeof bv === 'object'
          ? {
              heightCm: bv.heightCm ? Number(bv.heightCm) : null,
              weightKg: bv.weightKg ? Number(bv.weightKg) : null,
              bloodPressure: bv.bloodPressure ? String(bv.bloodPressure).trim() : null,
              bloodSugar: bv.bloodSugar ? Number(bv.bloodSugar) : null,
              pulseRate: bv.pulseRate ? Number(bv.pulseRate) : null,
              spo2: bv.spo2 ? Number(bv.spo2) : null,
            }
          : null;
    }
    if (body.generalNotes !== undefined)
      updateFields.generalNotes = String(body.generalNotes).trim() || null;

    await db.update(patients).set(updateFields).where(eq(patients.patientId, patientId));

    const updated = await db
      .select()
      .from(patients)
      .where(eq(patients.patientId, patientId))
      .limit(1);

    return NextResponse.json({ success: true, patient: updated[0] });
  } catch (error) {
    console.error('Update Patient Error:', error);
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
  }
}
