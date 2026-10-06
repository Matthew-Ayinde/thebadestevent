import { v2 as cloudinary } from 'cloudinary';

export const CLOUDINARY_ROOT_FOLDER = 'rinwa';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(
  fileBuffer: Buffer,
  folder: string,
  fileName: string
): Promise<string> {
  const targetFolder = folder ? `${CLOUDINARY_ROOT_FOLDER}/${folder}` : CLOUDINARY_ROOT_FOLDER;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: targetFolder,
        resource_type: 'auto',
        public_id: fileName,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed'));
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
}

function extractPublicId(url: string): string | null {
  const match = url.match(/\/(?:image|video|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
  return match ? match[1] : null;
}

function detectResourceType(url: string): 'image' | 'video' | 'raw' {
  if (url.includes('/video/upload/')) return 'video';
  if (url.includes('/raw/upload/')) return 'raw';
  return 'image';
}

export async function deleteCloudinaryAssets(urls: (string | undefined | null)[]): Promise<void> {
  const valid = urls.filter((u): u is string => !!u && u.includes('cloudinary.com'));
  await Promise.all(
    valid.map(async (url) => {
      const publicId = extractPublicId(url);
      if (!publicId) return;
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: detectResourceType(url) });
      } catch (err) {
        console.error(`Cloudinary delete failed for ${publicId}:`, err);
      }
    })
  );
}

export function getOptimizedUrl(
  publicId: string,
  width?: number,
  height?: number,
  format: string = 'auto'
): string {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto',
    format,
  });
}

export function generateSignedUrl(publicId: string, expiresIn: number = 3600): string {
  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'authenticated',
    resource_type: 'image',
  });
}

// ─── Private documents (e.g. applicant résumés) ────────────────────────────────
// Stored as private raw assets so they are never reachable at a public URL;
// admins download them through short-lived signed links.

export async function uploadPrivateDocument(
  fileBuffer: Buffer,
  folder: string,
  publicId: string
): Promise<{ publicId: string; bytes: number }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${CLOUDINARY_ROOT_FOLDER}/${folder}`,
        public_id: publicId,
        resource_type: 'raw',
        type: 'private',
        overwrite: false,
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve({ publicId: result.public_id, bytes: result.bytes });
        else reject(new Error('Upload failed'));
      }
    );

    uploadStream.end(fileBuffer);
  });
}

export function privateDocumentUrl(publicId: string, expiresInSeconds = 300): string {
  return cloudinary.utils.private_download_url(publicId, '', {
    resource_type: 'raw',
    type: 'private',
    attachment: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
}

export async function deletePrivateDocument(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw', type: 'private', invalidate: true });
  } catch (err) {
    console.error(`Cloudinary private delete failed for ${publicId}:`, err);
  }
}
