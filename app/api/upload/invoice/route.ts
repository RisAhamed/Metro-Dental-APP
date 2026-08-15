import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(req: NextRequest) {
  const { sessionClaims } = await auth();
  const role = String(sessionClaims?.role || '');
  const isStaff = ['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(role);
  const isVendor = role === 'VENDOR';

  if (!isStaff && !isVendor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const fileId = `invoice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = join(process.cwd(), 'public', 'uploads', 'invoices');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, fileId), bytes);

    return NextResponse.json({
      success: true,
      fileId: `/uploads/invoices/${fileId}`,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
