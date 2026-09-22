import Link from "next/link";

import { DocumentActions } from "@/app/dashboard/document-actions";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db/client";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import { formatBytes } from "@/lib/format-bytes";
import { cn } from "@/lib/utils";
import {
  listDocumentsForUser,
  type DocumentDto,
} from "@/lib/uploads/create-document";

type Props = {
  searchParams: Promise<{ estado?: string }>;
};

const LIST_LIMIT = 100;

function filterDocs(docs: DocumentDto[], estado?: string) {
  if (!estado || estado === "todos") {
    return docs;
  }
  if (estado === "borrador") {
    return docs.filter((d) => d.status === "draft");
  }
  if (estado === "anclado") {
    return docs.filter((d) => d.status === "anchored");
  }
  return docs;
}

function formatDocDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", { dateStyle: "medium" });
}

export default async function DocumentsPage({ searchParams }: Props) {
  const ctx = await loadDashboardUser();
  const { estado } = await searchParams;

  if (ctx.kind !== "ready") {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-muted-foreground text-sm">
          Configura Clerk y la base de datos para ver tus documentos.
        </p>
      </main>
    );
  }

  const db = getDb();
  const all = await listDocumentsForUser(db, ctx.appUser.id, LIST_LIMIT);
  const filtered = filterDocs(all, estado);
  const atCap = all.length >= LIST_LIMIT;

  const tab = estado === "borrador" || estado === "anclado" ? estado : "todos";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
        <Button render={<Link href="/dashboard/documents/new" />}>
          Subir documento
        </Button>
      </div>

      <div
        className="bg-muted inline-flex w-fit flex-wrap gap-1 rounded-lg p-1"
        role="tablist"
        aria-label="Filtrar documentos"
      >
        {(
          [
            {
              id: "todos",
              href: "/dashboard/documents?estado=todos",
              label: "Todos",
            },
            {
              id: "borrador",
              href: "/dashboard/documents?estado=borrador",
              label: "Borrador",
            },
            {
              id: "anclado",
              href: "/dashboard/documents?estado=anclado",
              label: "Anclado",
            },
          ] as const
        ).map((item) => (
          <Link
            key={item.id}
            href={item.href}
            role="tab"
            aria-selected={tab === item.id}
            className={cn(
              "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors",
              tab === item.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {atCap ? (
        <p className="text-muted-foreground text-xs">
          Mostrando los 100 más recientes.
        </p>
      ) : null}

      {all.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground text-sm">
            Todavía no hay documentos.
          </p>
          <Button render={<Link href="/dashboard/documents/new" />}>
            Subir documento
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground text-sm">
            No hay documentos en esta vista.
          </p>
          <Link
            href="/dashboard/documents?estado=todos"
            className="text-sm font-medium underline"
          >
            Ver todos
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="font-medium hover:underline"
                      >
                        {doc.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <DocumentStatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell>{formatBytes(doc.sizeBytes)}</TableCell>
                    <TableCell>{formatDocDate(doc.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DocumentActions doc={doc} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((doc) => (
              <Card key={doc.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    <Link
                      href={`/dashboard/documents/${doc.id}`}
                      className="hover:underline"
                    >
                      {doc.name}
                    </Link>
                  </CardTitle>
                  <DocumentStatusBadge status={doc.status} />
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">
                    {formatBytes(doc.sizeBytes)} ·{" "}
                    {formatDocDate(doc.createdAt)}
                  </span>
                  <DocumentActions doc={doc} />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
