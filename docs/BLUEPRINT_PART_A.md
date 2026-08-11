# DENTAL CLINIC SaaS — COMPLETE BLUEPRINT (PART A)
# Covers: System Overview · Setup · Types · Rules · Phases 1–5
# After building Part A, append BLUEPRINT_PART_B.md to this file and continue.

---

## HOW TO USE THIS DOCUMENT

1. Give this file to your AI coding assistant (Claude Code / DeepSeek / Cursor).
2. Tell it: "Read this blueprint and build the application phase by phase, starting with Phase 1."
3. Complete Phase 1 and verify the checklist at the end of that section before moving to Phase 2.
4. After Phase 5, append BLUEPRINT_PART_B.md content below this file and continue from Phase 6.

---

## SYSTEM OVERVIEW

**What we are building:** Private, role-based, staff-only web application for one dental group with 2 clinics.
No patient-facing portal. No public booking. Desktop-first, mobile-browser responsive.

**Two clinics:** clinic_a and clinic_b.
Patients are GLOBAL — their records span both clinics; each visit is tagged with which clinic it happened in.
All other data (appointments, attendance, lab orders, inventory) is scoped to a specific clinic.

### 7 User Roles

| Constant | Who | Special Notes |
|---|---|---|
| SUPER_ADMIN | Chief Doctor | Full access both clinics; owns payroll; only one who approves payment corrections |
| CLINIC_ADMIN | Clinic Manager | Also a practising doctor; pays same as GENERAL_DOCTOR in payroll |
| GENERAL_DOCTOR | Treating doctor | One clinic only; has daily revenue target |
| ASSISTANT_DOCTOR | Dental assistant | One clinic only; monthly base salary |
| RECEPTIONIST | Front desk | Books appointments; marks attendance; collects payments |
| LAB_TECHNICIAN | External lab | One login per lab entity; no salary tracking |
| VENDOR | Supplier | One login per vendor entity; no salary tracking |

### Payroll Constants (stored in /clinics/{id}/settings — all adjustable by SUPER_ADMIN)

| Constant | Default | Who It Applies To |
|---|---|---|
| generalDoctorBaseDailyPay | ₹2,000 | GENERAL_DOCTOR + CLINIC_ADMIN |
| generalDoctorDailyWorkHours | 7 | GENERAL_DOCTOR + CLINIC_ADMIN |
| generalDoctorDailyRevenueTarget | ₹20,000 | Triggers 2× multiplier |
| generalDoctorMonthlyRevenueTarget | ₹6,00,000 | Triggers monthly cap bonus |
| generalDoctorMonthlyTargetCap | ₹1,00,000 | Hard ceiling on monthly salary |
| assistantMonthlyBasePay | ₹18,000 | ASSISTANT_DOCTOR |
| assistantDailyWorkHours | 8 | ASSISTANT_DOCTOR |
| workingDaysPerMonth | 26 | Mon–Sat, no Sundays |
| referralIncentiveAmount | ₹1,500 | Per qualifying chief-doctor surgery referral |
| weeklyAttendanceBonusAmount | ₹500 | Full Mon–Sat attendance (assistants) |

### Incentive Triggers

| Incentive | Who Earns | Trigger |
|---|---|---|
| Daily 2× rate | GENERAL_DOCTOR / CLINIC_ADMIN | Own patients revenue ≥ ₹20,000 that day |
| Sunday 2× rate | Both doctor types | Working on Sunday (any hours) |
| Sunday 3× rate | GENERAL_DOCTOR / CLINIC_ADMIN | Sunday AND daily revenue ≥ ₹20,000 |
| ₹1,500 referral | Referring GENERAL_DOCTOR | Chief doctor earns ≥ ₹20,000 from referred surgery patient |
| ₹500 weekly bonus | ASSISTANT_DOCTOR | All 6 days (Mon–Sat) with full 8 hours — no leaves |
| ₹250 Sunday task | ASSISTANT_DOCTOR | Pre-Sterilization or Post-Sterilization on Sunday |
| Monthly bonus to cap | GENERAL_DOCTOR / CLINIC_ADMIN | Monthly revenue ≥ ₹6L → pad salary to ₹1L cap |

---

## MANUAL SETUP — YOU DO THESE STEPS YOURSELF

### Step 1 — Firebase Console (firebase.google.com)

```
1. Create project: dental-clinic-prod
2. Authentication → Sign-in method → Email/Password → Enable
3. Firestore Database → asia-south1 → Start in production mode
4. Storage → asia-south1 → Start in production mode
5. Functions → Enable  (requires Blaze plan)
6. Billing → Upgrade to Blaze → Set budget alert at $10/month
7. Project Settings → Your apps → Register web app "dental-clinic-web"
   → Copy the firebaseConfig object shown
8. Project Settings → Service accounts → Generate new private key
   → Save as  functions/service-account.json
   → ADD TO .gitignore  (NEVER commit this file)
9. Authentication → Users → Add user
   → Enter chief doctor email + temporary password
   → Copy the UID shown (needed for Step 30 of deployment checklist)
```

### Step 2 — Vercel (vercel.com)

```
1. Sign up with GitHub
2. Push your project to GitHub first
3. Vercel → Add New Project → Import GitHub repo
4. Framework preset: Next.js (auto-detected)
5. Root directory: ./  (leave default)
6. Settings → Environment Variables → add all NEXT_PUBLIC_ variables
7. Deploy
```

---

## TECH STACK — RUN THESE COMMANDS IN ORDER

```bash
npx create-next-app@latest dental-clinic --typescript --tailwind --app --src-dir
cd dental-clinic

# Core dependencies
npm install firebase zustand react-hook-form zod date-fns
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install xlsx jspdf html2canvas recharts

# Calendar
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list

# shadcn/ui
npx shadcn@latest init
# When prompted: Style=Default, Base color=Slate, CSS variables=Yes
npx shadcn@latest add button input label select dialog table form badge tabs card dropdown-menu popover calendar avatar separator toast alert-dialog sheet skeleton command

# Firebase CLI
npm install -g firebase-tools
firebase login
firebase init
# Select: Firestore, Functions (TypeScript), Storage, Emulators
# Project: dental-clinic-prod

cd functions
npm install firebase-admin firebase-functions
npm install -D typescript @types/node
cd ..
```

### .env.local (create in project root — never commit)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dental-clinic-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dental-clinic-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dental-clinic-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_APP_NAME=Metro Dental Clinic
```

### src/lib/firebase.ts

```typescript
import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const cfg = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApps()[0] : initializeApp(cfg);
export const db      = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
export const auth    = getAuth(app);
export const storage = getStorage(app);
```

### src/lib/utils/date.ts — USE EVERYWHERE DATES ARE STORED

```typescript
// CRITICAL: Never use toISOString().split("T")[0] — it gives UTC, not IST.
// A visit at 11:30 PM IST becomes the next day in UTC — payroll and attendance break.

export function toISTDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date); // Returns "2025-08-05"
}

export function toISTTimeHHMM(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date).replace(":", ""); // Returns "1430"
}

export function toISTDateStringServer(date: Date): string {
  // For use in Cloud Functions (Node.js)
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split("T")[0];
}
```

---

## PROJECT FOLDER STRUCTURE

```
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/set-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                        ← Sidebar + Header + NotificationBell
│   │   ├── page.tsx                          ← redirects to role-specific page
│   │   ├── calendar/page.tsx
│   │   ├── patients/
│   │   │   ├── page.tsx                      ← Patient list with groups sidebar
│   │   │   ├── new/page.tsx
│   │   │   └── [patientId]/
│   │   │       ├── profile/page.tsx
│   │   │       ├── appointments/page.tsx
│   │   │       ├── emr/vital-signs/page.tsx
│   │   │       ├── emr/clinical-notes/page.tsx
│   │   │       ├── emr/treatment-plans/page.tsx
│   │   │       ├── emr/treatment-plans/[planId]/page.tsx
│   │   │       ├── emr/completed-procedures/page.tsx
│   │   │       ├── emr/files/page.tsx
│   │   │       ├── emr/prescriptions/page.tsx
│   │   │       ├── emr/prescriptions/new/page.tsx
│   │   │       ├── emr/timeline/page.tsx
│   │   │       ├── billing/invoices/page.tsx
│   │   │       ├── billing/invoices/new/page.tsx   ← Invoice & Receipt
│   │   │       ├── billing/invoices/[id]/page.tsx
│   │   │       ├── billing/invoices/[id]/print/page.tsx
│   │   │       └── billing/payments/page.tsx
│   │   ├── lab-orders/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [orderId]/page.tsx
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   ├── vendors/page.tsx
│   │   │   ├── vendors/[id]/page.tsx
│   │   │   ├── purchase-orders/page.tsx
│   │   │   ├── purchase-orders/new/page.tsx
│   │   │   └── purchase-orders/[id]/page.tsx
│   │   ├── hr/
│   │   │   ├── attendance/page.tsx
│   │   │   ├── my-attendance/page.tsx
│   │   │   ├── leaves/page.tsx
│   │   │   ├── leaves/review/page.tsx
│   │   │   ├── corrections/page.tsx
│   │   │   ├── corrections/review/page.tsx
│   │   │   └── my-payroll/page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── users/new/page.tsx
│   │   │   ├── users/[id]/page.tsx
│   │   │   ├── payroll/page.tsx
│   │   │   ├── payroll/[year]/[month]/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── payment-corrections/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── notifications/page.tsx
│   ├── portal/lab/orders/page.tsx
│   ├── portal/lab/orders/[id]/page.tsx
│   ├── portal/vendor/orders/page.tsx
│   └── portal/vendor/orders/[id]/page.tsx
├── components/
│   ├── layout/Sidebar.tsx
│   ├── layout/Header.tsx
│   ├── layout/NotificationBell.tsx
│   ├── auth/LoginForm.tsx
│   ├── auth/RoleGuard.tsx
│   ├── patients/PatientList.tsx
│   ├── patients/GroupsSidebar.tsx         ← Left sidebar with group filter + counts
│   ├── patients/PatientCard.tsx
│   ├── patients/PatientRegistrationForm.tsx
│   ├── patients/GroupManageModal.tsx
│   ├── dental-chart/DentalChart.tsx       ← FDI (used in treatment plan AND invoice)
│   ├── dental-chart/ToothCell.tsx
│   ├── treatment/TreatmentPlanForm.tsx
│   ├── treatment/ProcedureCatalogPanel.tsx
│   ├── billing/InvoiceForm.tsx
│   ├── billing/TreatmentRow.tsx           ← Single line with "add teeth" trigger
│   ├── billing/PaymentAcceptance.tsx
│   ├── billing/InvoicePrint.tsx
│   ├── calendar/AppointmentCalendar.tsx
│   ├── calendar/AppointmentPopover.tsx    ← Click-on-block mini card
│   ├── calendar/AppointmentModal.tsx      ← 2-tab modal
│   ├── calendar/ReminderForm.tsx
│   ├── lab/LabOrderForm.tsx
│   ├── lab/StageChecklist.tsx
│   ├── lab/LabBillingPanel.tsx            ← Admin/doctor only
│   ├── hr/AttendanceBoard.tsx
│   ├── hr/LeaveForm.tsx
│   ├── payroll/PayrollSummary.tsx
│   ├── inventory/PurchaseOrderForm.tsx
│   ├── admin/ActivityFeed.tsx
│   └── notifications/NotificationList.tsx
├── lib/
│   ├── firebase.ts
│   ├── utils/date.ts                      ← IST helpers — use everywhere
│   ├── utils/export-excel.ts
│   ├── firestore/patients.ts
│   ├── firestore/appointments.ts
│   ├── firestore/visits.ts
│   ├── firestore/lab-orders.ts
│   ├── firestore/attendance.ts
│   ├── firestore/payroll.ts
│   ├── payroll-engine/general-doctor.ts
│   ├── payroll-engine/assistant-doctor.ts
│   └── seed/procedures_catalog_seed.ts    ← from companion file
├── hooks/useAuth.ts
├── hooks/useRole.ts
├── hooks/useNotifications.ts
└── types/index.ts
functions/src/index.ts
firestore.rules
storage.rules
firestore.indexes.json
```

---

## TYPESCRIPT TYPES (src/types/index.ts)

```typescript
import { Timestamp } from "firebase/firestore";

