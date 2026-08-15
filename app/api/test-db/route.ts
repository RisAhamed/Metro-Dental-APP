import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { isSuperAdmin } from '@/lib/auth/claims';
import { users } from '@/lib/db/schema/users';

export async function GET() {
  const { sessionClaims, userId } = await auth();
  if (!isSuperAdmin(sessionClaims) || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const checks: Record<string, unknown> = {
    databaseUrlSet: Boolean(process.env.DATABASE_URL),
    resendKeySet: Boolean(process.env.RESEND_API_KEY),
    resendFrom: process.env.RESEND_FROM_EMAIL || null,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
  };

  try {
    const result = await db.execute(sql`SELECT 1 AS ok`);
    checks.ping = result;
  } catch (error) {
    checks.ping = { error: String(error) };
    return NextResponse.json({ success: false, checks }, { status: 500 });
  }

  try {
    const schemaResult = await db.execute(
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`
    );
    checks.userColumns = schemaResult;
  } catch (error) {
    checks.userColumns = { error: String(error) };
  }

  try {
    const usersCount = await db.select({ count: sql`count(*)::int` }).from(users);
    checks.usersCount = usersCount[0]?.count ?? 0;
  } catch (error) {
    checks.usersCount = { error: String(error) };
  }

  return NextResponse.json({ success: true, checks });
}
