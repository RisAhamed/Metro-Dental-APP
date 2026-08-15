import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, userRoleEnum } from '@/lib/db/schema/users';
import { isSuperAdmin } from '@/lib/auth/claims';
import { eq } from 'drizzle-orm';

const VALID_CLINICS = ['clinic_a', 'clinic_b'] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { sessionClaims } = await auth();
  if (!isSuperAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { userId } = await params;

  try {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);

    if (!results.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: results[0] });
  } catch (error) {
    console.error('Get User Error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { sessionClaims, userId: currentUserId } = await auth();
  if (!isSuperAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { userId } = await params;
  const body = await req.json();
  const { name, email, phone, role, primaryClinicId, clinicIds, isActive } = body;

  if (!name || !role) {
    return NextResponse.json(
      { error: 'Missing required fields: name or role' },
      { status: 400 }
    );
  }

  const validRoles = userRoleEnum.enumValues as readonly string[];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
  }

  if (!clinicIds || !Array.isArray(clinicIds) || clinicIds.length === 0) {
    return NextResponse.json(
      { error: 'clinicIds must be a non-empty array' },
      { status: 400 }
    );
  }

  const uniqueClinics = Array.from(new Set(clinicIds));
  const invalidClinics = uniqueClinics.filter((c) => !VALID_CLINICS.includes(c));
  if (invalidClinics.length > 0) {
    return NextResponse.json(
      { error: `Invalid clinic ids: ${invalidClinics.join(', ')}` },
      { status: 400 }
    );
  }

  const effectivePrimary =
    primaryClinicId === '' || primaryClinicId === null || primaryClinicId === undefined
      ? null
      : primaryClinicId;

  if (effectivePrimary && !uniqueClinics.includes(effectivePrimary)) {
    return NextResponse.json(
      { error: 'primaryClinicId must be one of clinicIds or null' },
      { status: 400 }
    );
  }

  if (userId === currentUserId && role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'You cannot demote your own account' },
      { status: 400 }
    );
  }

  if (userId === currentUserId && isActive === false) {
    return NextResponse.json(
      { error: 'You cannot deactivate your own account' },
      { status: 400 }
    );
  }

  try {
    const client = await clerkClient();

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (email && email !== existing[0].email) {
      return NextResponse.json(
        { error: 'Email changes are not supported from this screen' },
        { status: 400 }
      );
    }

    const wasInactive = existing[0].isActive === false;
    const becomingActive = isActive === true;

    if (wasInactive && becomingActive && existing[0].email) {
      const blocked = await client.blocklistIdentifiers.getBlocklistIdentifierList({
        limit: 100,
      });
      const entry = blocked.data.find((b) => b.identifier === existing[0].email);
      if (entry) {
        await client.blocklistIdentifiers.deleteBlocklistIdentifier(entry.id);
      }
    }

    const nameParts = name.trim().split(/\s+/);
    await client.users.updateUser(userId, {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      publicMetadata: {
        role,
        clinicIds: uniqueClinics,
        primaryClinicId: effectivePrimary,
        isActive: isActive ?? true,
      },
    });

    await db
      .update(users)
      .set({
        name,
        email: email ?? undefined,
        phone: phone ?? null,
        role,
        primaryClinicId: effectivePrimary,
        clinicIds: uniqueClinics,
        isActive: isActive ?? true,
      })
      .where(eq(users.uid, userId));

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update User Error:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { sessionClaims, userId: currentUserId } = await auth();
  if (!isSuperAdmin(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { userId } = await params;

  if (userId === currentUserId) {
    return NextResponse.json(
      { error: 'You cannot deactivate your own account' },
      { status: 400 }
    );
  }

  try {
    const client = await clerkClient();

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, userId))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const sessions = await client.sessions.getSessionList({ userId });
    await Promise.all(
      sessions.data.map((s) => client.sessions.revokeSession(s.id))
    );

    if (existing[0].email) {
      await client.blocklistIdentifiers.createBlocklistIdentifier({
        identifier: existing[0].email,
      });
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata: { isActive: false },
    });

    await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.uid, userId));

    return NextResponse.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    console.error('Deactivate User Error:', error);
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || 'Failed to deactivate user' },
      { status: 500 }
    );
  }
}
