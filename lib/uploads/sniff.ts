import {
  ForbiddenFileError,
  UnsupportedTypeError,
} from "@/lib/uploads/quota-error";

const EXEC_EXTENSIONS = [
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".com",
  ".scr",
  ".msi",
  ".apk",
  ".sh",
  ".bash",
  ".ps1",
  ".jar",
  ".app",
  ".dmg",
  ".iso",
];

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function normalizeFilename(name: string) {
  return name.trim().replace(/\.+$/, "").toLowerCase();
}

function extensionOf(name: string) {
  const normalized = normalizeFilename(name);
  const idx = normalized.lastIndexOf(".");
  if (idx === -1) return "";
  return normalized.slice(idx);
}

function startsWith(bytes: Uint8Array, sig: number[], offset = 0) {
  return sig.every((b, i) => bytes[offset + i] === b);
}

function hasBinaryMagic(bytes: Uint8Array) {
  if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) return true;
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x7f &&
    bytes[1] === 0x45 &&
    bytes[2] === 0x4c &&
    bytes[3] === 0x46
  ) {
    return true;
  }
  const mach = [
    [0xfe, 0xed, 0xfa, 0xce],
    [0xfe, 0xed, 0xfa, 0xcf],
    [0xce, 0xfa, 0xed, 0xfe],
    [0xcf, 0xfa, 0xed, 0xfe],
  ];
  if (mach.some((sig) => startsWith(bytes, sig))) return true;
  if (bytes.length >= 2 && bytes[0] === 0x23 && bytes[1] === 0x21) return true;
  return false;
}

function isDocx(bytes: Uint8Array) {
  if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return false;
  const text = new TextDecoder("latin1").decode(bytes);
  return text.includes("word/document.xml");
}

function isUtf8Text(bytes: Uint8Array) {
  if (bytes.includes(0)) return false;
  if (hasBinaryMagic(bytes)) return false;
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return decoded.length >= 0;
  } catch {
    return false;
  }
}

function detectMime(bytes: Uint8Array, filename: string, declaredMime: string) {
  const ext = extensionOf(filename);
  const mime =
    declaredMime && declaredMime.length > 0
      ? declaredMime
      : (MIME_BY_EXT[ext] ?? "");

  if (
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) &&
    (mime === "image/png" || ext === ".png")
  ) {
    return "image/png";
  }
  if (
    startsWith(bytes, [0xff, 0xd8, 0xff]) &&
    (mime === "image/jpeg" || ext === ".jpg" || ext === ".jpeg")
  ) {
    return "image/jpeg";
  }
  if (
    (startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
      startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) &&
    (mime === "image/gif" || ext === ".gif")
  ) {
    return "image/gif";
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50 &&
    (mime === "image/webp" || ext === ".webp")
  ) {
    return "image/webp";
  }
  if (
    startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) &&
    (mime === "application/pdf" || ext === ".pdf")
  ) {
    return "application/pdf";
  }
  if (isDocx(bytes) && (mime.includes("wordprocessingml") || ext === ".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (
    startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) &&
    mime !== "application/pdf" &&
    ext !== ".pdf"
  ) {
    return null;
  }

  if (mime === "text/markdown" || ext === ".md") {
    if (isUtf8Text(bytes)) return "text/markdown";
  }
  if (mime === "text/plain" || ext === ".txt" || mime.startsWith("text/")) {
    if (isUtf8Text(bytes))
      return ext === ".md" ? "text/markdown" : "text/plain";
  }

  return null;
}

export function assertAllowedUpload(
  bytes: Uint8Array,
  filename: string,
  declaredMime: string,
): string {
  const normalized = normalizeFilename(filename);
  for (const ext of EXEC_EXTENSIONS) {
    if (normalized.endsWith(ext)) {
      throw new ForbiddenFileError();
    }
  }

  if (hasBinaryMagic(bytes)) {
    throw new ForbiddenFileError();
  }

  if (startsWith(bytes, [0x50, 0x4b]) && !isDocx(bytes)) {
    throw new ForbiddenFileError();
  }

  const mime = detectMime(bytes, filename, declaredMime);
  if (!mime) {
    throw new UnsupportedTypeError();
  }

  return mime;
}
