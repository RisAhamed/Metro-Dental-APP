# DENTAL CLINIC SaaS — V3 ADDITIONS & UPDATES
### New requirements from Practo screenshots, invoice images, and procedures catalog.
### Read this alongside MASTER_BLUEPRINT_V2.md. Together they form the complete spec.

---

## NEW IN V3 — WHAT CHANGED FROM V2

| Area | What's New |
|---|---|
| Invoice & Receipt | Full invoice with per-line tax, discount, dental chart in invoice, payment acceptance, print |
| Patient Advance | Track advance payments per patient; deduct from invoice |
| Calendar Popover | Clicking appointment block shows mini patient card with Collect Payment button |
| Appointment Modal | 2-tab modal (Appointment + Reminder); ABHA ID, token, "outside timings" warning |
| Reminder System | Calendar reminders (not appointments) with title, doctor, all-day or custom duration |
| Patient Groups | Left sidebar in patient list with group filter and count badges |
| Invoice Numbers | Auto-generated Invoice No. (INV-00001) and Receipt No. (RCP-00001) |
| Procedures Catalog | 300+ seeded items with default prices (see procedures_catalog_seed.ts) |
| Token System | Patients get a walk-in token number; used in appointment search |

---

## SECTION A — INVOICE & RECEIPT SYSTEM (Updates Phase 2)

### A.1 Invoice Schema Changes (updates /visits/{visitId})

```typescript
// Add these fields to the Visit interface and Firestore document
interface InvoiceData {
  invoiceNumber:  string;      // "INV-00001" — auto-generated
  receiptNumber:  string|null; // "RCP-00001" — generated when payment accepted
  shareEnabled:   boolean;     // Share Off/On toggle
  treatments: Array<{
    treatmentId:    string;
    procedureName:  string;
    unit:           number;     // quantity (from dental chart selection or manual)
    costPerUnit:    number;     // ₹ cost per unit
    discountValue:  number;     // actual ₹ discount applied
    discountType:   "PERCENT"|"FIXED"; // whether input was % or ₹
    discountInput:  number;     // the raw input (e.g. 10 for 10%)
    taxRate:        number;     // 0 for None, 5, 12, 18 for GST percentages
    taxAmount:      number;     // calculated ₹ tax amount
    lineTotal:      number;     // (unit × cost) − discount + tax
    toothNumbers:   number[]|null;
    isFullMouth:    boolean;
    isMultiplyCost: boolean;
    notes:          string|null;
  }>;
  totalCost:          number;  // sum of (unit × cost) for all lines
  totalDiscountFixed: number;  // sum of all line discounts (can be overridden)
  totalTaxFixed:      number;  // sum of all line taxes (can be overridden)
  grandTotal:         number;  // totalCost − totalDiscountFixed + totalTaxFixed
  advanceUsed:        number;  // amount deducted from patient advance balance
  payNow:             number;  // actual amount collected this session
}
```

**Invoice number counters** — add to /counters collection:
```
/counters/invoices → { count: 0 }
/counters/receipts → { count: 0 }
```
Both generated via Cloud Function (same pattern as patient ID generation).

### A.2 Invoice Page Layout (matches Practo screenshots exactly)

```
─── Header ──────────────────────────────────────────────────────────
  ● Invoice & Receipt ─────────────────────── Print Invoice & Receipt ●
  [MA] MOTHI AHAMED (18529)      ✉ Not available    📞 +919962563593
  Appointment with Dr. S.M.AMEERDEEN (Mylapore) on 11th Aug, 6:00 PM
─── Invoice Section ─────────────────────────────────────────────────
  Invoice  (Invoice No. will be auto generated)  [edit]   Share Off ↔

  TREATMENTS (N)   UNIT   COST (₹)   DISCOUNT        TAX        TOTAL (₹)
  ┌────────────────────────────────────────────────────────────────────┐
  │ [Procedure Name]  add teeth  │ [1] │ [  0  ] │ [0] [%▼] │ [None▼] │  0.00  [✕]
  │                               ₹ 0.00 (discount) │  ₹ 0.00 (tax) │
  └────────────────────────────────────────────────────────────────────┘
  [🔍 Search and add items                              ]

  ─── Totals ────────────────────────────────────────────────────────────
  TOTAL COST (₹)   TOTAL DISCOUNT (₹)   TOTAL TAX (₹)   GRAND TOTAL (₹)
      0.00              0.00  [edit]         0.00  [edit]       0.00
  ────────────────────────────────────────────────────────────────────────

─── Payment Section ──────────────────────────────────────────────────
  Payment  (Receipt No. will be auto generated)  [edit]

               PAYABLE (₹)    FROM ADVANCE (₹)    PAY NOW (₹)
                   0.00             0.00            [  0  ]

  Payment Mode: [Cash] [Card] [Online]
  If Online:    [GPay] [Google Pay] [Paytm] [Debit] [Credit] [Other]

                              [Cancel]    [Accept Payment]
```

