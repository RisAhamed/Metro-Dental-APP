import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { sundayTasks } from '@/lib/db/schema/sundayTasks';
import { isSuperAdmin, isStaff } from '@/lib/auth/claims';
import { eq, asc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isStaff(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get('includeInactive') === 'true';

  try {
    let records;
    if (includeInactive && isSuperAdmin(sessionClaims)) {
      // Admin view: show all (active + inactive)
      records = await db.select().from(sundayTasks).orderBy(asc(sundayTasks.name));
    } else {
      // Assistant dropdown: active tasks only
      records = await db
        .select()
        .from(sundayTasks)
        .where(eq(sundayTasks.isActive, true))
        .orderBy(asc(sundayTasks.name));
    }

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Get Sunday Tasks Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Sunday tasks' }, { status: 500 });
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(req: NextRequest) {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { id, name, amount, description } = body;

  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  const taskId = id || `task_${slugify(name)}`;
  const taskAmount = amount !== undefined && amount !== '' ? Number(amount) : 250;

  try {
    await db
      .insert(sundayTasks)
      .values({
        id: taskId,
        name,
        amount: String(taskAmount),
        isActive: true,
        description: description || null,
        createdBy: userId,
      })
      .onConflictDoNothing();

    const created = await db
      .select()
      .from(sundayTasks)
      .where(eq(sundayTasks.id, taskId))
      .limit(1);

    return NextResponse.json({ success: true, task: created[0] || null }, { status: 201 });
  } catch (error) {
    console.error('Create Sunday Task Error:', error);
    return NextResponse.json({ error: 'Failed to create Sunday task' }, { status: 500 });
  }
}