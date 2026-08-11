# DENTAL CLINIC SaaS — COMPLETE BLUEPRINT (PART B)
# Covers: Phases 6–9 · Cloud Functions F13–F14 · All Indexes · Deployment Checklist
# MERGE INSTRUCTIONS: Copy everything below and paste at the bottom of BLUEPRINT_PART_A.md

---

## PHASE 6 — PAYROLL ENGINE

**Goal:** Complete salary calculation for all staff. Daily payroll entries auto-populated from attendance + revenue. Monthly payroll generated on the 1st. All incentive types tracked. SUPER_ADMIN approves and exports to Excel.

### Phase 6 — Core Payroll Formulas

#### General Doctor / Clinic Admin — Daily Earning

```typescript
// src/lib/payroll-engine/general-doctor.ts
import { toISTDateString } from "@/lib/utils/date";
import { ClinicSettings } from "@/types";

export interface GDDayResult {
  earning: number; multiplier: number; dailyTargetAchieved: boolean; isSunday: boolean;
}

export function calcGDDayEarning(params: {
  hoursWorked:  number;
  dailyRevenue: number;  // total ₹ from this doctor's own patients this day
  date:         Date;    // in IST
  settings:     ClinicSettings;
}): GDDayResult {
  const { hoursWorked, dailyRevenue, date, settings } = params;
  const baseHourly     = settings.generalDoctorBaseDailyPay / settings.generalDoctorDailyWorkHours;
  const isSunday       = date.getDay() === 0;
  const targetAchieved = dailyRevenue >= settings.generalDoctorDailyRevenueTarget;

  let multiplier = 1;
  if      (isSunday && targetAchieved) multiplier = 3; // Sunday + target
  else if (isSunday)                   multiplier = 2; // Sunday only
  else if (targetAchieved)             multiplier = 2; // Weekday + target

  let earning: number;
  if (isSunday) {
    // Sunday: pay ALL hours at multiplied rate (no cap)
    earning = hoursWorked * baseHourly * multiplier;
  } else if (hoursWorked < settings.generalDoctorDailyWorkHours) {
    // Worked less than quota on weekday: pro-rated at multiplied rate
    earning = hoursWorked * baseHourly * multiplier;
  } else {
    // Worked full quota or overtime on weekday: capped at quota × rate (no overtime bonus)
    earning = settings.generalDoctorDailyWorkHours * baseHourly * multiplier;
  }

  return { earning: Math.round(earning * 100) / 100, multiplier, dailyTargetAchieved: targetAchieved, isSunday };
}
```

**Key rules:**
- CLINIC_ADMIN paid identically to GENERAL_DOCTOR (same formula, stored as userRole:"GENERAL_DOCTOR" in payroll)
- Weekday overtime > 7h: no extra pay. Earning capped at 7h × rate.
- Sunday: all hours paid at 2× (or 3× if target also hit). No hour cap on Sundays.
- ₹1,500 referral incentive is SEPARATE from dailyRevenue — never counts toward the 2× trigger.
- Sunday revenue counts toward the ₹6L monthly target.

#### Assistant Doctor — Daily Earning

```typescript
// src/lib/payroll-engine/assistant-doctor.ts
import { ClinicSettings } from "@/types";

export interface ADDayResult { earning: number; isDeducted: boolean; isSunday: boolean; }

export function calcADDayEarning(params: {
  hoursWorked: number;
  date:        Date;
  settings:    ClinicSettings;
}): ADDayResult {
  const { hoursWorked, date, settings } = params;
  const dailyBase  = settings.assistantMonthlyBasePay / settings.workingDaysPerMonth; // 18000/26 = 692.31
  const hourlyRate = dailyBase / settings.assistantDailyWorkHours;                    // 692.31/8 = 86.54
  const isSunday   = date.getDay() === 0;

  if (isSunday) {
    // Sunday: ALL hours at double rate (paid in addition to regular monthly salary)
    return { earning: Math.round(hoursWorked * hourlyRate * 2 * 100) / 100, isDeducted: false, isSunday: true };
  }
  if (hoursWorked >= settings.assistantDailyWorkHours) {
    return { earning: Math.round(dailyBase * 100) / 100, isDeducted: false, isSunday: false };
  }
  // Worked less than 8h: pro-rated by hour (deduction)
  return { earning: Math.round(hoursWorked * hourlyRate * 100) / 100, isDeducted: true, isSunday: false };
}
```

#### General Doctor — Monthly Payroll Calculation

