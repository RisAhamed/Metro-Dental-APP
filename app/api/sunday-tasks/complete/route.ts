import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { sundayTasks } from '@/lib/db/schema/sundayTasks';
import { eq } from 'drizzle-orm';
import { createIncentive } from '@/lib/payroll/incentives';
import { toISTDateString } from '@/lib/utils/attendance';

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!userId || sessionClaims?.role !== 'ASSISTANT_DOCTOR') {
    return NextResponse.json({ error: 'Only assistant doctors can complete tasks' }, { status: 403 });
  }

  const body = await req.json();
  const { taskId, clinicId, patientId } = body;

  if (!taskId || !clinicId) {
    return NextResponse.json(
      { error: 'Missing required fields: taskId, clinicId' },
      { status: 400 }
    );
  }

  // Today must be Sunday (IST)
  const today = new Date();
  const istDay = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  }).format(today);

  if (istDay !== 'Sun') {
    return NextResponse.json(
      { error: 'Sunday tasks can only be completed on a Sunday' },
      { status: 400 }
    );
  }

  try {
    const taskResult = await db
      .select()
      .from(sundayTasks)
      .where(eq(sundayTasks.id, taskId))
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
      recipientUserId: userId,
      clinicId,
      type: 'SUNDAY_TASK',
      amount,
      date: today,
      createdBy: userId,
      taskTypeId: task.id,
      taskTypeName: task.name,
      patientId: patientId || null,
      description: `Sunday task completed: ${task.name}`,
      notifTitle: 'Sunday Task Incentive',
      notifMessage: `₹${amount.toLocaleString('en-IN')} task incentive credited for ${task.name}!`,
    });

    return NextResponse.json(
      {
        success: true,
        incentiveId: result.incentiveId,
        taskId: task.id,
        taskName: task.name,
        amount,
        dateString: toISTDateString(today),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Complete Sunday Task Error:', error);
    return NextResponse.json({ error: 'Failed to complete Sunday task' }, { status: 500 });
  }
}