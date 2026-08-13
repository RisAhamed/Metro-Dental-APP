# PHASE 3 BLUEPRINT — CALENDAR & APPOINTMENTS

---

## Overview

Phase 3 builds the complete appointment scheduling system. All clinic staff can view and manage appointments. The system includes:

| Feature | Description |
| :--- | :--- |
| **Calendar View** | Day/Week/Month views with color-coded appointments |
| **Doctor Filter** | Filter appointments by doctor |
| **Category Filter** | Filter by appointment category (Consultation, Extraction, etc.) |
| **Appointment Popover** | Click on appointment block to see patient details |
| **2‑Tab Modal** | Tab 1: Appointment details, Tab 2: Reminder |
| **Slot‑Lock** | Prevents double‑booking using deterministic slot documents |
| **Walk‑in Tokens** | T‑001, T‑002, etc. (resets daily per clinic) |
| **Appointment Status** | SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED → CANCELLED → NO_SHOW |
| **Patient Live Search** | Search existing patients by name/phone/ID |
| **Reminders** | All‑day or custom time; "All Doctors" option |

---

## 1. Database Schema

### 1.1 Appointments Table

**File:** `src/lib/db/schema/appointments.ts`

```typescript
import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';

export const apptStatusEnum = pgEnum('appt_status', [
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
]);

export const appointments = table('appointments', {
  appointmentId: text('appointment_id').primaryKey().notNull(),
  patientId: text('patient_id').notNull(),
  patientName: text('patient_name').notNull(),
  clinicId: text('clinic_id').notNull(),
  doctorId: text('doctor_id').notNull(),
  doctorName: text('doctor_name').notNull(),
  appointmentDate: timestamp('appointment_date', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').default(30).notNull(),
  categoryId: text('category_id'),
  categoryName: text('category_name'),
  categoryColor: text('category_color'),
  status: apptStatusEnum('status').default('SCHEDULED').notNull(),
  isWalkIn: boolean('is_walk_in').default(false).notNull(),
  tokenNumber: text('token_number'),
  abhaId: text('abha_id'),
  plannedProcedures: text('planned_procedures'),
  notes: text('notes'),
  visitId: text('visit_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
```

### 1.2 Appointment Slots (For Double-Booking Prevention)

**File:** `src/lib/db/schema/appointmentSlots.ts`

```typescript
import { cockroachTable as table } from './cockroachTable';
import { text, timestamp } from 'drizzle-orm/pg-core';

// Deterministic slot key: {doctorId}_{date}_{time}
// Example: doctor_abc123_20250811_1800
export const appointmentSlots = table('appointment_slots', {
  slotKey: text('slot_key').primaryKey().notNull(),
  doctorId: text('doctor_id').notNull(),
  appointmentId: text('appointment_id').notNull(),
  bookedAt: timestamp('booked_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AppointmentSlot = typeof appointmentSlots.$inferSelect;
export type NewAppointmentSlot = typeof appointmentSlots.$inferInsert;
```

### 1.3 Reminders Table

**File:** `src/lib/db/schema/reminders.ts`

```typescript
import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const reminders = table('reminders', {
  reminderId: text('reminder_id').primaryKey().notNull(),
  clinicId: text('clinic_id').notNull(),
  title: text('title').notNull(),
  doctorId: text('doctor_id'), // null = "All Doctors"
  doctorName: text('doctor_name'),
  isAllDay: boolean('is_all_day').default(false).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
```

### 1.4 Tokens Table (For Walk-ins)

**File:** `src/lib/db/schema/tokens.ts`

```typescript
import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, integer } from 'drizzle-orm/pg-core';

export const tokens = table('tokens', {
  tokenId: text('token_id').primaryKey().notNull(), // T-001
  clinicId: text('clinic_id').notNull(),
  dateString: text('date_string').notNull(), // 2025-08-11
  tokenNumber: integer('token_number').notNull(),
  patientId: text('patient_id'),
  patientName: text('patient_name'),
  appointmentId: text('appointment_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;
```

