import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentActions } from "@/app/dashboard/document-actions";
import { DocumentAnchorPanel } from "@/app/dashboard/document-anchor-panel";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db/client";
import { loadDocumentDetail } from "@/lib/anchors/document-detail";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { formatBytes } from "@/lib/format-bytes";

type Props = { params: Promise<{ id: string }> };

export default async function DocumentDetailPage({ params }: Props) {
  const ctx = await loadDashboardUser();
  if (ctx.kind !== "ready") {
    notFound();
  }

  const { id } = await params;
  const db = getDb();
  const detail = await loadDocumentDetail(db, ctx.appUser.id, id);
  if (!detail) {
    notFound();
  }

  const created = new Date(detail.createdAt).toLocaleString("es");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <Button
        variant="outline"
        className="w-fit"
        render={<Link href="/dashboard/documents" />}
      >
        Documentos
      </Button>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {detail.name}
          </h1>
          <DocumentStatusBadge status={detail.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          {detail.mimeType} · {formatBytes(detail.sizeBytes)} · {created}
        </p>
      </div>

      <code className="bg-muted block rounded-md p-3 font-mono text-xs break-all">
        {detail.sha256}
      </code>

      <DocumentActions doc={detail} variant="detail" />

      <DocumentAnchorPanel detail={detail} />

      {detail.anchor ? (
        <Card>
          <CardHeader>
            <CardTitle>Recibo de anclaje</CardTitle>
            <CardDescription>
              Red {detail.anchor.network === "mainnet" ? "mainnet" : "testnet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>
              <span className="text-muted-foreground">Tx: </span>
              <code className="text-xs break-all">{detail.anchor.txHash}</code>
            </p>
            <p>
              <span className="text-muted-foreground">Ledger: </span>
              {detail.anchor.ledger ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Fecha: </span>
              {new Date(detail.anchor.anchoredAt).toLocaleString("es")}
            </p>
            <p>
              <span className="text-muted-foreground">Comisión: </span>
              {detail.anchor.feeXlm ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Contrato: </span>
              {detail.anchor.contractId ?? "—"}
            </p>
            <Button
              variant="outline"
              className="mt-2 w-fit"
              render={
                <a
                  href={detail.anchor.expertUrl}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              Ver en Stellar Expert
            </Button>
          </CardContent>
        </Card>
      ) : detail.status === "anchored" ? (
        <p className="text-muted-foreground text-sm">Recibo no disponible.</p>
      ) : null}
    </main>
  );
}
