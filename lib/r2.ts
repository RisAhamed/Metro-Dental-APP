import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const endpoint = process.env.R2_ENDPOINT_URL;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'dental-clinic-files';

export const r2 = endpoint && accessKeyId && secretAccessKey
  ? new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  : null;

export async function uploadToR2({
  key,
  body,
  contentType,
}: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<string> {
  if (!r2) throw new Error('R2 is not configured');
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

export async function deleteFromR2(key: string): Promise<void> {
  if (!r2) return;
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

export async function getFromR2(key: string) {
  if (!r2) throw new Error('R2 is not configured');
  return r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

// Presigned GET URL for an object. The S3 API endpoint requires SigV4 auth,
// so direct links to it are rejected — clients must use a presigned URL
// (auth embedded in query params) or go through our authenticated API.
export async function getPresignedUrl(
  key: string,
  options: { expiresIn?: number; fileName?: string; inline?: boolean } = {}
): Promise<string> {
  if (!r2) throw new Error('R2 is not configured');
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ...(options.fileName
      ? {
          ResponseContentDisposition: `${options.inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(
            options.fileName
          )}`,
        }
      : {}),
  });
  return getSignedUrl(r2, command, { expiresIn: options.expiresIn ?? 3600 });
}

// Extract the object key from a stored R2 URL
// (https://<account>.r2.cloudflarestorage.com/<bucket>/<key>)
export function extractKeyFromUrl(url: string): string | null {
  const base = (process.env.R2_ENDPOINT_URL || '').replace(/\/+$/, '');
  if (base && url.startsWith(`${base}/`)) {
    return decodeURIComponent(url.slice(base.length + 1));
  }
  // Fallback: assume the key starts after the bucket segment
  const bucketPrefix = `/${R2_BUCKET}/`;
  const idx = url.indexOf(bucketPrefix);
  if (idx !== -1) {
    try {
      return decodeURIComponent(url.slice(idx + bucketPrefix.length));
    } catch {
      return url.slice(idx + bucketPrefix.length);
    }
  }
  return null;
}