### 1.5 Appointment Categories Table

**File:** `src/lib/db/schema/appointmentCategories.ts`

```typescript
import { cockroachTable as table } from './cockroachTable';
import { text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const appointmentCategories = table('appointment_categories', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull().unique(),
  color: text('color').default('#6B7280'),
  clinicId: text('clinic_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type AppointmentCategory = typeof appointmentCategories.$inferSelect;
export type NewAppointmentCategory = typeof appointmentCategories.$inferInsert;
```

---

## 2. Database Migrations

**File:** `src/lib/db/schema/index.ts`

```typescript
export * from './users';
export * from './clinics';
export * from './clinicSettings';
export * from './patients';
export * from './patientGroups';
export * from './referralSources';
export * from './medicalConditions';
export * from './appointments';
export * from './appointmentSlots';
export * from './reminders';
export * from './tokens';
export * from './appointmentCategories';
export * from './counters';
```

Run migration:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## 3. Utility Functions

### 3.1 Slot Key Generator

**File:** `src/lib/utils/slotKey.ts`

```typescript
export function toISTDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function toISTTimeString(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(':', '');
}

export function slotKey(doctorId: string, date: Date): string {
  const dateStr = toISTDateString(date).replace(/-/g, '');
  const timeStr = toISTTimeString(date);
  return `${doctorId}_${dateStr}_${timeStr}`;
}
```

---

## 4. API Routes

### 4.1 Get Appointments (for Calendar)

**File:** `src/app/api/appointments/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appointments } from '@/lib/db/schema/appointments';
import { isStaff } from '@/lib/auth/claims';
import { eq, and, between } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const doctorId = searchParams.get('doctorId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!clinicId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    let query = db.select().from(appointments)
      .where(
        and(
          eq(appointments.clinicId, clinicId),
          between(appointments.appointmentDate, start, end),
          eq(appointments.status, 'SCHEDULED')
        )
      );

    if (doctorId && doctorId !== 'all') {
      query = query.where(eq(appointments.doctorId, doctorId));
    }

    const results = await query;
    return NextResponse.json({ appointments: results });
  } catch (error) {
    console.error('Get Appointments Error:', error);
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
  }
}
```

### 4.2 Create Appointment (with Slot Lock)

**File:** `src/app/api/appointments/route.ts` (POST method)

```typescript
export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const {
    patientId, patientName, clinicId, doctorId, doctorName,
    appointmentDate, durationMinutes, categoryId, categoryName,
    categoryColor, isWalkIn, tokenNumber, abhaId,
    plannedProcedures, notes
  } = body;

  if (!patientId || !doctorId || !appointmentDate || !clinicId) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const apptDate = new Date(appointmentDate);

  try {
    // Generate slot key
    const key = slotKey(doctorId, apptDate);

    // Use transaction to prevent double-booking
    const result = await db.transaction(async (tx) => {
      // Check if slot is taken
      const existingSlot = await tx.select()
        .from(appointmentSlots)
        .where(eq(appointmentSlots.slotKey, key))
        .limit(1);

      if (existingSlot.length > 0) {
        throw new Error('SLOT_TAKEN');
      }

      // Generate appointment ID
      const counterResult = await tx.execute(
        sql`INSERT INTO counters (key, value) VALUES ('appointments', 1) 
            ON CONFLICT (key) DO UPDATE SET value = counters.value + 1 
            RETURNING value`
      );
      const next = Number(counterResult.rows[0].value);
      const appointmentId = `APT-${String(next).padStart(5, '0')}`;

      // Create appointment
      await tx.insert(appointments).values({
        appointmentId,
        patientId,
        patientName,
        clinicId,
        doctorId,
        doctorName,
        appointmentDate: apptDate,
        durationMinutes: durationMinutes || 30,
        categoryId: categoryId || null,
        categoryName: categoryName || null,
        categoryColor: categoryColor || null,
        status: isWalkIn ? 'CONFIRMED' : 'SCHEDULED',
        isWalkIn: isWalkIn || false,
        tokenNumber: tokenNumber || null,
        abhaId: abhaId || null,
        plannedProcedures: plannedProcedures || null,
        notes: notes || null,
        createdBy: userId,
        updatedBy: userId,
      });

      // Create slot lock
      await tx.insert(appointmentSlots).values({
        slotKey: key,
        doctorId,
        appointmentId,
        bookedAt: new Date(),
      });

      return { appointmentId };
    });

    return NextResponse.json({
      success: true,
      appointmentId: result.appointmentId
    });

  } catch (error: any) {
    if (error.message === 'SLOT_TAKEN') {
      return NextResponse.json(
        { error: 'This slot is already booked. Please choose another time.' },
        { status: 409 }
      );
    }
    console.error('Create Appointment Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create appointment' },
      { status: 500 }
    );
  }
}
```

