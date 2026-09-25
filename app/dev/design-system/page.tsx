import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import {
  ActionLink,
  ChatMessage,
  FeedbackState,
  LessonRow,
  ModuleCard,
  SectionHeading,
  StatCard,
  StatusBadge,
  YachayProgress,
} from "@/components/yachay/components";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6">
      <SiteHeader title="Yachay · Sistema de diseño" />
      <header className="motion-rise flex flex-col gap-3">
        <p className="text-leaf-dark text-xs font-semibold uppercase tracking-[0.2em]">
          Yachay · Galería de desarrollo
        </p>
        <h1 className="font-heading text-4xl text-ink sm:text-5xl">
          Componentes y variantes
        </h1>
        <p className="text-muted-foreground max-w-2xl leading-6">
          Vista local para revisar la paleta, la tipografía, los estados y los
          tamaños del sistema compartido. Usa el selector de tema de la cabecera
          para revisar los equivalentes oscuros.
        </p>
      </header>

      <section className="flex flex-col gap-5">
        <SectionHeading size="compact" eyebrow="Acción" title="Button y ActionLink" description="Variantes, tamaños y estado de carga." />
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-border bg-paper p-5">
          <Button variant="primary" size="sm">Principal</Button>
          <Button variant="secondary" size="md">Secundario</Button>
          <Button variant="outline" size="lg">Contorno</Button>
          <Button variant="ghost">Sutil</Button>
          <Button variant="primary" size="icon" aria-label="Acción rápida"><Sparkles /></Button>
          <Button variant="primary" loading>Guardando</Button>
          <Button variant="primary" disabled>Deshabilitado</Button>
          <ActionLink variant="outline" href="#" loading>Cargando enlace</ActionLink>
          <ActionLink variant="ghost" href="#" disabled>Enlace deshabilitado</ActionLink>
          <Button variant="primary" render={<a href="#estados" />}><ArrowRight /> Enlace de acción</Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Variantes de encabezado">
        <div className="rounded-3xl bg-paper p-5">
          <SectionHeading size="compact" surface="paper" eyebrow="Compacto · paper" title="Un encabezado breve" description="Contexto para una sección de contenido." />
        </div>
        <div className="rounded-3xl bg-leaf p-5">
          <SectionHeading size="hero" surface="leaf" eyebrow="Hero · leaf" title="Una sección destacada" description="El mismo componente se adapta a una superficie hoja." />
        </div>
        <div className="rounded-3xl bg-ink p-5">
          <SectionHeading size="hero" surface="ink" eyebrow="Hero · ink" title="Una superficie de tinta" description="Texto claro para sostener el contraste en ambos temas." />
        </div>
      </section>

      <section id="estados" className="flex flex-col gap-5">
        <SectionHeading size="compact" eyebrow="Estado" title="Badges y mensajes de estado" />
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone="neutral">Neutral</StatusBadge>
          <StatusBadge tone="success">Completado</StatusBadge>
          <StatusBadge tone="pending">Pendiente</StatusBadge>
          <StatusBadge tone="error">Error</StatusBadge>
          <Badge variant="outline">Primitiva Base UI</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <FeedbackState state="loading" title="Cargando contenido" description="El mensaje se anuncia mediante una región de estado." />
          <FeedbackState state="empty" title="Aún no hay lecciones" description="Cuando haya contenido publicado, aparecerá aquí." />
          <FeedbackState state="error" title="No se pudo cargar" description="Comprueba la conexión e inténtalo de nuevo." />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <SectionHeading size="compact" eyebrow="Superficies" title="Card y ModuleCard" description="Acentos hoja, arcilla y gold (papel profundo + arcilla)." />
        <div className="grid gap-4 md:grid-cols-3">
          {(["leaf", "clay", "gold"] as const).map((accent) => (
            <Card key={accent} variant="marketing" accent={accent}>
              <CardHeader><CardTitle className="font-heading capitalize">Acento {accent}</CardTitle></CardHeader>
              <CardContent className="text-muted-foreground">Marketing · superficie papel · radio suave.</CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(["available", "in-progress", "completed"] as const).map((status, index) => (
            <ModuleCard key={status} title={["Saludos y presencia", "Familia y comunidad", "Territorio y tiempo"][index]} description="Una muestra con descripción extensa que conserva una lectura cómoda en anchos reducidos." progress={[0, 42, 100][index]} status={status} accent={(["leaf", "clay", "gold"] as const)[index]} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <SectionHeading size="compact" eyebrow="Progreso" title="Tonos y tamaños" />
        <Card variant="learning">
          <CardContent className="flex flex-col gap-5 py-5">
            <YachayProgress value={68} label="Progreso hoja, tamaño normal" />
            <YachayProgress value={34} label="Progreso arcilla, tamaño compacto" tone="clay" size="compact" />
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Lecciones" value="6 / 9" size="compact" surface="paper" />
          <StatCard label="Avance" value="68%" size="hero" surface="leaf" />
          <StatCard label="Constancia" value="4 días" size="hero" surface="ink" />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <SectionHeading size="compact" eyebrow="Aprendizaje y tutor" title="LessonRow y ChatMessage" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <LessonRow title="Allin p’unchay" description="Saludo para la mañana." status="completed" />
            <LessonRow title="Presentarse" description="Comparte tu nombre y procedencia." status="pending" href="#" />
          </div>
          <div className="flex flex-col gap-3 rounded-3xl bg-muted p-4">
            <ChatMessage role="assistant">¡Allin p’unchay! ¿Qué frase quieres practicar?</ChatMessage>
            <ChatMessage role="user">Quiero saludar a mi comunidad.</ChatMessage>
            <ChatMessage role="error">No pude conectar con el tutor. Prueba de nuevo.</ChatMessage>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="motion-rise"><CardHeader><CardTitle>motion-rise</CardTitle></CardHeader></Card>
        <Card className="motion-fade"><CardHeader><CardTitle>motion-fade</CardTitle></CardHeader></Card>
        <Card className="motion-drift"><CardHeader><CardTitle>motion-drift</CardTitle></CardHeader></Card>
      </section>
    </main>
  );
}
