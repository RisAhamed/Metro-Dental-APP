import { db } from '@/lib/db';
import { incentiveRecords } from '@/lib/db/schema/incentiveRecords';
import { payrollEntries, type NewPayrollEntry } from '@/lib/db/schema/payrollEntries';
import { users } from '@/lib/db/schema/users';
import { notifyUser } from '@/lib/notifications';
import { eq, sql, type SQL } from 'drizzle-orm';
import { toISTDateString } from '@/lib/utils/attendance';

export type IncentiveType = 'REFERRAL_1500' | 'WEEKLY_ATTENDANCE_500' | 'SUNDAY_TASK';

export interface CreateIncentiveInput {
  recipientUserId: string;
  clinicId: string;
  type: IncentiveType;
  amount: number;
  date: Date;
  createdBy: string;
  description?: string;
  // Referral metadata
  referredPatientId?: string;
  referredPatientName?: string;
  surgeryTypeId?: string;
  surgeryTypeName?: string;
  chiefDoctorRevenue?: number;
  // Weekly attendance bonus metadata
  weekStartDate?: string;
  weekEndDate?: string;
  // Sunday task metadata
  taskTypeId?: string;
  taskTypeName?: string;
  patientId?: string;
  // Notification
  notifTitle: string;
  notifMessage: string;
}

export interface CreatedIncentive {
  incentiveId: string;
  recipientName: string;
}

export async function createIncentive(
  input: CreateIncentiveInput
): Promise<CreatedIncentive> {
  const dateString = toISTDateString(input.date);

  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.uid, input.recipientUserId))
    .limit(1);

  const recipient = userResult[0];
  const recipientName = recipient?.name ?? input.recipientUserId;
  const recipientRole = recipient?.role ?? 'UNKNOWN';

  const counterResult = await db.execute(
    sql`INSERT INTO counters (key, value) VALUES ('incentives', 1)
        ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
        RETURNING value`
  );
  const next = Number(counterResult[0]?.value ?? 1);
  const incentiveId = `INC-${String(next).padStart(6, '0')}`;

  await db.insert(incentiveRecords).values({
    incentiveId,
    recipientUserId: input.recipientUserId,
    recipientUserName: recipientName,
    clinicId: input.clinicId,
    type: input.type,
    amount: String(input.amount),
    date: input.date,
    dateString,
    referredPatientId: input.referredPatientId || null,
    referredPatientName: input.referredPatientName || null,
    surgeryTypeId: input.surgeryTypeId || null,
    surgeryTypeName: input.surgeryTypeName || null,
    chiefDoctorRevenue:
      input.chiefDoctorRevenue !== undefined ? String(input.chiefDoctorRevenue) : null,
    weekStartDate: input.weekStartDate || null,
    weekEndDate: input.weekEndDate || null,
    taskTypeId: input.taskTypeId || null,
    taskTypeName: input.taskTypeName || null,
    patientId: input.patientId || null,
    description: input.description || null,
    createdBy: input.createdBy,
  });

  await updatePayrollEntryForIncentive({
    recipientUserId: input.recipientUserId,
    recipientName,
    recipientRole,
    clinicId: input.clinicId,
    type: input.type,
    amount: input.amount,
    date: input.date,
    dateString,
  });

  await notifyUser({
    userId: input.recipientUserId,
    type: input.type,
    title: input.notifTitle,
    message: input.notifMessage,
    clinicId: input.clinicId,
  });

  return { incentiveId, recipientName };
}

async function updatePayrollEntryForIncentive(params: {
  recipientUserId: string;
  recipientName: string;
  recipientRole: string;
  clinicId: string;
  type: IncentiveType;
  amount: number;
  date: Date;
  dateString: string;
}) {
  const { recipientUserId, recipientName, recipientRole, clinicId, type, amount, date, dateString } = params;
  const entryId = `${recipientUserId}_${clinicId}_${dateString}`;
  const isSunday = date.getDay() === 0;

  const insertValues: NewPayrollEntry = {
    entryId,
    userId: recipientUserId,
    userName: recipientName,
    userRole: recipientRole,
    clinicId,
    date,
    dateString,
    isSunday,
    totalDayEarning: '0',
    gdReferralIncentive: '0',
    gdReferralCount: '0',
    adSundayIncentives: '0',
    adSundayTasksCount: '0',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (type === 'REFERRAL_1500') {
    insertValues.gdReferralIncentive = String(amount);
    insertValues.gdReferralCount = '1';
  } else if (type === 'SUNDAY_TASK' || type === 'WEEKLY_ATTENDANCE_500') {
    insertValues.adSundayIncentives = String(amount);
    if (type === 'SUNDAY_TASK') insertValues.adSundayTasksCount = '1';
  }

  const conflictSet: { [key: string]: SQL | Date } = {
    updatedAt: new Date(),
  };
  if (type === 'REFERRAL_1500') {
    conflictSet.gdReferralIncentive = sql`coalesce(${payrollEntries.gdReferralIncentive}, 0) + ${amount}`;
    conflictSet.gdReferralCount = sql`coalesce(${payrollEntries.gdReferralCount}, 0) + 1`;
  } else if (type === 'SUNDAY_TASK' || type === 'WEEKLY_ATTENDANCE_500') {
    conflictSet.adSundayIncentives = sql`coalesce(${payrollEntries.adSundayIncentives}, 0) + ${amount}`;
    if (type === 'SUNDAY_TASK') {
      conflictSet.adSundayTasksCount = sql`coalesce(${payrollEntries.adSundayTasksCount}, 0) + 1`;
    }
  }

  await db
    .insert(payrollEntries)
    .values(insertValues)
    .onConflictDoUpdate({
      target: payrollEntries.entryId,
      set: conflictSet,
    });
}