```typescript
// src/lib/payroll-engine/general-doctor.ts (continued)

export function calcGDMonthlyPayroll(
  dailyEntries:     any[],   // PayrollEntry[] for this month
  incentiveRecords: any[],   // IncentiveRecord[] for this month
  settings:         ClinicSettings
) {
  const accumulatedEarning = dailyEntries.reduce((s, e) => s + (e.gdDailyEarning ?? 0), 0);
  const sundayEarning      = dailyEntries.filter(e => e.isSunday).reduce((s, e) => s + (e.gdDailyEarning ?? 0), 0);
  const referralTotal      = incentiveRecords.filter(r => r.type === "REFERRAL_1500").reduce((s, r) => s + r.amount, 0);
  const totalRevenue       = dailyEntries.reduce((s, e) => s + (e.gdDailyRevenue ?? 0), 0);
  const targetHit          = totalRevenue >= settings.generalDoctorMonthlyRevenueTarget;

  let totalFinalSalary = accumulatedEarning + referralTotal;
  let monthlyBonus     = 0;

  if (targetHit) {
    if (totalFinalSalary < settings.generalDoctorMonthlyTargetCap) {
      monthlyBonus     = settings.generalDoctorMonthlyTargetCap - totalFinalSalary;
      totalFinalSalary = settings.generalDoctorMonthlyTargetCap;
    } else {
      // Already at or above cap — hard ceiling (cannot exceed ₹1L)
      totalFinalSalary = Math.min(totalFinalSalary, settings.generalDoctorMonthlyTargetCap);
    }
  }

  return {
    gdAccumulatedSalary:     accumulatedEarning,
    gdSundayEarning:         sundayEarning,
    gdReferralIncentivesTotal: referralTotal,
    gdTotalMonthlyRevenue:   totalRevenue,
    gdMonthlyTargetAchieved: targetHit,
    gdMonthlyTargetBonus:    monthlyBonus,
    gdTotalFinalSalary:      totalFinalSalary,
    gdTotalDaysWorked:       dailyEntries.filter(e => (e.gdHoursWorked ?? 0) > 0).length,
    gdTargetDaysCount:       dailyEntries.filter(e => e.gdDailyTargetAchieved).length,
  };
}
```

### Phase 6 — Cloud Functions F13 & F14

Add these to the existing `functions/src/index.ts` file (after F12):

