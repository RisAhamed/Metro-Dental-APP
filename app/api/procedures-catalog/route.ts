import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { proceduresCatalog } from '@/lib/db/schema/proceduresCatalog';
import { canViewClinical, isSuperAdmin, isClinicAdmin } from '@/lib/auth/claims';
import { eq, ilike, or, and, isNull, type SQL } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const clinicId = searchParams.get('clinicId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '25') || 25, 100);

  try {
    const includeInactive = searchParams.get('includeInactive') === 'true' && canManageCatalog(sessionClaims);
    const conditions: SQL[] = [];
    if (!includeInactive) conditions.push(eq(proceduresCatalog.isActive, true));
    if (clinicId) {
      const clinicFilter = or(eq(proceduresCatalog.clinicId, clinicId), isNull(proceduresCatalog.clinicId));
      if (clinicFilter) conditions.push(clinicFilter);
    }
    if (search) conditions.push(ilike(proceduresCatalog.name, `%${search}%`));

    const results = await db
      .select()
      .from(proceduresCatalog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(proceduresCatalog.name)
      .limit(limit);

    return NextResponse.json({ procedures: results });
  } catch (error) {
    console.error('Get Procedures Catalog Error:', error);
    return NextResponse.json({ error: 'Failed to fetch procedures' }, { status: 500 });
  }
}

function canManageCatalog(sessionClaims: unknown): boolean {
  return isSuperAdmin(sessionClaims) || isClinicAdmin(sessionClaims);
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageCatalog(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name || '').trim();
  const defaultCost = body.defaultCost !== undefined ? String(body.defaultCost) : '0';
  const clinicId = body.clinicId ? String(body.clinicId) : null;

  if (!name) {
    return NextResponse.json({ error: 'Procedure name is required' }, { status: 400 });
  }

  try {
    const id = body.id || `proc_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)}_${Date.now().toString().slice(-4)}`;
    await db.insert(proceduresCatalog).values({
      id,
      name,
      defaultCost,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      clinicId,
    });
    const inserted = await db.select().from(proceduresCatalog).where(eq(proceduresCatalog.id, id)).limit(1);
    return NextResponse.json({ success: true, procedure: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('Create Procedure Error:', error);
    return NextResponse.json({ error: 'Failed to create procedure' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageCatalog(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
  }

  const body = await req.json();
  const id = String(body.id || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Procedure id is required' }, { status: 400 });
  }

  try {
    const existing = await db.select().from(proceduresCatalog).where(eq(proceduresCatalog.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Procedure not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) {
      const n = String(body.name).trim();
      if (!n) return NextResponse.json({ error: 'Procedure name cannot be empty' }, { status: 400 });
      updates.name = n;
    }
    if (body.defaultCost !== undefined) updates.defaultCost = String(body.defaultCost);
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    await db.update(proceduresCatalog).set(updates).where(eq(proceduresCatalog.id, id));
    const updated = await db.select().from(proceduresCatalog).where(eq(proceduresCatalog.id, id)).limit(1);
    return NextResponse.json({ success: true, procedure: updated[0] });
  } catch (error) {
    console.error('Update Procedure Error:', error);
    return NextResponse.json({ error: 'Failed to update procedure' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!canManageCatalog(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Procedure id is required' }, { status: 400 });
  }

  try {
    const existing = await db.select().from(proceduresCatalog).where(eq(proceduresCatalog.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Procedure not found' }, { status: 404 });
    }
    await db.update(proceduresCatalog).set({ isActive: false, updatedAt: new Date() }).where(eq(proceduresCatalog.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Procedure Error:', error);
    return NextResponse.json({ error: 'Failed to delete procedure' }, { status: 500 });
  }
}