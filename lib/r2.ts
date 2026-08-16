import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

// Public URL for an object. R2_ENDPOINT_URL points at the bucket's S3-compatible
// endpoint (https://<account>.r2.cloudflarestorage.com/<bucket>), so the public
// URL is endpoint + "/" + key.
export function r2PublicUrl(key: string): string {
  const base = (process.env.R2_ENDPOINT_URL || '').replace(/\/+$/, '');
  if (!base) return '';
  return `${base}/${key}`;
}