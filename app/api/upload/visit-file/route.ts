import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uploadToR2, deleteFromR2, r2PublicUrl } from '@/lib/r2';
import { canManageClinical } from '@/lib/auth/claims';

export async function POST(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManageClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const fileId = `visit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const key = `visits/${fileId}`;

    await uploadToR2({ key, body: bytes, contentType: file.type || 'application/octet-stream' });

    return NextResponse.json({
      success: true,
      file: {
        fileId: key,
        fileName: file.name,
        url: r2PublicUrl(key),
        type: file.type || 'application/octet-stream',
      },
    });
  } catch (error) {
    console.error('Visit File Upload Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canManageClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized - Clinical staff only' }, { status: 403 });
  }

  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'Missing file key' }, { status: 400 });
  }

  try {
    await deleteFromR2(key);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Visit File Delete Error:', error);
    return NextResponse.json(
      { error: (error as { message?: string }).message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}