### A.3 Invoice Interaction Rules

**"add teeth" link:** Opens the FDI dental chart popup inside the invoice row.
Tooth selection fills the Unit field (Multiply Cost) or marks as Full Mouth.

**Discount field:** Has a % / ₹ toggle button next to it.
- % mode: input 10 → discount = 10% of (unit × cost)
- ₹ mode: input 500 → discount = ₹500 flat

**Tax dropdown:** Options are None | 5% | 12% | 18%
- Most dental procedures = None (medical services exempt)
- Products like toothpaste may have 18% GST

**Total Discount [edit] button:** Overrides the sum of all line discounts with a single fixed amount.
**Total Tax [edit] button:** Overrides sum of all line taxes.

**Search and add items:** Full-text search across /procedures_catalog.
Matching items show as dropdown: name + default price.
Clicking adds a new treatment row with that default price pre-filled.

**PAYABLE:** = Grand Total (auto-calculated, read-only)
**FROM ADVANCE:** = patient's advance balance (auto-fetched from patient document, read-only)
**PAY NOW:** Manual input. Can be less than Payable (partial payment).

**Accept Payment:**
1. Validates PAY NOW > 0
2. Generates Receipt No. (Cloud Function)
3. Creates locked payment entry in visit.payments array
4. Deducts FROM ADVANCE from patient.advanceBalance
5. Updates patient.totalPaid and patient.totalDue
6. Shows print dialog OR opens print preview

**Print Invoice & Receipt button (top right):**
Opens a print-formatted page containing:
- Clinic name, address, phone
- Invoice No., Receipt No., Date
- Patient name, ID, phone
- Table of treatments (name, unit, cost, discount, tax, total)
- Total Cost, Total Discount, Total Tax, Grand Total
- Amount Paid, Payment Mode, Amount Due

### A.4 Patient Advance Balance

Add to Patient schema:
```typescript
advanceBalance: number; // default 0 — running total of excess payments
```

When PAY NOW > PAYABLE in an invoice:
→ excess amount added to patient.advanceBalance

When PAY NOW < PAYABLE and FROM ADVANCE > 0:
→ advance used = min(FROM ADVANCE, PAYABLE − PAY NOW)
→ patient.advanceBalance decremented by advanceUsed

---

## SECTION B — CALENDAR APPOINTMENT POPOVER (Updates Phase 3)

### B.1 Clicking an Appointment Block

When staff clicks any appointment block on the calendar, a popover card appears:

```
┌─────────────────────────────────────────────┐
│  [MA]  MOTHI AHAMED              [□][✏][✕]  │
│        18529                                 │
│        Male • 48 Years                       │
│        Show Balance                          │
│                                             │
│  📞 +919962563593, +919884093391            │
│  ✉  Not available                           │
│  📍 Not available                            │
│  🏷  Token: Not available                   │
│                                             │
│  🏠 In-Clinic Appointment    [No Show]      │
│     with S.M.AMEERDEEN (...)                │
│     at 6:00 PM for 30 mins                  │
│                                             │
│              [Collect Payment  →]           │
└─────────────────────────────────────────────┘
```

**Popover icons (top-right):**
- □ = Duplicate appointment (create new with same patient)
- ✏ = Edit appointment
- ✕ = Close popover

**"Show Balance" link:** Shows a small inline section with patient.totalPaid and patient.totalDue.

**"No Show" button:** Changes appointment status to NO_SHOW. One-click, no confirmation needed.

**"Collect Payment" button (orange):**
Navigates to: `/patients/{patientId}/billing/invoices/new?appointmentId={appointmentId}`
Pre-fills the invoice with the appointment details.

