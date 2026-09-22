"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type VerifyResult =
  | {
      status: "anchored";
      sha256: string;
      network: string;
      txHash: string | null;
      ledger: number | null;
      anchoredAt: string | null;
      owner: string | null;
      expertUrl: string | null;
      onChain: boolean | null;
      source: string;
    }
  | { status: "not_found"; sha256: string }
  | { status: "mismatch"; sha256: string; claimedSha256: string };

type Props = {
  initialHash?: string;
};

export function VerifyForm({ initialHash = "" }: Props) {
  const [hashField, setHashField] = useState(initialHash);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [clipboardFallback, setClipboardFallback] = useState<string | null>(
    null,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setClipboardFallback(null);
    setLoading(true);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];

    try {
      let response: Response;
      if (file) {
        const data = new FormData();
        data.append("file", file);
        if (hashField.trim()) {
          data.append("hash", hashField.trim());
        }
        response = await fetch("/api/verify", { method: "POST", body: data });
      } else if (text.length > 0) {
        response = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            ...(hashField.trim() ? { hash: hashField.trim() } : {}),
          }),
        });
      } else if (hashField.trim()) {
        response = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hash: hashField.trim() }),
        });
      } else {
        setError("Selecciona un archivo, pega un texto o un SHA-256.");
        setLoading(false);
        return;
      }

      const payload = await response.json();
      if (response.status === 429) {
        setError("Demasiadas comprobaciones. Espera un momento.");
        return;
      }
      if (response.status === 503 && payload.error === "chain_unavailable") {
        setError("No se pudo consultar la cadena. Inténtalo más tarde.");
        return;
      }
      if (!response.ok) {
        setError("No se pudo verificar el contenido.");
        return;
      }
      setResult(payload as VerifyResult);
    } catch {
      setError("Error de red al verificar.");
    } finally {
      setLoading(false);
    }
  }

  async function copyShareLink(sha: string) {
    const url = `${window.location.origin}/v/${sha}`;
    try {
      await navigator.clipboard.writeText(url);
      setClipboardFallback(null);
    } catch {
      setClipboardFallback(url);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="verify-file">
            Archivo
          </label>
          <input
            id="verify-file"
            name="file"
            type="file"
            className="max-w-full text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="verify-text">
            o pega un texto
          </label>
          <textarea
            id="verify-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="verify-hash">
            o pega un SHA-256
          </label>
          <input
            id="verify-hash"
            value={hashField}
            onChange={(e) => setHashField(e.target.value)}
            className="border-border bg-background w-full rounded-lg border px-3 py-2 font-mono text-xs break-all"
            spellCheck={false}
          />
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Verificando…" : "Verificar"}
        </Button>
      </form>

      {result ? (
        <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4">
          {result.status === "anchored" ? (
            <>
              <p className="font-medium">Anclado</p>
              <code className="bg-muted block rounded-md p-3 text-xs break-all">
                {result.sha256}
              </code>
              <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
                <li>Red: {result.network}</li>
                {result.txHash ? <li>Tx: {result.txHash}</li> : null}
                {result.ledger !== null ? (
                  <li>Ledger: {result.ledger}</li>
                ) : null}
                {result.anchoredAt ? (
                  <li>
                    Fecha: {new Date(result.anchoredAt).toLocaleString("es")}
                  </li>
                ) : null}
                {result.owner ? (
                  <li className="break-all">Propietario: {result.owner}</li>
                ) : null}
              </ul>
              {result.expertUrl ? (
                <a
                  href={result.expertUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium underline"
                >
                  Ver en Stellar Expert
                </a>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => copyShareLink(result.sha256)}
              >
                Copiar enlace
              </Button>
              {clipboardFallback ? (
                <input
                  readOnly
                  value={clipboardFallback}
                  className="border-border w-full rounded-lg border px-2 py-1 text-xs"
                />
              ) : null}
            </>
          ) : null}
          {result.status === "not_found" ? (
            <p className="text-sm">No hay un ancla para este hash.</p>
          ) : null}
          {result.status === "mismatch" ? (
            <>
              <p className="text-sm">
                El contenido no coincide con el hash indicado.
              </p>
              <p className="text-muted-foreground text-xs break-all">
                Calculado: {result.sha256}
              </p>
              <p className="text-muted-foreground text-xs break-all">
                Indicado: {result.claimedSha256}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
