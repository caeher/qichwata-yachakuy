export type SignedUrlOptions = {
  expiresInSeconds: number;
  downloadName?: string;
  contentType?: string;
};

export type StorageProvider = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
  signedUrl(key: string, options: SignedUrlOptions): Promise<string>;
};

export type ObjectStorage = StorageProvider;
