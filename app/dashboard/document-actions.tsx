"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CopyHashButton } from "@/components/copy-hash-button";
import type { DocumentDto } from "@/lib/uploads/create-document";

type Props = {
  doc: Pick<DocumentDto, "id" | "name" | "sha256" | "status">;
  variant?: "menu" | "detail";
};

export function DocumentActions({ doc, variant = "menu" }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const deleteDescription =
    doc.status === "anchored"
      ? "Se quitará de tu cuenta y se liberará el espacio. El hash puede seguir en Stellar. La verificación pública puede seguir encontrándolo en la red."
      : "Se eliminará el documento y se liberará el espacio.";

  async function confirmDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        toast.error("No se pudo eliminar el documento.");
        return;
      }
      toast.success("Documento eliminado.");
      setDialogOpen(false);
      if (variant === "detail") {
        router.push("/dashboard/documents");
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Error de red al eliminar.");
    } finally {
      setDeleting(false);
    }
  }

  if (variant === "detail") {
    return (
      <div className="flex flex-wrap gap-2">
        <CopyHashButton sha256={doc.sha256} />
        <Button variant="outline" render={<Link href={`/v/${doc.sha256}`} />}>
          Abrir verificación
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={doc.status === "pending"}
          onClick={() => setDialogOpen(true)}
        >
          Eliminar
        </Button>
        <DeleteDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          name={doc.name}
          description={deleteDescription}
          deleting={deleting}
          onConfirm={confirmDelete}
        />
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm">
              Acciones
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={<Link href={`/dashboard/documents/${doc.id}`} />}
          >
            Ver detalle
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(doc.sha256);
                toast.success("Hash copiado.");
              } catch {
                toast.error("No se pudo copiar.");
              }
            }}
          >
            Copiar hash
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`/v/${doc.sha256}`} />}>
            Abrir verificación
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {doc.status === "pending" ? (
            <DropdownMenuItem disabled>
              No se puede eliminar mientras se ancla
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDialogOpen(true)}
            >
              Eliminar
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        name={doc.name}
        description={deleteDescription}
        deleting={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  name,
  description,
  deleting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  deleting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!deleting}>
        <DialogHeader>
          <DialogTitle>¿Eliminar {name}?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={onConfirm}
          >
            {deleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