export type UserRole = "SUPER_ADMIN"|"CLINIC_ADMIN"|"GENERAL_DOCTOR"|"ASSISTANT_DOCTOR"|"RECEPTIONIST"|"LAB_TECHNICIAN"|"VENDOR";
export type ClinicId = "clinic_a"|"clinic_b";
export type PaymentMode = "CASH"|"GPAY"|"PAYTM"|"DEBIT_CARD"|"CREDIT_CARD"|"OTHER";
export type LeaveType = "FULL_DAY"|"HALF_DAY"|"EMERGENCY"|"SICK"|"PERMISSION";
export type ApptStatus = "SCHEDULED"|"CONFIRMED"|"IN_PROGRESS"|"COMPLETED"|"CANCELLED"|"NO_SHOW";

export interface AppUser {
  uid: string; name: string; email: string; phone: string;
  role: UserRole; primaryClinicId: ClinicId|null; clinicIds: ClinicId[];
  isActive: boolean; createdAt: Timestamp; createdBy: string;
  labId?: string; vendorId?: string;
}

export interface ClinicSettings {
  generalDoctorBaseDailyPay: number;       // 2000
  generalDoctorDailyWorkHours: number;     // 7
  generalDoctorDailyRevenueTarget: number; // 20000
  generalDoctorMonthlyRevenueTarget: number; // 600000
  generalDoctorMonthlyTargetCap: number;   // 100000
  assistantMonthlyBasePay: number;         // 18000
  assistantDailyWorkHours: number;         // 8
  workingDaysPerMonth: number;             // 26
  referralIncentiveAmount: number;         // 1500
  weeklyAttendanceBonusAmount: number;     // 500
  workingHours: { start: string; end: string }; // { start:"09:00", end:"20:00" }
}

export interface Patient {
  patientId: string; name: string; gender: "MALE"|"FEMALE"|"OTHER";
  dateOfBirth: Timestamp|null; age: number|null; bloodGroup: string|null;
  primaryPhone: string; secondaryPhone: string|null; email: string|null;
  anniversary: Timestamp|null;
  address: { street: string; locality: string; city: string; };
  referredById: string|null; referredByName: string|null;
  medicalHistory: string[]; otherHistory: string|null;
  groups: string[]; familyMembers: Array<{ patientId:string; relation:string; }>;
  languagePreference: string; registeredClinicId: ClinicId;
  primaryDoctorId: string|null; primaryDoctorName: string|null;
  advanceBalance: number;   // excess prepayments
  totalDue: number; totalPaid: number;
  lastVisitDate: Timestamp|null; lastVisitClinicId: ClinicId|null;
  createdAt: Timestamp; createdBy: string;
}

export interface Appointment {
  appointmentId: string; patientId: string; patientName: string;
  clinicId: ClinicId; doctorId: string; doctorName: string;
  appointmentDate: Timestamp; durationMinutes: number;
  categoryId: string; categoryName: string; categoryColor: string;
  status: ApptStatus; isWalkIn: boolean;
  tokenNumber: string|null;         // "T-001"
  abhaId: string|null;
  plannedProcedures: string|null; notes: string|null;
  createdAt: Timestamp; createdBy: string; visitId: string|null;
}

export interface Reminder {
  reminderId: string; clinicId: ClinicId; title: string;
  doctorId: string|null; doctorName: string|null;
  isAllDay: boolean; startDate: Timestamp; endDate: Timestamp;
  createdBy: string; createdAt: Timestamp;
}

export interface TreatmentLineItem {
  treatmentId: string; procedureName: string;
  unit: number; costPerUnit: number;
  discountInput: number; discountType: "PERCENT"|"FIXED";
  discountValue: number;   // calculated ₹ amount
  taxRate: number;         // 0, 5, 12, or 18
  taxAmount: number;
  lineTotal: number;       // (unit×cost) - discountValue + taxAmount
  toothNumbers: number[]|null; isFullMouth: boolean; isMultiplyCost: boolean;
  notes: string|null;
}

export interface VisitPayment {
  paymentId: string; amount: number; mode: PaymentMode;
  date: Timestamp; recordedBy: string; recordedByName: string;
  isVoided: boolean; voidedBy: string|null; voidedAt: Timestamp|null;
  correctionRequestId: string|null;
}

export interface Visit {
  visitId: string; patientId: string; patientName: string;
  clinicId: ClinicId; primaryDoctorId: string; primaryDoctorName: string;
  appointmentId: string|null; visitDate: Timestamp;
  chiefComplaint: string|null; clinicalNotes: string|null;
  // Invoice data
  invoiceNumber: string|null; receiptNumber: string|null;
  shareEnabled: boolean;
  treatments: TreatmentLineItem[];
  payments: VisitPayment[];
  totalCost: number; totalDiscount: number; totalTax: number;
  grandTotal: number; advanceUsed: number;
  totalPaid: number; totalDue: number;
  // Referral tracking
  referredToChiefDoctor: boolean;
  referralSurgeryTypeId: string|null; referralSurgeryTypeName: string|null;
  referringDoctorId: string|null; referringDoctorName: string|null;
  referralIncentivePaid: boolean;
  revenueAttributedTo: string;  // doctorId for payroll
  status: "IN_PROGRESS"|"COMPLETED";
  createdAt: Timestamp; updatedAt: Timestamp; updatedBy: string;
}

export interface TreatmentPlan {
  planId: string; patientId: string; clinicId: ClinicId;
  createdByDoctorId: string; title: string|null;
  status: "DRAFT"|"ACTIVE"|"COMPLETED";
  procedures: Array<{
    planProcedureId: string; procedureName: string;
    isFullMouth: boolean; isMultiplyCost: boolean;
    toothNumbers: number[]|null; qty: number;
    unitCost: number; discount: number; total: number;
    status: "PENDING"|"IN_PROGRESS"|"COMPLETED";
    completedInVisitId: string|null; notes: string|null;
  }>;
  totalCost: number; totalDiscount: number; grandTotal: number;
  shareEnabled: boolean; notes: string|null;
  createdAt: Timestamp; updatedAt: Timestamp; updatedBy: string;
}

export interface LabStage {
  stageId: string; stageName: string; description: string;
  deadline: Timestamp|null;
  status: "PENDING"|"IN_PROGRESS"|"COMPLETED";
  completedAt: Timestamp|null; completedBy: string|null; completedByName: string|null;
  notes: string|null;
  // NOTE: cost is NOT here — it lives in /lab_orders/{id}/billing/summary subcollection
}

export interface LabOrder {
  orderId: string; labId: string; labName: string;
  clinicId: ClinicId; patientId: string; patientName: string;
  visitId: string; orderedByDoctorId: string; orderedByDoctorName: string;
  orderDate: Timestamp; overallDueDate: Timestamp|null;
  workDescription: string; stages: LabStage[];
  status: "PENDING"|"IN_PROGRESS"|"COMPLETED"|"CANCELLED";
  attachmentFileIds: string[];
  createdAt: Timestamp; updatedAt: Timestamp;
  // labPayment lives in subcollection /lab_orders/{id}/billing/summary
}

export interface LabBilling {
  stageCosts: Array<{ stageId:string; stageName:string; cost:number|null; }>;
  totalCost: number; amountPaid: number;
  paymentStatus: "UNPAID"|"PARTIALLY_PAID"|"PAID";
  clinicApproved: boolean; clinicApprovedAt: Timestamp|null; clinicApprovedBy: string|null;
  paymentHistory: Array<{ paymentId:string; amount:number; date:Timestamp; recordedBy:string; notes:string|null; }>;
}

export interface AttendanceRecord {
  recordId: string;   // "{userId}_{clinicId}_{dateString}"
  userId: string; userName: string; userRole: UserRole; clinicId: ClinicId;
  date: Timestamp; dateString: string;   // IST "2025-08-05"
  clockIn: Timestamp|null; clockOut: Timestamp|null; hoursWorked: number;
  status: "PRESENT"|"ABSENT"|"HALF_DAY"|"ON_LEAVE";
  recordedBy: string; hasCorrectionRequest: boolean; correctionRequestId: string|null;
  createdAt: Timestamp; updatedAt: Timestamp; updatedBy: string;
}

export interface AttendanceCorrection {
  correctionId: string; attendanceRecordId: string;
  requestedBy: string; requestedByName: string; requesterRole: UserRole;
  clinicId: ClinicId; date: Timestamp; dateString: string;
  requestType: "MISSED_CLOCK_IN"|"MISSED_CLOCK_OUT"|"WRONG_TIME"|"OTHER";
  originalClockIn: Timestamp|null; originalClockOut: Timestamp|null;
  requestedClockIn: Timestamp|null; requestedClockOut: Timestamp|null;
  reason: string; status: "PENDING"|"APPROVED"|"REJECTED";
  reviewedBy: string|null; reviewedByName: string|null;
  reviewedAt: Timestamp|null; reviewNotes: string|null;
  createdAt: Timestamp;
}

