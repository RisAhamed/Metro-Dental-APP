// import { NextRequest, NextResponse } from 'next/server';
// import { auth, clerkClient } from '@clerk/nextjs/server';
// import { db } from '@/lib/db';
// import { users } from '@/lib/db/schema/users';
// import { isSuperAdmin } from '@/lib/auth/claims';

// export async function POST(req: NextRequest) {
//   const { userId, sessionClaims } = await auth();
//   if (!isSuperAdmin(sessionClaims)) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
//   }

//   const body = await req.json();
//   const { name, email, phone, role, primaryClinicId, clinicIds } = body;

//   // Validate
//   if (!name || !email || !role) {
//     return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
//   }

//   try {
//     // Generate temp password
//     const tempPwd = `Dc${Math.random().toString(36).slice(-6)}1!`;

//     // Create user in Clerk
//     const client = await clerkClient();
//     const clerkUser = await client.users.createUser({
//       emailAddress: [email],
//       password: tempPwd,
//       firstName: name.split(' ')[0],
//       lastName: name.split(' ').slice(1).join(' ') || '',
//       publicMetadata: {
//         role,
//         clinicIds: clinicIds || [primaryClinicId],
//         primaryClinicId: primaryClinicId || clinicIds?.[0],
//       },
//     });

//     // Save to our database
//     await db.insert(users).values({
//       uid: clerkUser.id,
//       name,
//       email,
//       phone: phone || '',
//       role,
//       primaryClinicId: primaryClinicId || null,
//       clinicIds: clinicIds || [primaryClinicId],
//       isActive: true,
//       createdBy: userId || 'system',
//     });

//     return NextResponse.json({
//       uid: clerkUser.id,
//       tempPassword: tempPwd,
//     });
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema/users';
import { vendors } from '@/lib/db/schema/vendors';
import { isSuperAdmin } from '@/lib/auth/claims';
import { eq, sql } from 'drizzle-orm';
import { clinicName } from '@/lib/constants/clinics';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CLINIC_ADMIN: 'Clinical Admin',
  GENERAL_DOCTOR: 'General Doctor',
  ASSISTANT_DOCTOR: 'Assistant Doctor',
  RECEPTIONIST: 'Receptionist',
  LAB_TECHNICIAN: 'Lab Technician',
  VENDOR: 'Vendor',
};

