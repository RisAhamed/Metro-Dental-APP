import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labOrders } from '@/lib/db/schema/labOrders';
import { labBilling } from '@/lib/db/schema/labBilling';
import { users } from '@/lib/db/schema/users';
import { isStaff, isDoctor } from '@/lib/auth/claims';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logActivity } from '@/lib/activity';

type LabOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export async function GET(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  const role = sessionClaims?.role;
  if (!isStaff(sessionClaims) && role !== 'LAB_TECHNICIAN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const status = searchParams.get('status');
  const patientId = searchParams.get('patientId');

  try {
    const conditions = [];

    if (clinicId) {
      conditions.push(eq(labOrders.clinicId, clinicId));
    }
    if (status) {
      conditions.push(eq(labOrders.status, status as LabOrderStatus));
    }
    if (patientId) {
      conditions.push(eq(labOrders.patientId, patientId));
    }

    // Lab technicians can only see their own lab's orders
    if (sessionClaims?.role === 'LAB_TECHNICIAN') {
      const labParam = searchParams.get('labId');
      const userSnap = await db
        .select({ labId: users.labId })
        .from(users)
        .where(eq(users.uid, userId || ''))
        .limit(1);
      const userLabId = userSnap[0]?.labId || null;
      const labId = labParam || userLabId;
      if (!labId) {
        return NextResponse.json({ orders: [] });
      }
      conditions.push(eq(labOrders.labId, labId));
    } else if (searchParams.get('labId')) {
      conditions.push(eq(labOrders.labId, searchParams.get('labId')!));
    }

    const results = await db
      .select()
      .from(labOrders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(labOrders.createdAt));

    return NextResponse.json({ orders: results });
  } catch (error) {
    console.error('Get Lab Orders Error:', error);
    return NextResponse.json({ error: 'Failed to fetch lab orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isDoctor(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Doctors only' }, { status: 403 });
  }

  const body = await req.json();
  const {
    labId, labName, clinicId, patientId, patientName,
    visitId, workDescription, stages, overallDueDate,
    workType, workTypeId, shade, shadeId, totalAmount,
  } = body;

  if (!labId || !clinicId || !patientId || !workDescription || !stages) {
    return NextResponse.json(
      { error: 'Missing required fields: labId, clinicId, patientId, workDescription, stages' },
      { status: 400 }
    );
  }

  try {
    // Generate order ID
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('lab_orders', 1)
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
          RETURNING value`
    );
    const next = Number(counterResult[0]?.value ?? 1);
    const orderId = `ORD-${String(next).padStart(5, '0')}`;

    // Resolve doctor name: prefer users table, fall back to Clerk user record
    let doctorName = 'Unknown Doctor';
    if (userId) {
      const doctorSnap = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.uid, userId))
        .limit(1);
      if (doctorSnap[0]?.name) {
        doctorName = doctorSnap[0].name;
      } else {
        try {
          const { clerkClient } = await import('@clerk/nextjs/server');
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(userId);
          doctorName = clerkUser.fullName || clerkUser.firstName || 'Unknown Doctor';
        } catch (error) {
          console.error('Error fetching doctor name from Clerk:', error);
        }
      }
    }

    const normalizedStages = (stages as Array<{
      stageId?: string;
      stageName: string;
      description?: string;
      deadline?: string | null;
      price?: string | number | null;
      templateId?: string | null;
    }>).map((s, i) => ({
      stageId: s.stageId || `stage_${i + 1}`,
      stageName: s.stageName,
      description: s.description || '',
      deadline: s.deadline || null,
      status: 'PENDING' as const,
      completedAt: null,
      completedBy: null,
      completedByName: null,
      notes: null,
      price: s.price !== undefined && s.price !== null && s.price !== '' ? String(s.price) : null,
      templateId: s.templateId || null,
    }));

    // Compute totalAmount as sum of stage prices if not provided
    let computedTotal = totalAmount;
    if (!computedTotal) {
      const sum = normalizedStages.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
      if (sum > 0) computedTotal = String(sum);
    }

    await db.insert(labOrders).values({
      orderId,
      labId,
      labName,
      clinicId,
      patientId,
      patientName,
      visitId: visitId || null,
      orderedByDoctorId: userId,
      orderedByDoctorName: doctorName,
      orderDate: new Date(),
      overallDueDate: overallDueDate ? new Date(overallDueDate) : null,
      workDescription,
      workType: workType || null,
      workTypeId: workTypeId || null,
      shade: shade || null,
      shadeId: shadeId || null,
      totalAmount: computedTotal ? String(computedTotal) : null,
      amountPaid: null,
      stages: normalizedStages as unknown as typeof labOrders.$inferInsert.stages,
      status: 'PENDING',
      attachmentFileIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Initialize billing subcollection
    await db.insert(labBilling).values({
      orderId,
      stageCosts: [],
      totalCost: '0',
      amountPaid: '0',
      paymentStatus: 'UNPAID',
      clinicApproved: false,
      paymentHistory: [],
    }).onConflictDoNothing();

    await logActivity({
      clinicId,
      type: 'LAB_ORDER_SENT',
      message: `Lab order ${orderId} sent to ${labName} for patient ${patientName}`,
      userId,
      userName: doctorName,
      userRole: (sessionClaims?.role as string) || undefined,
      relatedEntityType: 'lab_order',
      relatedEntityId: orderId,
      metadata: { labId, patientId },
    });

    return NextResponse.json({
      success: true,
      orderId,
      message: 'Lab order created successfully',
    });
  } catch (error: unknown) {
    console.error('Create Lab Order Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to create lab order' },
      { status: 500 }
    );
  }
}