export interface Leave {
  leaveId: string; userId: string; userName: string;
  userRole: UserRole; requesterRole: UserRole;  // drives approval routing
  clinicId: ClinicId; leaveType: LeaveType;
  startDate: Timestamp; endDate: Timestamp; totalDays: number;
  halfDaySlot: "MORNING"|"AFTERNOON"|null;
  reason: string; status: "PENDING"|"APPROVED"|"REJECTED"|"CANCELLED";
  appliedAt: Timestamp;
  reviewedBy: string|null; reviewedByName: string|null;
  reviewedAt: Timestamp|null; reviewNotes: string|null;
}
```

---

## FIRESTORE SECURITY RULES (firestore.rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function role()    { return request.auth.token.role; }
    function uid()     { return request.auth.uid; }
    function clinics() { return request.auth.token.clinicIds; }
    function signedIn(){ return request.auth != null; }
    function isSuperAdmin(){ return role() == "SUPER_ADMIN"; }
    function isAdmin()    { return role() in ["SUPER_ADMIN","CLINIC_ADMIN"]; }
    function isDoctor()   { return role() in ["SUPER_ADMIN","CLINIC_ADMIN","GENERAL_DOCTOR"]; }
    function isStaff()    { return role() in ["SUPER_ADMIN","CLINIC_ADMIN","GENERAL_DOCTOR","ASSISTANT_DOCTOR","RECEPTIONIST"]; }
    function inClinic(cid){ return isSuperAdmin() || cid in clinics(); }

    match /users/{id}  { allow read: if signedIn()&&(isSuperAdmin()||uid()==id); allow write: if isSuperAdmin(); }
    match /clinics/{id}{ allow read: if signedIn(); allow write: if isSuperAdmin(); }

    // Patients GLOBAL
    match /patients/{id}{ allow read: if isStaff(); allow create,update: if isStaff(); allow delete: if isSuperAdmin(); }

    match /appointment_slots/{id}{ allow read,write: if isStaff(); }
    match /reminders/{id}{ allow read: if isStaff()&&inClinic(resource.data.clinicId);
      allow create,update: if isStaff()&&inClinic(request.resource.data.clinicId); allow delete: if isAdmin(); }
    match /tokens/{id}{ allow read,write: if isStaff()&&inClinic(resource.data.clinicId); }
    match /appointments/{id}{ allow read: if isStaff()&&inClinic(resource.data.clinicId);
      allow create: if isStaff()&&inClinic(request.resource.data.clinicId);
      allow update: if isStaff()&&inClinic(resource.data.clinicId);
      allow delete: if isAdmin()&&inClinic(resource.data.clinicId); }
    match /visits/{id}{ allow read: if isStaff()&&inClinic(resource.data.clinicId);
      allow create: if isStaff()&&inClinic(request.resource.data.clinicId);
      allow update: if isStaff()&&inClinic(resource.data.clinicId); allow delete: if isSuperAdmin(); }
    match /treatment_plans/{id}{ allow read: if isStaff()&&inClinic(resource.data.clinicId);
      allow create,update: if isDoctor()&&inClinic(request.resource.data.clinicId); allow delete: if isSuperAdmin(); }
    match /prescriptions/{id}{ allow read: if isStaff()&&inClinic(resource.data.clinicId);
      allow create,update: if isDoctor(); }
    match /vital_signs/{id}{ allow read: if isStaff(); allow create,update: if isDoctor(); }
    match /files/{id}{ allow read: if isStaff(); allow create: if isStaff(); allow delete: if isSuperAdmin(); }

    // Lab orders — stages all staff; billing subcollection doctors+admin only
    match /lab_orders/{orderId}{
      allow read: if (isStaff()&&inClinic(resource.data.clinicId))
                  || (role()=="LAB_TECHNICIAN"&&resource.data.labId==request.auth.token.labId);
      allow create: if isDoctor()&&inClinic(request.resource.data.clinicId);
      allow update: if isDoctor()&&inClinic(resource.data.clinicId);
      allow update: if role()=="LAB_TECHNICIAN"&&resource.data.labId==request.auth.token.labId
                    &&request.resource.data.diff(resource.data).affectedKeys().hasOnly(["stages","attachmentFileIds","status","updatedAt"]);
    }
    match /lab_orders/{orderId}/billing/{docId}{
      allow read,write: if isDoctor()&&inClinic(
        get(/databases/$(database)/documents/lab_orders/$(orderId)).data.clinicId); }

    match /labs/{id}{ allow read: if isStaff(); allow write: if isSuperAdmin(); }
    match /vendors/{id}{ allow read,write: if isAdmin(); }
    match /inventory_items/{id}{ allow read,write: if isAdmin()&&inClinic(resource.data.clinicId); }
    match /purchase_orders/{id}{
      allow read: if (isAdmin()&&inClinic(resource.data.clinicId))
                  || (role()=="VENDOR"&&resource.data.vendorId==request.auth.token.vendorId);
      allow create,update: if isAdmin()&&inClinic(request.resource.data.clinicId);
      allow update: if role()=="VENDOR"&&resource.data.vendorId==request.auth.token.vendorId
                    &&request.resource.data.diff(resource.data).affectedKeys().hasOnly(["lineItems","status","deliveredAt","invoiceFileId","updatedAt"]); }

    match /attendance_records/{id}{ allow read: if isStaff()&&inClinic(resource.data.clinicId);
      allow create,update: if (isAdmin()||role()=="RECEPTIONIST")&&inClinic(request.resource.data.clinicId); }
    match /attendance_corrections/{id}{ allow read: if isStaff()&&inClinic(resource.data.clinicId);
      allow create: if isStaff()&&inClinic(request.resource.data.clinicId);
      allow update: if isSuperAdmin()||(role()=="CLINIC_ADMIN"&&inClinic(resource.data.clinicId)
                    &&resource.data.requesterRole!="CLINIC_ADMIN"&&resource.data.requesterRole!="SUPER_ADMIN"); }
    match /leaves/{id}{ allow read: if isStaff()&&inClinic(resource.data.clinicId);
      allow create: if isStaff()&&inClinic(request.resource.data.clinicId);
      allow update: if isSuperAdmin()||(role()=="CLINIC_ADMIN"&&inClinic(resource.data.clinicId)
                    &&resource.data.requesterRole!="CLINIC_ADMIN"&&resource.data.requesterRole!="SUPER_ADMIN"); }

    match /payroll_entries/{id}{ allow read: if isSuperAdmin()||uid()==resource.data.userId; allow write: if isSuperAdmin(); }
    match /monthly_payroll/{id}{ allow read: if isSuperAdmin()||uid()==resource.data.userId; allow write: if isSuperAdmin(); }
    match /incentive_records/{id}{ allow read: if isSuperAdmin()||uid()==resource.data.recipientUserId; allow write: if isSuperAdmin(); }
    match /payment_corrections/{id}{ allow read: if isSuperAdmin()||uid()==resource.data.requestedBy;
      allow create: if isStaff(); allow update: if isSuperAdmin(); }

    match /notifications/{id}{ allow read,update: if uid()==resource.data.recipientUserId||isSuperAdmin();
      allow create: if false; }

    match /surgery_types/{id}         { allow read: if isStaff(); allow write: if isSuperAdmin(); }
    match /sunday_tasks/{id}          { allow read: if isStaff(); allow write: if isSuperAdmin(); }
    match /procedures_catalog/{id}    { allow read: if isStaff(); allow write: if isAdmin(); }
    match /appointment_categories/{id}{ allow read: if isStaff(); allow write: if isAdmin(); }
    match /patient_groups/{id}        { allow read,write: if isStaff(); }
    match /referral_sources/{id}      { allow read,write: if isStaff(); }
    match /medical_conditions/{id}    { allow read,write: if isStaff(); }
    match /activity_logs/{id}         { allow read: if isSuperAdmin(); allow create: if false; }
    match /counters/{id}              { allow read,write: if false; }
  }
}
```

### storage.rules

```javascript
rules_version = "2";
service firebase.storage {
  match /b/{bucket}/o {
    function role(){ return request.auth.token.role; }
    function isStaff(){ return role() in ["SUPER_ADMIN","CLINIC_ADMIN","GENERAL_DOCTOR","ASSISTANT_DOCTOR","RECEPTIONIST"]; }
    function isAdmin() { return role() in ["SUPER_ADMIN","CLINIC_ADMIN"]; }
    function ok()      { return request.resource.size <= 10 * 1024 * 1024; }
    match /patients/{pid}/{allFiles=**}        { allow read: if isStaff(); allow write: if isStaff()&&ok(); }
    match /purchase_orders/{oid}/{allFiles=**} { allow read: if isAdmin()||role()=="VENDOR"; allow write: if (isAdmin()||role()=="VENDOR")&&ok(); }
    match /lab_orders/{oid}/{allFiles=**}      { allow read: if isStaff()||role()=="LAB_TECHNICIAN"; allow write: if (isStaff()||role()=="LAB_TECHNICIAN")&&ok(); }
  }
}
```

---

## PERMISSION MATRIX

| Feature | SA | CA | GD | AD | RC | LT | VN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| All patient records (both clinics) | ✅ | ✅¹ | ✅¹ | ✅¹ | ✅¹ | ❌ | ❌ |
| Create/edit patient basics & groups | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| EMR — create/edit | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| EMR — view only | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Write prescriptions | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invoice — create treatments | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invoice — view | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Record patient payment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve payment correction | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Book/manage appointments | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark attendance (clock in/out) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Approve correction — clinic staff | ✅ | ✅¹ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve correction — CLINIC_ADMIN | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve leave — clinic staff | ✅ | ✅¹ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve leave — CLINIC_ADMIN | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lab stages (view progress) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅² | ❌ |
| Lab billing amounts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory/vendor management | ✅ | ✅¹ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View own payroll | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View all payroll | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Chief Admin dashboard | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create user accounts | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

¹ = own clinic only  ² = own lab orders only

---

## PHASE 1 — FOUNDATION

**Goal:** Every role can log in and see their correct sidebar. Auth, layout shell, user management, and clinic settings are fully operational.

### Phase 1 — Pages

| Route | Access | Purpose |
|---|---|---|
| /login | Public | Email + password login |
| /set-password | Any auth | Forced password change on first login |
| / | Any auth | Redirect to role dashboard |
| /admin/users | SUPER_ADMIN | All user accounts |
| /admin/users/new | SUPER_ADMIN | Create any user type |
| /admin/users/[id] | SUPER_ADMIN | Edit, deactivate, reset password |
| /admin/settings | SUPER_ADMIN | Clinic config + all extensible lists |
| /notifications | All auth | Notification centre |

### Phase 1 — Sidebar Menus (hardcoded per role)

```typescript
// src/components/layout/Sidebar.tsx
const ROLE_MENUS: Record<UserRole, { label:string; href:string; icon:string }[]> = {
  SUPER_ADMIN:      [
    {label:"Dashboard",     href:"/admin",              icon:"LayoutDashboard"},
    {label:"Calendar",      href:"/calendar",           icon:"Calendar"},
    {label:"Patients",      href:"/patients",           icon:"Users"},
    {label:"Lab Orders",    href:"/lab-orders",         icon:"FlaskConical"},
    {label:"Inventory",     href:"/inventory",          icon:"Package"},
    {label:"HR",            href:"/hr/attendance",      icon:"Clock"},
    {label:"Payroll",       href:"/admin/payroll",      icon:"Banknote"},
    {label:"Reports",       href:"/admin/reports",      icon:"FileSpreadsheet"},
    {label:"Users",         href:"/admin/users",        icon:"UserCog"},
    {label:"Settings",      href:"/admin/settings",     icon:"Settings"},
  ],
  CLINIC_ADMIN: [
    {label:"Calendar",   href:"/calendar",         icon:"Calendar"},
    {label:"Patients",   href:"/patients",         icon:"Users"},
    {label:"Lab Orders", href:"/lab-orders",       icon:"FlaskConical"},
    {label:"Inventory",  href:"/inventory",        icon:"Package"},
    {label:"HR",         href:"/hr/attendance",    icon:"Clock"},
    {label:"My Payroll", href:"/hr/my-payroll",    icon:"Banknote"},
  ],
  GENERAL_DOCTOR: [
    {label:"Calendar",      href:"/calendar",        icon:"Calendar"},
    {label:"Patients",      href:"/patients",        icon:"Users"},
    {label:"Lab Orders",    href:"/lab-orders",      icon:"FlaskConical"},
    {label:"My Attendance", href:"/hr/my-attendance",icon:"Clock"},
    {label:"My Payroll",    href:"/hr/my-payroll",   icon:"Banknote"},
  ],
  ASSISTANT_DOCTOR: [
    {label:"Calendar",      href:"/calendar",        icon:"Calendar"},
    {label:"Patients",      href:"/patients",        icon:"Users"},
    {label:"Lab Orders",    href:"/lab-orders",      icon:"FlaskConical"},
    {label:"My Attendance", href:"/hr/my-attendance",icon:"Clock"},
    {label:"My Payroll",    href:"/hr/my-payroll",   icon:"Banknote"},
  ],
  RECEPTIONIST: [
    {label:"Calendar",   href:"/calendar",       icon:"Calendar"},
    {label:"Patients",   href:"/patients",       icon:"Users"},
    {label:"Attendance", href:"/hr/attendance",  icon:"Clock"},
  ],
  LAB_TECHNICIAN: [{label:"Lab Orders",href:"/portal/lab/orders",   icon:"ClipboardList"}],
  VENDOR:         [{label:"Orders",    href:"/portal/vendor/orders", icon:"ShoppingCart"}],
};
```

### Phase 1 — Cloud Functions (functions/src/index.ts — COMPLETE FILE)

