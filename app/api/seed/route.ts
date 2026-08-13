import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { seedAllData } from '@/lib/seed';
import { isSuperAdmin } from '@/lib/auth/claims';

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const clinicId = body.clinicId || (sessionClaims?.primaryClinicId as string) || 'clinic_a';

  try {
    const result = await seedAllData(clinicId, userId);
    return NextResponse.json({
      success: true,
      message: 'All data seeded successfully',
      counts: result,
    });
  } catch (error) {
    console.error('Seed Error:', error);
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
  }
}