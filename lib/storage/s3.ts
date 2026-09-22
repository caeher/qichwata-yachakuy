import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { sanitizeDownloadName } from "@/lib/storage/sign-local";
import type { SignedUrlOptions, StorageProvider } from "@/lib/storage/types";

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required when STORAGE_DRIVER=s3`);
  }
  return value;
}

export function isMissingObjectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const name = (error as { name?: string }).name;
  return name === "NoSuchKey" || name === "NotFound";
}

export function buildSignedGetInput(
  bucket: string,
  key: string,
  options: SignedUrlOptions,
): {
  Bucket: string;
  Key: string;
  ResponseContentType?: string;
  ResponseContentDisposition?: string;
} {
  const input: {
    Bucket: string;
    Key: string;
    ResponseContentType?: string;
    ResponseContentDisposition?: string;
  } = {
    Bucket: bucket,
    Key: key,
  };
  if (options.contentType) {
    input.ResponseContentType = options.contentType;
  }
  if (options.downloadName) {
    const sanitized = sanitizeDownloadName(options.downloadName);
    input.ResponseContentDisposition = `attachment; filename="${sanitized}"`;
  }
  return input;
}

export function createS3Storage(): StorageProvider {
  const client = new S3Client({
    region: required("S3_REGION"),
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: true,
    credentials: {
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
    },
  });
  const bucket = required("S3_BUCKET");

  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },
    async get(key) {
      try {
        const res = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        const bytes = await res.Body?.transformToByteArray();
        return bytes ? new Uint8Array(bytes) : null;
      } catch (error) {
        if (isMissingObjectError(error)) {
          return null;
        }
        throw error;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    async signedUrl(key, options) {
      const command = new GetObjectCommand(
        buildSignedGetInput(bucket, key, options),
      );
      return getSignedUrl(client, command, {
        expiresIn: options.expiresInSeconds,
      });
    },
  };
}