```typescript
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp({ credential: admin.credential.cert(require("./service-account.json")) });
const db = admin.firestore();

// === SHARED HELPERS ===
async function notifyUser(recipientId:string,type:string,title:string,body:string,relatedId:string|null,relatedType:string|null,clinicId?:string){
  await db.collection("notifications").add({
    recipientUserId:recipientId,type,title,body,isRead:false,
    relatedEntityId:relatedId??null,relatedEntityType:relatedType??null,
    clinicId:clinicId??null,createdAt:admin.firestore.FieldValue.serverTimestamp(),
  });
}
function toIST(date:Date):string{
  const ist=new Date(date.getTime()+5.5*60*60*1000);
  return ist.toISOString().split("T")[0];
}

// === F1: INITIALIZE SUPER_ADMIN (run ONCE after first deploy) ===
export const initializeSuperAdmin=functions.https.onCall(async(data,ctx)=>{
  const cfg=functions.config();
  if(data.secret!==cfg.admin?.secret) throw new functions.https.HttpsError("permission-denied","Bad secret");
  const{uid,name,email,phone}=data;
  await admin.auth().setCustomUserClaims(uid,{role:"SUPER_ADMIN",clinicIds:["clinic_a","clinic_b"],primaryClinicId:null,labId:null,vendorId:null});
  await db.collection("users").doc(uid).set({uid,name,email,phone,role:"SUPER_ADMIN",clinicIds:["clinic_a","clinic_b"],primaryClinicId:null,isActive:true,createdAt:admin.firestore.FieldValue.serverTimestamp(),createdBy:uid,labId:null,vendorId:null});
  return{success:true};
});

// === F2: CREATE USER ACCOUNT ===
export const createUserAccount=functions.https.onCall(async(data,ctx)=>{
  if(ctx.auth?.token.role!=="SUPER_ADMIN") throw new functions.https.HttpsError("permission-denied","SUPER_ADMIN only");
  const{name,email,phone,role,primaryClinicId,clinicIds,labId,vendorId}=data;
  const tempPwd=`Dc${Math.random().toString(36).slice(-6)}1!`;
  const user=await admin.auth().createUser({email,password:tempPwd,displayName:name});
  await admin.auth().setCustomUserClaims(user.uid,{role,clinicIds,primaryClinicId:primaryClinicId??null,labId:labId??null,vendorId:vendorId??null});
  await db.collection("users").doc(user.uid).set({uid:user.uid,name,email,phone,role,primaryClinicId:primaryClinicId??null,clinicIds,isActive:true,createdAt:admin.firestore.FieldValue.serverTimestamp(),createdBy:ctx.auth!.uid,labId:labId??null,vendorId:vendorId??null});
  return{uid:user.uid,email,tempPassword:tempPwd};
});

// === F3: UPDATE ROLE / DEACTIVATE ===
export const updateUserRole=functions.https.onCall(async(data,ctx)=>{
  if(ctx.auth?.token.role!=="SUPER_ADMIN") throw new functions.https.HttpsError("permission-denied","SUPER_ADMIN only");
  const{uid,role,clinicIds,primaryClinicId,isActive}=data;
  await admin.auth().setCustomUserClaims(uid,{role,clinicIds,primaryClinicId});
  await db.collection("users").doc(uid).update({role,clinicIds,primaryClinicId,isActive});
  return{success:true};
});

// === F4: GENERATE PATIENT ID ===
export const generatePatientId=functions.https.onCall(async(_,ctx)=>{
  if(!["SUPER_ADMIN","CLINIC_ADMIN","GENERAL_DOCTOR","ASSISTANT_DOCTOR","RECEPTIONIST"].includes(ctx.auth?.token.role||""))
    throw new functions.https.HttpsError("permission-denied","Staff only");
  const ref=db.collection("counters").doc("patients");
  return db.runTransaction(async t=>{
    const snap=await t.get(ref);const next=(snap.data()?.count??0)+1;
    t.set(ref,{count:next},{merge:true});return`P-${String(next).padStart(5,"0")}`;
  });
});

// === F5: GENERATE INVOICE NUMBER ===
export const generateInvoiceNumber=functions.https.onCall(async(_,ctx)=>{
  if(!ctx.auth?.uid) throw new functions.https.HttpsError("unauthenticated","Login required");
  const ref=db.collection("counters").doc("invoices");
  return db.runTransaction(async t=>{
    const snap=await t.get(ref);const next=(snap.data()?.count??0)+1;
    t.set(ref,{count:next},{merge:true});return`INV-${String(next).padStart(5,"0")}`;
  });
});

// === F6: GENERATE RECEIPT NUMBER ===
export const generateReceiptNumber=functions.https.onCall(async(_,ctx)=>{
  if(!ctx.auth?.uid) throw new functions.https.HttpsError("unauthenticated","Login required");
  const ref=db.collection("counters").doc("receipts");
  return db.runTransaction(async t=>{
    const snap=await t.get(ref);const next=(snap.data()?.count??0)+1;
    t.set(ref,{count:next},{merge:true});return`RCP-${String(next).padStart(5,"0")}`;
  });
});

// === F7: APPROVE PAYMENT CORRECTION (SUPER_ADMIN callable) ===
export const approvePaymentCorrection=functions.https.onCall(async(data,ctx)=>{
  if(ctx.auth?.token.role!=="SUPER_ADMIN") throw new functions.https.HttpsError("permission-denied","SUPER_ADMIN only");
  const{correctionId,reviewNotes,approved}=data;
  const corrRef=db.collection("payment_corrections").doc(correctionId);
  const corr=(await corrRef.get()).data()!;
  if(approved){
    const visitRef=db.collection("visits").doc(corr.visitId);
    await db.runTransaction(async t=>{
      const visit=(await t.get(visitRef)).data()!;
      const updated=visit.payments.map((p:any)=>p.paymentId===corr.originalPaymentId?{...p,isVoided:true,voidedBy:ctx.auth!.uid,voidedAt:admin.firestore.Timestamp.now(),correctionRequestId:correctionId}:p);
      updated.push({paymentId:db.collection("_").doc().id,amount:corr.requestedAmount,mode:corr.originalMode,date:corr.originalDate,recordedBy:corr.requestedBy,recordedByName:corr.requestedByName,isVoided:false,voidedBy:null,voidedAt:null,correctionRequestId:correctionId});
      const newPaid=updated.filter((p:any)=>!p.isVoided).reduce((s:number,p:any)=>s+p.amount,0);
      t.update(visitRef,{payments:updated,totalPaid:newPaid,totalDue:visit.grandTotal-newPaid});
      t.update(db.collection("patients").doc(corr.patientId),{totalPaid:admin.firestore.FieldValue.increment(corr.requestedAmount-corr.originalAmount),totalDue:admin.firestore.FieldValue.increment(corr.originalAmount-corr.requestedAmount)});
      t.update(corrRef,{status:"APPROVED",reviewedBy:ctx.auth!.uid,reviewedAt:admin.firestore.FieldValue.serverTimestamp(),reviewNotes});
    });
  }else{
    await corrRef.update({status:"REJECTED",reviewedBy:ctx.auth!.uid,reviewedAt:admin.firestore.FieldValue.serverTimestamp(),reviewNotes});
  }
  await notifyUser(corr.requestedBy,approved?"PAYMENT_CORRECTION_APPROVED":"PAYMENT_CORRECTION_REJECTED",
    approved?"Payment correction approved":"Payment correction rejected",
    approved?`Correction for ${corr.patientName} (₹${corr.requestedAmount}) approved.`:`Correction rejected: ${reviewNotes}`,
    correctionId,"payment_correction");
  return{success:true};
});

// === F8: LAB STAGE COMPLETED (called from lab tech portal) ===
export const completeLabStage=functions.https.onCall(async(data,ctx)=>{
  if(ctx.auth?.token.role!=="LAB_TECHNICIAN") throw new functions.https.HttpsError("permission-denied","Lab tech only");
  const{orderId,stageId,stageCost,notes}=data;
  const orderRef=db.collection("lab_orders").doc(orderId);
  const billingRef=db.collection("lab_orders").doc(orderId).collection("billing").doc("summary");
  const orderSnap=await orderRef.get();
  if(orderSnap.data()?.labId!==ctx.auth!.token.labId) throw new functions.https.HttpsError("permission-denied","Not your lab");
  const now=admin.firestore.Timestamp.now();
  const completedByName=(await db.collection("users").doc(ctx.auth!.uid).get()).data()?.name??"";
  await db.runTransaction(async t=>{
    const order=(await t.get(orderRef)).data()!;
    const billing=(await t.get(billingRef)).data()??{stageCosts:[],totalCost:0,amountPaid:0,paymentStatus:"UNPAID",clinicApproved:false,clinicApprovedAt:null,clinicApprovedBy:null,paymentHistory:[]};
    const updStages=order.stages.map((s:any)=>s.stageId===stageId?{...s,status:"COMPLETED",completedAt:now,completedBy:ctx.auth!.uid,completedByName,notes:notes??null}:s);
    const allDone=updStages.every((s:any)=>s.status==="COMPLETED");
    t.update(orderRef,{stages:updStages,status:allDone?"COMPLETED":"IN_PROGRESS",updatedAt:now});
    const stageName=updStages.find((s:any)=>s.stageId===stageId)?.stageName??stageId;
    const costs=billing.stageCosts.some((c:any)=>c.stageId===stageId)
      ?billing.stageCosts.map((c:any)=>c.stageId===stageId?{...c,cost:stageCost}:c)
      :[...billing.stageCosts,{stageId,stageName,cost:stageCost}];
    const total=costs.reduce((s:number,c:any)=>s+(c.cost??0),0);
    t.set(billingRef,{...billing,stageCosts:costs,totalCost:total},{merge:true});
  });
  const order=(await orderRef.get()).data()!;
  const stageName=order.stages.find((s:any)=>s.stageId===stageId)?.stageName??stageId;
  await notifyUser(order.orderedByDoctorId,"LAB_STAGE_COMPLETED","Lab stage completed",
    `${stageName} for patient ${order.patientName} completed by ${order.labName}`,
    orderId,"lab_order",order.clinicId);
  return{success:true};
});

// === F9: REFERRAL INCENTIVE — ON VISIT COMPLETED ===
export const onVisitCompleted=functions.firestore.document("visits/{visitId}").onUpdate(async(change,ctx)=>{
  const before=change.before.data();const after=change.after.data();
  if(before.status==="COMPLETED"||after.status!=="COMPLETED") return;
  if(!after.referredToChiefDoctor||!after.referringDoctorId) return;
  if(after.grandTotal<20000) return;
  const dateStr=toIST(after.visitDate.toDate());
  const entryId=`${after.referringDoctorId}_${after.clinicId}_${dateStr}`;
  await db.collection("incentive_records").add({
    type:"REFERRAL_1500",recipientUserId:after.referringDoctorId,clinicId:after.clinicId,
    amount:1500,date:after.visitDate,referredPatientId:after.patientId,referredPatientName:after.patientName,
    surgeryTypeId:after.referralSurgeryTypeId,surgeryTypeName:after.referralSurgeryTypeName,
    chiefDoctorRevenue:after.grandTotal,visitId:ctx.params.visitId,
    appliedToPayrollId:null,createdAt:admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection("payroll_entries").doc(entryId).set({
    gdReferralIncentive:admin.firestore.FieldValue.increment(1500),
    gdReferralCount:admin.firestore.FieldValue.increment(1),
    totalDayEarning:admin.firestore.FieldValue.increment(1500),
  },{merge:true});
  await notifyUser(after.referringDoctorId,"REFERRAL_INCENTIVE_CREDITED","₹1,500 referral incentive!",
    `Patient ${after.patientName} surgery completed. ₹1,500 added to your payroll.`,
    ctx.params.visitId,"visit",after.clinicId);
});

// === F10: LEAVE APPROVED → CREATE ATTENDANCE RECORDS ===
export const onLeaveStatusChanged=functions.firestore.document("leaves/{leaveId}").onUpdate(async change=>{
  const before=change.before.data();const after=change.after.data();
  if(before.status===after.status) return;
  if(after.status==="APPROVED"){
    const start=after.startDate.toDate();const end=after.endDate.toDate();
    const batch=db.batch();
    for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
      const day=new Date(d);const dateStr=toIST(day);
      const recordId=`${after.userId}_${after.clinicId}_${dateStr}`;
      batch.set(db.collection("attendance_records").doc(recordId),{
        recordId,userId:after.userId,userName:after.userName,userRole:after.userRole,clinicId:after.clinicId,
        date:admin.firestore.Timestamp.fromDate(day),dateString:dateStr,
        clockIn:null,clockOut:null,hoursWorked:after.leaveType==="HALF_DAY"?4:0,
        status:"ON_LEAVE",recordedBy:after.reviewedBy,
        hasCorrectionRequest:false,correctionRequestId:null,
        createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp(),updatedBy:after.reviewedBy,
      },{merge:true});
    }
    await batch.commit();
  }
  await notifyUser(after.userId,after.status==="APPROVED"?"LEAVE_APPROVED":"LEAVE_REJECTED",
    after.status==="APPROVED"?"Leave approved":"Leave rejected",
    after.status==="APPROVED"?`Your leave has been approved.`:`Leave rejected: ${after.reviewNotes??""}`,
    change.after.id,"leave",after.clinicId);
});

// === F11: CORRECTION APPROVED → UPDATE ATTENDANCE ===
export const onCorrectionApproved=functions.firestore.document("attendance_corrections/{id}").onUpdate(async change=>{
  const before=change.before.data();const after=change.after.data();
  if(before.status===after.status||after.status!=="APPROVED") return;
  const hrs=after.requestedClockIn&&after.requestedClockOut
    ?Math.round(((after.requestedClockOut.toMillis()-after.requestedClockIn.toMillis())/3600000)*100)/100:0;
  await db.collection("attendance_records").doc(after.attendanceRecordId).set({
    clockIn:after.requestedClockIn,clockOut:after.requestedClockOut,hoursWorked:hrs,
    status:hrs>0?"PRESENT":"ABSENT",
    updatedAt:admin.firestore.FieldValue.serverTimestamp(),updatedBy:after.reviewedBy,hasCorrectionRequest:false,
  },{merge:true});
  await notifyUser(after.requestedBy,"CORRECTION_APPROVED","Attendance correction approved",
    `Your correction for ${after.dateString} has been approved.`,change.after.id,"attendance_correction",after.clinicId);
});

// === F12: VENDOR NOTIFIED ON NEW PURCHASE ORDER ===
export const onPurchaseOrderCreated=functions.firestore.document("purchase_orders/{orderId}").onCreate(async snap=>{
  const order=snap.data();
  const vendorDoc=await db.collection("vendors").doc(order.vendorId).get();
  if(!vendorDoc.exists) return;
  await notifyUser(vendorDoc.data()!.userId,"VENDOR_ORDER_PLACED","New order received",
    `New order from ${order.clinicId==="clinic_a"?"Clinic A":"Clinic B"}: ${order.lineItems.length} item(s).`,
    snap.id,"purchase_order",order.clinicId);
});

// === NOTE: F13 (Weekly Bonus) and F14 (Monthly Payroll) are in PART B ===
```