### 4.3 Update Appointment Status

**File:** `src/app/api/appointments/[appointmentId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appointments } from '@/lib/db/schema/appointments';
import { isStaff } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { appointmentId: string } }
) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { appointmentId } = params;
  const body = await req.json();
  const { status, notes } = body;

  try {
    await db.update(appointments)
      .set({
        status,
        notes: notes || null,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(appointments.appointmentId, appointmentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Appointment Error:', error);
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    );
  }
}
```

### 4.4 Issue Walk-in Token

**File:** `src/app/api/tokens/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { tokens } from '@/lib/db/schema/tokens';
import { isStaff } from '@/lib/auth/claims';
import { eq, and } from 'drizzle-orm';
import { toISTDateString } from '@/lib/utils/slotKey';

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { clinicId, patientId, patientName, appointmentId } = body;

  if (!clinicId) {
    return NextResponse.json({ error: 'Missing clinicId' }, { status: 400 });
  }

  const dateStr = toISTDateString(new Date());

  try {
    // Get today's token count
    const existingTokens = await db.select()
      .from(tokens)
      .where(
        and(
          eq(tokens.clinicId, clinicId),
          eq(tokens.dateString, dateStr)
        )
      )
      .orderBy(tokens.tokenNumber, 'desc')
      .limit(1);

    const nextNumber = existingTokens.length > 0 ? existingTokens[0].tokenNumber + 1 : 1;
    const tokenId = `${clinicId}_${dateStr.replace(/-/g, '')}_${String(nextNumber).padStart(3, '0')}`;
    const tokenNumber = `T-${String(nextNumber).padStart(3, '0')}`;

    await db.insert(tokens).values({
      tokenId,
      clinicId,
      dateString: dateStr,
      tokenNumber: nextNumber,
      patientId: patientId || null,
      patientName: patientName || null,
      appointmentId: appointmentId || null,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      tokenNumber,
      tokenId,
    });
  } catch (error) {
    console.error('Issue Token Error:', error);
    return NextResponse.json({ error: 'Failed to issue token' }, { status: 500 });
  }
}
```

### 4.5 Create Reminder

**File:** `src/app/api/reminders/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { reminders } from '@/lib/db/schema/reminders';
import { isStaff } from '@/lib/auth/claims';

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { clinicId, title, doctorId, doctorName, isAllDay, startDate, endDate } = body;

  if (!clinicId || !title || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  try {
    // Generate reminder ID
    const counterResult = await db.execute(
      sql`INSERT INTO counters (key, value) VALUES ('reminders', 1) 
          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1 
          RETURNING value`
    );
    const next = Number(counterResult.rows[0].value);
    const reminderId = `REM-${String(next).padStart(5, '0')}`;

    await db.insert(reminders).values({
      reminderId,
      clinicId,
      title,
      doctorId: doctorId || null,
      doctorName: doctorName || null,
      isAllDay: isAllDay || false,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdBy: userId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      reminderId,
    });
  } catch (error) {
    console.error('Create Reminder Error:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder' },
      { status: 500 }
    );
  }
}
```

