import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, userRoleEnum } from '@/lib/db/schema/users';
import { isStaff } from '@/lib/auth/claims';
import { eq, and, or, inArray, arrayContains, asc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId');
  const singleRole = searchParams.get('role');
  const roles = searchParams.getAll('role');

  const roleParams = singleRole ? [...roles.filter((r) => r !== singleRole), singleRole] : roles;

  const validRoles = roleParams.filter((r) =>
    (userRoleEnum.enumValues as readonly string[]).includes(r)
  ) as (typeof userRoleEnum.enumValues)[number][];

  try {
    const conditions = [eq(users.isActive, true)];

    if (clinicId) {
      conditions.push(
        or(eq(users.primaryClinicId, clinicId), arrayContains(users.clinicIds, [clinicId]))!
      );
    }

    if (validRoles.length > 0) {
      conditions.push(inArray(users.role, validRoles));
    }

    const results = await db
      .select({
        id: users.uid,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        clinicId: users.primaryClinicId,
        primaryClinicId: users.primaryClinicId,
        clinicIds: users.clinicIds,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(asc(users.name));

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error('Get Users Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}