### B.2 Calendar Block Colours
Each appointment block is coloured by category (not by doctor).
Doctor is indicated by a small coloured dot on the block or in the left sidebar filter.

---

## SECTION C — 2-TAB APPOINTMENT MODAL (Updates Phase 3)

### C.1 Appointment Tab Fields

```
┌──────────────────────────────────────────────────────┐
│  [Appointment]  [Reminder]                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ABHA ID: [___________________] [Get Patient Details]│
│  Token No:[___________________] [Get Patient Details]│
│                                                      │
│  Patient Name*  [_____________________]              │
│  Patient ID*    [_____ (auto-filled) _]              │
│  Mobile No.     [_____________________]              │
│  Email ID       [_____________________]              │
│                                                      │
│  Doctor         [Dr.S.M.AMEERDEEN (K)  ▼]    --corresponding Doctors name should be  displayed here        │
│  Category       [Select Category       ▼]            │
│                                                      │
│  Scheduled On   [08-08-2026 📅] at [HH:MM] for [30 ▼]│
│  ⚠ Outside doctor's timings.                        │
│                                                      │
│  Planned Procedures  [_________________________]     │
│  Notes               [_________________________]     │
│                                                      │
│                      [Cancel]   [Save]               │
└──────────────────────────────────────────────────────┘
```

**Patient Name field:** Searchable — typing shows dropdown of existing patients.
Selecting an existing patient auto-fills Patient ID, Mobile, Email.
If no match: patient is treated as a new walk-in (name saved but patient record not yet created).

**ABHA ID:** Ayushman Bharat Health Account ID (Indian national health ID).
Optional field. "Get Patient Details" fetches patient data from local DB if ABHA ID is stored on patient record.

**Token Number:** Walk-in queue token assigned at reception.
Each walk-in gets a token for the day (T-001, T-002, ...).
"Get Patient Details" fetches patient linked to that token.

**Category dropdown options (pre-seeded, extendable by admin):**
Consultation | Extraction | Filling | Scaling | RCT | Wisdom Tooth Extraction |
Ortho | Implant | Bleaching | Surgical | No Category

**"Outside doctor's timings" warning:**
If scheduled time is outside the clinic's working hours (from /clinics/{id}/settings):
Show orange warning text. Booking is NOT blocked — it's a warning only.

**Doctor working hours:** Store in clinic settings as:
```typescript
workingHours: { start: "09:00", end: "20:00" } // 9 AM to 8 PM
```

**Duration dropdown:** 15 min | 30 min | 45 min | 1 hour | 1.5 hours | 2 hours

### C.2 Reminder Tab Fields

```
┌──────────────────────────────────────────────────────┐
│  [Appointment]  [Reminder]                           │
├──────────────────────────────────────────────────────┤
│  ℹ You can add a reminder to your calendar           │
│                                                      │
│  Reminder Title*  [________________________]         │
│  Doctor*          [All Doctors             ▼]        │
│                                                      │
│  Duration*   ● All Day   ○ Custom                   │
│                                                      │
│  Date & Time*   [08-08-2026 📅]  [07:39 AM]         │
│                                                      │
│                      [Cancel]   [Save]               │
└──────────────────────────────────────────────────────┘
```

**Reminder vs Appointment:** A reminder is a calendar block (not tied to a patient).
Used for: staff meetings, clinic closures, supply deliveries, etc.
Stored in /reminders collection (separate from /appointments).

**"All Doctors" option:** Reminder shows on all doctors' calendars simultaneously.

### C.3 Reminders Collection

```typescript
// /reminders/{reminderId}
interface Reminder {
  reminderId:   string;
  clinicId:     ClinicId;
  title:        string;
  doctorId:     string|null; // null = All Doctors
  doctorName:   string|null;
  isAllDay:     boolean;
  startDate:    Timestamp;
  endDate:      Timestamp;   // same as startDate for non-all-day
  createdBy:    string;
  createdAt:    Timestamp;
}
```

Firestore rule:
```javascript
match /reminders/{id} {
  allow read: if isStaff() && inClinic(resource.data.clinicId);
  allow create, update: if isStaff() && inClinic(request.resource.data.clinicId);
  allow delete: if isAdmin();
}
```

---

## SECTION D — TOKEN SYSTEM (Updates Phase 3)

Walk-in patients receive a queue token for the day.

