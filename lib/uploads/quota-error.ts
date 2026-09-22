import { QuotaExceededError, UploadTooLargeError } from "@/db/quota";

export { QuotaExceededError, UploadTooLargeError };

export class UnsupportedTypeError extends Error {
  constructor() {
    super("unsupported_type");
    this.name = "UnsupportedTypeError";
  }
}

export class ForbiddenFileError extends Error {
  constructor() {
    super("forbidden_file");
    this.name = "ForbiddenFileError";
  }
}