```typescript
// === F13: WEEKLY ATTENDANCE BONUS — EVERY SATURDAY 23:59 IST ===
export const weeklyAttendanceBonus = functions.pubsub
  .schedule("59 23 * * 6")  // Every Saturday at 23:59
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const now      = new Date();
    const saturday = now;
    const monday   = new Date(now); monday.setDate(now.getDate() - 5);
    const satStr   = toIST(saturday);
    const monStr   = toIST(monday);

    const clinicsSnap = await db.collection("clinics").get();

    for (const clinicDoc of clinicsSnap.docs) {
      const clinicId = clinicDoc.id;
      const settings = clinicDoc.data().settings;
      const assistants = await db.collection("users")
        .where("role", "==", "ASSISTANT_DOCTOR")
        .where("clinicIds", "array-contains", clinicId)
        .where("isActive", "==", true)
        .get();

      for (const assistantDoc of assistants.docs) {
        const uid     = assistantDoc.id;
        const records = await db.collection("attendance_records")
          .where("userId",     "==", uid)
          .where("clinicId",   "==", clinicId)
          .where("dateString", ">=", monStr)
          .where("dateString", "<=", satStr)
          .get();

        const days     = records.docs.map(d => d.data());
        // Exclude Sundays (we only count Mon–Sat for the 6-day bonus)
        const weekdays = days.filter(d => {
          const dow = new Date(d.dateString + "T00:00:00+05:30").getDay();
          return dow !== 0;
        });

        const fullWeek = weekdays.length === 6 &&
          weekdays.every(d => d.status === "PRESENT" && d.hoursWorked >= settings.assistantDailyWorkHours);

        if (!fullWeek) continue;

        const bonusAmount = settings.weeklyAttendanceBonusAmount;
        const iRef        = db.collection("incentive_records").doc();
        await iRef.set({
          incentiveId: iRef.id, type: "WEEKLY_ATTENDANCE_500",
          recipientUserId: uid, clinicId, amount: bonusAmount,
          date:          admin.firestore.Timestamp.fromDate(saturday),
          weekStartDate: admin.firestore.Timestamp.fromDate(monday),
          weekEndDate:   admin.firestore.Timestamp.fromDate(saturday),
          appliedToPayrollId: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await notifyUser(uid, "WEEKLY_BONUS_CREDITED",
          `₹${bonusAmount} weekly attendance bonus!`,
          `You completed all 6 days (${monStr} – ${satStr}). Bonus added to your payroll.`,
          iRef.id, "incentive", clinicId);
      }
    }
  });

// === F14: MONTHLY PAYROLL GENERATION — 1ST OF EVERY MONTH 01:00 IST ===
export const generateMonthlyPayroll = functions.pubsub
  .schedule("0 1 1 * *")    // 1st of every month at 01:00
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const now    = new Date();
    // Calculate previous month (the month we are generating payroll for)
    const pMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const pYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const prefix = `${pYear}-${String(pMonth).padStart(2, "0")}`;

    const clinicsSnap = await db.collection("clinics").get();

    for (const clinicDoc of clinicsSnap.docs) {
      const clinicId = clinicDoc.id;
      const settings = clinicDoc.data().settings;

      // Doctors and clinic admins (both paid as GENERAL_DOCTOR)
      const staff = await db.collection("users")
        .where("role", "in", ["GENERAL_DOCTOR", "CLINIC_ADMIN", "ASSISTANT_DOCTOR"])
        .where("clinicIds", "array-contains", clinicId)
        .where("isActive", "==", true)
        .get();

      for (const staffDoc of staff.docs) {
        const uid  = staffDoc.id;
        const role = staffDoc.data().role;
        const name = staffDoc.data().name;
        const docId = `${uid}_${clinicId}_${pYear}_${String(pMonth).padStart(2, "0")}`;

        // Get daily payroll entries for this month
        const entries = (await db.collection("payroll_entries")
          .where("userId", "==", uid)
          .where("clinicId", "==", clinicId)
          .where("dateString", ">=", `${prefix}-01`)
          .where("dateString", "<=", `${prefix}-31`)
          .get()).docs.map(d => d.data());

        // Get incentive records for this month
        const allIncentives = (await db.collection("incentive_records")
          .where("recipientUserId", "==", uid)
          .where("clinicId", "==", clinicId)
          .get()).docs.map(d => d.data())
          .filter(r => {
            const d = r.date.toDate();
            return d.getMonth() + 1 === pMonth && d.getFullYear() === pYear;
          });

        if (role === "GENERAL_DOCTOR" || role === "CLINIC_ADMIN") {
          // GD monthly calculation
          const baseSalary  = entries.reduce((s: number, e: any) => s + (e.gdDailyEarning ?? 0), 0);
          const sundayPay   = entries.filter((e: any) => e.isSunday).reduce((s: number, e: any) => s + (e.gdDailyEarning ?? 0), 0);
          const referrals   = allIncentives.filter(r => r.type === "REFERRAL_1500").reduce((s: number, r: any) => s + r.amount, 0);
          const totalRev    = entries.reduce((s: number, e: any) => s + (e.gdDailyRevenue ?? 0), 0);
          const targetHit   = totalRev >= settings.generalDoctorMonthlyRevenueTarget;
          let   finalSalary = baseSalary + referrals;
          let   bonus       = 0;
          if (targetHit) {
            if (finalSalary < settings.generalDoctorMonthlyTargetCap) {
              bonus = settings.generalDoctorMonthlyTargetCap - finalSalary;
              finalSalary = settings.generalDoctorMonthlyTargetCap;
            } else {
              finalSalary = Math.min(finalSalary, settings.generalDoctorMonthlyTargetCap);
            }
          }
          await db.collection("monthly_payroll").doc(docId).set({
            payrollId: docId, userId: uid, userName: name, clinicId, month: pMonth, year: pYear,
            userRole: "GENERAL_DOCTOR",
            gdAccumulatedSalary: baseSalary, gdSundayEarning: sundayPay,
            gdReferralIncentivesTotal: referrals, gdTotalMonthlyRevenue: totalRev,
            gdMonthlyTargetAchieved: targetHit, gdMonthlyTargetBonus: bonus,
            gdTotalFinalSalary: finalSalary,
            gdTotalDaysWorked: entries.filter((e: any) => (e.gdHoursWorked ?? 0) > 0).length,
            gdTargetDaysCount: entries.filter((e: any) => e.gdDailyTargetAchieved).length,
            status: "DRAFT",
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            generatedBy: "SYSTEM", approvedBy: null, approvedAt: null, notes: null,
          });

        } else if (role === "ASSISTANT_DOCTOR") {
          const weeklyBonuses    = allIncentives.filter(r => r.type === "WEEKLY_ATTENDANCE_500").reduce((s: number, r: any) => s + r.amount, 0);
          const sundayTasks      = allIncentives.filter(r => r.type === "SUNDAY_TASK").reduce((s: number, r: any) => s + r.amount, 0);
          const regularEarning   = entries.filter((e: any) => !e.isSunday).reduce((s: number, e: any) => s + (e.adDailyEarning ?? 0), 0);
          const sundayEarning    = entries.filter((e: any) => e.isSunday).reduce((s: number, e: any) => s + (e.adDailyEarning ?? 0), 0);
          const finalSalary      = regularEarning + sundayEarning + weeklyBonuses + sundayTasks;
          await db.collection("monthly_payroll").doc(docId).set({
            payrollId: docId, userId: uid, userName: name, clinicId, month: pMonth, year: pYear,
            userRole: "ASSISTANT_DOCTOR",
            adRegularEarning: regularEarning, adSundayEarning: sundayEarning,
            adWeeklyBonusesTotal: weeklyBonuses, adSundayTaskIncentivesTotal: sundayTasks,
            adTotalFinalSalary: finalSalary,
            adTotalDaysWorked: entries.filter((e: any) => (e.adHoursWorked ?? 0) > 0).length,
            status: "DRAFT",
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            generatedBy: "SYSTEM", approvedBy: null, approvedAt: null, notes: null,
          });
        }
      }
    }

    // Notify SUPER_ADMIN(s) that payroll draft is ready
    const admins = await db.collection("users").where("role", "==", "SUPER_ADMIN").get();
    for (const adminDoc of admins.docs) {
      await notifyUser(adminDoc.id, "PAYROLL_READY",
        `Monthly payroll for ${pMonth}/${pYear} ready`,
        "Payroll draft has been generated. Please review and approve.",
        null, "monthly_payroll");
    }
  });
```

### Phase 6 — Payroll Pages

| Route | Access | Purpose |
|---|---|---|
| /hr/my-payroll | All clinic staff | Own payroll: current month accumulation, daily breakdown, incentives |
| /admin/payroll | SUPER_ADMIN | All staff payroll list for a month; approve/lock |
| /admin/payroll/[year]/[month] | SUPER_ADMIN | Detailed per-doctor payroll |

**My Payroll page shows:**
- Current month so far: days worked, daily earnings table, incentives earned
- Running total salary
- Monthly target progress bar (for general doctors)

**Admin Payroll page shows:**
- Table: Name | Role | Days Worked | Base Salary | Bonuses | Total | Status
- "Generate Payroll" button (triggers F14 on-demand — also auto-runs 1st of month)
- "Approve All" button → changes all DRAFT → APPROVED for the month
- Individual approve also available
- Excel export button

