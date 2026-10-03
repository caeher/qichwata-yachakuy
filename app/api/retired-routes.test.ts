import { describe, expect, it } from "vitest";

import {
  GET as getDocuments,
  POST as createDocument,
} from "@/app/api/documents/route";
import { POST as createText } from "@/app/api/documents/text/route";
import { POST as anchorDocument } from "@/app/api/documents/[id]/anchor/route";
import { GET as downloadDocument } from "@/app/api/documents/[id]/download/route";
import { GET as downloadObject } from "@/app/api/storage/download/route";

describe("retired document and object routes", () => {
  it("rejects every former document and download operation explicitly", async () => {
    const responses = await Promise.all([
      getDocuments(),
      createDocument(),
      createText(),
      anchorDocument(),
      downloadDocument(),
      downloadObject(),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(410);
      expect(await response.json()).toEqual({ error: "resource_retired" });
    }
  });
});
