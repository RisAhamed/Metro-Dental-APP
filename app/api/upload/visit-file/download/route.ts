import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPresignedUrl, extractKeyFromUrl } from '@/lib/r2';
import { canViewClinical } from '@/lib/auth/claims';

// GET /api/upload/visit-file/download?key=<r2-key>  (or &url=<stored-url>)
//
// The browser must never hit the R2 S3 endpoint directly — it requires SigV4
// auth and rejects unauthenticated requests (InvalidArgument/Authorization).
// Instead this authenticated route issues a short-lived presigned GET URL and
// 302-redirects to it, so no Authorization header ever reaches R2.
export async function GET(req: NextRequest) {
  const { sessionClaims } = await auth();
  if (!canViewClinical(sessionClaims)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const fileName = params.get('name') || 'file';
  const inline = params.get('inline') === '1';

  let key = params.get('key');
  if (!key) {
    const storedUrl = params.get('url');
    if (storedUrl && !storedUrl.startsWith('/')) {
      key = extractKeyFromUrl(storedUrl);
    }
    // Legacy fallback: older records may have passed a bare fileId
    if (!key && storedUrl?.startsWith('visits/')) {
      key = storedUrl;
    }
  }

  if (!key) {
    return NextResponse.json({ error: 'Missing file key' }, { status: 400 });
  }

  try {
    const presigned = await getPresignedUrl(key, {
      expiresIn: 300,
      fileName,
      inline,
    });
    return NextResponse.redirect(presigned, 302);
  } catch (error) {
    console.error('Visit File Download Error:', error);
    return NextResponse.json({ error: 'Failed to generate file access URL' }, { status: 500 });
  }
}