### Phase 6 — Excel Export
```typescript
// src/lib/utils/export-excel.ts
import * as XLSX from "xlsx";

export function exportPayrollToExcel(data: any[], month: number, year: number) {
  const rows = data.map(p => ({
    "Name":             p.userName,
    "Role":             p.userRole,
    "Clinic":           p.clinicId,
    "Days Worked":      p.gdTotalDaysWorked ?? p.adTotalDaysWorked ?? 0,
    "Base Salary (₹)":  p.gdAccumulatedSalary ?? p.adRegularEarning ?? 0,
    "Sunday Pay (₹)":   p.gdSundayEarning ?? p.adSundayEarning ?? 0,
    "Referrals (₹)":    p.gdReferralIncentivesTotal ?? 0,
    "Monthly Bonus (₹)":p.gdMonthlyTargetBonus ?? 0,
    "Weekly Bonus (₹)": p.adWeeklyBonusesTotal ?? 0,
    "Sunday Tasks (₹)": p.adSundayTaskIncentivesTotal ?? 0,
    "Total Salary (₹)": p.gdTotalFinalSalary ?? p.adTotalFinalSalary ?? 0,
    "Status":           p.status,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Payroll ${month}-${year}`);
  XLSX.writeFile(wb, `Payroll_${month}_${year}.xlsx`);
}
```

### Phase 6 — Checklist
```
☐ Daily payroll entry created with merge:true when visit completed (no error on new doctors)
☐ GDDayEarning: multiplier 1x/2x/3x calculates correctly for all scenarios
☐ CLINIC_ADMIN payroll calculated identically to GENERAL_DOCTOR
☐ Sunday 3x: Sunday + daily target hit = triple rate confirmed
☐ Referral incentive (₹1,500) is separate from dailyRevenue — does not trigger 2x
☐ CF F13 runs Saturday 23:59 IST — weekly bonus credits correctly for full Mon–Sat weeks
☐ CF F14 runs 1st of month 01:00 IST — payroll draft generated for all active staff
☐ CF F14 uses merge:true on payroll documents
☐ Monthly cap: if salary already ≥ ₹1L before bonus, it stays capped at ₹1L
☐ SUPER_ADMIN receives notification when payroll draft ready
☐ "Approve All" changes all DRAFT records to APPROVED
☐ Each staff member receives notification when their payroll is APPROVED
☐ Excel export downloads correct file with all columns
```

---

## PHASE 7 — VENDOR & INVENTORY MANAGEMENT

**Goal:** Clinic admins manage stock and place orders. Vendors receive orders in their portal, update delivery, upload invoices. Returns tracked separately from original orders.

### Phase 7 — Inventory Item Categories (Pre-seeded)
Seed these into the clinic settings or a /inventory_categories collection:
```
Surgical Gloves (Latex, Nitrile)    | unit: Box
Syringes & Needles                  | unit: Box / Piece
Local Anaesthetics (Lignocaine)     | unit: Box (10 cartridges)
Dental Burs & Drills                | unit: Piece / Kit
Composite Resins & Bonding Agents   | unit: Syringe / Bottle
Impression Materials (Alginate)     | unit: kg / Pack
Sterilisation Pouches & Indicators  | unit: Roll / Box
Face Masks (Surgical/N95)           | unit: Box (50 pcs)
Cotton Rolls & Gauze                | unit: Pack
GIC Cement / Zinc Phosphate Cement  | unit: Pack
Orthodontic Brackets & Wires        | unit: Kit / Piece
Dental Floss & Prophylaxis Paste    | unit: Roll / Jar
X-Ray Films / Digital Sensors       | unit: Piece / Pack
Antibiotics (Amoxicillin)           | unit: Strip (10 tabs)
Analgesics (Ibuprofen)              | unit: Strip
Antiseptic Solution                 | unit: Bottle
```

### Phase 7 — Purchase Order Flow

1. CLINIC_ADMIN goes to /inventory/purchase-orders/new
2. Selects vendor (from /vendors, filtered to this clinic's associated vendors)
3. Adds line items: Item Name, Category, Unit, Quantity Ordered, Unit Price
4. Submits → creates /purchase_orders document → CF F12 fires → Vendor gets notification
5. Vendor logs into /portal/vendor/orders → sees pending order
6. Vendor enters Quantity Delivered, Unit Price per item, uploads invoice PDF
7. CLINIC_ADMIN records payment to vendor (amount + date)
8. Returns: if items returned, CLINIC_ADMIN clicks "Add Return" — new entry in `returns` array — original line items never modified

**Purchase Order Billing Display:**
```
Order Total:         ₹ 5,200.00
Return Amount:    -  ₹   400.00
Net Amount:          ₹ 4,800.00
Amount Paid:      -  ₹ 2,000.00
Balance Due:         ₹ 2,800.00
```

### Phase 7 — Vendor Portal (/portal/vendor)

**Separate layout** — distinct from main dashboard.

- /portal/vendor/orders — list of all orders from associated clinics
- /portal/vendor/orders/[id] — order detail:
  - Items ordered, quantities, delivery date
  - Enter/update: Quantity Delivered, Unit Price per item
  - Upload invoice (PDF/image, max 10 MB to Firebase Storage)
  - Update delivery status: Pending → Partially Delivered → Delivered
  - View outstanding balance owed by clinic
  - **CANNOT see:** clinic stock levels, other vendor info, patient data

### Phase 7 — Checklist
```
☐ CLINIC_ADMIN creates purchase order → CF F12 fires → vendor notification appears in /portal/vendor
☐ Vendor updates delivery status and unit prices
☐ Vendor uploads invoice to Firebase Storage path /purchase_orders/{id}/invoice.*
☐ Return records stored in returns[] array — original lineItems never modified
☐ Net Amount = totalOrderAmount − totalReturnAmount shown correctly
☐ Balance Due = netAmount − paidAmount updated when payment recorded
☐ Vendor cannot read /inventory_items (Firestore rule blocks this)
☐ Vendor cannot see other clinic's orders (rule checks vendorId match)
```

---

## PHASE 8 — CHIEF ADMIN DASHBOARD & REPORTS

**Goal:** SUPER_ADMIN sees all activity across both clinics on a date-based feed. Expense tracking for clinical money flows. All 6 report types downloadable as Excel.

### Phase 8 — Chief Admin Dashboard Layout

```
Left Panel (320px)                Right Panel (flex-1)
───────────────────────           ──────────────────────────────────────
Clinic: [Clinic A ▼]              CLINIC A — 11 Aug 2025
Date:   [📅 11-08-2025]
                                  Patients Seen:       12
                                  Revenue:         ₹45,000
