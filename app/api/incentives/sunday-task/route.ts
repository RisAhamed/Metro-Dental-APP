import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { sundayTasks } from '@/lib/db/schema/sundayTasks';
import { isDoctor } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';
import { createIncentive } from '@/lib/payroll/incentives';
import { toISTDateString } from '@/lib/utils/attendance';

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isDoctor(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { assistantId, taskTypeId, clinicId, patientId, date } = body;

  if (!assistantId || !taskTypeId || !clinicId) {
    return NextResponse.json(
      { error: 'Missing required fields: assistantId, taskTypeId, clinicId' },
      { status: 400 }
    );
  }

  const taskDate = date ? new Date(date) : new Date();
  if (taskDate.getDay() !== 0) {
    return NextResponse.json(
      { error: 'Sunday tasks can only be recorded on a Sunday' },
      { status: 400 }
    );
  }

  try {
    const taskResult = await db
      .select()
      .from(sundayTasks)
      .where(eq(sundayTasks.id, taskTypeId))
      .limit(1);

    if (taskResult.length === 0 || !taskResult[0].isActive) {
      return NextResponse.json(
        { error: 'Sunday task not found or inactive' },
        { status: 404 }
      );
    }

    const task = taskResult[0];
    const amount = Number(task.amount);

    const result = await createIncentive({
      recipientUserId: assistantId,
      clinicId,
      type: 'SUNDAY_TASK',
      amount,
      date: taskDate,
      createdBy: userId,
      taskTypeId: task.id,
      taskTypeName: task.name,
      patientId: patientId || null,
      description: `Sunday task: ${task.name}`,
      notifTitle: 'Sunday Task Incentive',
      notifMessage: `₹${amount.toLocaleString('en-IN')} task incentive credited for ${task.name}`,
    });

    return NextResponse.json(
      {
        success: true,
        incentiveId: result.incentiveId,
        amount,
        taskName: task.name,
        dateString: toISTDateString(taskDate),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create Sunday Task Incentive Error:', error);
    return NextResponse.json(
      { error: 'Failed to record Sunday task' },
      { status: 500 }
    );
  }
}