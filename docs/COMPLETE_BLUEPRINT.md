# DENTAL CLINIC SaaS — COMPLETE IMPLEMENTATION BLUEPRINT
### Single source of truth. Pass this document to an AI coding assistant to build the full application phase by phase.
### Two companion files: `procedures_catalog_seed.ts` (300+ procedures) and `MASTER_BLUEPRINT_V3_ADDITIONS.md` (UI screenshots reference).

---

## SYSTEM OVERVIEW

**What we are building:** A private, role-based, internal web application for one dental group running 2 clinics.
No patient-facing portal. No public booking. Staff only. Desktop-first, mobile-browser compatible.

**The two clinics:** `clinic_a` and `clinic_b`. Patients are global (can visit both). All other data is clinic-scoped.

**7 User Roles:**

| Role | Who | Count |
|---|---|---|
| `SUPER_ADMIN` | Chief Doctor — full access both clinics, owns payroll, payment corrections | 1 |
| `CLINIC_ADMIN` | Clinic Manager — also a practising doctor, admin for one clinic | 1 per clinic |
| `GENERAL_DOCTOR` | Treating doctor — one clinic only | 2–3 per clinic |
| `ASSISTANT_DOCTOR` | Dental assistant — one clinic only | 2–3 per clinic |
| `RECEPTIONIST` | Front desk — attendance, appointments, patient basics, payment collection | 1 per clinic |
| `LAB_TECHNICIAN` | External lab — one login per lab entity | 3–4 labs |
| `VENDOR` | Supplier — one login per vendor entity | multiple |

---

## 9 DEVELOPMENT PHASES

Build in this exact order. Each phase builds on the previous.

| # | Phase | Core Deliverable |
|---|---|---|
| 1 | Foundation | Auth, roles, layout shell, user accounts, clinic settings |
| 2 | Patient Management | Patient list+groups, registration, EMR, dental chart, invoice & receipt |
| 3 | Calendar & Appointments | Calendar, appointment popover, 2-tab modal, reminders, slot-lock |
| 4 | Lab Management | Lab orders, stage tracking, lab portal, billing split |
| 5 | HR & Attendance | Clock-in/out, corrections, leave workflow |
| 6 | Payroll Engine | Daily entries, monthly payroll, all incentive types, export |
| 7 | Vendor & Inventory | Vendors, purchase orders, stock, vendor portal |
| 8 | Chief Admin Dashboard | Activity feed, expense view, reports, all Excel exports |
| 9 | Notifications & Polish | All notification triggers, mobile layout, final security audit |

---

## MANUAL SETUP — DO THESE STEPS YOURSELF BEFORE ANY CODE

### Firebase (You Do This)
```
1. console.firebase.google.com → Create project "dental-clinic-prod"
2. Authentication → Sign-in method → Email/Password → Enable
3. Firestore → asia-south1 → Production mode
4. Storage → asia-south1 → Production mode
5. Functions → Enable (requires Blaze plan)
6. Upgrade to Blaze → set $10/month budget alert
7. Project Settings → Your apps → Register web → copy firebaseConfig object
8. Project Settings → Service Accounts → Generate private key
   → save as functions/service-account.json (add to .gitignore, never commit)
9. Create SUPER_ADMIN in Auth manually: Authentication → Users → Add user
   → copy the UID shown (used in step 30 of deployment checklist)
```

### Vercel (You Do This)
```
1. vercel.com → Sign up with GitHub
2. Push project to GitHub first
3. Vercel → Add New Project → Import from GitHub → Select repo
4. Framework: Next.js (auto-detected), Root: ./
5. Add all NEXT_PUBLIC_ env vars in Vercel → Settings → Environment Variables
6. Deploy → your URL: https://dental-clinic-prod.vercel.app
```

---

## TECH STACK

```bash
# Run these commands in order

npx create-next-app@latest dental-clinic --typescript --tailwind --app --src-dir
cd dental-clinic

npm install firebase zustand react-hook-form zod date-fns
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install xlsx jspdf html2canvas
npm install recharts
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list

npx shadcn@latest init
# Style=Default, Base color=Slate, CSS variables=Yes
npx shadcn@latest add button input label select dialog table form badge \
  tabs card dropdown-menu popover calendar avatar separator toast \
  alert-dialog sheet skeleton command

npm install -g firebase-tools
firebase login
firebase init   # select: Firestore, Functions (TypeScript), Storage, Emulators

cd functions
npm install firebase-admin firebase-functions
npm install -D typescript @types/node
cd ..
```

### Environment Variables (.env.local — never commit this file)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dental-clinic-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dental-clinic-prod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dental-clinic-prod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_APP_NAME=Metro Dental Clinic
```

### Firebase Client (src/lib/firebase.ts)
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
export const db      = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const auth    = getAuth(app);
export const storage = getStorage(app);
```