[Today] [This Week] [Custom]      Walk-ins:             3
                                  New Registrations:    2
Summary Cards:                    Lab Orders Sent:      2
  Revenue Today                   Lab Orders Done:      1
  Patients Today                  Inventory Orders:     1  (₹3,200)
  Outstanding Lab Bills
  Pending Payroll                 ─── Activity Feed (real-time) ────
  Pending Corrections             10:05 Dr. A — Patient MOTHI AHAMED checked in
                                  10:12 Receptionist — ₹300 payment recorded (Cash)
                                  11:30 Dr. B — Lab order sent to Chennai Lab
                                  14:00 Admin — Purchase order placed to XYZ Supplies
```

**Real-time activity feed** uses Firestore `onSnapshot` on `/activity_logs` filtered by clinicId + dateString.

**Expense overview (Back Office / Expenses — admin only):**
```
INFLOWS (from patients):    ₹45,000
  Cash:     ₹15,000
  GPay:     ₹20,000
  Card:     ₹10,000

OUTFLOWS:
  Lab payments:             ₹12,000
  Vendor payments:           ₹3,200

NET:                        ₹29,800
```

### Phase 8 — 6 Report Types (all Excel)

| Report | Date Range | Key Columns |
|---|---|---|
| Payroll Report | By month | Name, Role, Days, Base Salary, Bonuses, Total, Status |
| Revenue Report | By day range | Date, Doctor, Patient Revenue, Daily Target Hit, Multiplier |
| Attendance Report | By month | Name, Days Present, Days Absent, Days Leave, Total Hours |
| Lab Cost Report | By month | Lab, Orders, Stages Done, Total Cost, Paid, Balance |
| Inventory Report | Current + history | Item, Category, Stock, Last Price, Last Order Date |
| Patient Payment Report | By date range | Date, Patient, Amount, Mode, Recorded By, Running Total |

All reports filter by date range AND clinic (or "both clinics"). Output file named with date range.

### Phase 8 — Extensible Lists (/admin/settings)

SUPER_ADMIN can add to these lists from the settings page:

| List | Effect |
|---|---|
| Surgery types | Adding new type makes it available in "Refer to Chief Doctor" dropdown; also triggers ₹1,500 referral logic |
| Sunday incentive tasks | Adding new task type makes it available for assistants on Sundays; admin sets ₹ amount per task |
| Appointment categories | New category appears in calendar colour legend and appointment modal dropdown |
| Procedures catalog | New procedure appears in invoice search and treatment plan catalog |
| Medical conditions | New condition appears in patient registration medical history checklist |
| Referral sources | New source appears in "Referred By" dropdown on patient registration |
| Clinic working hours | Changes the "outside timings" warning threshold on appointment booking |
| Payroll settings | Changing daily base pay / work hours / targets recalculates from next payroll cycle |

### Phase 8 — Checklist
```
☐ Chief admin dashboard loads per-day data for selected clinic
☐ Date picker navigates to historical dates and shows correct data
☐ Clinic A / Clinic B / Both toggle works
☐ Activity feed updates in real-time (onSnapshot on /activity_logs)
☐ Expense overview shows correct inflow/outflow breakdown by payment mode
☐ All 6 report types generate correct Excel files
☐ Reports filter by date range correctly
☐ "Both clinics" report aggregates data from both clinic_a and clinic_b
☐ Extensible lists page: adding surgery type immediately available in appointment modal
☐ Adding Sunday task immediately available in assistant task logging
☐ Payroll settings change reflected in next generated payroll (not retroactive)
☐ Payment corrections page: all pending corrections visible; CF F7 called on approve
```

---

## PHASE 9 — NOTIFICATIONS & FINAL POLISH

**Goal:** All notification triggers wired and tested. Mobile layout verified. Final security audit complete.

### Phase 9 — Complete Notification Trigger Map

| Trigger Event | Cloud Function | Recipient |
|---|---|---|
| Lab stage completed | F8 (completeLabStage) | Doctor who ordered |
| Leave approved | F10 (onLeaveStatusChanged) | Leave applicant |
| Leave rejected | F10 (onLeaveStatusChanged) | Leave applicant |
| Attendance correction approved | F11 (onCorrectionApproved) | Correction requester |
| Attendance correction rejected | (add to F11) | Correction requester |
| Payment correction approved | F7 (approvePaymentCorrection) | Correction requester |
| Payment correction rejected | F7 (approvePaymentCorrection) | Correction requester |
| Referral incentive ₹1,500 | F9 (onVisitCompleted) | Referring doctor |
| Weekly bonus ₹500 | F13 (weeklyAttendanceBonus) | Assistant doctor |
| Sunday task incentive ₹250 | (trigger when doctor logs task) | Performing assistant |
| New purchase order | F12 (onPurchaseOrderCreated) | Vendor (in /portal/vendor) |
| Monthly payroll ready | F14 (generateMonthlyPayroll) | SUPER_ADMIN |
| Monthly payroll approved | (on admin approval) | Each staff member |
| Leave request submitted | (on leave create) | Correct approver |
| Correction submitted | (on correction create) | Correct approver |

**For "leave request submitted" and "correction submitted" notifications:** Add Firestore triggers (`.onCreate`) for the `/leaves` and `/attendance_corrections` collections that look up the correct approver and call `notifyUser`.

```typescript
// Add to functions/src/index.ts