async function sendWelcomeEmail(opts: {
  name: string;
  email: string;
  tempPassword: string;
  role: string;
  clinicId: string | null;
}): Promise<void> {
  const { name, email, tempPassword, role, clinicId } = opts;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const from = (process.env.RESEND_FROM_EMAIL || 'Metro Dental <noreply@metrodental.com>').trim();
  const roleLabel = ROLE_LABELS[role] || role;
  const clinicLabel = clinicName(clinicId);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY || ''}`,
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `Your Metro Dental Clinic account — ${roleLabel}${clinicId ? ` (${clinicLabel})` : ''}`,
      replyTo: from,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h1 style="color: #2563eb; margin: 0 0 8px;">Metro Dental Clinic</h1>
          <p style="color: #6b7280; margin: 0 0 20px;">You have been invited to join the clinic team.</p>

          <p>Hello ${name},</p>
          <p>Your account has been created at Metro Dental Clinic with the role of <strong>${roleLabel}</strong>${clinicId ? `, assigned to <strong>${clinicLabel}</strong>.` : '.'} Please use the credentials below to log in:</p>

          <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
            <tr>
              <td style="padding: 10px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Role</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #374151;">${roleLabel}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Clinic</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #374151;">${clinicLabel}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Email</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #374151;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 10px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Temporary Password</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; color: #374151;">${tempPassword}</td>
            </tr>
          </table>

          <p style="color: #374151;">Click below to log in to the application:</p>
          <a href="${appUrl}/sign-in" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Log in to your account
          </a>
          <p style="color: #6b7280; font-size: 13px; margin-top: 8px;">${appUrl}/sign-in</p>

          <p style="margin-top: 20px; color: #374151;">
            We recommend changing your password after your first login.
          </p>
          <p style="color: #6b7280; font-size: 13px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
            If you did not expect this invitation, please ignore this email.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(`Resend failed (${res.status}): ${errorBody}`);
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, role, primaryClinicId, clinicIds, labId, vendorId } = body;

  // Validate required fields
  if (!name || !email || !role) {
    return NextResponse.json(
      { error: 'Missing required fields: name, email, or role' },
      { status: 400 }
    );
  }

  // Validate clinicIds
  if (!clinicIds || !Array.isArray(clinicIds) || clinicIds.length === 0) {
    return NextResponse.json(
      { error: 'clinicIds must be a non‑empty array' },
      { status: 400 }
    );
  }

  try {
    // Check for an existing user with the same email to give a clean error
    const existing = await db
      .select({ uid: users.uid, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `A user with email ${email} already exists.`, code: 'EMAIL_EXISTS' },
        { status: 409 }
      );
    }

    // Auto-create a vendor entity when creating a VENDOR user without an existing vendor
    let finalVendorId: string | null = vendorId || null;
    if (role === 'VENDOR') {
      if (finalVendorId) {
        const existing = await db
          .select({ vendorId: vendors.vendorId })
          .from(vendors)
          .where(eq(vendors.vendorId, finalVendorId))
          .limit(1);
        if (existing.length === 0) {
          return NextResponse.json(
            { error: 'Selected vendor does not exist' },
            { status: 400 }
          );
        }
      } else {
        const counterResult = await db.execute(
          sql`INSERT INTO counters (key, value) VALUES ('vendors', 1)
              ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
              RETURNING value`
        );
        const next = Number(counterResult[0]?.value ?? 1);
        const newVendorId = `VND-${String(next).padStart(4, '0')}`;
        const vendorClinicId = primaryClinicId || clinicIds[0] || 'shared';

        await db.insert(vendors).values({
          vendorId: newVendorId,
          name,
          clinicId: vendorClinicId,
          isActive: true,
          createdBy: userId || 'system',
        });

        finalVendorId = newVendorId;
      }
    }

    // Generate temp password
    const tempPwd = `Dc${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-6)}1!`;

    // Create user in Clerk with full error handling
    const client = await clerkClient();
    const clerkUser = await client.users.createUser({
      emailAddress: [email],
      password: tempPwd,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || '',
      publicMetadata: {
        role,
        clinicIds,
        primaryClinicId: primaryClinicId || clinicIds[0],
        labId: labId || null,
        vendorId: finalVendorId || null,
      },
    });

    // Insert into our database
    await db.insert(users).values({
      uid: clerkUser.id,
      name,
      email,
      phone: phone || '',
      role,
      primaryClinicId: primaryClinicId || clinicIds[0],
      clinicIds,
      isActive: true,
      labId: labId || null,
      vendorId: finalVendorId || null,
      createdBy: userId || 'system',
    });

    // Send welcome email (non-blocking — failures do not prevent user creation)
    try {
      await sendWelcomeEmail({
        name,
        email,
        tempPassword: tempPwd,
        role,
        clinicId: primaryClinicId || clinicIds[0] || null,
      });
    } catch (emailError) {
      console.error('Welcome email failed for', email, ':', emailError);
    }

    return NextResponse.json({
      uid: clerkUser.id,
      tempPassword: tempPwd,
      vendorId: finalVendorId,
      message: 'User created successfully',
    });
  } catch (error: unknown) {
    const err = error as { message?: string; errors?: unknown; code?: string };
    // Log the full error to the server console (check Vercel logs or terminal)
    console.error('Clerk createUser error:', error);

    const isDuplicate = (err as { code?: string })?.code === '23505';

    // Return a detailed message to the frontend
    return NextResponse.json(
      {
        error: isDuplicate
          ? `A user with this email already exists.`
          : err.message || 'Failed to create user',
        code: isDuplicate ? 'EMAIL_EXISTS' : err.code || undefined,
        details: err.errors || error,
      },
      { status: isDuplicate ? 409 : 422 }
    );
  }
}