### IST Date Utilities (src/lib/utils/date.ts) — Use EVERYWHERE dates are stored
```typescript
export function toISTDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date); // "2025-08-05"
}
export function toISTTimeHHMM(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date).replace(":", ""); // "1430"
}
export function toISTDateStringServer(date: Date): string {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split("T")[0]; // use in Cloud Functions
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
│   │   ├── layout.tsx                  ← sidebar + header + notification bell
│   │   ├── calendar/page.tsx
│   │   ├── patients/
│   │   │   ├── page.tsx                ← patient list with groups sidebar
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
│   │   │       ├── billing/invoices/new/page.tsx    ← Invoice & Receipt
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
│   │   │   ├── page.tsx                ← chief admin dashboard
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
│   ├── patients/GroupsSidebar.tsx      ← left sidebar with group filter
│   ├── patients/PatientCard.tsx
│   ├── patients/PatientRegistrationForm.tsx
│   ├── patients/GroupManageModal.tsx
│   ├── dental-chart/DentalChart.tsx    ← FDI chart (used in treatment plan AND invoice)
│   ├── dental-chart/ToothCell.tsx
│   ├── treatment/TreatmentPlanForm.tsx
│   ├── treatment/ProcedureCatalogPanel.tsx
│   ├── billing/InvoiceForm.tsx         ← Invoice & Receipt (main billing UI)
│   ├── billing/TreatmentRow.tsx        ← single line item with "add teeth" trigger
│   ├── billing/PaymentAcceptance.tsx   ← pay now + mode + accept
│   ├── billing/InvoicePrint.tsx        ← print-formatted output
│   ├── calendar/AppointmentCalendar.tsx
│   ├── calendar/AppointmentPopover.tsx ← click-on-block mini patient card
│   ├── calendar/AppointmentModal.tsx   ← 2-tab modal
│   ├── calendar/ReminderForm.tsx
│   ├── lab/LabOrderForm.tsx
│   ├── lab/StageChecklist.tsx
│   ├── lab/LabBillingPanel.tsx         ← admin/doctor only
│   ├── hr/AttendanceBoard.tsx
│   ├── hr/LeaveForm.tsx
│   ├── hr/LeaveApprovalCard.tsx
│   ├── hr/CorrectionRequestCard.tsx
│   ├── payroll/PayrollSummary.tsx
│   ├── payroll/DailyBreakdown.tsx
│   ├── inventory/PurchaseOrderForm.tsx
│   ├── inventory/ReturnForm.tsx
│   ├── admin/ActivityFeed.tsx
│   └── notifications/NotificationList.tsx
├── lib/
│   ├── firebase.ts
│   ├── utils/date.ts                   ← IST helpers (use everywhere)
│   ├── utils/export-excel.ts
│   ├── utils/export-pdf.ts
│   ├── firestore/patients.ts
│   ├── firestore/appointments.ts
│   ├── firestore/visits.ts
│   ├── firestore/lab-orders.ts
│   ├── firestore/attendance.ts
│   ├── firestore/payroll.ts
│   ├── payroll-engine/general-doctor.ts
│   ├── payroll-engine/assistant-doctor.ts
│   └── seed/procedures_catalog_seed.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useRole.ts
│   └── useNotifications.ts
└── types/index.ts
functions/src/index.ts                  ← all Cloud Functions
firestore.rules
storage.rules
firestore.indexes.json
```

---

## SECURITY RULES