// === F15: NOTIFY APPROVER WHEN LEAVE SUBMITTED ===
export const onLeaveSubmitted = functions.firestore
  .document("leaves/{leaveId}").onCreate(async (snap) => {
    const leave = snap.data();
    // If CLINIC_ADMIN applying, notify SUPER_ADMIN
    // Otherwise notify CLINIC_ADMIN of their primary clinic
    if (leave.requesterRole === "CLINIC_ADMIN" || leave.requesterRole === "SUPER_ADMIN") {
      const admins = await db.collection("users").where("role","==","SUPER_ADMIN").get();
      for (const a of admins.docs) {
        await notifyUser(a.id,"LEAVE_REQUEST","Leave request pending",
          `${leave.userName} (${leave.userRole}) applied for ${leave.leaveType} leave.`,
          snap.id,"leave",leave.clinicId);
      }
    } else {
      const clinicAdmins = await db.collection("users")
        .where("role","==","CLINIC_ADMIN").where("clinicIds","array-contains",leave.clinicId).get();
      for (const a of clinicAdmins.docs) {
        await notifyUser(a.id,"LEAVE_REQUEST","Leave request pending",
          `${leave.userName} applied for ${leave.leaveType} leave.`,
          snap.id,"leave",leave.clinicId);
      }
    }
  });

// === F16: NOTIFY APPROVER WHEN CORRECTION SUBMITTED ===
export const onCorrectionSubmitted = functions.firestore
  .document("attendance_corrections/{id}").onCreate(async (snap) => {
    const corr = snap.data();
    if (corr.requesterRole === "CLINIC_ADMIN" || corr.requesterRole === "SUPER_ADMIN") {
      const admins = await db.collection("users").where("role","==","SUPER_ADMIN").get();
      for (const a of admins.docs) {
        await notifyUser(a.id,"CORRECTION_REQUEST","Attendance correction pending",
          `${corr.requestedByName} requested correction for ${corr.dateString}.`,
          snap.id,"attendance_correction",corr.clinicId);
      }
    } else {
      const clinicAdmins = await db.collection("users")
        .where("role","==","CLINIC_ADMIN").where("clinicIds","array-contains",corr.clinicId).get();
      for (const a of clinicAdmins.docs) {
        await notifyUser(a.id,"CORRECTION_REQUEST","Attendance correction pending",
          `${corr.requestedByName} requested correction for ${corr.dateString}.`,
          snap.id,"attendance_correction",corr.clinicId);
      }
    }
  });
