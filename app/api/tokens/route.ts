import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { tokens } from '@/lib/db/schema/tokens';
import { isStaff } from '@/lib/auth/claims';
import { eq, and, desc } from 'drizzle-orm';
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
    const existingTokens = await db
      .select()
      .from(tokens)
      .where(and(eq(tokens.clinicId, clinicId), eq(tokens.dateString, dateStr)))
      .orderBy(desc(tokens.tokenNumber))
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