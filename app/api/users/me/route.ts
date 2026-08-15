import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';

// Returns the current signed-in user's role and clinic info, resolved from
// the database (authoritative) rather than relying on Clerk session claims.
export async function GET() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await db
      .select({
        uid: users.uid,
        name: users.name,
        email: users.email,
        role: users.role,
        primaryClinicId: users.primaryClinicId,
        clinicIds: users.clinicIds,
      })
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);

    if (results.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: results[0],
      sessionClaims: {
        role: (sessionClaims?.role as string) || results[0].role,
        primaryClinicId:
          (sessionClaims?.primaryClinicId as string) || results[0].primaryClinicId,
      },
    });
  } catch (error) {
    console.error('Get Current User Error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