### 4.6 Get Appointment Categories

**File:** `src/app/api/appointment-categories/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appointmentCategories } from '@/lib/db/schema/appointmentCategories';
import { isStaff } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

// GET categories
export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');

  try {
    let query = db.select().from(appointmentCategories)
      .where(eq(appointmentCategories.isActive, true));
    
    if (clinicId) {
      query = query.where(eq(appointmentCategories.clinicId, clinicId));
    }

    const results = await query.orderBy(appointmentCategories.name);
    return NextResponse.json({ categories: results });
  } catch (error) {
    console.error('Get Categories Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST - Create category (Admin only)
export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Only SUPER_ADMIN and CLINIC_ADMIN can create categories
  const role = sessionClaims?.role || '';
  if (!['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, color, clinicId } = body;

  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  try {
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await db.insert(appointmentCategories).values({
      id,
      name: name.toUpperCase(),
      color: color || '#6B7280',
      clinicId: clinicId || null,
      isActive: true,
      createdAt: new Date(),
    });
    return NextResponse.json({ success: true, category: { id, name, color } });
  } catch (error) {
    console.error('Create Category Error:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
```

---

## 5. Calendar Page

### 5.1 Calendar Component

**File:** `src/app/(dashboard)/calendar/page.tsx`

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Search, Users, Clock, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';
import { AppointmentPopover } from '@/components/calendar/AppointmentPopover';
import { AppointmentModal } from '@/components/calendar/AppointmentModal';

interface Appointment {
  appointmentId: string;
  patientId: string;
  patientName: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  durationMinutes: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  status: string;
  isWalkIn: boolean;
  tokenNumber: string | null;
  notes: string | null;
}

interface Doctor {
  id: string;
  name: string;
  clinicId: string;
}

