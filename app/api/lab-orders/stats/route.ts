import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { labOrders } from '@/lib/db/schema/labOrders';
import { isStaff } from '@/lib/auth/claims';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const labId = searchParams.get('labId');
  const status = searchParams.get('status');
  const fromDate = searchParams.get('from');
  const toDate = searchParams.get('to');

  try {
    const conditions = [];
    if (clinicId) conditions.push(eq(labOrders.clinicId, clinicId));
    if (labId) conditions.push(eq(labOrders.labId, labId));
    if (status) conditions.push(eq(labOrders.status, status as typeof labOrders.$inferSelect.status));

    const allOrders = await db
      .select()
      .from(labOrders)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Filter by date range if provided
    let filtered = allOrders;
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;
      filtered = allOrders.filter((o) => {
        const d = new Date(o.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    const totalOrders = filtered.length;
    const totalAmount = filtered.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    // Breakdown by workType
    const byWorkType: Record<string, { count: number; total: number }> = {};
    for (const o of filtered) {
      const key = o.workType || 'Unspecified';
      if (!byWorkType[key]) byWorkType[key] = { count: 0, total: 0 };
      byWorkType[key].count += 1;
      byWorkType[key].total += Number(o.totalAmount) || 0;
    }
    const topWorkTypes = Object.entries(byWorkType)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Breakdown by lab
    const byLab: Record<string, { count: number; total: number }> = {};
    for (const o of filtered) {
      const key = o.labName || o.labId;
      if (!byLab[key]) byLab[key] = { count: 0, total: 0 };
      byLab[key].count += 1;
      byLab[key].total += Number(o.totalAmount) || 0;
    }
    const topLabs = Object.entries(byLab)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Orders by status
    const byStatus: Record<string, number> = {};
    for (const o of filtered) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    }

    // Average stage completion time (in hours)
    let totalStageCompletionTime = 0;
    let completedStagesCount = 0;
    for (const o of filtered) {
      for (const s of o.stages || []) {
        if (s.status === 'COMPLETED' && s.completedAt) {
          const created = new Date(o.createdAt).getTime();
          const completed = new Date(s.completedAt).getTime();
          if (!isNaN(completed) && !isNaN(created)) {
            totalStageCompletionTime += (completed - created) / (1000 * 60 * 60);
            completedStagesCount += 1;
          }
        }
      }
    }
    const avgStageCompletionHours =
      completedStagesCount > 0 ? totalStageCompletionTime / completedStagesCount : null;

    return NextResponse.json({
      totalOrders,
      totalAmount,
      byWorkType: topWorkTypes,
      byLab: topLabs,
      byStatus,
      avgStageCompletionHours,
    });
  } catch (error) {
    console.error('Get Lab Orders Stats Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
