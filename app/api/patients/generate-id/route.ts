import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isStaff } from '@/lib/auth/claims';

export async function GET() {
  const { sessionClaims } = await auth();
  if (!isStaff(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Dummy for Phase 1 — a real 'counters' table will be implemented later
  return NextResponse.json({ patientId: 'P-00001' });
}
