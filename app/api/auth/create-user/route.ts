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
import { isSuperAdmin } from '@/lib/auth/claims';

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { name, email, phone, role, primaryClinicId, clinicIds } = body;

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
    // Generate temp password
    const tempPwd = `Dc${Math.random().toString(36).slice(-6)}1!`;

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
      createdBy: userId || 'system',
    });

    return NextResponse.json({
      uid: clerkUser.id,
      tempPassword: tempPwd,
      message: 'User created successfully',
    });
  } catch (error: unknown) {
    const err = error as { message?: string; errors?: unknown };
    // Log the full error to the server console (check Vercel logs or terminal)
    console.error('Clerk createUser error:', error);

    // Return a detailed message to the frontend
    return NextResponse.json(
      {
        error: err.message || 'Failed to create user',
        details: err.errors || error,
      },
      { status: 422 }
    );
  }
}