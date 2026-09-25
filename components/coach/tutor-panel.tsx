"use client";

import { useRef, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";

type ChatLine = {
  role: "user" | "assistant";
  content: string;
  explanation?: string;
  regionalNote?: string;
};

const suggestions = [
  "Explícame una palabra de esta unidad.",
  "Propón un diálogo breve para practicar.",
  "¿Puedes corregir una respuesta mía?",
];

export function TutorPanel({
  enrollmentId,
  unitId,
  unitTitle,
  ownerKey,
  enabled,
}: {
  enrollmentId: string;
  unitId: string;
  unitTitle: string;
  ownerKey: string;
  enabled: boolean;
}) {
  const storageKey = `yachay-coach:${ownerKey}:${enrollmentId}:${unitId}`;
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const [sessionId] = useState(() => {
    const fallback = crypto.randomUUID();
    try {
      const savedSessionId = sessionStorage.getItem(storageKey);
      if (savedSessionId) return savedSessionId;
      sessionStorage.setItem(storageKey, fallback);
    } catch {
      // Storage may be disabled; the in-memory session still works this visit.
    }
    return fallback;
  });
  const [turnsRemaining, setTurnsRemaining] = useState(12);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<string | null>(null);
  const sentRef = useRef(false);

  async function sendMessage(message = draft) {
    const trimmed = message.trim();
    if (
      !enabled ||
      !sessionId ||
      !trimmed ||
      isSending ||
      turnsRemaining <= 0 ||
      sentRef.current
    )
      return;
    sentRef.current = true;
    setIsSending(true);
    setError(null);
    setErrorKind(null);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId,
          unitId,
          sessionId,
          message: trimmed,
          history: messages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErrorKind(body.error ?? "coach_unavailable");
        throw new Error(errorText(body.error));
      }
      const reply = body.reply;
      if (
        !reply ||
        typeof reply.answer !== "string" ||
        typeof reply.explanation !== "string" ||
        typeof reply.regionalNote !== "string"
      ) {
        setErrorKind("invalid_response");
        throw new Error(errorText("invalid_response"));
      }
      setMessages((previous) => [
        ...previous,
        { role: "user", content: trimmed },
        {
          role: "assistant",
          content: reply.answer,
          explanation: reply.explanation,
          regionalNote: reply.regionalNote,
        },
      ]);
      setTurnsRemaining(
        typeof body.turnsRemaining === "number" ? body.turnsRemaining : 0,
      );
      setDraft("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : errorText("coach_unavailable"),
      );
    } finally {
      sentRef.current = false;
      setIsSending(false);
    }
  }

  const unavailableMessage = !enabled
    ? "El tutor todavía no está configurado. Puedes continuar con la práctica autónoma."
    : null;

  return (
    <section
      aria-label="Tutor de quechua"
      className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-medium">Práctica asistida</h3>
            <p className="text-muted-foreground text-xs">{unitTitle}</p>
          </div>
        </div>
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
          <MessageCircle size={14} aria-hidden="true" />
          {turnsRemaining} turnos disponibles
        </span>
      </header>

      <div
        aria-live="polite"
        aria-relevant="additions text"
        className="flex max-h-[28rem] min-h-48 flex-col gap-3 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <p className="text-muted-foreground bg-muted/60 rounded-xl p-4 text-sm leading-6">
            Pregunta por el vocabulario de la unidad, practica un diálogo o
            comparte una frase para recibir una corrección orientativa.
          </p>
        ) : null}
        {messages.map((message, index) => (
          <ChatMessage key={`${index}-${message.role}`} message={message} />
        ))}
        {isSending ? (
          <p role="status" className="text-muted-foreground text-sm">
            Yachay está preparando una respuesta…
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-3">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setDraft(suggestion);
            }}
            disabled={!enabled || isSending || turnsRemaining <= 0}
            className="border-border hover:bg-muted rounded-full border px-3 py-1.5 text-left text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <PromptComposer
        value={draft}
        onChange={setDraft}
        onSubmit={() => void sendMessage()}
        disabled={!enabled || !sessionId || isSending || turnsRemaining <= 0}
      />
      <div className="px-4 pb-4">
        {enabled && !sessionId ? (
          <p role="status" className="text-muted-foreground text-xs">
            Iniciando la sesión de práctica…
          </p>
        ) : null}
        {unavailableMessage ? (
          <p role="status" className="text-muted-foreground text-xs">
            {unavailableMessage}
          </p>
        ) : null}
        {turnsRemaining <= 0 ? (
          <p role="status" className="text-muted-foreground text-xs">
            Límite de turnos alcanzado. La sesión se podrá renovar 30 minutos
            después de la última respuesta.
          </p>
        ) : null}
        {error ? (
          <div role="alert" className="text-destructive text-xs">
            <p>{error}</p>
            {errorKind !== "session_expired" && draft.trim() ? (
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={isSending || !enabled}
                className="mt-2 font-semibold underline disabled:opacity-50"
              >
                Reintentar
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="text-muted-foreground mt-2 text-[11px]">
          Orientación para practicar; no reemplaza a una persona hablante ni a
          una fuente académica. El tutor no guarda avance ni emite certificados.
        </p>
      </div>
    </section>
  );
}

function ChatMessage({ message }: { message: ChatLine }) {
  return (
    <article
      className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted text-foreground mr-auto"}`}
    >
      <p className="whitespace-pre-wrap">{message.content}</p>
      {message.explanation ? (
        <p className="mt-2 border-t border-current/15 pt-2 text-xs">
          {message.explanation}
        </p>
      ) : null}
      {message.regionalNote ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Nota regional: {message.regionalNote}
        </p>
      ) : null}
    </article>
  );
}

function PromptComposer({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <form
      className="border-t p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="sr-only" htmlFor="coach-prompt">
        Pregunta para Yachay
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="coach-prompt"
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, 600))}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              event.keyCode !== 229
            ) {
              event.preventDefault();
              onSubmit();
            }
          }}
          maxLength={600}
          rows={2}
          placeholder="¿Cómo puedo decir…?"
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-12 flex-1 resize-y rounded-xl border px-3 py-2 text-sm outline-none focus-visible:ring-3 disabled:opacity-60"
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Enviar pregunta"
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex size-11 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="text-muted-foreground mt-2 text-right text-[11px]">
        {value.length}/600
      </p>
    </form>
  );
}

function errorText(code: unknown) {
  switch (code) {
    case "unauthorized":
    case "session_expired":
      return "Tu sesión venció. Inicia sesión y vuelve a intentarlo.";
    case "rate_limited":
    case "session_limit":
      return "Alcanzaste el límite de uso por ahora.";
    case "session_active":
      return "Ya hay otra sesión de práctica activa para esta unidad. Continúa en esa pestaña o espera 30 minutos.";
    case "provider_timeout":
      return "El tutor tardó demasiado en responder. Tu texto sigue aquí; puedes reintentar.";
    case "provider_rate_limited":
      return "El servicio está recibiendo muchas solicitudes. Intenta de nuevo en un momento.";
    case "invalid_response":
      return "El tutor no pudo preparar una respuesta válida. Tu texto sigue aquí; puedes reintentar.";
    case "context_too_large":
      return "Esta unidad todavía no se puede usar con el tutor. Puedes continuar con la práctica autónoma.";
    default:
      return "El tutor no está disponible ahora. Tu texto sigue aquí; puedes reintentar.";
  }
}
