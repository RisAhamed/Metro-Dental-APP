import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { patients } from '@/lib/db/schema/patients';
import { patientGroups } from '@/lib/db/schema/patientGroups';
import { canManagePatients } from '@/lib/auth/claims';
import { eq, ilike, or, and, arrayContains, desc, inArray, sql } from 'drizzle-orm';

const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const VALID_BLOOD_GROUPS = [
  'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-',
  'A1+', 'A1-', 'A1B+', 'A1B-', 'A2+', 'A2-', 'A2B+', 'A2B-', 'B1+',
];

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManagePatients(sessionClaims) || !userId) {
    return NextResponse.json(
      { error: 'Unauthorized - Staff only' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    patientId, name, gender, dateOfBirth, age, bloodGroup,
    primaryPhone, secondaryPhone, email, anniversary, address,
    referredById, referredByName, medicalHistory, otherHistory,
    groups, familyMembers, languagePreference, registeredClinicId,
    primaryDoctorId, primaryDoctorName,
  } = body;

  if (!patientId || !name || !gender || !primaryPhone || !registeredClinicId) {
    return NextResponse.json(
      {
        error:
          'Missing required fields: patientId, name, gender, primaryPhone, registeredClinicId',
      },
      { status: 400 }
    );
  }

  if (!VALID_GENDERS.includes(gender)) {
    return NextResponse.json({ error: 'Invalid gender value' }, { status: 400 });
  }

  if (bloodGroup && !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
    return NextResponse.json({ error: 'Invalid blood group value' }, { status: 400 });
  }

  try {
    const groupIds: string[] = Array.isArray(groups) ? groups : [];

    await db.insert(patients).values({
      patientId,
      name,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      age: age ? Number(age) : null,
      bloodGroup: bloodGroup || null,
      primaryPhone,
      secondaryPhone: secondaryPhone || null,
      email: email || null,
      anniversary: anniversary ? new Date(anniversary) : null,
      address: address || null,
      referredById: referredById || null,
      referredByName: referredByName || null,
      medicalHistory: medicalHistory || [],
      otherHistory: otherHistory || null,
      groups: groupIds,
      familyMembers: familyMembers || [],
      languagePreference: languagePreference || 'English',
      registeredClinicId,
      primaryDoctorId: primaryDoctorId || null,
      primaryDoctorName: primaryDoctorName || null,
      createdBy: userId,
      updatedBy: userId,
    });

    // Keep group patient counts in sync
    if (groupIds.length > 0) {
      await db
        .update(patientGroups)
        .set({ patientCount: sql`${patientGroups.patientCount} + 1` })
        .where(inArray(patientGroups.id, groupIds));
    }

    return NextResponse.json({
      success: true,
      patientId,
      message: 'Patient created successfully',
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    // Unique constraint on patient_id
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'Patient ID already exists, please regenerate and try again' },
        { status: 409 }
      );
    }
    console.error('Create Patient Error:', error);
    return NextResponse.json(
      { error: err.message || 'Failed to create patient' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManagePatients(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Staff only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const group = searchParams.get('group');
  const search = searchParams.get('search');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 200);

  try {
    const conditions = [];

    if (clinicId) {
      conditions.push(eq(patients.registeredClinicId, clinicId));
    }

    if (group) {
      conditions.push(arrayContains(patients.groups, [group]));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(patients.name, pattern),
          ilike(patients.patientId, pattern),
          ilike(patients.primaryPhone, pattern)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select()
      .from(patients)
      .where(where)
      .orderBy(desc(patients.lastVisitDate), desc(patients.createdAt))
      .limit(limit);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(patients)
      .where(where);

    return NextResponse.json({ patients: results, total: Number(total) });
  } catch (error) {
    console.error('Get Patients Error:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}