### Phase 1 — Seed Data (run once from /admin/settings after first deploy)

```typescript
// Appointment categories
const CATEGORIES = [
  {id:"cat_consultation",name:"CONSULTATION",color:"#3B82F6"},
  {id:"cat_extraction",name:"EXTRACTION",color:"#EF4444"},
  {id:"cat_filling",name:"FILLING",color:"#F59E0B"},
  {id:"cat_scaling",name:"SCALING",color:"#10B981"},
  {id:"cat_rct",name:"RCT",color:"#06B6D4"},
  {id:"cat_ortho",name:"ORTHO",color:"#8B5CF6"},
  {id:"cat_implant",name:"IMPLANT",color:"#6366F1"},
  {id:"cat_surgical",name:"SURGICAL",color:"#DC2626"},
  {id:"cat_bleaching",name:"BLEACHING",color:"#F59E0B"},
  {id:"cat_wisdom",name:"WISDOM TOOTH EXTRACTION",color:"#9F1239"},
  {id:"cat_none",name:"NO CATEGORY",color:"#6B7280"},
];
const SURGERY_TYPES = [
  {id:"surg_implants",name:"Dental Implants",isActive:true},
  {id:"surg_laser",name:"Laser Treatment",isActive:true},
  {id:"surg_whitening",name:"Tooth Whitening",isActive:true},
  {id:"surg_extraction",name:"Surgical Extraction",isActive:true},
  {id:"surg_alignment",name:"Tooth Alignment",isActive:true},
];
const SUNDAY_TASKS = [
  {id:"task_pre",name:"Pre-Sterilization",incentiveAmount:250,isActive:true},
  {id:"task_post",name:"Post-Sterilization",incentiveAmount:250,isActive:true},
];
// Counters: /counters/patients {count:0}, /counters/invoices {count:0}, /counters/receipts {count:0}
// Procedures: call seedProceduresCatalog() from procedures_catalog_seed.ts
```

### Phase 1 — Checklist
```
☐ Firebase project created, all services enabled, Blaze plan active, $10 budget alert set
☐ firestore.rules deployed and tested
☐ storage.rules deployed and tested
☐ Cloud Functions F1–F12 deployed (firebase deploy --only functions)
☐ SUPER_ADMIN UID set via initializeSuperAdmin callable (called once with secret)
☐ All 7 roles can log in and see their correct sidebar
☐ Role-based redirect working (SUPER_ADMIN → /admin, others → /calendar)
☐ Seed data written: categories, surgery types, Sunday tasks, counters
☐ Procedures catalog seeded (300+ items from procedures_catalog_seed.ts)
```

---

## PHASE 2 — PATIENT MANAGEMENT

**Goal:** Complete Practo-style patient system. List with groups sidebar, registration, full EMR with dental chart, invoice & receipt with payment acceptance and locking.

### Phase 2 — Patient List Page Layout

```
LEFT SIDEBAR (280px)                  MAIN AREA
─────────────────────────             ────────────────────────────────────
[↔ Switch to All Patients]            [Search Patient Name/ID/Phone  🔍]
                                      [Advanced Search]
Patients
  All Patients            19331       ┌──────────┐ ┌──────────┐ ┌──────────┐
  ● Recently Visited      ▓▓          │ [MA]     │ │ [BS]     │ │ [KL]     │
  ● Recently Added                    │ MASHAK   │ │ BABU S   │ │ KALYAN   │
                                      │ Male     │ │ Male     │ │ Male     │
Groups                                │ +91...   │ │ +91...   │ │ +91...   │
  My Groups         [Manage]          │ #18847   │ │ #M586    │ │ #18846   │
  ──────────────────────────          └──────────┘ └──────────┘ └──────────┘
  WISDOM TOOTH           24           ...more cards...
  ADAYAR                 16
  RCT                    14           [Get More Patients] ← cursor pagination
  EXTRACTION             11
  KODAMBAKKAM             6
  [+ more groups...]
```

**Group sidebar:** clicking a group filters cards to patients in that group.
"Manage" opens modal: create / rename / delete groups.
Group count badges come from denormalized `patientGroup.patientCount`.

### Phase 2 — Patient Registration

**All clinic staff including RECEPTIONIST can create patients.**
Receptionist fields: Name, Age/Gender, Primary Phone, Groups, Assigned Doctor, Chief Complaint.
Full fields (doctors see all):

```
Patient Name*          [auto] Patient ID (P-00001)
Gender: Male/Female    Date of Birth  or  Age
Blood Group            Anniversary (optional)
Primary Phone*         Secondary Phone
Email                  Language Preference
Street Address, Locality, City

Referred By:  [dropdown /referral_sources + "Add New"]
Family:       [+ Add member: select patient + relationship]
Medical History: [checkboxes /medical_conditions + "Add New"]
Other History: [free text]
Groups/Tags:   [multi-select /patient_groups + "Add New"]
Assigned Doctor: [dropdown: active doctors in this clinic]

[Print Registration Form]  [Cancel]  [Save Patient]
```

**Patient ID** — call Cloud Function F4 on submit. Never generate client-side.

### Phase 2 — FDI Dental Chart Component

**Two tooth sets (toggle):**
```
ADULT TEETH
Upper: 18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28
Lower: 48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38

CHILD TEETH (shown when toggled)
Upper: 55 54 53 52 51 | 61 62 63 64 65
Lower: 85 84 83 82 81 | 71 72 73 74 75
```

**Checkboxes (mutually exclusive):**
- ☐ Full Mouth → all teeth selected, QTY = free-entry spinner
- ☐ Multiply Cost → QTY = count of selected teeth auto-fills
- ☐ Show Child Teeth → reveals child rows

**[clear selection] link** deselects everything.

**Used in TWO places:** TreatmentPlanForm and InvoiceForm TreatmentRow (the "add teeth" link).

### Phase 2 — Treatment Plans

1. Patient → EMR → Treatment Plans → [New Treatment Plan]
2. Right panel: searchable /procedures_catalog list with default costs
3. Click procedure → dental chart appears
4. Select teeth → checkboxes → fill cost → [Done] → line item added
5. Multiple procedures stacked
6. Footer: Total Cost | Total Discount | Grand Total
7. [Save Treatment Plan]

Status flow: DRAFT → ACTIVE → COMPLETED

### Phase 2 — Invoice & Receipt Page (/patients/[id]/billing/invoices/new)

**Opened from:** "Collect Payment" on calendar popover, or Patient → Billing → Invoices → [New Invoice].

**Page layout (matches Practo screenshots):**
```
● Invoice & Receipt ─────────────────────── [Print Invoice & Receipt]

[MA] MOTHI AHAMED (18529)   ✉ email    📞 +919962563593
Appointment with Dr. (Doctor Name)(clinic name if avaialbe) on 11th Aug, 06:00 PM for 30 min

──────────────────────────────────────────────────────────────────
Invoice  (Invoice No. auto-generated)  [edit]    ⓘ Share Off

TREATMENTS (N)  UNIT  COST(₹)    DISCOUNT       TAX        TOTAL(₹)
[Procedure Name] add teeth │ [1] │ [  0  ] │ [0][%▼] │ [None▼] │ 0.00 [✕]
                                  ₹ 0.00 discount │ ₹ 0.00 tax
[Search and add items  🔍                              ]
                      ┌───────────────┬────────────────┬────────────────┬──────────────┐
                      │TOTAL COST(₹)  │TOTAL DISC.(₹)  │TOTAL TAX(₹)   │GRAND TOTAL   │
                      │    0.00       │  0.00  [edit]  │  0.00  [edit] │    0.00      │
                      └───────────────┴────────────────┴────────────────┴──────────────┘
──────────────────────────────────────────────────────────────────
Payment  (Receipt No. auto-generated)  [edit]

              PAYABLE(₹)     FROM ADVANCE(₹)    PAY NOW(₹)
                  0.00             0.00          [   0   ]

  Mode: ● Cash  ○ Card  ○ Online → [GPay][Paytm][Debit][Credit][Other]

                                    [Cancel]    [Accept Payment]
```

**Treatment row logic:**
- Cost input pre-fills from /procedures_catalog when added via search
- Discount: `%` toggle → discount = (unit×cost) × (input/100). `₹` toggle → discount = input directly
- Tax: None | 5% | 12% | 18% → taxAmount = (lineSubtotal − discount) × rate/100
- Line Total = (unit×cost) − discountValue + taxAmount
- [✕] removes the row

**Totals:**
- TOTAL COST = Σ(unit×cost)
- TOTAL DISCOUNT = Σ discountValues (overrideable via [edit] button → sets one flat amount)
- TOTAL TAX = Σ taxAmounts (overrideable via [edit] button)
- GRAND TOTAL = TOTAL COST − TOTAL DISCOUNT + TOTAL TAX

**Payment section:**
- PAYABLE = GRAND TOTAL (read-only)
- FROM ADVANCE = patient.advanceBalance (read-only, fetched from patient doc)
- PAY NOW = manual input; if PAY NOW < PAYABLE → partial payment; if PAY NOW > PAYABLE → excess added to patient.advanceBalance

**Accept Payment flow:**
1. Validate PAY NOW > 0
2. Call Cloud Function F6 → receive receipt number
3. Write locked payment entry to visit.payments (isVoided: false)
4. Update patient.totalPaid, patient.totalDue, patient.advanceBalance
5. Open print view

**Payment is permanently locked after Accept Payment. To correct: submit a Payment Correction Request → SUPER_ADMIN approves via F7.**

**Print page (/billing/invoices/[id]/print):**
```
[Clinic Name]               Invoice: INV-00001
[Clinic Address]            Receipt: RCP-00001
[Phone]                     Date: 11 Aug 2025

Patient: Mothi Ahamed (18529)   Phone: +91-9962563593
─────────────────────────────────────────────────────
TREATMENT             QTY   COST    DISC    TAX    TOTAL
Consultation              1    300       0      0    300.00
─────────────────────────────────────────────────────
             Total Cost:  300.00
          Total Discount:   0.00
               Total Tax:   0.00
             Grand Total:  300.00
Amount Paid:  ₹300.00  (Cash)
 Balance Due:  ₹0.00

Doctor Signature: ______________________
```

### Phase 2 — Patient Profile Tabs

| Tab Section | Sub-tabs | Edit Access |
|---|---|---|
| Patient | Profile, Appointments, Communications | All staff |
| EMR | Vital Signs, Clinical Notes, Treatment Plans, Completed Procedures, Files, Prescriptions, Timeline | Doctors edit; Receptionist views |
| Billing | Invoices, Payments | All staff view; All staff can record payment |

### Phase 2 — Prescription Writer

**Access:** SUPER_ADMIN, CLINIC_ADMIN, GENERAL_DOCTOR only.

Fields: clinic name (pre-filled), clinic address (pre-filled), date, drug rows (name/dosage/frequency/duration/instructions), additional notes.

Output: Print (browser print dialog) or Download PDF (jsPDF). Doctor writes name + signs physically on printout.

