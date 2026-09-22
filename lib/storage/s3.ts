import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type { ObjectStorage } from "@/lib/storage/types";

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required when STORAGE_DRIVER=s3`);
  }
  return value;
}

export function createS3Storage(): ObjectStorage {
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
      } catch {
        return null;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
