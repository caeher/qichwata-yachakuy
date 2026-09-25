import Link from "next/link";
import type { ReactNode } from "react";
import {
  Check,
  Circle,
  LoaderCircle,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "cn";

type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;

export function ActionLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  loading = false,
  disabled = false,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg" | "icon";
  className?: string;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isUnavailable = disabled || loading;
  const linkClassName = cn(
    buttonVariants({ variant, size, className }),
    isUnavailable && "pointer-events-none opacity-50",
  );
  const content = (
    <>
      {loading ? (
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
      ) : null}
      {children}
    </>
  );

  if (isUnavailable) {
    return (
      <span
        aria-busy={loading || undefined}
        aria-disabled="true"
        className={linkClassName}
      >
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={linkClassName}>
      {content}
    </Link>
  );
}

const statusBadgeVariants = cva("border-0", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground",
      success: "bg-leaf-pale text-leaf-dark",
      pending: "bg-clay-pale text-clay-dark",
      error: "bg-destructive/10 text-destructive",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "success" | "pending" | "error";
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge className={cn(statusBadgeVariants({ tone }), className)}>
      {children}
    </Badge>
  );
}

export function YachayProgress({
  value,
  label,
  tone = "leaf",
  size = "normal",
  className,
}: {
  value: number;
  label: string;
  tone?: "leaf" | "clay";
  size?: "compact" | "normal";
  className?: string;
}) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return (
    <Progress
      value={boundedValue}
      aria-label={label}
      tone={tone}
      size={size}
      className={className}
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  size = "hero",
  level = "h2",
  surface = "paper",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  size?: "compact" | "hero";
  level?: "h1" | "h2";
  surface?: "paper" | "leaf" | "ink";
  className?: string;
}) {
  const surfaceClasses = {
    paper: "text-ink-soft [&_h2]:text-ink [&_p:first-child]:text-leaf-dark",
    leaf: "text-paper [&_h2]:text-paper [&_p:first-child]:text-paper",
    ink: "text-paper [&_h2]:text-paper [&_p:first-child]:text-paper/80",
  }[surface];
  const Heading = level;
  return (
    <div className={cn("flex flex-col gap-2", surfaceClasses, className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-[0.18em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <Heading
        className={cn(
          "font-heading leading-tight",
          size === "hero" ? "text-3xl md:text-4xl" : "text-xl md:text-2xl",
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p className="max-w-2xl text-sm leading-6">{description}</p>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  size = "compact",
  surface = "paper",
  className,
}: {
  label: string;
  value: ReactNode;
  size?: "compact" | "hero";
  surface?: "paper" | "leaf" | "ink";
  className?: string;
}) {
  const surfaceClasses = {
    paper: "bg-paper text-ink [&_p]:text-ink-soft",
    leaf: "bg-leaf text-paper [&_p]:text-paper/80",
    ink: "bg-ink text-paper [&_p]:text-paper/70",
  }[surface];
  return (
    <Card variant="learning" className={cn("p-5", surfaceClasses, className)}>
      <p className="text-xs font-semibold tracking-[0.14em] uppercase">
        {label}
      </p>
      <p
        className={cn(
          "font-heading mt-2",
          size === "hero" ? "text-3xl" : "text-2xl",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

export function ModuleCard({
  title,
  description,
  href,
  progress,
  accent = "leaf",
  status = "available",
  statusLabel,
  level,
  durationMinutes,
  unitCount,
}: {
  title: string;
  description: string;
  href?: string;
  progress?: number;
  accent?: "leaf" | "clay" | "gold";
  status?: "available" | "in-progress" | "completed" | "preparation" | "demo";
  statusLabel?: string;
  level?: string;
  durationMinutes?: number;
  unitCount?: number;
}) {
  const tone = accent === "clay" ? "clay" : "leaf";
  const badgeTone =
    status === "completed"
      ? "success"
      : status === "in-progress"
        ? "pending"
        : "neutral";
  const visualStatus =
    status === "in-progress" || status === "completed" ? status : "available";
  const label =
    statusLabel ??
    {
      preparation: "En preparación",
      available: "Disponible",
      demo: "Demostración",
      "in-progress": "En curso",
      completed: "Completado",
    }[status];
  const content = (
    <>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="font-heading text-xl">{title}</CardTitle>
          <StatusBadge tone={badgeTone}>{label}</StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground leading-6">{description}</p>
        {level ||
        typeof durationMinutes === "number" ||
        typeof unitCount === "number" ? (
          <p className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {level ? <span>{level}</span> : null}
            {typeof durationMinutes === "number" ? (
              <span>{durationMinutes} min</span>
            ) : null}
            {typeof unitCount === "number" ? (
              <span>{unitCount} unidades</span>
            ) : null}
          </p>
        ) : null}
        {typeof progress === "number" ? (
          <div className="flex flex-col gap-2">
            <YachayProgress
              value={progress}
              label={`Progreso de ${title}`}
              tone={tone}
              size="compact"
            />
            <span className="text-muted-foreground text-xs">
              {Math.round(progress)}% recorrido
            </span>
          </div>
        ) : null}
        {href ? (
          <span className="text-leaf-dark text-sm font-semibold">
            Explorar módulo <span aria-hidden>↗</span>
          </span>
        ) : null}
      </CardContent>
    </>
  );

  return href ? (
    <Card
      variant="learning"
      accent={accent}
      status={visualStatus}
      className="gap-4"
    >
      <Link
        href={href}
        className="focus-visible:ring-ring/50 block rounded-[inherit] outline-none focus-visible:ring-3"
      >
        {content}
      </Link>
    </Card>
  ) : (
    <Card
      variant="learning"
      accent={accent}
      status={visualStatus}
      className="gap-4"
    >
      {content}
    </Card>
  );
}

export function LessonRow({
  title,
  description,
  status,
  href,
  actionLabel,
  onAction,
  disabled = false,
}: {
  title: string;
  description?: string;
  status: "pending" | "completed";
  href?: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  const row = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          status === "completed"
            ? "bg-leaf-pale text-leaf-dark"
            : "bg-muted text-muted-foreground",
        )}
      >
        {status === "completed" ? (
          <Check aria-hidden className="size-4" />
        ) : (
          <Circle aria-hidden className="size-3" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        {description ? (
          <span className="text-muted-foreground mt-1 block text-sm">
            {description}
          </span>
        ) : null}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge tone={status === "completed" ? "success" : "pending"}>
          {status === "completed" ? "Completada" : "Pendiente"}
        </StatusBadge>
        {actionLabel && onAction && !href ? (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </>
  );
  const classes =
    "flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-paper p-4 text-left";
  return href ? (
    <Link
      href={href}
      className={cn(
        classes,
        "hover:bg-muted focus-visible:ring-ring/50 transition-colors outline-none focus-visible:ring-3",
      )}
    >
      {row}
    </Link>
  ) : (
    <div className={classes}>{row}</div>
  );
}

export function ChatMessage({
  role,
  children,
}: {
  role: "user" | "assistant" | "error";
  children: ReactNode;
}) {
  const style = {
    user: "ml-auto bg-leaf text-paper",
    assistant: "mr-auto border border-border bg-paper text-ink",
    error:
      "mr-auto border border-destructive/30 bg-destructive/10 text-destructive",
  }[role];
  return (
    <div
      role="group"
      className={cn(
        "flex max-w-[min(88%,38rem)] items-start gap-2 rounded-2xl px-4 py-3 text-sm leading-6",
        style,
      )}
      aria-label={`${role === "user" ? "Tú" : role === "assistant" ? "Tutor" : "Error"}: ${typeof children === "string" ? children : "mensaje"}`}
    >
      {role === "user" ? (
        <UserRound aria-hidden className="mt-1 size-4 shrink-0" />
      ) : (
        <MessageCircle aria-hidden className="mt-1 size-4 shrink-0" />
      )}
      <div>{children}</div>
    </div>
  );
}

export function FeedbackState({
  state,
  title,
  description,
}: {
  state: "loading" | "empty" | "error";
  title: string;
  description?: string;
}) {
  const role = state === "error" ? "alert" : "status";
  return (
    <Card
      variant="marketing"
      role={role}
      aria-live={state === "error" ? undefined : "polite"}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {state === "loading" ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : null}
          {title}
        </CardTitle>
        {description ? (
          <p className="text-muted-foreground text-sm leading-6">
            {description}
          </p>
        ) : null}
      </CardHeader>
    </Card>
  );
}