### Phase 2 — Checklist
```
☐ Patient ID generated by CF F4 (never client-side)
☐ Patient list shows groups sidebar with correct counts
☐ Group filter works (clicking group filters patient cards)
☐ "Manage" modal creates/renames/deletes groups
☐ Dental chart renders FDI notation — adult and child rows
☐ Multiply Cost: selecting N teeth auto-fills QTY = N
☐ Full Mouth: all teeth selected, QTY is free-entry
☐ Invoice search bar finds procedures from /procedures_catalog
☐ Discount % toggle and ₹ toggle both calculate correctly
☐ "Accept Payment" locks payment entry — cannot edit from UI
☐ FROM ADVANCE deducts from patient.advanceBalance correctly
☐ PAY NOW > PAYABLE adds excess to patient.advanceBalance
☐ Invoice number from CF F5, receipt number from CF F6
☐ Print view renders correctly in browser
☐ Prescription writer generates printable output
☐ Payment correction request routes to SUPER_ADMIN notifications
```

---

## PHASE 3 — CALENDAR & APPOINTMENTS

**Goal:** Full appointment calendar, appointment popover with mini patient card, 2-tab appointment creation modal, slot-lock double-booking prevention, walk-in tokens, and calendar reminders.

### Phase 3 — Calendar Layout

**Header:** [Clinic A ▼] ← 8–13 Aug 2026 → [Today] [Day][Week][Month] [Settings▼]

**Left sidebar:**
```
[↩]
DOCTORS                          44
  All Doctors
  ● Dr. A (Kodambakkam)          11
  ● Dr. B (Mylapore)              7
  ● Dr. C (Adayar)               16

CATEGORIES              [Edit]
  ● CONSULTATION
  ● CORE FILLING
  ● EXTRACTION
  ● FILLING
  ● ORTHO
```

**Right panel — Today's Schedule:**
```
TODAY  WAITING  ENGAGED  DONE
  23      0        0       22

10:00  SAJIDA D                 🟢
       Visit reason not specified
       Dr. S.M.AMEERDEEN (Kodambakkam) --here, the doctor's name Amiruddin is given. For example, the corresponding doctor's name, along with the clinic name if available, should be present. It is common for all the doctors' names that are given here. It is just for example. On the corresponding space, the doctor's name which is selected or which is available should be present. 

10:30  MOHAMMED IDRIS           🟢
       FILLING
       Dr. S.M.AMEERDEEN (Kodambakkam)
```

**Walk-in Appointment button** (top right) → opens appointment modal Tab 1.

### Phase 3 — Appointment Block Popover

Clicking any appointment block on the calendar opens a floating card:

```
┌────────────────────────────────────────────┐
│ [MA]  MOTHI AHAMED           [□] [✏] [✕]  │
│       18529                                │
│       Male • 48 Years                     │
│       Show Balance ↗                      │
│                                           │
│  📞 +919962563593, +919884093391          │
│  ✉  Not available                         │
│  📍 Not available                         │
│  🏷  Token: Not available                 │
│                                           │
│  🏠 In-Clinic Appointment   [No Show]     │
│     with Dr. S.M.Ameerdeen (...)          │
│     at 6:00 PM for 30 mins               │
│                                           │
│               [Collect Payment →]         │
└────────────────────────────────────────────┘
```

- **□** Copy/duplicate appointment
- **✏** Edit (reopens modal pre-filled)
- **✕** Close
- **Show Balance** → inline expand: "Paid: ₹X | Due: ₹Y"
- **No Show** → one-click, changes status to NO_SHOW immediately
- **Collect Payment** → navigates to `/patients/{id}/billing/invoices/new?appointmentId={id}`

### Phase 3 — 2-Tab Appointment Modal

**Tab 1: Appointment**
```
ABHA ID:     [___________________]  [Get Patient Details]
Token No.:   [___________________]  [Get Patient Details]

Patient Name*   [live search — type to find existing patient]
Patient ID*     [P-00001  auto-filled when patient selected]
Mobile No.      [____________________]
Email ID        [____________________]

Doctor      [Dr.S.M.AMEERDEEN (K)   ▼]
Category    [Select Category         ▼]

Scheduled On  [08-08-2026 📅]  at  [HH:MM]  for  [30 min ▼]
              ⚠ Outside doctor's timings.  (warning only — does NOT block save)

Planned Procedures  [________________________________]
Notes               [________________________________]

                         [Cancel]   [Save]
```

**Patient Name live search:** queries /patients; selecting fills Patient ID, Mobile, Email.
New patient not found: fields left empty; appointment saved with name+phone only.

**ABHA ID lookup:** queries /patients where abhaId == input.
**Token lookup:** queries /tokens for today's token matching input.

**Category options:** Consultation | Extraction | Filling | Scaling | RCT | Wisdom Tooth Extraction | Ortho | Implant | Bleaching | Surgical | No Category (+ admin-created from /admin/settings).

**Duration options:** 15 min | 30 min | 45 min | 1 hour | 1.5 hours | 2 hours.

**"Outside doctor's timings" warning:** compare scheduled time against `clinic.settings.workingHours`. Show orange warning text. Save is not blocked.

**Tab 2: Reminder**
```
ℹ You can add a reminder to your calendar.

Reminder Title*  [_________________________]
Doctor*          [All Doctors              ▼]

Duration*   ● All Day    ○ Custom

Date & Time*  [08-08-2026 📅]   [07:39 AM]

                        [Cancel]   [Save]
```

Saves to /reminders. `doctorId: null` = All Doctors = shows on all calendars.

### Phase 3 — Slot-Lock Double-Booking Prevention

**PROBLEM:** `getDocs()` inside a Firestore transaction is not transactional — two concurrent bookings both see "slot free" and both succeed. Standard Firestore transaction limitation.

**SOLUTION:** Deterministic slot-lock document. Two concurrent writes to the same document ID will conflict and one will fail atomically.

```typescript
// src/lib/firestore/appointments.ts
import { doc, collection, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toISTDateString, toISTTimeHHMM } from "@/lib/utils/date";

function slotKey(doctorId: string, date: Date): string {
  const d = toISTDateString(date).replace(/-/g, ""); // "20250811"
  const t = toISTTimeHHMM(date);                     // "1800"
  return `${doctorId}_${d}_${t}`;
}

export async function bookAppointmentSafe(appt: Omit<Appointment,"appointmentId"|"createdAt">): Promise<string> {
  const slotRef = doc(db, "appointment_slots", slotKey(appt.doctorId, appt.appointmentDate.toDate()));
  const apptRef = doc(collection(db, "appointments"));

  await runTransaction(db, async (t) => {
    const slot = await t.get(slotRef);
    if (slot.exists()) throw new Error("SLOT_TAKEN");
    t.set(slotRef, { doctorId: appt.doctorId, appointmentId: apptRef.id, bookedAt: serverTimestamp() });
    t.set(apptRef, { ...appt, appointmentId: apptRef.id, createdAt: serverTimestamp() });
  });
  return apptRef.id;
}
// On SLOT_TAKEN error: show toast "This slot was just booked — please choose another time."
```

### Phase 3 — Walk-in Token System

```typescript
// Token ID = "{clinicId}_{yyyyMMdd}_{tokenNumber}"
// Counter: /counters/tokens_{clinicId}_{dateString}
// Counter key contains date so it auto-resets each new day

export async function issueToken(clinicId: string, patientId: string|null, patientName: string|null): Promise<string> {
  const dateStr = toISTDateString(new Date());
  const counterRef = doc(db, "counters", `tokens_${clinicId}_${dateStr}`);
  // Call server-side Cloud Function (same pattern as F4)
  // Returns "T-001", "T-002", etc.
}
```

### Phase 3 — Checklist
```
☐ Calendar shows week view with appointments colour-coded by category
☐ Doctor filter in left sidebar works
☐ Clicking appointment block opens popover with all patient details
☐ "Collect Payment" on popover navigates to correct invoice URL
☐ "No Show" button changes status immediately
☐ Appointment modal Tab 1 opens by default
☐ Patient name live search shows matching patients as dropdown
☐ ABHA ID and Token lookups fetch correct patient
☐ "Outside doctor's timings" warning appears but does NOT block save
☐ Double-booking test: 2 browser tabs book same slot simultaneously → only one succeeds
☐ Reminder saves to /reminders; appears on calendar; "All Doctors" shows everywhere
☐ Walk-in tokens issue as T-001, T-002 correctly per clinic per day
```

---

## PHASE 4 — LAB MANAGEMENT

**Goal:** Complete lab order lifecycle. Doctor creates order → lab technician sees it in their portal, marks stages complete, sets costs → clinic sees progress and billing → notifications flow correctly.

### Phase 4 — Key Design Decision

**Lab payment data is stored in a SUBCOLLECTION, not in the main document.**
This provides true server-side access control, not UI-layer hiding.

```
/lab_orders/{orderId}                  ← all staff + lab tech can read
/lab_orders/{orderId}/billing/summary  ← ONLY doctors + admin can read (strict Firestore rule)
```

Lab tech updating stage status via CF F8 writes to BOTH documents atomically:
- Stage completion status → main document (whitelisted fields only)
- Stage cost → billing subcollection (unreachable by lab tech directly)

### Phase 4 — Lab Order Detail Page

**Visible to ALL clinic staff + lab technician (from main document):**
```
Order #: ORD-001   Lab: Chennai Dental Lab   Status: IN PROGRESS
Patient: Mothi Ahamed   Doctor: Dr. S.M. Ameerdeen   Clinic: Mylapore
Work: "Upper arch restoration — 3 crowns"   Due: 20 Aug 2025

STAGES:
[✓] Trial 1       Completed 14/08  by Lab Tech Ravi  Notes: "Size adjusted"
[○] Trial 2       Deadline: 17/08
[○] Final Delivery Deadline: 20/08

[📎 Upload Report]   [View Attached Files (2)]
```

**Visible ONLY to SUPER_ADMIN, CLINIC_ADMIN, GENERAL_DOCTOR (from billing subcollection):**
```
─── LAB BILLING ───────────────────────────────
Trial 1:       ₹ 1,200  ✓
Trial 2:       ₹ — (pending)
Final:         ₹ — (pending)
Total Cost:    ₹ 1,200 (so far)
Amount Paid:   ₹ 0
Balance Due:   ₹ 1,200
Clinic Approved: No

[Record Lab Payment]   [Approve]
```

**Rendering check in React:**
```typescript
const canSeeBilling = ["SUPER_ADMIN","CLINIC_ADMIN","GENERAL_DOCTOR"].includes(currentUser.role);
// Fetch billing subcollection only if canSeeBilling
```

### Phase 4 — Lab Technician Portal (/portal/lab)

**Separate layout — not the main dashboard.**

- /portal/lab/orders — all orders for their lab (filter: All / Pending / In Progress / Done)
- /portal/lab/orders/[id] — order detail:
  - Patient name, work description, stage list with deadlines
  - Mark stage "In Progress" or call CF F8 to mark "Completed" + enter cost
  - Upload lab reports/photos against this order
  - CANNOT see: billing amounts, patient financials, other clinic orders

### Phase 4 — Checklist
```
☐ Doctor creates lab order with stages and deadlines
☐ Lab tech sees order in /portal/lab/orders
☐ Lab tech marks stage complete via CF F8 (cost goes to billing subcollection, not main doc)
☐ RECEPTIONIST cannot see billing amounts on lab order page
☐ ASSISTANT_DOCTOR cannot see billing amounts
☐ Ordering doctor receives notification on stage completion (CF F8 calls notifyUser)
☐ Referral incentive fires correctly when visit completes (CF F9)
☐ Lab tech cannot edit clinicApproved or paymentHistory fields (whitelist rule enforced)
```

---

## PHASE 5 — HR & ATTENDANCE

**Goal:** Receptionists mark daily attendance with IST timestamps. Staff submit missed-punch corrections. All leave types available. Approval chains enforced. Leave approval auto-creates attendance records.

### Phase 5 — Attendance Record ID Pattern

```typescript
// Deterministic ID prevents duplicate records for same person on same day
const recordId = `${userId}_${clinicId}_${toISTDateString(date)}`;
// Example: "uid_abc123_clinic_a_2025-08-11"
await setDoc(doc(db, "attendance_records", recordId), data, { merge: true });
```

**NEVER use `toISOString()` for the date portion — always use `toISTDateString()`.**

### Phase 5 — Attendance Page (/hr/attendance)

**Access:** RECEPTIONIST + CLINIC_ADMIN + SUPER_ADMIN

