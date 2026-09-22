import { Badge } from "@/components/ui/badge";
import type { DocumentDto } from "@/lib/uploads/create-document";

const labels: Record<DocumentDto["status"], string> = {
  draft: "Borrador",
  pending: "Pendiente",
  anchored: "Anclado",
  failed: "Fallido",
};

export function DocumentStatusBadge({
  status,
}: {
  status: DocumentDto["status"];
}) {
  const variant =
    status === "anchored"
      ? "default"
      : status === "failed"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{labels[status]}</Badge>;
}
