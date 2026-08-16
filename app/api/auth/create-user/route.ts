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

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, phone, role, primaryClinicId, clinicIds, labId, vendorId } = body;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

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
    const client = await clerkClient();

    // Clerk is the source of truth for email uniqueness.
    const clerkMatches = await client.users.getUserList({
      emailAddress: [email],
    });
    if (clerkMatches.totalCount > 0) {
      return NextResponse.json(
        { error: `A user with email ${email} already exists.`, code: 'EMAIL_EXISTS' },
        { status: 409 }
      );
    }

    // If Clerk says the email is free but a stale row still exists in our
    // database (e.g. the Clerk user was deleted without syncing), remove it
    // so the insert below does not fail on the unique constraint.
    await db.delete(users).where(eq(users.email, email));

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

    // Send welcome email (disconnected — Resend integration disabled)
    // try {
    //   await sendWelcomeEmail({
    //     name,
    //     email,
    //     tempPassword: tempPwd,
    //     role,
    //     clinicId: primaryClinicId || clinicIds[0] || null,
    //   });
    // } catch (emailError) {
    //   console.error('Welcome email failed for', email, ':', emailError);
    // }

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