```
Date: [08-08-2026 📅]   Clinic: [Kodambakkam ▼]

NAME              ROLE              CLOCK IN    CLOCK OUT   HOURS   STATUS
Dr. S.M.Ameerdeen GENERAL_DOCTOR   [09:15 AM]  [06:30 PM]  9.25    PRESENT
Dr. Priya          GENERAL_DOCTOR   [Mark In ►] [—       ]  0.00    —
Ravi (Assistant)   ASSISTANT_DOCTOR [09:00 AM]  [05:00 PM]  8.00    PRESENT
Meena (Reception)  RECEPTIONIST     [08:45 AM]  [—       ]  —       —

[Mark In Now] button auto-stamps current IST time.
[Mark Out Now] button auto-stamps current IST time.
[Save All] writes all records as setDoc with merge:true.
```

**Status auto-assignment:**
- 0 hours → ABSENT
- hours ≥ quota → PRESENT
- 0 < hours < quota → HALF_DAY

**Record is locked after save.** Staff cannot edit their own attendance. To correct: submit AttendanceCorrection request.

### Phase 5 — Attendance Correction Workflow

**Submit form (/hr/corrections):**
```
Date:         [08-08-2026]   (which day needs correction)
Request Type: ○ Missed Clock-In  ○ Missed Clock-Out  ● Wrong Time  ○ Other
Original:     Clock In: 09:15  Clock Out: 06:30
Requested:    Clock In: [09:00]  Clock Out: [06:30]
Reason:       [Accidentally entered wrong time]
[Submit Request]
```

**Approval routing (enforced in both Firestore rules AND frontend query):**

| requesterRole | Approval Queue |
|---|---|
| GENERAL_DOCTOR | CLINIC_ADMIN (own clinic) OR SUPER_ADMIN |
| ASSISTANT_DOCTOR | CLINIC_ADMIN (own clinic) OR SUPER_ADMIN |
| RECEPTIONIST | CLINIC_ADMIN (own clinic) OR SUPER_ADMIN |
| CLINIC_ADMIN | SUPER_ADMIN ONLY |

```typescript
// CLINIC_ADMIN review queue query:
query(collection(db,"attendance_corrections"),
  where("clinicId","==",user.primaryClinicId),
  where("status","==","PENDING"),
  where("requesterRole","not-in",["CLINIC_ADMIN","SUPER_ADMIN"])
)
```

On approval → CF F11 updates the attendance record with corrected times.

### Phase 5 — Leave Application (/hr/leaves)

```
Leave Type:   ○ Full Day  ○ Half Day  ○ Emergency  ○ Sick  ○ Permission
              If Half Day: ○ Morning  ○ Afternoon

Date Range:   [Start Date 📅]  →  [End Date 📅]  (single date for half day)

Reason:       [____________________________________________]

[Submit Leave Request]
```

**Same approval routing as attendance corrections (stored as requesterRole on the leave document).**

On APPROVED → CF F10 creates ON_LEAVE attendance records for all approved days.

**Payroll impact:**
- Full Day leave → hoursWorked=0 that day → no earning
- Half Day → hoursWorked=4 → pro-rated at hourly rate
- Any leave in a Mon–Sat week → ₹500 weekly bonus FORFEITED that week (for assistants)

### Phase 5 — Checklist
```
☐ Attendance records use IST date string (not UTC) — test near midnight
☐ Record ID is deterministic "{userId}_{clinicId}_{dateString}" — no duplicates
☐ "Mark In Now" auto-stamps current IST time
☐ Hours calculated correctly from clockIn to clockOut
☐ Status auto-assigned: PRESENT / HALF_DAY / ABSENT
☐ Correction request routes to correct approver based on requesterRole
☐ CLINIC_ADMIN correction goes only to SUPER_ADMIN queue (not shown to other CLINIC_ADMINs)
☐ CF F11 updates attendance record on approval
☐ Leave application routes correctly
☐ CF F10 creates ON_LEAVE records for approved leave days
☐ Leave affects payroll: full day = 0 earning, half day = pro-rated
```

---

## END OF PART A

**Next steps:**
1. Build Phases 1–5 using this document.
2. Verify all phase-end checklists before proceeding.
3. Open `BLUEPRINT_PART_B.md` — it contains Phases 6–9, weekly/monthly payroll Cloud Functions (F13, F14), Firestore indexes, and the complete deployment checklist.
4. Append Part B content to the bottom of this file (Part A) and continue building.

---

## APPENDIX A — KEY HOOKS & GUARDS

### src/hooks/useAuth.ts
```typescript
"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { AppUser } from "@/types";

export function useAuth() {
  const [user,    setUser]    = useState<User|null>(null);
  const [appUser, setAppUser] = useState<AppUser|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        const snap = await getDoc(doc(db, "users", fbUser.uid));
        if (snap.exists()) setAppUser(snap.data() as AppUser);
      } else {
        setUser(null);
        setAppUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, appUser, loading };
}
```

### src/hooks/useRole.ts
```typescript
"use client";
import { useAuth } from "./useAuth";
import { UserRole } from "@/types";

export function useRole() {
  const { appUser } = useAuth();
  return {
    role: appUser?.role ?? null,
    isSuperAdmin:    appUser?.role === "SUPER_ADMIN",
    isClinicAdmin:   appUser?.role === "CLINIC_ADMIN",
    isDoctor:        ["SUPER_ADMIN","CLINIC_ADMIN","GENERAL_DOCTOR"].includes(appUser?.role ?? ""),
    isStaff:         ["SUPER_ADMIN","CLINIC_ADMIN","GENERAL_DOCTOR","ASSISTANT_DOCTOR","RECEPTIONIST"].includes(appUser?.role ?? ""),
    isLabTech:       appUser?.role === "LAB_TECHNICIAN",
    isVendor:        appUser?.role === "VENDOR",
    clinicIds:       appUser?.clinicIds ?? [],
    primaryClinicId: appUser?.primaryClinicId ?? null,
    can: (roles: UserRole[]) => roles.includes(appUser?.role ?? "" as UserRole),
  };
}
```

### src/hooks/useNotifications.ts
```typescript
"use client";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppNotification } from "@/types";
import { useAuth } from "./useAuth";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("recipientUserId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, snap =>
      setNotifications(snap.docs.map(d => d.data() as AppNotification))
    );
    return unsub;
  }, [user?.uid]);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  return { notifications, unreadCount };
}
```

### src/components/auth/RoleGuard.tsx
```typescript
"use client";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types";
import { redirect } from "next/navigation";

interface Props { allowedRoles: UserRole[]; children: React.ReactNode; }

export function RoleGuard({ allowedRoles, children }: Props) {
  const { appUser, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><span>Loading...</span></div>;
  if (!appUser) redirect("/login");
  if (!allowedRoles.includes(appUser.role)) redirect("/");
  return <>{children}</>;
}
```

### src/app/(dashboard)/layout.tsx
```typescript
"use client";
import { useAuth } from "@/hooks/useAuth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { appUser, loading } = useAuth();
  if (loading) return null;
  if (!appUser) redirect("/login");
  // Lab techs and vendors go to their own portal
  if (appUser.role === "LAB_TECHNICIAN") redirect("/portal/lab/orders");
  if (appUser.role === "VENDOR")         redirect("/portal/vendor/orders");
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={appUser.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header appUser={appUser} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">{children}</main>
      </div>
    </div>
  );
}
```

### src/app/(dashboard)/page.tsx  (root redirect)
```typescript
"use client";
import { useAuth } from "@/hooks/useAuth";
import { redirect } from "next/navigation";

export default function RootPage() {
  const { appUser, loading } = useAuth();
  if (loading) return null;
  if (!appUser) redirect("/login");
  switch (appUser.role) {
    case "SUPER_ADMIN":    redirect("/admin"); break;
    case "LAB_TECHNICIAN": redirect("/portal/lab/orders"); break;
    case "VENDOR":         redirect("/portal/vendor/orders"); break;
    default:               redirect("/calendar"); break;
  }
}
```

---

## APPENDIX B — FIRESTORE QUERY HELPERS

### src/lib/firestore/patients.ts
```typescript
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Patient } from "@/types";

// All patients for a clinic (paginated)
export async function getPatients(clinicId: string, lastDoc?: DocumentSnapshot, pageSize = 50) {
  let q = query(
    collection(db, "patients"),
    where("registeredClinicId", "==", clinicId),
    orderBy("lastVisitDate", "desc"),
    limit(pageSize)
  );
  if (lastDoc) q = query(q, startAfter(lastDoc));
  const snap = await getDocs(q);
  return { patients: snap.docs.map(d => d.data() as Patient), lastDoc: snap.docs[snap.docs.length-1] };
}

// Recently visited
export async function getRecentPatients(clinicIds: string[], lim = 50) {
  const snap = await getDocs(query(
    collection(db, "patients"),
    where("registeredClinicId", "in", clinicIds),
    orderBy("lastVisitDate", "desc"),
    limit(lim)
  ));
  return snap.docs.map(d => d.data() as Patient);
}

// Patients in a specific group (client-side filter: groups array-contains)
export async function getPatientsByGroup(clinicId: string, groupName: string) {
  const snap = await getDocs(query(
    collection(db, "patients"),
    where("registeredClinicId", "==", clinicId),
    where("groups", "array-contains", groupName)
  ));
  return snap.docs.map(d => d.data() as Patient);
}

// Search by phone (exact match)
export async function searchPatientByPhone(phone: string) {
  const snap = await getDocs(query(
    collection(db, "patients"),
    where("primaryPhone", "==", phone)
  ));
  return snap.docs.map(d => d.data() as Patient);
}
```

### src/lib/firestore/appointments.ts
```typescript
import { collection, query, where, orderBy, getDocs, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Appointment } from "@/types";

// Appointments for a date range (for calendar)
export function subscribeToAppointments(
  clinicId: string,
  startDate: Date,
  endDate: Date,
  callback: (appts: Appointment[]) => void
) {
  const q = query(
    collection(db, "appointments"),
    where("clinicId",         "==",  clinicId),
    where("appointmentDate",  ">=",  Timestamp.fromDate(startDate)),
    where("appointmentDate",  "<=",  Timestamp.fromDate(endDate)),
    where("status", "not-in", ["CANCELLED"])
  );
  return onSnapshot(q, snap => callback(snap.docs.map(d => d.data() as Appointment)));
}

// Today's schedule for right panel
export async function getTodayAppointments(clinicId: string) {
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(); end.setHours(23,59,59,999);
  const snap = await getDocs(query(
    collection(db, "appointments"),
    where("clinicId",        "==", clinicId),
    where("appointmentDate", ">=", Timestamp.fromDate(start)),
    where("appointmentDate", "<=", Timestamp.fromDate(end)),
    orderBy("appointmentDate", "asc")
  ));
  return snap.docs.map(d => d.data() as Appointment);
}
```

### src/lib/firestore/attendance.ts
```typescript
import { doc, collection, query, where, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AttendanceRecord } from "@/types";
import { toISTDateString } from "@/lib/utils/date";

// Upsert attendance record (deterministic ID prevents duplicates)
export async function upsertAttendance(record: Omit<AttendanceRecord,"createdAt"|"updatedAt">) {
  const id = `${record.userId}_${record.clinicId}_${record.dateString}`;
  await setDoc(doc(db, "attendance_records", id), {
    ...record, recordId: id,
    createdAt:  serverTimestamp(),
    updatedAt:  serverTimestamp(),
  }, { merge: true });
}

// Get attendance for a month (for payroll)
export async function getMonthAttendance(userId: string, clinicId: string, year: number, month: number) {
  const prefix = `${year}-${String(month).padStart(2,"0")}`;
  const snap = await getDocs(query(
    collection(db, "attendance_records"),
    where("userId",      "==", userId),
    where("clinicId",    "==", clinicId),
    where("dateString",  ">=", `${prefix}-01`),
    where("dateString",  "<=", `${prefix}-31`)
  ));
  return snap.docs.map(d => d.data() as AttendanceRecord);
}

// Get attendance for a week (for weekly bonus check)
export async function getWeekAttendance(userId: string, clinicId: string, mondayStr: string, satStr: string) {
  const snap = await getDocs(query(
    collection(db, "attendance_records"),
    where("userId",     "==", userId),
    where("clinicId",   "==", clinicId),
    where("dateString", ">=", mondayStr),
    where("dateString", "<=", satStr)
  ));
  return snap.docs.map(d => d.data() as AttendanceRecord);
}
```

