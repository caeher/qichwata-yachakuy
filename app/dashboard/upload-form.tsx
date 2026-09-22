"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { QUOTA_STORAGE } from "@/lib/api/quota-codes";

export function UploadForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    try {
      let response: Response;
      if (file) {
        const data = new FormData();
        data.append("file", file);
        response = await fetch("/api/documents", {
          method: "POST",
          body: data,
        });
      } else if (text.trim().length > 0) {
        response = await fetch("/api/documents/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      } else {
        setError("Selecciona un archivo o pega un texto.");
        setLoading(false);
        return;
      }

      const payload = await response.json();
      if (!response.ok) {
        if (payload.error === QUOTA_STORAGE) {
          setError("Superas el espacio de tu plan.");
        } else if (payload.error === "file_too_large") {
          setError("El archivo supera el tamaño máximo del plan.");
        } else if (payload.error === "unsupported_type") {
          setError("Tipo de archivo no permitido.");
        } else if (payload.error === "forbidden_file") {
          setError("Este tipo de archivo no está permitido.");
        } else {
          setError("No se pudo subir el contenido.");
        }
        setLoading(false);
        return;
      }

      toast.success("Documento creado.");
      router.push(`/dashboard/documents/${payload.id}`);
      router.refresh();
    } catch {
      setError("Error de red al subir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="file">
          Archivo
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,.docx"
          className="text-sm"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="text">
          o pega un texto
        </label>
        <textarea
          id="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Subiendo…" : "Subir y calcular SHA-256"}
      </Button>
    </form>
  );
}
