import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { isSuperAdmin } from '@/lib/auth/claims';
import { monthlyPayroll } from '@/lib/db/schema/monthlyPayroll';
import { attendanceRecords } from '@/lib/db/schema/attendance';
import { labBilling } from '@/lib/db/schema/labBilling';
import { labOrders } from '@/lib/db/schema/labOrders';
import { inventoryItems } from '@/lib/db/schema/inventoryItems';
import { patientPayments } from '@/lib/db/schema/patientPayments';
import { eq, and, or, gte, lte, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { buildWorkbookBuffer } from '@/lib/utils/buildWorkbook';

const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const n = (v: string | null | undefined): number => Number(v || 0);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { sessionClaims } = await auth();
  if (!isSuperAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { type } = await params;
  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  const clinicFilter = (col: { clinicId: PgColumn }) =>
    clinicId && clinicId !== 'both' ? eq(col.clinicId, clinicId) : undefined;

  try {
    let data: Record<string, unknown>[] = [];
    let columns: { key: string; header: string }[] = [];
    let fileName = '';

    switch (type) {
      case 'payroll': {
        const conds = [];
        if (clinicId && clinicId !== 'both') conds.push(eq(monthlyPayroll.clinicId, clinicId));
        if (month) conds.push(eq(monthlyPayroll.month, month));
        if (year) conds.push(eq(monthlyPayroll.year, year));

        const records = await db
          .select()
          .from(monthlyPayroll)
          .where(conds.length > 0 ? and(...conds) : undefined);

        data = records.map((p) => {
          const isDoctor =
            p.userRole === 'GENERAL_DOCTOR' || p.userRole === 'CLINIC_ADMIN';
          return {
            Name: p.userName,
            Role: p.userRole,
            Clinic: p.clinicId,
            'Days Worked': isDoctor ? n(p.gdTotalDaysWorked) : n(p.adTotalDaysWorked),
            'Base Salary': isDoctor ? n(p.gdAccumulatedSalary) : n(p.adRegularEarning),
            'Sunday Pay': isDoctor ? n(p.gdSundayEarning) : n(p.adSundayEarning),
            'Referrals': n(p.gdReferralIncentivesTotal),
            'Monthly Bonus': isDoctor ? n(p.gdMonthlyTargetBonus) : n(p.adWeeklyBonusesTotal),
            'Sunday Task Incentive': n(p.adSundayTaskIncentivesTotal),
            'Total Salary': isDoctor ? n(p.gdTotalFinalSalary) : n(p.adTotalFinalSalary),
            Status: p.status,
          };
        });
        columns = [
          { key: 'Name', header: 'Name' },
          { key: 'Role', header: 'Role' },
          { key: 'Clinic', header: 'Clinic' },
          { key: 'Days Worked', header: 'Days Worked' },
          { key: 'Base Salary', header: 'Base Salary' },
          { key: 'Sunday Pay', header: 'Sunday Pay' },
          { key: 'Referrals', header: 'Referrals' },
          { key: 'Monthly Bonus', header: 'Monthly Bonus' },
          { key: 'Sunday Task Incentive', header: 'Sunday Task Incentive' },
          { key: 'Total Salary', header: 'Total Salary' },
          { key: 'Status', header: 'Status' },
        ];
        fileName = `Payroll_${month}_${year}`;
        break;
      }

      case 'revenue': {
        const conds = [clinicFilter(patientPayments)];
        if (startDate && endDate) {
          conds.push(gte(patientPayments.date, new Date(`${startDate}T00:00:00.000Z`)));
          conds.push(lte(patientPayments.date, new Date(`${endDate}T23:59:59.999Z`)));
        }

        const payments = await db
          .select()
          .from(patientPayments)
          .where(and(...conds.filter(Boolean)))
          .orderBy(sql`${patientPayments.date} ASC`);

        let running = 0;
        data = payments.map((p) => {
          running += n(p.amount);
          return {
            Date: p.date.toISOString().slice(0, 10),
            Patient: p.patientName,
            Amount: n(p.amount),
            Mode: p.mode,
            'Recorded By': p.recordedByName,
            'Running Total': Number(running.toFixed(2)),
          };
        });
        columns = [
          { key: 'Date', header: 'Date' },
          { key: 'Patient', header: 'Patient' },
          { key: 'Amount', header: 'Amount' },
          { key: 'Mode', header: 'Mode' },
          { key: 'Recorded By', header: 'Recorded By' },
          { key: 'Running Total', header: 'Running Total' },
        ];
        fileName = `Revenue_${startDate}_${endDate}`;
        break;
      }

      case 'attendance': {
        const conds = [];
        if (clinicId && clinicId !== 'both') conds.push(eq(attendanceRecords.clinicId, clinicId));
        if (month) conds.push(sql`EXTRACT(MONTH FROM ${attendanceRecords.date}) = ${month}`);
        if (year) conds.push(sql`EXTRACT(YEAR FROM ${attendanceRecords.date}) = ${year}`);

        const records = await db
          .select()
          .from(attendanceRecords)
          .where(conds.length > 0 ? and(...conds) : undefined)
          .orderBy(sql`${attendanceRecords.userName} ASC`);

        data = records.map((r) => ({
          Name: r.userName,
          Role: r.userRole,
          Date: r.dateString,
          Status: r.status,
          'Hours Worked': n(r.hoursWorked),
        }));
        columns = [
          { key: 'Name', header: 'Name' },
          { key: 'Role', header: 'Role' },
          { key: 'Date', header: 'Date' },
          { key: 'Status', header: 'Status' },
          { key: 'Hours Worked', header: 'Hours Worked' },
        ];
        fileName = `Attendance_${month}_${year}`;
        break;
      }

      case 'lab-cost': {
        const conds = [];
        if (clinicId && clinicId !== 'both') conds.push(eq(labOrders.clinicId, clinicId));
        if (month) conds.push(sql`EXTRACT(MONTH FROM ${labOrders.createdAt}) = ${month}`);
        if (year) conds.push(sql`EXTRACT(YEAR FROM ${labOrders.createdAt}) = ${year}`);

        const orders = await db
          .select()
          .from(labOrders)
          .where(conds.length > 0 ? and(...conds) : undefined);

        const orderIds = orders.map((o) => o.orderId);
        const billings =
          orderIds.length > 0
            ? await db
                .select()
                .from(labBilling)
                .where(inArrayFallback(orderIds))
            : [];

        const billingByOrder = new Map(billings.map((b) => [b.orderId, b]));

        data = orders.map((o) => {
          const b = billingByOrder.get(o.orderId);
          return {
            Order: o.orderId,
            Lab: o.labName,
            Patient: o.patientName,
            Status: o.status,
            'Total Cost': b ? n(b.totalCost) : 0,
            Paid: b ? n(b.amountPaid) : 0,
            'Balance': b ? Math.max(0, n(b.totalCost) - n(b.amountPaid)) : 0,
          };
        });
        columns = [
          { key: 'Order', header: 'Order' },
          { key: 'Lab', header: 'Lab' },
          { key: 'Patient', header: 'Patient' },
          { key: 'Status', header: 'Status' },
          { key: 'Total Cost', header: 'Total Cost' },
          { key: 'Paid', header: 'Paid' },
          { key: 'Balance', header: 'Balance' },
        ];
        fileName = `LabCost_${month}_${year}`;
        break;
      }

      case 'inventory': {
        const items = await db
          .select()
          .from(inventoryItems)
          .where(clinicFilter(inventoryItems));

        data = items.map((i) => ({
          Item: i.name,
          Category: i.category,
          Unit: i.unit,
          Stock: i.quantityInStock,
          'Reorder Level': i.reorderLevel,
          Price: n(i.unitPrice),
          Clinic: i.clinicId,
        }));
        columns = [
          { key: 'Item', header: 'Item' },
          { key: 'Category', header: 'Category' },
          { key: 'Unit', header: 'Unit' },
          { key: 'Stock', header: 'Stock' },
          { key: 'Reorder Level', header: 'Reorder Level' },
          { key: 'Price', header: 'Price' },
          { key: 'Clinic', header: 'Clinic' },
        ];
        fileName = `Inventory_Report`;
        break;
      }

      case 'patient-payments': {
        const conds = [clinicFilter(patientPayments)];
        if (startDate && endDate) {
          conds.push(gte(patientPayments.date, new Date(`${startDate}T00:00:00.000Z`)));
          conds.push(lte(patientPayments.date, new Date(`${endDate}T23:59:59.999Z`)));
        }

        const payments = await db
          .select()
          .from(patientPayments)
          .where(and(...conds.filter(Boolean)))
          .orderBy(sql`${patientPayments.date} ASC`);

        let running = 0;
        data = payments.map((p) => {
          running += n(p.amount);
          return {
            Date: p.date.toISOString().slice(0, 10),
            Patient: p.patientName,
            Amount: n(p.amount),
            Mode: p.mode,
            'Recorded By': p.recordedByName,
            'Running Total': Number(running.toFixed(2)),
          };
        });
        columns = [
          { key: 'Date', header: 'Date' },
          { key: 'Patient', header: 'Patient' },
          { key: 'Amount', header: 'Amount' },
          { key: 'Mode', header: 'Mode' },
          { key: 'Recorded By', header: 'Recorded By' },
          { key: 'Running Total', header: 'Running Total' },
        ];
        fileName = `PatientPayments_${startDate}_${endDate}`;
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    const buffer = buildWorkbookBuffer(data, columns, fileName);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': EXCEL_MIME,
        'Content-Disposition': `attachment; filename="${fileName}.xlsx"`,
      },
    });
  } catch (error) {
    console.error(`Report ${type} Error:`, error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

function inArrayFallback(ids: string[]) {
  return or(...ids.map((id) => eq(labBilling.orderId, id)));
}
