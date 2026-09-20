import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { prescriptionTemplates } from '@/lib/db/schema/prescriptionTemplates';
import { canManageClinical, canViewClinical, getPrimaryClinicId } from '@/lib/auth/claims';
import { and, desc, eq } from 'drizzle-orm';

function templateId(name: string) {
  return `pt_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 36)}_${Date.now().toString(36)}`;
}

function displayName(claims: unknown, fallback: string) {
  const c = claims as { name?: string; email?: string } | null;
  return c?.name || c?.email?.replace(/@.*$/, '') || fallback;
}

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = searchParams.get('clinicId') || getPrimaryClinicId(sessionClaims);
  if (!clinicId) return NextResponse.json({ error: 'clinicId is required' }, { status: 400 });

  try {
    const list = await db
      .select()
      .from(prescriptionTemplates)
      .where(and(eq(prescriptionTemplates.clinicId, clinicId), eq(prescriptionTemplates.isActive, true)))
      .orderBy(desc(prescriptionTemplates.updatedAt));

    return NextResponse.json({ templates: list });
  } catch (error) {
    console.error('Get Prescription Templates Error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageClinical(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || '').trim();
  const clinicId = body.clinicId ? String(body.clinicId) : getPrimaryClinicId(sessionClaims);
  if (!name) return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
  if (!clinicId) return NextResponse.json({ error: 'clinicId is required' }, { status: 400 });
  if (!Array.isArray(body.medicines) || body.medicines.length === 0) {
    return NextResponse.json({ error: 'At least one medicine is required' }, { status: 400 });
  }

  const id = templateId(name);

  try {
    await db.insert(prescriptionTemplates).values({
      templateId: id,
      name,
      description: body.description ? String(body.description).trim() : null,
      clinicId,
      createdBy: userId,
      createdByName: displayName(sessionClaims, userId),
      medicines: body.medicines,
      notes: body.notes ? String(body.notes).trim() : null,
    });

    const created = await db.select().from(prescriptionTemplates).where(eq(prescriptionTemplates.templateId, id)).limit(1);
    return NextResponse.json({ success: true, template: created[0] }, { status: 201 });
  } catch (error) {
    console.error('Create Prescription Template Error:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