```

### Phase 9 — Sunday Task Incentive Recording

When a doctor logs that an assistant completed a Sunday task:

```typescript
// Called from the patient visit page or a dedicated Sunday tasks section
// (Doctor selects which assistant performed which task)
export const recordSundayTask = functions.https.onCall(async (data, ctx) => {
  if (!["SUPER_ADMIN","CLINIC_ADMIN","GENERAL_DOCTOR"].includes(ctx.auth?.token.role||""))
    throw new functions.https.HttpsError("permission-denied","Doctors only");

  const { assistantId, taskTypeId, clinicId, patientId } = data;

  const date = new Date();
  if (date.getDay() !== 0) throw new functions.https.HttpsError("invalid-argument","Sunday tasks only on Sundays");

  const taskDoc   = await db.collection("sunday_tasks").doc(taskTypeId).get();
  if (!taskDoc.exists || !taskDoc.data()?.isActive)
    throw new functions.https.HttpsError("not-found","Task not found or inactive");

  const task   = taskDoc.data()!;
  const dateStr = toIST(date);
  const entryId = `${assistantId}_${clinicId}_${dateStr}`;

  const iRef = db.collection("incentive_records").doc();
  await iRef.set({
    incentiveId: iRef.id, type: "SUNDAY_TASK",
    recipientUserId: assistantId, clinicId, amount: task.incentiveAmount,
    date: admin.firestore.Timestamp.fromDate(date),
    taskTypeId, taskTypeName: task.name, patientId: patientId ?? null,
    appliedToPayrollId: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection("payroll_entries").doc(entryId).set({
    adSundayIncentives: admin.firestore.FieldValue.increment(task.incentiveAmount),
    adSundayTasksCount: admin.firestore.FieldValue.increment(1),
    totalDayEarning: admin.firestore.FieldValue.increment(task.incentiveAmount),
  }, { merge: true });

  await notifyUser(assistantId, "SUNDAY_TASK_INCENTIVE_CREDITED",
    `₹${task.incentiveAmount} task incentive!`,
    `${task.name} incentive for today has been credited to your payroll.`,
    iRef.id, "incentive", clinicId);

  return { success: true };
});
```

### Phase 9 — Mobile Layout Notes

The application is **desktop-first** but must work on mobile browsers. Key adjustments:
- Sidebar: collapses to a slide-out drawer on mobile (< 768px)
- Patient cards: single column on mobile
- Calendar: defaults to Day view on mobile (not Week view)
- Invoice form: scrollable horizontal table on mobile
- Notification bell: always visible in mobile header

Use Tailwind responsive prefixes:
- `sm:` for ≥ 640px
- `md:` for ≥ 768px (main breakpoint for sidebar visibility)
- `lg:` for ≥ 1024px

### Phase 9 — Final Security Audit Checklist
```
☐ Lab tech reads /lab_orders/{id}/billing/summary → Firestore returns "permission denied"
☐ Vendor reads /inventory_items → "permission denied"
☐ Receptionist reads /lab_orders/billing subcollection → "permission denied"
☐ Client writes to /counters/{any} → "permission denied"
☐ Vendor writes to /notifications → "permission denied" (allow create: if false)
☐ Lab tech updates clinicApproved field on lab_orders → blocked by diff().affectedKeys().hasOnly() rule
☐ CLINIC_ADMIN reads another clinic's appointments → "permission denied" (inClinic check)
☐ CLINIC_ADMIN reads own payroll via /monthly_payroll → allowed
☐ CLINIC_ADMIN reads other doctor's payroll → "permission denied"
☐ All Cloud Functions validate ctx.auth?.token.role before proceeding
☐ IST date string used in ALL dateString fields — no UTC leakage
☐ Slot-lock documents prevent double-booking under concurrent load
☐ Payment entries are never client-editable after creation (isVoided: false, locked in UI)
```

---

## COMPLETE FIRESTORE INDEXES (firestore.indexes.json)

This is the full index file for all 9 phases. Deploy once and Firebase will build all indexes:

```json
{
  "indexes": [
    {"collectionGroup":"appointments","fields":[{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"appointmentDate","order":"ASCENDING"}]},
    {"collectionGroup":"appointments","fields":[{"fieldPath":"doctorId","order":"ASCENDING"},{"fieldPath":"appointmentDate","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"}]},
    {"collectionGroup":"visits","fields":[{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"visitDate","order":"DESCENDING"}]},
    {"collectionGroup":"visits","fields":[{"fieldPath":"patientId","order":"ASCENDING"},{"fieldPath":"visitDate","order":"DESCENDING"}]},
    {"collectionGroup":"visits","fields":[{"fieldPath":"primaryDoctorId","order":"ASCENDING"},{"fieldPath":"visitDate","order":"ASCENDING"}]},
    {"collectionGroup":"patients","fields":[{"fieldPath":"registeredClinicId","order":"ASCENDING"},{"fieldPath":"lastVisitDate","order":"DESCENDING"}]},
    {"collectionGroup":"patients","fields":[{"fieldPath":"registeredClinicId","order":"ASCENDING"},{"fieldPath":"groups","order":"ASCENDING"}]},
    {"collectionGroup":"lab_orders","fields":[{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"orderDate","order":"DESCENDING"}]},
    {"collectionGroup":"lab_orders","fields":[{"fieldPath":"labId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"}]},
    {"collectionGroup":"attendance_records","fields":[{"fieldPath":"userId","order":"ASCENDING"},{"fieldPath":"dateString","order":"ASCENDING"}]},
    {"collectionGroup":"attendance_records","fields":[{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"dateString","order":"ASCENDING"}]},
    {"collectionGroup":"attendance_corrections","fields":[{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"requesterRole","order":"ASCENDING"}]},
    {"collectionGroup":"leaves","fields":[{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"requesterRole","order":"ASCENDING"}]},
    {"collectionGroup":"payroll_entries","fields":[{"fieldPath":"userId","order":"ASCENDING"},{"fieldPath":"dateString","order":"ASCENDING"}]},
    {"collectionGroup":"payroll_entries","fields":[{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"dateString","order":"ASCENDING"}]},
    {"collectionGroup":"monthly_payroll","fields":[{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"year","order":"DESCENDING"},{"fieldPath":"month","order":"DESCENDING"}]},
    {"collectionGroup":"monthly_payroll","fields":[{"fieldPath":"userId","order":"ASCENDING"},{"fieldPath":"year","order":"DESCENDING"},{"fieldPath":"month","order":"DESCENDING"}]},
    {"collectionGroup":"incentive_records","fields":[{"fieldPath":"recipientUserId","order":"ASCENDING"},{"fieldPath":"type","order":"ASCENDING"},{"fieldPath":"date","order":"DESCENDING"}]},
    {"collectionGroup":"purchase_orders","fields":[{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"orderDate","order":"DESCENDING"}]},
    {"collectionGroup":"purchase_orders","fields":[{"fieldPath":"vendorId","order":"ASCENDING"},{"fieldPath":"orderDate","order":"DESCENDING"}]},
    {"collectionGroup":"payment_corrections","fields":[{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}]},
    {"collectionGroup":"notifications","fields":[{"fieldPath":"recipientUserId","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}]},
    {"collectionGroup":"treatment_plans","fields":[{"fieldPath":"patientId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"}]},
    {"collectionGroup":"reminders","fields":[{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"startDate","order":"ASCENDING"}]},
    {"collectionGroup":"activity_logs","fields":[{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"dateString","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}]}
  ],
  "fieldOverrides": []
}
```

---

## COMPLETE DEPLOYMENT CHECKLIST (All 9 Phases)

```
=== PRE-CODE ===
☐ Firebase project created: dental-clinic-prod
☐ Auth, Firestore, Storage, Functions all enabled
☐ Blaze plan active; $10 budget alert set
☐ firebaseConfig object copied to .env.local
☐ service-account.json saved to functions/ folder
☐ service-account.json added to .gitignore

=== AFTER WRITING ALL CODE ===
☐ npm run build passes with no TypeScript errors in /functions
☐ firebase deploy --only firestore:rules
☐ firebase deploy --only storage:rules
☐ firebase deploy --only firestore:indexes
☐ firebase functions:config:set admin.secret="your-one-time-secret"
☐ firebase deploy --only functions
☐ git push → Vercel auto-deploys Next.js frontend
☐ All NEXT_PUBLIC_ env vars set in Vercel dashboard

=== FIRST-TIME SETUP (run once after deploy) ===
☐ Create SUPER_ADMIN in Firebase Auth console → copy UID
☐ Call initializeSuperAdmin with { secret, uid, name, email, phone }
☐ Log in as SUPER_ADMIN → verify role-based redirect to /admin
☐ /admin/settings → run Seed Data for all lists
☐ Run seedProceduresCatalog() → verify 300+ items in /procedures_catalog

=== PHASE 1 SIGN-OFF ===
☐ All 7 roles log in and see correct sidebar
☐ Role-based redirect works (SUPER_ADMIN→/admin, others→/calendar, LT→/portal/lab/orders)
☐ CF F1 initializeSuperAdmin: custom claims set (check Firebase Auth console → user → claims)
☐ CF F4 generatePatientId: P-00001 returns correctly

=== PHASE 2 SIGN-OFF ===
☐ New patient P-00002, P-00003 generated without collision
☐ Patient groups sidebar: click "RCT" → only RCT patients shown
☐ Dental chart: select teeth 17+16+15, Multiply Cost checked → QTY=3, Total=3×cost
☐ Dental chart: Full Mouth checked → all 32 teeth blue, QTY is free-entry
☐ Invoice: search "consultation" → finds procedures from catalog
☐ Accept Payment: creates locked entry → cannot edit from UI → tries to update in DB → blocked
☐ Payment correction: SUPER_ADMIN approves → CF F7 voids old + creates new + notifies

=== PHASE 3 SIGN-OFF ===
☐ Calendar popover shows correctly on appointment click
☐ "No Show" changes status instantly
☐ "Collect Payment" opens invoice correctly
☐ Double-booking: open 2 browser tabs, book same slot → error on one tab
☐ Reminder "All Doctors": shows on all doctor calendars in calendar view

=== PHASE 4 SIGN-OFF ===
☐ Receptionist cannot see billing amounts on lab order (section hidden)
☐ DevTools Network: /lab_orders/{id}/billing/summary → 403 PERMISSION_DENIED for Receptionist
☐ Lab tech field whitelist: trying to update labOrder.clinicApproved → denied

=== PHASE 5 SIGN-OFF ===
☐ Mark attendance at 11:55 PM → date is correct IST date (not next UTC day)
☐ CLINIC_ADMIN correction request: appears in SUPER_ADMIN queue; NOT in other CLINIC_ADMIN queue
☐ Leave approved: ON_LEAVE attendance records created for all approved days

=== PHASE 6 SIGN-OFF ===
☐ Saturday at midnight: CF F13 fires (check Firebase Functions logs)
☐ Doctor works Sunday + earns > ₹20K: verify 3× rate in payroll_entries
☐ Monthly payroll 1st of month: CF F14 fires → DRAFT records created
☐ SUPER_ADMIN approve payroll → each staff member receives notification

=== PHASE 7 SIGN-OFF ===
☐ Vendor notified on new purchase order (CF F12)
☐ Return entry added → original lineItems unchanged → netAmount recalculated
☐ Vendor reads /inventory_items → 403 PERMISSION_DENIED

=== PHASE 8 SIGN-OFF ===
☐ Chief admin dashboard shows correct per-day data
☐ All 6 Excel reports download correct files
☐ Activity feed updates in real-time

=== PHASE 9 SIGN-OFF ===
☐ All notification triggers tested end-to-end
☐ Mobile layout: sidebar collapses, calendar shows day view, invoice scrolls horizontally
☐ Final security test: all rules tested with wrong roles → all return 403
```

---

## COST SUMMARY

| Service | Free Tier | Expected (100 users) | Cost |
|---|---|---|---|
| Firestore Reads | 50K/day | ~30K/day | ₹0 |
| Firestore Writes | 20K/day | ~5K/day | ₹0 |
| Firebase Storage (files) | 5 GB | ~2 GB accumulated | ~₹5–15/mo |
| Firebase Auth (email) | Unlimited | ~100 users | ₹0 |
| Cloud Functions | 2M/month | ~50K invocations | ₹0 |
| Vercel Hosting | 100 GB bandwidth | ~5 GB/month | ₹0 |
| **TOTAL** | | | **~₹5–15/month ($0–2)** |

---

## END OF PART B — COMPLETE BLUEPRINT

**You now have:**
- `BLUEPRINT_PART_A.md` — System overview, setup, types, rules, Phases 1–5
- `BLUEPRINT_PART_B.md` — Phases 6–9, Cloud Functions F13–F17, all indexes, deployment checklist
- `procedures_catalog_seed.ts` — 300+ procedures with default prices

**To merge:** Copy everything in `BLUEPRINT_PART_B.md` and paste it at the very bottom of `BLUEPRINT_PART_A.md`. The combined file is your complete specification.

**To build:** Give the combined file (or each part separately by phase) to your AI coding tool and say: "Read this blueprint and build the application starting with Phase 1. Complete the checklist at the end of each phase before moving to the next."
