import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

export interface StorageDriver {
  save(buffer: Buffer, originalName: string, contentType: string): Promise<string>;
}

function safeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (!/^\.[a-z0-9]{1,5}$/.test(ext)) return "";
  return ext;
}

class LocalStorageDriver implements StorageDriver {
  private uploadDir: string;
  private publicPath: string;

  constructor() {
    this.uploadDir = process.env.LOCAL_UPLOAD_DIR ?? "public/uploads";
    this.publicPath = process.env.LOCAL_UPLOAD_PUBLIC_PATH ?? "/uploads";
  }

  async save(buffer: Buffer, originalName: string, _contentType: string): Promise<string> {
    const dir = path.join(process.cwd(), this.uploadDir);
    await fs.mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}${safeExtension(originalName)}`;
    await fs.writeFile(path.join(dir, filename), buffer);
    return `${this.publicPath}/${filename}`;
  }
}

class S3StorageDriver implements StorageDriver {
  async save(buffer: Buffer, originalName: string, contentType: string): Promise<string> {
    // Loaded dynamically so the AWS SDK is only required when STORAGE_DRIVER=s3.
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION;
    if (!bucket || !region) {
      throw new Error("S3_BUCKET and S3_REGION must be set when STORAGE_DRIVER=s3");
    }

    const client = new S3Client({
      region,
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
    });

    const key = `uploads/${randomUUID()}${safeExtension(originalName)}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (base) return `${base}/${key}`;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}

let driver: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (driver) return driver;
  driver = process.env.STORAGE_DRIVER === "s3" ? new S3StorageDriver() : new LocalStorageDriver();
  return driver;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function assertValidImageUpload(contentType: string, size: number) {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error("Unsupported file type. Allowed: PNG, JPEG, WEBP, GIF.");
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error("File too large. Maximum size is 5MB.");
  }
}
