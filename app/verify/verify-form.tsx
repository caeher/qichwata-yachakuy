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
  | {
      status: "pending" | "failed" | "integrity_mismatch" | "chain_unavailable";
      publicId: string;
      sha256: string;
    }
  | { status: "unknown"; certificateId: string; sha256?: string };

type Props = {
  initialHash?: string;
};

export function VerifyForm({ initialHash = "" }: Props) {
  const [hashField, setHashField] = useState(initialHash);
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

    try {
      if (!hashField.trim()) {
        setError("Pega un SHA-256 o el ID público del certificado.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            hashField.trim(),
          )
            ? { certificateId: hashField.trim() }
            : { hash: hashField.trim() },
        ),
      });

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
        setError("No se pudo consultar el hash.");
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
          <label className="text-sm font-medium" htmlFor="verify-hash">
            SHA-256 o ID público
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
              <p className="font-medium">
                {result.onChain === true
                  ? "Confirmado actualmente en Stellar"
                  : result.onChain === false
                    ? "El hash no aparece actualmente en Stellar"
                    : "Recibo local; estado actual de Stellar desconocido"}
              </p>
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
          {result.status === "unknown" ? (
            <p className="text-sm">Certificado desconocido.</p>
          ) : null}
          {result.status === "not_found" ? (
            <p className="text-sm">No hay un ancla para este hash.</p>
          ) : null}
          {result.status === "pending" ? (
            <p className="text-sm">
              Certificado emitido; anclaje pendiente de Stellar.
            </p>
          ) : null}
          {result.status === "failed" ? (
            <p className="text-sm">
              El anclaje falló y está disponible para recuperación.
            </p>
          ) : null}
          {result.status === "integrity_mismatch" ? (
            <p className="text-destructive text-sm">
              Los datos no coinciden con el hash o recibo registrado.
            </p>
          ) : null}
          {result.status === "chain_unavailable" ? (
            <p className="text-destructive text-sm">
              Stellar no está disponible; la verificación en cadena no se pudo
              confirmar.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
