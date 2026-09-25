import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (destination: string) => {
    throw new Error(`redirect:${destination}`);
  },
}));

import LegacyLearnPage from "@/app/aprender/page";
import LegacyVerifyPage from "@/app/verificar/page";

describe("legacy route aliases", () => {
  it("keeps repeated and scalar query parameters when redirecting /aprender", async () => {
    await expect(
      LegacyLearnPage({
        searchParams: Promise.resolve({
          course: "saludos y presencia",
          lesson: ["hola", "practica-01"],
          empty: undefined,
        }),
      }),
    ).rejects.toThrow(
      "redirect:/dashboard?course=saludos+y+presencia&lesson=hola&lesson=practica-01",
    );
  });

  it("keeps legacy certificate identifiers when redirecting /verificar", async () => {
    await expect(
      LegacyVerifyPage({
        searchParams: Promise.resolve({ identifier: "YCH-legacy-123" }),
      }),
    ).rejects.toThrow("redirect:/verify?identifier=YCH-legacy-123");
  });
});