### firestore.rules (CORRECTED — all bugs from V2 fixed)
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

    match /users/{id}        { allow read: if signedIn() && (isSuperAdmin()||uid()==id); allow write: if isSuperAdmin(); }
    match /clinics/{id}      { allow read: if signedIn(); allow write: if isSuperAdmin(); }

    // Patients are GLOBAL (intentional - visit both clinics)
    match /patients/{id}     { allow read: if isStaff(); allow create,update: if isStaff(); allow delete: if isSuperAdmin(); }

    // Slot locks for double-booking prevention
    match /appointment_slots/{id} { allow read,write: if isStaff(); }

    // Reminders
    match /reminders/{id}    { allow read: if isStaff() && inClinic(resource.data.clinicId);
                               allow create,update: if isStaff() && inClinic(request.resource.data.clinicId);
                               allow delete: if isAdmin(); }

    // Appointments - clinic scoped
    match /appointments/{id} { allow read: if isStaff() && inClinic(resource.data.clinicId);
                               allow create: if isStaff() && inClinic(request.resource.data.clinicId);
                               allow update: if isStaff() && inClinic(resource.data.clinicId);
                               allow delete: if isAdmin() && inClinic(resource.data.clinicId); }

    // Visits - clinic scoped
    match /visits/{id}       { allow read: if isStaff() && inClinic(resource.data.clinicId);
                               allow create: if isStaff() && inClinic(request.resource.data.clinicId);
                               allow update: if isStaff() && inClinic(resource.data.clinicId);
                               allow delete: if isSuperAdmin(); }

    match /treatment_plans/{id}  { allow read: if isStaff() && inClinic(resource.data.clinicId);
                                   allow create,update: if isDoctor() && inClinic(request.resource.data.clinicId);
                                   allow delete: if isSuperAdmin(); }
    match /prescriptions/{id}    { allow read: if isStaff() && inClinic(resource.data.clinicId);
                                   allow create,update: if isDoctor(); }
    match /vital_signs/{id}      { allow read: if isStaff(); allow create,update: if isDoctor(); }
    match /files/{id}            { allow read: if isStaff(); allow create: if isStaff(); allow delete: if isSuperAdmin(); }

    // Lab orders - stages visible to all staff; billing in subcollection (restricted)
    match /lab_orders/{orderId} {
      allow read: if (isStaff() && inClinic(resource.data.clinicId))
                  || (role()=="LAB_TECHNICIAN" && resource.data.labId==request.auth.token.labId);
      allow create: if isDoctor() && inClinic(request.resource.data.clinicId);
      allow update: if isDoctor() && inClinic(resource.data.clinicId);
      // Lab tech can ONLY update whitelisted fields
      allow update: if role()=="LAB_TECHNICIAN"
                    && resource.data.labId==request.auth.token.labId
                    && request.resource.data.diff(resource.data).affectedKeys()
                       .hasOnly(["stages","attachmentFileIds","status","updatedAt"]);
    }
    // Lab billing subcollection - doctors + admin only (actual data separation, not UI trick)
    match /lab_orders/{orderId}/billing/{docId} {
      allow read,write: if isDoctor() && inClinic(
        get(/databases/$(database)/documents/lab_orders/$(orderId)).data.clinicId
      );
    }

    match /labs/{id}  { allow read: if isStaff(); allow write: if isSuperAdmin(); }

    // Vendors & inventory - admin only
    match /vendors/{id}         { allow read,write: if isAdmin(); }
    match /inventory_items/{id} { allow read,write: if isAdmin() && inClinic(resource.data.clinicId); }
    match /purchase_orders/{id} {
      allow read: if (isAdmin() && inClinic(resource.data.clinicId))
                  || (role()=="VENDOR" && resource.data.vendorId==request.auth.token.vendorId);
      allow create,update: if isAdmin() && inClinic(request.resource.data.clinicId);
      allow update: if role()=="VENDOR" && resource.data.vendorId==request.auth.token.vendorId
                    && request.resource.data.diff(resource.data).affectedKeys()
                       .hasOnly(["lineItems","status","deliveredAt","invoiceFileId","updatedAt"]);
    }

    // Attendance - clinic scoped
    match /attendance_records/{id} {
      allow read: if isStaff() && inClinic(resource.data.clinicId);
      allow create,update: if (isAdmin()||role()=="RECEPTIONIST") && inClinic(request.resource.data.clinicId);
    }
    match /attendance_corrections/{id} {
      allow read:   if isStaff() && inClinic(resource.data.clinicId);
      allow create: if isStaff() && inClinic(request.resource.data.clinicId);
      allow update: if isSuperAdmin()
                    || (role()=="CLINIC_ADMIN" && inClinic(resource.data.clinicId)
                        && resource.data.requesterRole != "CLINIC_ADMIN"
                        && resource.data.requesterRole != "SUPER_ADMIN");
    }
    match /leaves/{id} {
      allow read:   if isStaff() && inClinic(resource.data.clinicId);
      allow create: if isStaff() && inClinic(request.resource.data.clinicId);
      allow update: if isSuperAdmin()
                    || (role()=="CLINIC_ADMIN" && inClinic(resource.data.clinicId)
                        && resource.data.requesterRole != "CLINIC_ADMIN"
                        && resource.data.requesterRole != "SUPER_ADMIN");
    }

    // Payroll - own record readable; write only by admin/functions
    match /payroll_entries/{id}  { allow read: if isSuperAdmin()||uid()==resource.data.userId; allow write: if isSuperAdmin(); }
    match /monthly_payroll/{id}  { allow read: if isSuperAdmin()||uid()==resource.data.userId; allow write: if isSuperAdmin(); }
    match /incentive_records/{id}{ allow read: if isSuperAdmin()||uid()==resource.data.recipientUserId; allow write: if isSuperAdmin(); }

    // Payment corrections - submit by staff; approve by SUPER_ADMIN only
    match /payment_corrections/{id} {
      allow read:   if isSuperAdmin()||uid()==resource.data.requestedBy;
      allow create: if isStaff();
      allow update: if isSuperAdmin();
    }

    // Notifications - Cloud Functions write only; users read own
    match /notifications/{id} {
      allow read,update: if uid()==resource.data.recipientUserId || isSuperAdmin();
      allow create: if false; // NEVER from client
    }

    // Config lists
    match /surgery_types/{id}           { allow read: if isStaff(); allow write: if isSuperAdmin(); }
    match /sunday_tasks/{id}            { allow read: if isStaff(); allow write: if isSuperAdmin(); }
    match /procedures_catalog/{id}      { allow read: if isStaff(); allow write: if isAdmin(); }
    match /appointment_categories/{id}  { allow read: if isStaff(); allow write: if isAdmin(); }
    match /patient_groups/{id}          { allow read,write: if isStaff(); }
    match /referral_sources/{id}        { allow read,write: if isStaff(); }
    match /medical_conditions/{id}      { allow read,write: if isStaff(); }
    match /activity_logs/{id}           { allow read: if isSuperAdmin(); allow create: if false; }

    // Counters - Cloud Functions only (client never writes)
    match /counters/{id}                { allow read,write: if false; }

    // Tokens
    match /tokens/{id} { allow read,write: if isStaff() && inClinic(resource.data.clinicId); }
  }
}
```

### storage.rules
```javascript
rules_version = "2";
service firebase.storage {
  match /b/{bucket}/o {
    function role() { return request.auth.token.role; }
    function isStaff() { return role() in ["SUPER_ADMIN","CLINIC_ADMIN","GENERAL_DOCTOR","ASSISTANT_DOCTOR","RECEPTIONIST"]; }
    function isAdmin()  { return role() in ["SUPER_ADMIN","CLINIC_ADMIN"]; }
    function ok()       { return request.resource.size <= 10 * 1024 * 1024; } // 10 MB limit
    match /patients/{pid}/{allFiles=**}        { allow read: if isStaff(); allow write: if isStaff() && ok(); }
    match /purchase_orders/{oid}/{allFiles=**} { allow read: if isAdmin()||role()=="VENDOR"; allow write: if (isAdmin()||role()=="VENDOR") && ok(); }
    match /lab_orders/{oid}/{allFiles=**}      { allow read: if isStaff()||role()=="LAB_TECHNICIAN"; allow write: if (isStaff()||role()=="LAB_TECHNICIAN") && ok(); }
  }
}
```

---

## ALL FIRESTORE COLLECTIONS

| Collection | Purpose | Who Reads | Who Writes |
|---|---|---|---|
| `/users` | All user accounts | Own record + SUPER_ADMIN | SUPER_ADMIN |
| `/clinics` | Clinic config + payroll settings | All signed-in | SUPER_ADMIN |
| `/patients` | Global patient records | All clinic staff | All clinic staff |
| `/appointment_slots` | Slot-lock for double-booking prevention | All clinic staff | Via transaction |
| `/appointments` | Scheduled appointments | All clinic staff | All clinic staff |
| `/reminders` | Calendar reminders (non-patient) | All clinic staff | All clinic staff |
| `/tokens` | Walk-in queue tokens (per clinic per day) | All clinic staff | All clinic staff |
| `/visits` | Patient encounter records with invoice data | All clinic staff | All clinic staff |
| `/treatment_plans` | Multi-session treatment plans | All clinic staff | Doctors |
| `/prescriptions` | Doctor prescriptions | All clinic staff | Doctors |
| `/vital_signs` | Pre/post procedure vitals | All clinic staff | Doctors |
| `/files` | Patient file metadata (actual files in Storage) | All clinic staff | All clinic staff |
| `/lab_orders` | Lab work orders (stages visible to all) | Staff + Lab (own) | Doctors; Lab (whitelist) |
| `/lab_orders/{id}/billing/summary` | Lab payment data (separate subcollection) | Doctors + Admin | Doctors + Admin |
| `/labs` | External lab entities | All clinic staff | SUPER_ADMIN |
| `/vendors` | Supplier entities | Admin only | SUPER_ADMIN |
| `/purchase_orders` | Vendor purchase orders | Admin + Vendor (own) | Admin; Vendor (whitelist) |
| `/inventory_items` | Stock levels per clinic | Admin only | Admin only |
| `/attendance_records` | Daily clock-in/out per staff | All clinic staff | Admin + Receptionist |
| `/attendance_corrections` | Missed punch correction requests | All clinic staff | Staff (create); Admin (approve) |
| `/leaves` | Leave requests | All clinic staff | Staff (create); Admin (approve) |
| `/payroll_entries` | Daily payroll snapshots per doctor | Own + SUPER_ADMIN | Cloud Functions |
| `/monthly_payroll` | Monthly salary summaries | Own + SUPER_ADMIN | Cloud Functions |
| `/incentive_records` | Referral, Sunday task, weekly bonus credits | Own + SUPER_ADMIN | Cloud Functions |
| `/payment_corrections` | Billing correction requests | Requestor + SUPER_ADMIN | Staff (create); SUPER_ADMIN (approve) |
| `/notifications` | In-app notifications | Own recipient | Cloud Functions only |
| `/surgery_types` | Chief-doctor-only surgery list (extensible) | All clinic staff | SUPER_ADMIN |
| `/sunday_tasks` | Sunday incentive task list (extensible) | All clinic staff | SUPER_ADMIN |
| `/procedures_catalog` | 300+ dental procedures with default costs | All clinic staff | Admin |
| `/appointment_categories` | Calendar colour categories (extensible) | All clinic staff | Admin |
| `/patient_groups` | Patient tags/groups | All clinic staff | All clinic staff |
| `/referral_sources` | Referred-by dropdown options | All clinic staff | All clinic staff |
| `/medical_conditions` | Medical history conditions list | All clinic staff | All clinic staff |
| `/activity_logs` | Chief admin daily feed | SUPER_ADMIN | Cloud Functions |
| `/counters` | Auto-increment IDs (patients/invoices/receipts) | Cloud Functions | Cloud Functions |

---

## PERMISSION MATRIX

| Feature | SA | CA | GD | AD | RC | LT | VN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| All patient records (both clinics) | ✅ | ✅ clinic | ✅ clinic | ✅ clinic | ✅ clinic | ❌ | ❌ |
| Create/edit patient basics | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| EMR — create/edit clinical notes, vitals, treatment plans | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| EMR — view | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Write prescriptions | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invoice — create & add treatments | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invoice — view | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Record patient payment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve payment correction | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Book/manage appointments | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark attendance | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Approve correction (own clinic staff) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve correction (CLINIC_ADMIN) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve leave (own clinic staff) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve leave (CLINIC_ADMIN) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lab order stages (view) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ own | ❌ |
| Lab billing amounts (view) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory/vendor management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View own payroll | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View all payroll | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Chief Admin dashboard | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create user accounts | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

SA=SUPER_ADMIN, CA=CLINIC_ADMIN, GD=GENERAL_DOCTOR, AD=ASSISTANT_DOCTOR, RC=RECEPTIONIST, LT=LAB_TECHNICIAN, VN=VENDOR

---

---

## PHASE 1 — FOUNDATION

**Goal:** Every user role can log in and reach their correct empty dashboard. The auth skeleton, layout, and admin user management are fully operational.

### Phase 1 — Pages to Build
| Route | Who | Purpose |
|---|---|---|
| `/login` | Public | Email + password login |
| `/set-password` | Any auth | First-login forced password change |
| `/` | Any auth | Redirects to role-specific dashboard |
| `/admin/users` | SUPER_ADMIN | List all user accounts |
| `/admin/users/new` | SUPER_ADMIN | Create any user role |
| `/admin/users/[id]` | SUPER_ADMIN | Edit, deactivate, reset password |
| `/admin/settings` | SUPER_ADMIN | Clinic settings + all extensible lists |
| `/notifications` | All auth | Notification centre |

### Phase 1 — Sidebar Menu (role-based)
```typescript
const MENUS = {
  SUPER_ADMIN:      ["Dashboard(/admin)","Calendar","Patients","Lab Orders","Inventory","HR","Payroll","Reports","Users","Settings"],
  CLINIC_ADMIN:     ["Calendar","Patients","Lab Orders","Inventory","HR","My Payroll"],
  GENERAL_DOCTOR:   ["Calendar","Patients","Lab Orders","My Attendance","My Payroll"],
  ASSISTANT_DOCTOR: ["Calendar","Patients","Lab Orders","My Attendance","My Payroll"],
  RECEPTIONIST:     ["Calendar","Patients","Attendance"],
  LAB_TECHNICIAN:   ["Lab Orders(/portal/lab/orders)"],
  VENDOR:           ["Orders(/portal/vendor/orders)"],
};
```

### Phase 1 — Cloud Functions
```typescript
// functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp({ credential: admin.credential.cert(require("./service-account.json")) });
const db = admin.firestore();