---

## APPENDIX C — FIRESTORE INDEXES FOR PHASES 1–5

Add these to `firestore.indexes.json` (deploy with `firebase deploy --only firestore:indexes`):

```json
{
  "indexes": [
    { "collectionGroup": "appointments",
      "fields": [{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"appointmentDate","order":"ASCENDING"}]},
    { "collectionGroup": "appointments",
      "fields": [{"fieldPath":"doctorId","order":"ASCENDING"},{"fieldPath":"appointmentDate","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"}]},
    { "collectionGroup": "visits",
      "fields": [{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"visitDate","order":"DESCENDING"}]},
    { "collectionGroup": "visits",
      "fields": [{"fieldPath":"patientId","order":"ASCENDING"},{"fieldPath":"visitDate","order":"DESCENDING"}]},
    { "collectionGroup": "visits",
      "fields": [{"fieldPath":"primaryDoctorId","order":"ASCENDING"},{"fieldPath":"visitDate","order":"ASCENDING"}]},
    { "collectionGroup": "patients",
      "fields": [{"fieldPath":"registeredClinicId","order":"ASCENDING"},{"fieldPath":"lastVisitDate","order":"DESCENDING"}]},
    { "collectionGroup": "patients",
      "fields": [{"fieldPath":"registeredClinicId","order":"ASCENDING"},{"fieldPath":"groups","order":"ASCENDING"}]},
    { "collectionGroup": "lab_orders",
      "fields": [{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"orderDate","order":"DESCENDING"}]},
    { "collectionGroup": "lab_orders",
      "fields": [{"fieldPath":"labId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"}]},
    { "collectionGroup": "attendance_records",
      "fields": [{"fieldPath":"userId","order":"ASCENDING"},{"fieldPath":"dateString","order":"ASCENDING"}]},
    { "collectionGroup": "attendance_records",
      "fields": [{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"dateString","order":"ASCENDING"}]},
    { "collectionGroup": "attendance_corrections",
      "fields": [{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"requesterRole","order":"ASCENDING"}]},
    { "collectionGroup": "leaves",
      "fields": [{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"requesterRole","order":"ASCENDING"}]},
    { "collectionGroup": "payment_corrections",
      "fields": [{"fieldPath":"status","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}]},
    { "collectionGroup": "notifications",
      "fields": [{"fieldPath":"recipientUserId","order":"ASCENDING"},{"fieldPath":"createdAt","order":"DESCENDING"}]},
    { "collectionGroup": "treatment_plans",
      "fields": [{"fieldPath":"patientId","order":"ASCENDING"},{"fieldPath":"status","order":"ASCENDING"}]},
    { "collectionGroup": "reminders",
      "fields": [{"fieldPath":"clinicId","order":"ASCENDING"},{"fieldPath":"startDate","order":"ASCENDING"}]}
  ],
  "fieldOverrides": []
}
```

---

## APPENDIX D — PHASE 1–5 DEPLOYMENT COMMANDS

Run these in order after writing all code:

```bash
# 1. Deploy Firestore rules
firebase deploy --only firestore:rules

# 2. Deploy Storage rules
firebase deploy --only storage:rules

# 3. Deploy Firestore indexes (takes a few minutes to build in Firebase console)
firebase deploy --only firestore:indexes

# 4. Build and deploy Cloud Functions
cd functions && npm run build && cd ..
firebase deploy --only functions

# 5. Set the one-time admin secret in Firebase Functions config (do this BEFORE calling initializeSuperAdmin)
firebase functions:config:set admin.secret="your-one-time-strong-secret-here"
firebase deploy --only functions   # redeploy to pick up the config

# 6. Deploy the Next.js frontend (Vercel auto-deploys on git push, but for manual deploy)
# git add . && git commit -m "Phase 1 complete" && git push origin main

# 7. After deploy: call initializeSuperAdmin from the browser console or a test script
# Pass: { secret: "your-one-time-strong-secret-here", uid: "SUPER_ADMIN_UID_FROM_FIREBASE_AUTH", name: "Dr. [Name]", email: "...", phone: "..." }

# 8. Log in as SUPER_ADMIN and run seed data from /admin/settings
```

---

## APPENDIX E — COMPLETE ROLE-BASED PAGE ACCESS TABLE (Phases 1–5)

| Route | SA | CA | GD | AD | RC | LT | VN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| /login | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| /calendar | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /patients | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /patients/new | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /patients/[id]/profile | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /patients/[id]/emr/* (view) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /patients/[id]/emr/* (edit) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| /patients/[id]/emr/prescriptions/new | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| /patients/[id]/billing/invoices/new | ✅ | ✅ | ✅ | ✅ | ❌¹ | ❌ | ❌ |
| /patients/[id]/billing/invoices (view) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /patients/[id]/billing/payments | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /lab-orders | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /lab-orders/new | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| /lab-orders/[id] (view) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /lab-orders/[id] billing section | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| /portal/lab/orders | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| /hr/attendance | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| /hr/my-attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /hr/leaves (apply) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /hr/leaves/review | ✅ | ✅¹ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /hr/corrections (apply) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /hr/corrections/review | ✅ | ✅¹ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /hr/my-payroll | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| /admin/* | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| /notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

¹ = own clinic only, cannot approve CLINIC_ADMIN requests

---

## ✅ COMPLETE PHASE 1–5 MASTER CHECKLIST

### Phase 1 — Foundation
```
☐ Firebase project created, all services enabled, Blaze plan, budget alert set
☐ firestore.rules deployed
☐ storage.rules deployed
☐ firestore.indexes.json deployed (wait for indexes to finish building in Firebase Console)
☐ Cloud Functions F1–F12 compiled and deployed (npm run build in /functions first)
☐ Functions config secret set: firebase functions:config:set admin.secret="..."
☐ initializeSuperAdmin callable executed once — SUPER_ADMIN custom claims verified
☐ All 7 roles can log in and are redirected to correct page
☐ Notification bell stub visible in header (unread count = 0)
☐ Seed data in Firebase Console: categories, surgery types, Sunday tasks, counters
☐ Procedures catalog seeded (300+ items searchable)
```

### Phase 2 — Patient Management
```
☐ Patient ID P-00001 generated by CF F4, never client-side
☐ Patient list loads with groups sidebar showing correct counts
☐ Clicking a group filters patient cards to only that group's patients
☐ "Manage" modal: create, rename, delete groups
☐ Assigning patient to groups updates patientGroup.patientCount (denormalized)
☐ Dental chart renders FDI notation — adult rows correct, child rows toggle correctly
☐ Multiply Cost: selecting N teeth auto-fills QTY = N, Total = N × cost
☐ Full Mouth: all teeth blue, QTY is free-entry spinner
☐ clear selection deselects all teeth
☐ Treatment plan saves correctly, status progresses DRAFT→ACTIVE→COMPLETED
☐ Invoice search finds procedures from /procedures_catalog
☐ Discount % toggle: 10% of cost works. ₹ toggle: flat ₹500 works
☐ Tax dropdown: 18% calculates correctly on line total
☐ Total Discount [edit] overrides sum-of-lines correctly
☐ Accept Payment: generates invoice+receipt numbers via CF F5+F6
☐ Payment entry is locked (isVoided:false) — cannot be edited from any UI
☐ FROM ADVANCE deducts from patient.advanceBalance on Accept Payment
☐ PAY NOW > PAYABLE: excess added to patient.advanceBalance
☐ Print view renders correctly with clinic name, invoice/receipt numbers, totals
☐ Payment Correction Request creates document + CF sends notification to SUPER_ADMIN
☐ CF F7 (approvePaymentCorrection): voids original + creates new + notifies requester
☐ Prescription writer generates printable/PDF output
```

### Phase 3 — Calendar & Appointments
```
☐ Calendar week view loads with appointment blocks colour-coded by category
☐ Doctor sidebar filter shows all doctors with count; filtering works
☐ Today's Schedule right panel populates in real-time (onSnapshot)
☐ TODAY/WAITING/ENGAGED/DONE counts are correct
☐ Clicking an appointment block shows the patient popover card
☐ Popover shows: name, ID, gender+age, phones, "Show Balance" toggle, appointment details
☐ "No Show" button changes status instantly; popover closes/updates
☐ "Collect Payment" navigates to correct invoice URL with appointmentId in query
☐ Appointment modal Tab 1: patient live search finds existing patients
☐ Selecting existing patient auto-fills Patient ID, Mobile, Email
☐ ABHA ID lookup queries /patients by abhaId field
☐ Token lookup queries /tokens for today
☐ "Outside doctor's timings" warning shows (does NOT block save)
☐ Category dropdown populated from /appointment_categories
☐ Duration dropdown: 15min to 2hr options
☐ Double-booking prevention: book same slot in 2 tabs simultaneously → only 1 succeeds
☐ Slot-lock document created in /appointment_slots on booking
☐ Appointment modal Tab 2 (Reminder): saves to /reminders
☐ "All Doctors" reminder: doctorId=null, appears on all doctors' calendars
☐ Walk-in token issued correctly as T-001, T-002 (resets each new day per clinic)
```

### Phase 4 — Lab Management
```
☐ Doctor creates lab order with stages (name, description, deadline)
☐ Lab order stages saved correctly in main document (no cost field)
☐ Lab billing initialized in /lab_orders/{id}/billing/summary subcollection
☐ Lab tech sees order in /portal/lab/orders (filtered to their lab only)
☐ Lab tech marks stage complete via CF F8 callable
☐ CF F8: updates stage status in main doc + cost in billing subcollection atomically
☐ CF F8: sends notification to ordering doctor
☐ RECEPTIONIST viewing /lab-orders/[id]: stage checklist visible, billing section absent
☐ ASSISTANT_DOCTOR viewing /lab-orders/[id]: same as receptionist
☐ GENERAL_DOCTOR viewing /lab-orders/[id]: both stage checklist AND billing section visible
☐ Lab tech attempting direct write to /billing subcollection: blocked by Firestore rule
☐ Lab tech field whitelist: attempting to update clinicApproved → blocked by diff() rule
☐ CF F9: referral incentive credits ₹1,500 when visit completes with referral + grandTotal ≥ ₹20K
☐ CF F9: payroll_entries updated with merge:true (no error if entry doesn't exist yet)
```

### Phase 5 — HR & Attendance
```
☐ Attendance records use IST date string (not UTC) — test at 11:30 PM IST
☐ Record ID is "{userId}_{clinicId}_{dateString}" — no duplicates on same day
☐ "Mark In Now" stamps current IST time (not UTC)
☐ Hours calculated from clockIn to clockOut correctly (decimal hours)
☐ Status auto-assigned: PRESENT / HALF_DAY / ABSENT based on hours vs quota
☐ Saving attendance uses setDoc with merge:true
☐ Attendance correction request: CLINIC_ADMIN's request does NOT appear in CLINIC_ADMIN review queue
☐ Attendance correction request: CLINIC_ADMIN's request appears in SUPER_ADMIN queue only
☐ CF F11: on correction APPROVED, attendance record updated with corrected times
☐ CF F11: sends notification to requester
☐ Leave form: all 5 types available; Half Day shows morning/afternoon toggle
☐ Leave request: CLINIC_ADMIN's leave goes only to SUPER_ADMIN queue
☐ CF F10: on leave APPROVED, ON_LEAVE attendance records created for each day
☐ CF F10: HALF_DAY leave creates record with hoursWorked=4
☐ Full Day leave: corresponding attendance record has hoursWorked=0
☐ Any leave in Mon–Sat week: weekly bonus forfeit tracked (checked in CF F13 in Part B)
```

---

## END OF PART A (COMPLETE)

This document covers everything needed to build Phases 1–5.

**To continue building:** Open `BLUEPRINT_PART_B.md` which covers:
- Phase 6: Payroll Engine (daily entries, monthly calculations, incentives, Excel export)
- Phase 7: Vendor & Inventory Management
- Phase 8: Chief Admin Dashboard & Reports
- Phase 9: Notifications & Final Polish
- Cloud Functions F13 (Weekly Bonus Cron) and F14 (Monthly Payroll Cron)
- Firestore indexes for Phases 6–9
- Complete deployment checklist

**Merging Part B:** Copy all content from `BLUEPRINT_PART_B.md` and paste it below the END OF PART A line in this file. The combined file is the complete blueprint.