```typescript
// /tokens/{tokenId}
// tokenId = "{clinicId}_{yyyyMMdd}_{tokenNumber}"
interface Token {
  tokenId:     string;        // e.g. "clinic_a_20250808_001"
  clinicId:    ClinicId;
  date:        Timestamp;
  dateString:  string;        // "2025-08-08"
  tokenNumber: string;        // "T-001", "T-002"
  patientId:   string|null;   // linked when patient is identified
  patientName: string|null;
  assignedAt:  Timestamp;
  assignedBy:  string;
}

// Counter for tokens per day per clinic:
// /counters/tokens_{clinicId}_{dateString} → { count: 0 }
// Reset each new day automatically
```

Tokens are issued from the reception → "Add Walk-in" → "Issue Token" button (optional flow).

---

## SECTION E — PATIENT GROUPS SIDEBAR (Updates Phase 2)

### E.1 Patient List Page Layout with Groups

```
Left Sidebar                    | Main Area (Patient Cards Grid)
───────────────────────────────────────────────────────────────
[Switch to All Patients]         MASHAK          BABU S
                                 Male            Male
or [Search Patient Name/ID/Phone]  +919042198890   +919841717132
                                 #18847          #M586
Patients
  All Patients        19331      KALYAN          ELAYARAJA D
  Recently Visited    ████       Male            Male
  Recently Added               ...
                                [Get More Patients]
Groups
  My Groups           [Manage]

  WISDOM TOOTH           24
  ADAYAR                 16
  RCT                    14
  EXTRACTION             11
  KODAMBAKKAM             6
  FA                      4
  ...
  [Show All]
```

### E.2 Group Interaction

**Click on a group:** Filters the main patient cards to only show patients in that group.
The selected group is highlighted in the sidebar.
Breadcrumb shows: Patients > [Group Name]

**"Manage" button:** Opens a modal:
```
─── Manage Groups ──────────────────────────
[+ New Group]

WISDOM TOOTH EXTRACTION   [✏ Rename] [🗑 Delete]
ADAYAR                    [✏ Rename] [🗑 Delete]
RCT                       [✏ Rename] [🗑 Delete]
...
────────────────────────────────────────────
```

**Delete group:** Only deletes the group name — does NOT delete the patients. Patients lose that tag.

**Adding patient to a group:** On the patient registration form or patient profile edit,
a multi-select dropdown shows all groups + "Add New Group" option.

### E.3 Groups Firestore
```typescript
// /patient_groups/{groupId}
interface PatientGroup {
  groupId:    string;
  name:       string;
  clinicId:   ClinicId|null; // null = global (both clinics)
  createdBy:  string;
  createdAt:  Timestamp;
  patientCount: number;      // denormalized count (updated when patients are assigned/removed)
}
```

When assigning a patient to a group: update `patient.groups` array AND increment `group.patientCount`.
When removing: decrement `group.patientCount`.

---

## SECTION F — INVOICE NUMBERS (Cloud Functions)

```typescript
// Add to functions/src/index.ts

// F-NEW-1: Generate Invoice Number
export const generateInvoiceNumber = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token.role) throw new functions.https.HttpsError("unauthenticated","Login required");
  const counterRef = db.collection("counters").doc("invoices");
  return db.runTransaction(async (t) => {
    const snap = await t.get(counterRef);
    const next = (snap.data()?.count ?? 0) + 1;
    t.set(counterRef, { count: next }, { merge: true });
    return `INV-${String(next).padStart(5,"0")}`;
  });
});

// F-NEW-2: Generate Receipt Number (called when payment is accepted)
export const generateReceiptNumber = functions.https.onCall(async (data, context) => {
  if (!context.auth?.token.role) throw new functions.https.HttpsError("unauthenticated","Login required");
  const counterRef = db.collection("counters").doc("receipts");
  return db.runTransaction(async (t) => {
    const snap = await t.get(counterRef);
    const next = (snap.data()?.count ?? 0) + 1;
    t.set(counterRef, { count: next }, { merge: true });
    return `RCP-${String(next).padStart(5,"0")}`;
  });
});
```

---

## SECTION G — PROCEDURES CATALOG SEED DATA

The procedures catalog should be seeded on first deploy.
See the companion file: `procedures_catalog_seed.ts`

This file exports a TypeScript array of ~300 procedures that can be written to
`/procedures_catalog` collection via a one-time seeding script or from the admin settings page.

