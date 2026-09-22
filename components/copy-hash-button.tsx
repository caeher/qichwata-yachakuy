"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyHashButton({
  sha256,
  className,
}: {
  sha256: string;
  className?: string;
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(sha256);
      toast.success("Hash copiado.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={handleCopy}
    >
      Copiar hash
    </Button>
  );
}