// Shared notification helper
async function notifyUser(recipientId:string,type:string,title:string,body:string,relatedId:string|null,relatedType:string|null,clinicId?:string) {
  await db.collection("notifications").add({
    recipientUserId:recipientId, type, title, body, isRead:false,
    relatedEntityId:relatedId??null, relatedEntityType:relatedType??null,
    clinicId:clinicId??null, createdAt:admin.firestore.FieldValue.serverTimestamp(),
  });
}

// IST date helper for server
function toIST(date:Date):string {
  const ist = new Date(date.getTime()+5.5*60*60*1000);
  return ist.toISOString().split("T")[0];
}

// F1: Initialize SUPER_ADMIN (run ONCE after first deploy)
export const initializeSuperAdmin = functions.https.onCall(async(data,ctx)=>{
  const cfg = functions.config();
  if(data.secret!==cfg.admin?.secret) throw new functions.https.HttpsError("permission-denied","Bad secret");
  const {uid,name,email,phone} = data;
  await admin.auth().setCustomUserClaims(uid,{role:"SUPER_ADMIN",clinicIds:["clinic_a","clinic_b"],primaryClinicId:null,labId:null,vendorId:null});
  await db.collection("users").doc(uid).set({uid,name,email,phone,role:"SUPER_ADMIN",clinicIds:["clinic_a","clinic_b"],primaryClinicId:null,isActive:true,createdAt:admin.firestore.FieldValue.serverTimestamp(),createdBy:uid,labId:null,vendorId:null});
  return {success:true};
});

