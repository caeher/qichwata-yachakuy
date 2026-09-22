import { NextResponse } from "next/server";

import { QuotaExceededError, UploadTooLargeError } from "@/db/quota";
import {
  ForbiddenFileError,
  UnsupportedTypeError,
} from "@/lib/uploads/quota-error";

export function documentErrorResponse(error: unknown) {
  if (error instanceof UploadTooLargeError) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: error.maxBytes },
      { status: 413 },
    );
  }
  if (error instanceof QuotaExceededError) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        limitBytes: error.limitBytes,
        usedBytes: error.usedBytes,
      },
      { status: 409 },
    );
  }
  if (error instanceof UnsupportedTypeError) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (error instanceof ForbiddenFileError) {
    return NextResponse.json({ error: "forbidden_file" }, { status: 415 });
  }
  if (error instanceof Error && error.message === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "invalid_input") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (error instanceof Error && error.message === "storage_failed") {
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