### G.1 Seeding Script (run once from admin settings)

```typescript
// src/lib/seed/seedProcedures.ts
import { writeBatch, collection, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PROCEDURES_CATALOG } from "./procedures_catalog_seed";

export async function seedProceduresCatalog() {
  const batches = [];
  let batch = writeBatch(db);
  let count = 0;

  for (const proc of PROCEDURES_CATALOG) {
    const ref = doc(collection(db, "procedures_catalog"));
    batch.set(ref, {
      procedureId: ref.id,
      name: proc.name,
      defaultCost: proc.cost,
      category: proc.category,
      isActive: true,
      createdAt: new Date(),
      createdBy: "SYSTEM",
    });
    count++;
    if (count % 499 === 0) {
      batches.push(batch.commit());
      batch = writeBatch(db);
    }
  }
  batches.push(batch.commit());
  await Promise.all(batches);
}
```

---

## SECTION H — UPDATED PHASES WITH NEW REQUIREMENTS

### Phase 2 Updates — New Pages and Components

**New pages:**
| Route | Description |
|---|---|
| `/patients/{id}/billing/invoices/new` | Create invoice (linked to appointment) |
| `/patients/{id}/billing/invoices/{invoiceId}` | View/print existing invoice |
| `/patients/{id}/billing/invoices/{invoiceId}/print` | Print-formatted invoice + receipt |

**New components:**
| Component | Location | Purpose |
|---|---|---|
| `InvoiceForm.tsx` | components/billing/ | Full invoice with treatment table |
| `TreatmentRow.tsx` | components/billing/ | Single line item with dental chart trigger |
| `PaymentAcceptance.tsx` | components/billing/ | Pay Now + mode + Accept Payment |
| `InvoicePrint.tsx` | components/billing/ | Print-formatted output |
| `GroupsSidebar.tsx` | components/patients/ | Left sidebar with group filter |
| `GroupManageModal.tsx` | components/patients/ | Create/rename/delete groups |

### Phase 3 Updates — New Pages and Components

**New components:**
| Component | Location | Purpose |
|---|---|---|
| `AppointmentPopover.tsx` | components/calendar/ | Click-on-block mini patient card |
| `AppointmentModal.tsx` | components/calendar/ | 2-tab modal (Appointment + Reminder) |
| `ReminderForm.tsx` | components/calendar/ | Reminder creation within modal |
| `TokenBadge.tsx` | components/calendar/ | Display token number on appointment |

**Updated calendar features:**
- Clicking appointment block → shows `AppointmentPopover` with Collect Payment button
- "Add Walk-in Appointment" → opens `AppointmentModal` with Appointment tab active
- "Add Reminder" option in calendar header → opens `AppointmentModal` with Reminder tab active

---

## SECTION I — UPDATED DEPLOYMENT CHECKLIST ADDITIONS

```
PHASE 2 NEW CHECKS:
  ☐ Invoice creation generates correct INV-00001 numbers (Cloud Function)
  ☐ Receipt numbers generate on payment acceptance (RCP-00001)
  ☐ Dental chart opens within invoice treatment row (not separate modal)
  ☐ Discount % toggle works correctly (10% of cost vs ₹10 flat)
  ☐ Tax dropdown defaults to None for all procedures
  ☐ Total Discount [edit] overrides per-line sum correctly
  ☐ "Accept Payment" creates locked payment + decrements advance balance
  ☐ Print view renders correctly in browser print dialog
  ☐ Patient groups sidebar shows with correct patient counts
  ☐ Filtering by group shows only patients in that group
  ☐ Procedures catalog seeded (300+ items searchable in invoice)
  ☐ Adding new treatment from search shows correct default price

PHASE 3 NEW CHECKS:
  ☐ Clicking appointment block shows popover with patient details
  ☐ "Collect Payment" on popover navigates to invoice correctly
  ☐ "No Show" button changes status correctly and updates popover
  ☐ 2-tab appointment modal opens with Appointment tab active by default
  ☐ ABHA ID "Get Patient Details" button works (searches by ABHA field)
  ☐ Token number "Get Patient Details" button works
  ☐ "Outside doctor's timings" warning appears (not error) for off-hours
  ☐ Reminder saves to /reminders collection and appears on calendar
  ☐ "All Doctors" reminder shows on all doctors' calendars
```