// F2: Create user account (SUPER_ADMIN only)
export const createUserAccount = functions.https.onCall(async(data,ctx)=>{
  if(ctx.auth?.token.role!=="SUPER_ADMIN") throw new functions.https.HttpsError("permission-denied","SUPER_ADMIN only");
  const {name,email,phone,role,primaryClinicId,clinicIds,labId,vendorId} = data;
  const tempPwd = `Dc${Math.random().toString(36).slice(-6)}1!`;
  const user = await admin.auth().createUser({email,password:tempPwd,displayName:name});
  await admin.auth().setCustomUserClaims(user.uid,{role,clinicIds,primaryClinicId:primaryClinicId??null,labId:labId??null,vendorId:vendorId??null});
  await db.collection("users").doc(user.uid).set({uid:user.uid,name,email,phone,role,primaryClinicId:primaryClinicId??null,clinicIds,isActive:true,createdAt:admin.firestore.FieldValue.serverTimestamp(),createdBy:ctx.auth!.uid,labId:labId??null,vendorId:vendorId??null});
  return {uid:user.uid,email,tempPassword:tempPwd};
});

// F3: Update role / deactivate
export const updateUserRole = functions.https.onCall(async(data,ctx)=>{
  if(ctx.auth?.token.role!=="SUPER_ADMIN") throw new functions.https.HttpsError("permission-denied","SUPER_ADMIN only");
  const {uid,role,clinicIds,primaryClinicId,isActive} = data;
  await admin.auth().setCustomUserClaims(uid,{role,clinicIds,primaryClinicId});
  await db.collection("users").doc(uid).update({role,clinicIds,primaryClinicId,isActive});
  return {success:true};
});

// F4: Generate patient ID (counter, server-side only)
export const generatePatientId = functions.https.onCall(async(_,ctx)=>{
  if(!["SUPER_ADMIN","CLINIC_ADMIN","GENERAL_DOCTOR","ASSISTANT_DOCTOR","RECEPTIONIST"].includes(ctx.auth?.token.role||""))
    throw new functions.https.HttpsError("permission-denied","Staff only");
  const ref = db.collection("counters").doc("patients");
  return db.runTransaction(async t=>{
    const snap=await t.get(ref); const next=(snap.data()?.count??0)+1;
    t.set(ref,{count:next},{merge:true});
    return `P-${String(next).padStart(5,"0")}`;
  });
});

// F5: Generate invoice number
export const generateInvoiceNumber = functions.https.onCall(async(_,ctx)=>{
  if(!ctx.auth?.uid) throw new functions.https.HttpsError("unauthenticated","Login required");
  const ref = db.collection("counters").doc("invoices");
  return db.runTransaction(async t=>{
    const snap=await t.get(ref); const next=(snap.data()?.count??0)+1;
    t.set(ref,{count:next},{merge:true});
    return `INV-${String(next).padStart(5,"0")}`;
  });
});

// F6: Generate receipt number (called when payment accepted)
export const generateReceiptNumber = functions.https.onCall(async(_,ctx)=>{
  if(!ctx.auth?.uid) throw new functions.https.HttpsError("unauthenticated","Login required");
  const ref = db.collection("counters").doc("receipts");
  return db.runTransaction(async t=>{
    const snap=await t.get(ref); const next=(snap.data()?.count??0)+1;
    t.set(ref,{count:next},{merge:true});
    return `RCP-${String(next).padStart(5,"0")}`;
  });
});
```

### Phase 1 — Seed Data (run once from admin settings page)
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
  {id:"cat_surgery",name:"SURGICAL",color:"#DC2626"},
  {id:"cat_bleaching",name:"BLEACHING",color:"#F59E0B"},
  {id:"cat_wisdom",name:"WISDOM TOOTH EXTRACTION",color:"#9F1239"},
  {id:"cat_none",name:"NO CATEGORY",color:"#6B7280"},
];
// Surgery types (for ₹1,500 referral incentive)
const SURGERY_TYPES = [
  {id:"surg_implants",name:"Dental Implants",isActive:true},
  {id:"surg_laser",name:"Laser Treatment",isActive:true},
  {id:"surg_whitening",name:"Tooth Whitening",isActive:true},
  {id:"surg_extraction",name:"Surgical Extraction",isActive:true},
  {id:"surg_alignment",name:"Tooth Alignment",isActive:true},
];
// Sunday incentive tasks
const SUNDAY_TASKS = [
  {id:"task_pre",name:"Pre-Sterilization",incentiveAmount:250,isActive:true},
  {id:"task_post",name:"Post-Sterilization",incentiveAmount:250,isActive:true},
];
// Counters
const COUNTERS = [
  {id:"patients",count:0},{id:"invoices",count:0},{id:"receipts",count:0},
];
// Procedures: run seedProceduresCatalog() from procedures_catalog_seed.ts
```

### Phase 1 → Phase 2 Connection
After Phase 1 every role can log in. The layout shell (sidebar, header, notification bell stub) is complete. All auth tokens with custom claims are working. Phase 2 builds the patient system on top of this auth foundation.

---

## PHASE 2 — PATIENT MANAGEMENT

**Goal:** Complete Practo-style patient management. Patient list with groups sidebar, registration form, full EMR, dental chart treatment plans, invoice & receipt system with payment acceptance.

### Phase 2 — Patient List Page (`/patients`)

**Layout (two panels):**
```
LEFT SIDEBAR (280px)              MAIN AREA (flex-1)
─────────────────                 ──────────────────────
[Switch to All Patients]          Search bar + Advanced Search
                                  [Patient cards grid - 4 per row]
Patients
  All Patients       19331        MASHAK          BABU S
  Recently Visited   ▓▓           Male            Male
  Recently Added                  +91…            +91…
                                  #18847          #M586
Groups
  My Groups   [Manage]
  ─────────────────
  WISDOM TOOTH  24               [KALYAN]  [ELAYARAJA D] ...
  ADAYAR        16
  RCT           14               [Get More Patients]
  EXTRACTION    11                (pagination cursor)
  KODAMBAKKAM    6
  ...more groups...
```

**Patient card** shows: avatar initials circle, patient name, gender, phone, patient ID `#18847`.

**Group sidebar behaviour:**
- Click group name → filters main area to patients in that group only
- Active group highlighted; breadcrumb shows "Patients > [Group]"
- "Manage" → opens modal to create / rename / delete groups
- Groups stored in `/patient_groups`. Patient assignment: `patient.groups` array.
- Each group shows count badge (denormalized `group.patientCount`).

**Search:** Searches name, phone, patient ID client-side (all patients loaded for clinic). For clinics with >5,000 patients, implement cursor-based pagination with `getDocs(query(..., limit(50), startAfter(cursor)))`.

### Phase 2 — Patient Registration Form

