import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getFromR2 } from '@/lib/r2';
import { canViewClinical } from '@/lib/auth/claims';

export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const key = req.nextUrl.searchParams.get('key');
  const fileName = req.nextUrl.searchParams.get('name') || 'file';

  if (!key) {
    return NextResponse.json({ error: 'Missing file key' }, { status: 400 });
  }

  try {
    const result = await getFromR2(key);
    if (!result.Body) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': result.ContentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error('Visit File Download Error:', error);
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });
  }
}