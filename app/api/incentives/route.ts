import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { incentiveRecords } from '@/lib/db/schema/incentiveRecords';
import { isStaff, isSuperAdmin } from '@/lib/auth/claims';
import { eq, and, gte, lte } from 'drizzle-orm';
import { createIncentive, type IncentiveType } from '@/lib/payroll/incentives';

const VALID_TYPES: IncentiveType[] = ['REFERRAL_1500', 'WEEKLY_ATTENDANCE_500', 'SUNDAY_TASK'];

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const clinicId = searchParams.get('clinicId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!userId || !clinicId || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing userId, clinicId, startDate, endDate' },
      { status: 400 }
    );
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const conditions = [
      eq(incentiveRecords.recipientUserId, userId),
      eq(incentiveRecords.clinicId, clinicId),
      gte(incentiveRecords.date, start),
      lte(incentiveRecords.date, end),
    ];

    const records = await db
      .select()
      .from(incentiveRecords)
      .where(and(...conditions))
      .orderBy(incentiveRecords.date);

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Get Incentives Error:', error);
    return NextResponse.json({ error: 'Failed to fetch incentives' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { type, recipientUserId, clinicId, amount, date, description } = body;

  if (!type || !recipientUserId || !clinicId || amount === undefined || !date) {
    return NextResponse.json(
      { error: 'Missing required fields: type, recipientUserId, clinicId, amount, date' },
      { status: 400 }
    );
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid incentive type' }, { status: 400 });
  }

  try {
    const result = await createIncentive({
      recipientUserId,
      clinicId,
      type,
      amount: Number(amount),
      date: new Date(date),
      createdBy: userId,
      description,
      referredPatientId: body.referredPatientId,
      referredPatientName: body.referredPatientName,
      surgeryTypeId: body.surgeryTypeId,
      surgeryTypeName: body.surgeryTypeName,
      chiefDoctorRevenue: body.chiefDoctorRevenue !== undefined ? Number(body.chiefDoctorRevenue) : undefined,
      weekStartDate: body.weekStartDate,
      weekEndDate: body.weekEndDate,
      taskTypeId: body.taskTypeId,
      taskTypeName: body.taskTypeName,
      patientId: body.patientId,
      notifTitle: 'Incentive Credited',
      notifMessage: `₹${Number(amount).toLocaleString('en-IN')} incentive credited`,
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    console.error('Create Incentive Error:', error);
    return NextResponse.json({ error: 'Failed to create incentive' }, { status: 500 });
  }
}