**Who can create patients:** All clinic staff including RECEPTIONIST.
Receptionist can fill: name, age/gender, phone, groups, assigned doctor, chief complaint (reason for visit).

**Complete field list:**
```
Patient Name*          Patient ID (auto — P-00001)
Gender: Male/Female    Date of Birth or Age
Blood Group (dropdown) Anniversary (optional)
Primary Phone*         Secondary Phone
Email                  Language Preference
Street Address         Locality        City

Referred By: [dropdown from /referral_sources + "Add New"]
             Options: Another Patient, Just Dial, Google, [clinic-added names]

Family Members: [+ Add] — select existing patient + relationship

Medical History: [checkbox list from /medical_conditions + "Add New"]
Other History: [free text]

Groups/Tags: [multi-select from /patient_groups + "Add New"]

Assigned Doctor: [dropdown of active doctors in this clinic]

[Print Patient Registration Form]  [Cancel]  [Save Patient]
```

Patient ID generated by calling Cloud Function F4 on form submit. All counter writes go through Cloud Functions — client never writes `/counters`.

### Phase 2 — Patient Profile Shell

**Left sub-sidebar tabs:**
```
Patient (section)      EMR (section)         Billing (section)
  Profile                Vital Signs             Invoices
  Appointments           Clinical Notes          Payments
  Communications         Treatment Plans
                         Completed Procedures
                         Files
                         Prescriptions
                         Timeline
```

**Header bar on every patient page:**
```
[MA] MOTHI AHAMED (18529)    ✉ Not available    📞 +919962563593
     Male • 48 Years    Total Due: ₹2,500 (shown in red if >0)
```

### Phase 2 — Dental Chart Component

**FDI Two-Digit Notation — exact layout:**
```
ADULT TEETH (toggle: [Adult] [Child])
Upper Right → Left:  18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28
Lower Right → Left:  48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38

CHILD TEETH (shown when "Show Child Teeth" tab/toggle active):
Upper:  55 54 53 52 51 | 61 62 63 64 65
Lower:  85 84 83 82 81 | 71 72 73 74 75

Checkboxes (mutually exclusive):
  ☐ Full Mouth          ☐ Multiply Cost (= ☐ Show Child Teeth embedded here too)
  [clear selection]
```

**Interaction rules:**
1. Teeth cells are clickable; selected = blue highlight.
2. "Multiply Cost" checked + N teeth selected → QTY auto-sets to N. `Total = N × unitCost − discount`.
3. "Full Mouth" checked → all adult teeth go blue. QTY becomes a free-entry spinner. `Total = QTY × unitCost`.
4. "Show Child Teeth" toggle reveals child tooth rows.
5. "clear selection" deselects all teeth.
6. [Done] button closes chart and commits the line item.

**The DentalChart component is used in TWO places:**
- Inside TreatmentPlanForm (for treatment plans)
- Inside TreatmentRow in the Invoice form (the "add teeth" link in billing)

### Phase 2 — Invoice & Receipt System

**This is the primary billing interface. It is accessed from:**
1. `/patients/[id]/billing/invoices/new?appointmentId=[id]` — from "Collect Payment" on calendar
2. `/patients/[id]/billing/invoices/new` — directly from patient billing tab
3. Existing invoice: `/patients/[id]/billing/invoices/[invoiceId]`

**Invoice page layout (from Practo screenshots):**
```
● Invoice & Receipt ─────────────────────── Print Invoice & Receipt ●

[MA] MOTHI AHAMED (18529)     ✉ email    📞 phone
Appointment with Dr. [Name] on [date] at [time] for [duration]

─────────────────────────────────────────────────────────────────────
Invoice  (Invoice No. will be auto generated)  [edit]   ⓘ Share Off

TREATMENTS (N)     UNIT   COST (₹)   DISCOUNT         TAX      TOTAL (₹)
┌──────────────────────────────────────────────────────────────────────┐
│[Procedure Name] add teeth │[1]│[    0   ]│[0][%▼]  │[None▼]│ 0.00 [✕]│
│                            ₹ 0.00 discount  │  ₹ 0.00 tax           │
└──────────────────────────────────────────────────────────────────────┘
[🔍 Search and add items                                 ]

                  TOTAL COST (₹)  TOTAL DISCOUNT (₹)  TOTAL TAX (₹)  GRAND TOTAL (₹)
                       0.00            0.00 [edit]          0.00 [edit]      0.00
─────────────────────────────────────────────────────────────────────
Payment  (Receipt No. will be auto generated)  [edit]

                    PAYABLE (₹)    FROM ADVANCE (₹)    PAY NOW (₹)
                        0.00             0.00            [   0   ]

  Mode: [Cash ●] [Card] [Online: GPay / Paytm / Debit / Credit]

                                        [Cancel]  [Accept Payment]
```

**Treatment row fields:**
- Procedure name (text input or selected from catalog search)
- "add teeth" link — opens DentalChart as popover/modal inline
- Unit (qty spinner)
- Cost per unit (₹ input, pre-filled from procedures catalog default)
- Discount: amount input + % / ₹ toggle
  - % mode: discount₹ = (unit × cost) × (input / 100)
  - ₹ mode: discount₹ = input directly
- Tax: None | 5% | 12% | 18% dropdown
  - taxAmount = (lineSubtotal - discount) × (rate / 100)
- Line Total = (unit × cost) - discount + taxAmount
- [✕] remove row button

**"Search and add items" bar:**
Full-text search across /procedures_catalog (client-side filter on loaded catalog).
Shows dropdown: procedure name + default price.
Clicking adds a new treatment row with that default price pre-filled.

**Total row calculations:**
- TOTAL COST = Σ (unit × cost) for all rows
- TOTAL DISCOUNT = Σ discounts (overrideable via [edit] button — sets a fixed discount on total)
- TOTAL TAX = Σ taxAmounts (overrideable via [edit] button)
- GRAND TOTAL = TOTAL COST - TOTAL DISCOUNT + TOTAL TAX

**Payment section:**
- PAYABLE = GRAND TOTAL (read-only, auto-calculated)
- FROM ADVANCE = patient.advanceBalance (read-only, fetched from patient doc)
- PAY NOW = manual input (can be partial)
- If PAY NOW > PAYABLE: excess added to patient.advanceBalance after acceptance
- If FROM ADVANCE > 0 and PAY NOW < PAYABLE: advance used = min(FROM ADVANCE, PAYABLE-PAY NOW)