export default function CalendarPage() {
  const { sessionClaims } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });

  const clinicId = sessionClaims?.primaryClinicId || 'clinic_a';

  // Fetch appointments
  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, [currentDate, selectedDoctor, clinicId]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const start = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const end = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'yyyy-MM-dd');
      
      let url = `/api/appointments?clinicId=${clinicId}&startDate=${start}&endDate=${end}`;
      if (selectedDoctor !== 'all') {
        url += `&doctorId=${selectedDoctor}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      // Fetch doctors from users table
      const res = await fetch(`/api/users?clinicId=${clinicId}&role=GENERAL_DOCTOR&role=CLINIC_ADMIN`);
      const data = await res.json();
      setDoctors(data.users || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(a => {
      const apptDate = new Date(a.appointmentDate);
      return isSameDay(apptDate, day);
    });
  };

  const handleAppointmentClick = (appt: Appointment, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setPopoverPosition({ x: rect.left, y: rect.top - 100 });
    setSelectedAppointment(appt);
    setShowPopover(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-500',
      CONFIRMED: 'bg-green-500',
      IN_PROGRESS: 'bg-yellow-500',
      COMPLETED: 'bg-green-700',
      CANCELLED: 'bg-red-500',
      NO_SHOW: 'bg-gray-500',
    };
    return colors[status] || 'bg-blue-500';
  };

  const weekDays = getWeekDays();

  return (
    <div className="flex h-full gap-6">
      {/* Left Sidebar */}
      <div className="w-64 flex-shrink-0 bg-white rounded-lg shadow p-4 h-[calc(100vh-120px)] overflow-y-auto">
        <h3 className="font-semibold text-gray-700 mb-4">Doctors</h3>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedDoctor('all')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedDoctor === 'all' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            All Doctors
          </button>
          {doctors.map((doctor) => (
            <button
              key={doctor.id}
              onClick={() => setSelectedDoctor(doctor.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedDoctor === doctor.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
              }`}
            >
              {doctor.name}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Area */}
      <div className="flex-1 bg-white rounded-lg shadow p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {format(currentDate, 'MMM d, yyyy')}
            </h2>
            <button
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="ml-2 px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-200 rounded-md overflow-hidden">
              <button
                onClick={() => setView('day')}
                className={`px-3 py-1 text-sm ${
                  view === 'day' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1 text-sm ${
                  view === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1 text-sm ${
                  view === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
                }`}
              >
                Month
              </button>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Book Appointment
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            Loading appointments...
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {weekDays.map((day) => (
                <div
                  key={day.toString()}
                  className={`p-2 text-center font-medium ${
                    isSameDay(day, new Date()) ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-sm text-gray-500">{format(day, 'EEE')}</span>
                  <div className={`text-lg font-bold ${
                    isSameDay(day, new Date()) ? 'text-blue-600' : 'text-gray-800'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[500px]">
              {weekDays.map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                return (
                  <div
                    key={day.toString()}
                    className="border-r border-gray-200 last:border-r-0 p-1 min-h-[100px]"
                  >
                    {dayAppointments.slice(0, 4).map((appt) => (
                      <div
                        key={appt.appointmentId}
                        onClick={(e) => handleAppointmentClick(appt, e)}
                        className={`${getStatusColor(appt.status)} text-white text-xs p-1 rounded mb-1 cursor-pointer truncate`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {format(new Date(appt.appointmentDate), 'HH:mm')}
                          </span>
                          <span className="truncate ml-1">{appt.patientName}</span>
                        </div>
                      </div>
                    ))}
                    {dayAppointments.length > 4 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayAppointments.length - 4} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Popover */}
      {showPopover && selectedAppointment && (
        <AppointmentPopover
          appointment={selectedAppointment}
          position={popoverPosition}
          onClose={() => setShowPopover(false)}
          onEdit={() => {
            setShowPopover(false);
            setShowModal(true);
          }}
          onCollectPayment={() => {
            window.location.href = `/patients/${selectedAppointment.patientId}/billing/invoices/new?appointmentId=${selectedAppointment.appointmentId}`;
          }}
        />
      )}

      {/* Appointment Modal */}
      {showModal && (
        <AppointmentModal
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchAppointments();
          }}
          clinicId={clinicId}
          doctors={doctors}
        />
      )}
    </div>
  );
}
```

---

## 6. Components

### 6.1 Appointment Popover

**File:** `src/components/calendar/AppointmentPopover.tsx`

```tsx
'use client';

import { format } from 'date-fns';
import { X, Phone, Mail, MapPin, Copy, Edit, User } from 'lucide-react';

interface AppointmentPopoverProps {
  appointment: any;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onCollectPayment: () => void;
}

export function AppointmentPopover({
  appointment,
  position,
  onClose,
  onEdit,
  onCollectPayment,
}: AppointmentPopoverProps) {
  return (
    <div
      className="fixed z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200"
      style={{ top: position.y, left: position.x }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
              {appointment.patientName.charAt(0)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{appointment.patientName}</h4>
              <p className="text-sm text-gray-500">{appointment.patientId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(appointment.appointmentDate), 'hh:mm a')}</span>
            <span>•</span>
            <span>{appointment.durationMinutes} min</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>Dr. {appointment.doctorName}</span>
          </div>
          {appointment.categoryName && (
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: appointment.categoryColor || '#6B7280' }}
              />
              <span className="text-sm text-gray-600">{appointment.categoryName}</span>
            </div>
          )}
          {appointment.tokenNumber && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                {appointment.tokenNumber}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center gap-1"
          >
            <Edit className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={onCollectPayment}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-1"
          >
            Collect Payment
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 6.2 Appointment Modal

**File:** `src/components/calendar/AppointmentModal.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Search, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

interface AppointmentModalProps {
  onClose: () => void;
  onSave: () => void;
  clinicId: string;
  doctors: any[];
  appointment?: any; // For editing
}

export function AppointmentModal({
  onClose,
  onSave,
  clinicId,
  doctors,
  appointment,
}: AppointmentModalProps) {
  const { sessionClaims, userId } = useAuth();
  const [activeTab, setActiveTab] = useState<'appointment' | 'reminder'>('appointment');
  const [loading, setLoading] = useState(false);
  const [searchPatient, setSearchPatient] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  // Form state
  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    doctorId: '',
    doctorName: '',
    categoryId: '',
    categoryName: '',
    categoryColor: '',
    appointmentDate: '',
    appointmentTime: '09:00',
    durationMinutes: 30,
    isWalkIn: false,
    tokenNumber: '',
    abhaId: '',
    plannedProcedures: '',
    notes: '',
  });

  // Reminder state
  const [reminder, setReminder] = useState({
    title: '',
    doctorId: '',
    doctorName: '',
    isAllDay: false,
    startDate: '',
    endDate: '',
  });

  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchCategories();
  }, [clinicId]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/appointment-categories?clinicId=${clinicId}`);
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSearchPatient = async () => {
    if (searchPatient.length < 2) return;
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(searchPatient)}&limit=10`);
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setForm({
      ...form,
      patientId: patient.patientId,
      patientName: patient.name,
      patientPhone: patient.primaryPhone,
      patientEmail: patient.email || '',
    });
    setSearchPatient('');
    setPatients([]);
  };

  const handleSubmitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!form.patientId || !form.doctorId || !form.appointmentDate) {
      alert('Please fill in all required fields');
      setLoading(false);
      return;
    }

    const dateTime = new Date(`${form.appointmentDate}T${form.appointmentTime}`);
    const selectedDoctor = doctors.find(d => d.id === form.doctorId);

    try {
      const payload = {
        ...form,
        appointmentDate: dateTime.toISOString(),
        doctorName: selectedDoctor?.name || '',
        clinicId,
        createdBy: userId,
      };

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        clinicId,
        title: reminder.title,
        doctorId: reminder.doctorId || null,
        doctorName: reminder.doctorId ? doctors.find(d => d.id === reminder.doctorId)?.name : 'All Doctors',
        isAllDay: reminder.isAllDay,
        startDate: reminder.startDate,
        endDate: reminder.endDate || reminder.startDate,
      };

      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create reminder');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">Book Appointment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('appointment')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'appointment'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Appointment
          </button>
          <button
            onClick={() => setActiveTab('reminder')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'reminder'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Reminder
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'appointment' ? (
            <form onSubmit={handleSubmitAppointment} className="space-y-4">
              {/* Patient Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Patient</label>
                <div className="mt-1 relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search by name, ID, or phone..."
                      value={searchPatient}
                      onChange={(e) => setSearchPatient(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={handleSearchPatient}
                      className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                  {patients.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {patients.map((p) => (
                        <button
                          key={p.patientId}
                          type="button"
                          onClick={() => handleSelectPatient(p)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                        >
                          {p.name} ({p.patientId}) - {p.primaryPhone}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedPatient && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md">
                    <span className="font-medium">{selectedPatient.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({selectedPatient.patientId})</span>
                  </div>
                )}
              </div>

              {/* Patient Details - Pre-filled */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient ID</label>
                  <input
                    type="text"
                    value={form.patientId}
                    readOnly
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mobile No.</label>
                  <input
                    type="text"
                    value={form.patientPhone}
                    readOnly
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                </div>
              </div>

              {/* Doctor & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Doctor *</label>
                  <select
                    required
                    value={form.doctorId}
                    onChange={(e) => {
                      const doc = doctors.find(d => d.id === e.target.value);
                      setForm({ ...form, doctorId: e.target.value, doctorName: doc?.name || '' });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => {
                      const cat = categories.find(c => c.id === e.target.value);
                      setForm({
                        ...form,
                        categoryId: e.target.value,
                        categoryName: cat?.name || '',
                        categoryColor: cat?.color || '',
                      });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.appointmentDate}
                    onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time *</label>
                  <input
                    type="time"
                    required
                    value={form.appointmentTime}
                    onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <select
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              {/* Walk-in & Token */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.isWalkIn}
                      onChange={(e) => setForm({ ...form, isWalkIn: e.target.checked })}
                      className="h-4 w-4 text-blue-600"
                    />
                    Walk-in Appointment
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Token No.</label>
                  <input
                    type="text"
                    value={form.tokenNumber}
                    onChange={(e) => setForm({ ...form, tokenNumber: e.target.value })}
                    placeholder="T-001"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Planned Procedures</label>
                <input
                  type="text"
                  value={form.plannedProcedures}
                  onChange={(e) => setForm({ ...form, plannedProcedures: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Appointment'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitReminder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  required
                  value={reminder.title}
                  onChange={(e) => setReminder({ ...reminder, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Doctor</label>
                <select
                  value={reminder.doctorId}
                  onChange={(e) => {
                    const doc = doctors.find(d => d.id === e.target.value);
                    setReminder({
                      ...reminder,
                      doctorId: e.target.value,
                      doctorName: doc?.name || '',
                    });
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Doctors</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={reminder.isAllDay}
                    onChange={(e) => setReminder({ ...reminder, isAllDay: e.target.checked })}
                    className="h-4 w-4 text-blue-600"
                  />
                  All Day
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={reminder.startDate}
                    onChange={(e) => setReminder({ ...reminder, startDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="datetime-local"
                    value={reminder.endDate}
                    onChange={(e) => setReminder({ ...reminder, endDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Reminder'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## 7. Phase 3 Checklist

### Database
- [ ] `appointments` table created
- [ ] `appointment_slots` table created
- [ ] `reminders` table created
- [ ] `tokens` table created
- [ ] `appointment_categories` table created
- [ ] Migrations run successfully

### API Routes
- [ ] `GET /api/appointments` returns appointments for date range
- [ ] `POST /api/appointments` creates appointment with slot lock
- [ ] `POST /api/appointments` prevents double-booking (409 conflict)
- [ ] `PATCH /api/appointments/[id]` updates appointment status
- [ ] `POST /api/tokens` issues walk-in token (T-001, T-002, etc.)
- [ ] `POST /api/reminders` creates reminder
- [ ] `GET /api/appointment-categories` returns categories list
- [ ] `POST /api/appointment-categories` creates category (admin only)

### Calendar UI
- [ ] Calendar renders Day/Week/Month views
- [ ] Appointments are color-coded by category
- [ ] Doctor filter works
- [ ] Clicking appointment opens popover
- [ ] Popover shows patient name, ID, time, doctor
- [ ] Popover "Edit" button opens modal
- [ ] Popover "Collect Payment" navigates to invoice page

### Appointment Modal
- [ ] Tab 1: Patient search works (live search)
- [ ] Selecting patient auto-fills details
- [ ] Doctor dropdown shows active doctors
- [ ] Category dropdown shows categories
- [ ] Date/time selection works
- [ ] Duration dropdown works
- [ ] Walk-in checkbox works
- [ ] Token number field works
- [ ] Tab 2: Reminder form works
- [ ] "All Doctors" option works
- [ ] All-day toggle works
- [ ] Saving appointment redirects/refreshes calendar

### Slot Lock
- [ ] Opening 2 tabs and booking same slot → only 1 succeeds
- [ ] Error message "This slot is already booked" appears

### Walk-in Tokens
- [ ] Token number resets daily per clinic
- [ ] Token format: `T-001`, `T-002`, etc.
- [ ] Token appears on appointment popover

### Permissions
- [ ] Receptionist can book appointments
- [ ] Doctors can book appointments
- [ ] Clinic Admin can create appointment categories
- [ ] Super Admin can create appointment categories
- [ ] General Doctor cannot create categories

