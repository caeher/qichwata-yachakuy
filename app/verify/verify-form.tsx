"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { VerificationStatus } from "@/components/yachay/certificates";

type VerifyResult =
  | {
      status: "anchored";
      publicId: string;
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
type LegacyResult = { status: "legacy"; certificateId: string };

type Props = {
  initialHash?: string;
  configuredNetwork?: string;
};

export function VerifyForm({ initialHash = "", configuredNetwork }: Props) {
  const [hashField, setHashField] = useState(initialHash);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(VerifyResult | LegacyResult) | null>(
    null,
  );
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

      if (/^YCH-[A-Za-z0-9-]+$/i.test(hashField.trim())) {
        setResult({ status: "legacy", certificateId: hashField.trim() });
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
        <div className="border-border bg-paper flex flex-col gap-3 rounded-2xl border p-4">
          {result.status === "anchored" ? (
            <>
              <VerificationStatus
                status={
                  result.onChain === true
                    ? "anchored"
                    : result.onChain === false
                      ? "mismatch"
                      : "unavailable"
                }
              />
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
              <a
                className="text-sm font-medium underline"
                href={`/certificates/${result.publicId}`}
              >
                Abrir detalle público del certificado
              </a>
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
            <VerificationStatus status="unknown" />
          ) : null}
          {result.status === "legacy" ? (
            <VerificationStatus status="unknown">
              {result.certificateId} es una referencia heredada. No hay
              evidencia de finalización ni anclaje asociada; no se reconoce como
              certificado verificado.
            </VerificationStatus>
          ) : null}
          {result.status === "not_found" ? (
            <VerificationStatus status="unknown">
              No hay un ancla ni un certificado raíz asociado a este hash.
            </VerificationStatus>
          ) : null}
          {result.status === "pending" ? (
            <VerificationStatus status="pending" />
          ) : null}
          {result.status === "failed" ? (
            <VerificationStatus status="failed" />
          ) : null}
          {result.status === "integrity_mismatch" ? (
            <VerificationStatus status="mismatch" />
          ) : null}
          {result.status === "chain_unavailable" ? (
            <VerificationStatus status="unavailable" />
          ) : null}
          {"publicId" in result && result.status !== "anchored" ? (
            <a
              className="text-sm font-medium underline"
              href={`/certificates/${result.publicId}`}
            >
              Abrir detalle público del certificado
            </a>
          ) : null}
          {configuredNetwork && result.status !== "legacy" ? (
            <p className="text-muted-foreground text-xs">
              Red configurada para esta consulta: {configuredNetwork}.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