**"Accept Payment" action:**
1. Validate PAY NOW > 0
2. Call Cloud Function F6 → get receipt number
3. Lock payment entry (isVoided: false, cannot be edited from UI)
4. Update patient.totalPaid, patient.totalDue, patient.advanceBalance
5. Update visit.totalPaid, visit.totalDue
6. Open print dialog (or show "Print" button)

**Payment locking rule:** Once `Accept Payment` is clicked, the payment entry is permanently locked.
Only SUPER_ADMIN can approve a correction via `/admin/payment-corrections`.

**Print Invoice & Receipt:**
Opens `/patients/[id]/billing/invoices/[id]/print` in a new tab or print-formatted modal containing:
```
[Clinic Name]              Invoice: INV-00001
[Clinic Address]           Receipt: RCP-00001
[Clinic Phone]             Date: 11 Aug 2025
──────────────────────
Patient: Mothi Ahamed (18529) | Phone: +91...
──────────────────────
TREATMENT                QTY    COST    DISC    TAX     TOTAL
Consultation And Treatme   1    300      0        0     300.00
──────────────────────
             Total Cost:  300.00
          Total Discount:   0.00
               Total Tax:   0.00
             Grand Total:  300.00
────────
                 Paid: ₹300.00 (Cash)
           Balance Due: ₹0.00
────────
Dr. Signature: ________________
```

### Phase 2 — Cloud Functions for Payment
```typescript
// F7: Approve Payment Correction (SUPER_ADMIN only, callable)
export const approvePaymentCorrection = functions.https.onCall(async(data,ctx)=>{
  if(ctx.auth?.token.role!=="SUPER_ADMIN") throw new functions.https.HttpsError("permission-denied","SUPER_ADMIN only");
  const {correctionId,reviewNotes,approved} = data;
  const corrRef=db.collection("payment_corrections").doc(correctionId);
  const corr=(await corrRef.get()).data()!;
  if(approved){
    const visitRef=db.collection("visits").doc(corr.visitId);
    await db.runTransaction(async t=>{
      const visit=(await t.get(visitRef)).data()!;
      const updated=visit.payments.map((p:any)=>
        p.paymentId===corr.originalPaymentId
          ?{...p,isVoided:true,voidedBy:ctx.auth!.uid,voidedAt:admin.firestore.Timestamp.now(),correctionRequestId:correctionId}:p
      );
      updated.push({paymentId:db.collection("_").doc().id,amount:corr.requestedAmount,mode:corr.originalMode,date:corr.originalDate,recordedBy:corr.requestedBy,recordedByName:corr.requestedByName,isVoided:false,voidedBy:null,voidedAt:null,correctionRequestId:correctionId});
      const newPaid=updated.filter((p:any)=>!p.isVoided).reduce((s:number,p:any)=>s+p.amount,0);
      t.update(visitRef,{payments:updated,totalPaid:newPaid,totalDue:visit.grandTotal-newPaid});
      t.update(db.collection("patients").doc(corr.patientId),{
        totalPaid:admin.firestore.FieldValue.increment(corr.requestedAmount-corr.originalAmount),
        totalDue:admin.firestore.FieldValue.increment(corr.originalAmount-corr.requestedAmount),
      });
      t.update(corrRef,{status:"APPROVED",reviewedBy:ctx.auth!.uid,reviewedAt:admin.firestore.FieldValue.serverTimestamp(),reviewNotes});
    });
  }else{
    await corrRef.update({status:"REJECTED",reviewedBy:ctx.auth!.uid,reviewedAt:admin.firestore.FieldValue.serverTimestamp(),reviewNotes});
  }
  await notifyUser(corr.requestedBy,approved?"PAYMENT_CORRECTION_APPROVED":"PAYMENT_CORRECTION_REJECTED",
    approved?"Payment correction approved":"Payment correction rejected",
    approved?`Correction for ${corr.patientName}: ₹${corr.requestedAmount} approved.`:`Correction rejected: ${reviewNotes}`,
    correctionId,"payment_correction");
  return {success:true};
});
```

### Phase 2 — Phase-End Checklist
```
☐ Patient ID P-00001 generated by Cloud Function (never client-side)
☐ Dental chart renders FDI notation correctly — adult and child rows
☐ Multiply Cost: selecting 3 teeth sets QTY=3 automatically
☐ Full Mouth: all teeth selected, QTY is manually editable
☐ Invoice search bar finds procedures from /procedures_catalog
☐ Discount % and ₹ toggle works correctly
☐ "Accept Payment" locks payment entry permanently
☐ FROM ADVANCE deducts from patient.advanceBalance
☐ Receipt number generated by Cloud Function F6
☐ Print page renders correctly
☐ Groups sidebar shows with patient counts
☐ Filtering by group shows only patients in that group
☐ "Manage" modal allows create/rename/delete groups
```

---

## PHASE 3 — CALENDAR & APPOINTMENTS

**Goal:** Full appointment calendar with click-on-block patient popover, safe slot-booking, walk-in appointments, 2-tab creation modal (Appointment + Reminder), and Collect Payment flow.

### Phase 3 — Calendar Page Layout

**Header:** Clinic name dropdown (SUPER_ADMIN only) | Date navigation ← 5–10 Aug 2026 → | [Today] [Day][Week][Month] | [Settings▼]

**Left sidebar:**
```
[↩]
DOCTORS
  All Doctors        44
  ● Dr. A             11
  ● Dr. B              7
  ● Dr. C (you)        4
  ...

CATEGORIES
  [Edit]
  ● CONSULTATION
  ● CORE FILLING
  ● EXTRACTION
  ...
```

**Main calendar:** FullCalendar with timegrid/week view by default. Appointment blocks colour-coded by category. Each block shows patient name + time.

**Right panel — Today's Schedule:**
```
TODAY  WAITING  ENGAGED  DONE
  23      0        0       22

10:00  SAJIDA D         🟢
       Visit reason not specified
       Dr. S.M.AMEERDEEN (Kodambakkam)- here, the doctor's name Amiruddin is given. For example, the corresponding doctor's name, along with the clinic name if available, should be present. It is common for all the doctors' names that are given here. It is just for example. On the corresponding space, the doctor's name which is selected or which is available should be present. 

10:30  MOHAMMED IDRIS   🟢
       FILLING
       ...
```

### Phase 3 — Appointment Block Popover (click on any block)

```
┌──────────────────────────────────────────┐
│ [MA]  MOTHI AHAMED          [□] [✏] [✕] │
│       18529                              │
│       Male • 48 Years                   │
│       Show Balance ↗                    │
│                                          │
│  📞 +919962563593, +919884093391         │
│  ✉  Not available                        │
│  📍 Not available                        │
│  🏷  Token: Not available                │
│                                          │
│  🏠 In-Clinic Appointment  [No Show]     │
│     with Dr. S.M.Ameerdeen (...)         │ -- Here, the doctor name is given just for example. On the place, the corresponding doctor name who has been selected for the corresponding appointment should be available. 
│     at 6:00 PM for 30 mins              │
│                                          │
│              [Collect Payment →]         │
└──────────────────────────────────────────┘
```

- **□** = Duplicate appointment (same patient, new booking)
- **✏** = Edit this appointment (opens modal pre-filled)
- **✕** = Close popover
- **Show Balance** = inline expand showing patient.totalPaid / patient.totalDue
- **No Show** = one-click sets appointment status to NO_SHOW
- **Collect Payment** = navigates to `/patients/{id}/billing/invoices/new?appointmentId={id}`

### Phase 3 — 2-Tab Appointment Creation Modal

**Opened by:** "Add Walk-in Appointment" button (top-right of calendar) OR clicking empty time slot on calendar.

**Tab 1: Appointment**
```
ABHA ID:      [___________________]  [Get Patient Details]
Token No.:    [___________________]  [Get Patient Details]

Patient Name*  [searchable — existing or new]
Patient ID*    [P-00001  (auto-filled from search)]
Mobile No.     [_______________________]
Email ID       [_______________________]

Doctor         [Dr.S.M.AMEERDEEN (K)     ▼] - here, the doctor's name Amiruddin is given. For example, the corresponding doctor's name, along with the clinic name if available, should be present. It is common for all the doctors' names that are given here. It is just for example. On the corresponding space, the doctor's name which is selected or which is available should be present. 
Category       [Select Category           ▼]

Scheduled On   [08-08-2026 📅]  at [HH:MM]  for [30 min ▼]
               ⚠ Outside doctor's timings.   (warning only, not blocking)

Planned Procedures [_______________________________]
Notes              [_______________________________]

                        [Cancel]  [Save]
```

**Patient Name field:** Live search against `/patients`. Selecting fills Patient ID, Mobile, Email.
New patient (no match): fields stay empty, appointment saved with just name + phone.

**ABHA ID:** Ayushman Bharat Health Account ID. Optional. "Get Patient Details" queries `/patients` where `abhaId == input`.

**Token No.:** Walk-in queue token. "Get Patient Details" queries `/tokens` for today's token.

**Category dropdown options:**
Consultation | Extraction | Filling | Scaling | RCT | Wisdom Tooth Extraction | Ortho | Implant | Bleaching | Surgical | No Category (+ admin-added categories)

**Duration:** 15 min | 30 min | 45 min | 1 hour | 1.5 hours | 2 hours

**"Outside doctor's timings" warning:** Compares scheduled time against `clinics/{id}/settings.workingHours {start:"09:00",end:"20:00"}`. Shows orange warning text. Does NOT block save.

**Tab 2: Reminder**
```
ℹ You can add a reminder to your calendar.

Reminder Title*  [_________________________]
Doctor*          [All Doctors              ▼]

Duration*   ● All Day    ○ Custom

Date & Time*  [08-08-2026 📅]  [07:39 AM]

                        [Cancel]  [Save]
```

Reminders go to `/reminders`. If "All Doctors" → `doctorId: null`. Shown on calendar for all matching doctors.

### Phase 3 — Double-Booking Prevention (Slot Lock)

**Pattern:** Deterministic slot document `appointment_slots/{doctorId}_{yyyyMMdd}_{HHmm}`.

```typescript
function slotKey(doctorId:string, date:Date):string {
  // Use IST helpers
  const d = toISTDateString(date).replace(/-/g,"");      // "20250811"
  const t = toISTTimeHHMM(date);                          // "1800"
  return `${doctorId}_${d}_${t}`;
}

export async function bookAppointmentSafe(appt: NewAppointment): Promise<string> {
  const slotRef = doc(db,"appointment_slots",slotKey(appt.doctorId, appt.appointmentDate.toDate()));
  const apptRef = doc(collection(db,"appointments"));

  await runTransaction(db, async t => {
    const slot = await t.get(slotRef);
    if(slot.exists()) throw new Error("SLOT_TAKEN");
    t.set(slotRef,{doctorId:appt.doctorId,appointmentId:apptRef.id,bookedAt:serverTimestamp()});
    t.set(apptRef,{...appt, appointmentId:apptRef.id, createdAt:serverTimestamp()});
  });
  return apptRef.id;
}
```

If "SLOT_TAKEN" error thrown: show toast "This slot was just booked. Please choose another time."

### Phase 3 — Walk-in Token System

Walk-in patients are issued a queue token for the day.
```typescript
// Token ID: "{clinicId}_{yyyyMMdd}_{sequenceNumber}"
// Counter: /counters/tokens_{clinicId}_{dateString}
// Each new clinic day, counter resets automatically (key contains date)
// Token format: "T-001", "T-002"
```

"Issue Token" button at reception → calls Cloud Function → returns token number → shown on Today's Schedule.

### Phase 3 — Phase-End Checklist
```
☐ Calendar shows Week view with appointments colour-coded by category
☐ Doctor filter in sidebar works correctly
☐ Clicking appointment block shows popover with all patient details
☐ "Collect Payment" on popover navigates to correct invoice URL
☐ "No Show" button changes status immediately
☐ Appointment modal opens with Tab 1 (Appointment) active
☐ Patient name search shows existing patients as dropdown
☐ ABHA ID and Token lookup fetch correct patient
☐ "Outside doctor's timings" warning appears (not error) for off-hours
☐ Double-booking test: two concurrent bookings for same slot — only one succeeds
☐ Reminder saves to /reminders and shows on calendar
☐ "All Doctors" reminder appears on all doctors' calendars
☐ Walk-in token issued correctly (T-001, T-002...)
```

---
