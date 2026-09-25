import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Leaf,
  MessageCircle,
  Sprout,
  Waves,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteAuthControls } from "@/components/site-auth-controls";
import { ActionLink, SectionHeading } from "@/components/yachay/components";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const principles = [
  { number: "01", title: "Aprende con contexto", text: "Cada palabra llega acompañada de una escena, una intención y una nota cultural." },
  { number: "02", title: "Practica sin presión", text: "Lecciones breves para acercarte al idioma con curiosidad y a tu propio ritmo." },
  { number: "03", title: "Avanza paso a paso", text: "Tu espacio reunirá las rutas y actividades disponibles a medida que se preparen." },
] as const;

const routes = [
  { title: "Saludos y presencia", description: "Saludos y presentaciones en escenas cotidianas.", status: "En preparación" },
  { title: "Familia y comunidad", description: "Palabras y expresiones para hablar de tus vínculos.", status: "En preparación" },
  { title: "Territorio y tiempo", description: "Explora cómo hablar de lugares y momentos.", status: "En preparación" },
] as const;

const benefits = [
  { icon: BookOpen, title: "Rutas con raíces", text: "Un catálogo organizado por situaciones y temas cotidianos." },
  { icon: MessageCircle, title: "Práctica acompañada", text: "Actividades de aprendizaje que se incorporarán cuando estén disponibles." },
  { icon: Compass, title: "Un mapa para continuar", text: "Consulta tu espacio y encuentra las secciones habilitadas." },
] as const;

export default function Home() {
  return (
    <div className="min-h-svh bg-background text-ink">
      <SiteHeader
        title="Yachay · lengua viva"
        trailing={<SiteAuthControls />}
      />

      <main className="overflow-hidden">
        <section className="mx-auto grid min-h-[min(780px,calc(100svh-72px))] w-full max-w-7xl items-center gap-12 px-5 py-14 md:px-8 lg:grid-cols-[1.03fr_0.97fr] lg:px-10 lg:py-20">
          <div className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-leaf/15 bg-leaf-pale px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-leaf-dark"><span className="size-1.5 rounded-full bg-clay" /> Aprende con raíces</div>
            <h1 className="max-w-3xl font-heading text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.05em] text-balance">Una lengua viva merece un lugar en tu vida.</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-ink-soft md:text-lg">Acércate al quechua desde la curiosidad, con rutas cotidianas, práctica gradual y respeto por sus variantes.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ActionLink href="/sign-up" size="lg">Empezar mi recorrido <ArrowRight className="ml-2 size-4" /></ActionLink>
              <Link href="#rutas" className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-ink transition hover:bg-paper-deep"><BookOpen className="size-4 text-clay" /> Explorar las rutas</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-ink-soft"><span className="inline-flex items-center gap-2"><Check className="size-4 text-leaf-dark" /> A tu ritmo</span><span className="inline-flex items-center gap-2"><Check className="size-4 text-leaf-dark" /> Acceso gratuito</span><span className="inline-flex items-center gap-2"><Check className="size-4 text-leaf-dark" /> Progreso personal</span></div>
          </div>

          <div className="relative min-h-[27rem] md:min-h-[33rem]" aria-label="Vista ilustrativa de una ruta de aprendizaje">
            <div className="absolute right-0 top-0 h-[78%] w-[78%] rounded-[3rem] bg-leaf" />
            <Card variant="learning" className="absolute bottom-0 left-0 w-[82%] gap-5 rounded-[2rem] border-ink/10 bg-paper p-5 shadow-[0_24px_70px_rgba(35,49,39,0.14)] md:p-7">
              <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">Vista ilustrativa</p><h2 className="mt-3 font-heading text-3xl leading-tight">Saludos y presencia</h2></div><span className="flex size-11 items-center justify-center rounded-2xl bg-clay-pale text-clay-dark"><Sprout className="size-5" /></span></div>
              <div className="rounded-3xl bg-paper-deep p-4"><div className="flex items-center justify-between text-xs font-bold"><span>Ejemplo de una actividad</span><span className="text-ink-soft">Demostración</span></div><div className="mt-3 h-2 rounded-full bg-paper"><div className="h-full w-1/3 rounded-full bg-clay" /></div><p className="mt-4 font-heading text-2xl">Allin p&apos;unchay</p><p className="mt-1 text-xs leading-5 text-ink-soft">Ejemplo visual; no representa progreso guardado ni contenido publicado.</p></div>
              <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-leaf-pale p-4"><Waves className="size-4 text-leaf-dark" /><p className="mt-4 text-xs font-bold text-leaf-dark">Contexto</p><p className="mt-1 text-xs leading-5 text-ink-soft">Escena cotidiana</p></div><div className="rounded-2xl bg-clay-pale p-4"><MessageCircle className="size-4 text-clay-dark" /><p className="mt-4 text-xs font-bold text-clay-dark">Práctica</p><p className="mt-1 text-xs leading-5 text-ink-soft">Disponibilidad próxima</p></div></div>
            </Card>
            <div className="absolute -right-1 bottom-8 hidden w-44 rounded-3xl bg-ink p-4 text-paper shadow-lg sm:block"><Leaf className="size-4 text-clay" /><p className="mt-5 font-heading text-xl leading-tight">Una palabra puede abrir un camino.</p></div>
          </div>
        </section>

        <div className="border-y border-ink/10 bg-paper py-5"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 text-center text-xs font-bold uppercase tracking-[0.14em] text-ink-soft md:justify-between md:px-8 lg:px-10"><span>Aprendizaje con contexto</span><span>Práctica gradual</span><span>Progreso personal</span><span>Construido con respeto</span></div></div>

        <section id="metodo" className="scroll-mt-20 mx-auto flex max-w-7xl flex-col gap-12 px-5 py-20 md:px-8 lg:px-10 lg:py-28">
          <SectionHeading eyebrow="El método Yachay" title="Menos ruido. Más relación con la lengua." description="Cada encuentro busca acercarte a una palabra y a la situación en que puede usarse. El catálogo educativo está en preparación." />
          <div className="grid gap-4 md:grid-cols-3">{principles.map((item, index) => <article key={item.number} className={`rounded-[1.75rem] border border-ink/10 p-6 transition hover:-translate-y-1 hover:shadow-lg ${index === 1 ? "bg-leaf text-paper" : "bg-paper"}`}><span className="font-mono text-xs font-bold text-clay-dark">{item.number}</span><h3 className="mt-12 font-heading text-2xl leading-tight">{item.title}</h3><p className={`mt-4 text-sm leading-6 ${index === 1 ? "text-paper/75" : "text-ink-soft"}`}>{item.text}</p></article>)}</div>
        </section>

        <section id="rutas" className="scroll-mt-20 bg-paper-deep px-5 py-20 md:px-8 lg:px-10 lg:py-28"><div className="mx-auto flex max-w-7xl flex-col gap-10"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><SectionHeading eyebrow="Rutas iniciales" title="Pequeños pasos para empezar." description="Estas rutas describen el catálogo previsto. El contenido todavía no está publicado." /><ActionLink variant="outline" href="/dashboard/learn">Ver disponibilidad <ArrowRight className="ml-2 size-4" /></ActionLink></div><div className="grid gap-4 md:grid-cols-3">{routes.map((route, index) => <Card key={route.title} variant="learning" className="min-h-60 justify-between rounded-[1.75rem] border-ink/10 bg-paper p-6"><CardHeader className="p-0"><div className="flex items-start justify-between gap-3"><span className={`flex size-11 items-center justify-center rounded-2xl ${index === 1 ? "bg-clay-pale text-clay-dark" : "bg-leaf-pale text-leaf-dark"}`}>{index === 0 ? <Sprout className="size-5" /> : index === 1 ? <Waves className="size-5" /> : <Compass className="size-5" />}</span><span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{route.status}</span></div><CardTitle className="mt-7 font-heading text-2xl">{route.title}</CardTitle><CardDescription className="leading-6">{route.description}</CardDescription></CardHeader><Link href="/dashboard/learn" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-leaf-dark hover:gap-3">Consultar catálogo <ArrowRight className="size-4" /></Link></Card>)}</div></div></section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-28"><div><div className="flex size-12 items-center justify-center rounded-2xl bg-clay-pale text-clay-dark"><Leaf className="size-5" /></div><p className="mt-7 max-w-md font-heading text-3xl leading-tight md:text-4xl">Aprender una lengua también es aprender a mirar de nuevo.</p><p className="mt-6 text-sm font-bold text-ink-soft">La intención detrás de Yachay</p></div><div className="grid gap-4 sm:grid-cols-3">{benefits.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-3xl border border-ink/10 bg-paper p-5"><Icon className="size-5 text-leaf-dark" /><h3 className="mt-10 font-heading text-xl">{title}</h3><p className="mt-3 text-sm leading-6 text-ink-soft">{text}</p></article>)}</div></section>

        <section className="mx-5 mb-8 overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-paper md:mx-8 md:px-12 lg:mx-auto lg:max-w-7xl lg:px-16 lg:py-16"><div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-clay">Tu primer paso empieza aquí</p><h2 className="mt-4 font-heading text-4xl leading-tight md:text-6xl">Haz espacio para una lengua viva.</h2><p className="mt-5 max-w-xl text-sm leading-6 text-paper/70">Crea una cuenta y revisa el catálogo mientras preparamos las primeras actividades.</p></div><ActionLink variant="secondary" href="/sign-up">Crear mi cuenta <ArrowRight className="ml-2 size-4" /></ActionLink></div></section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 pb-10 pt-5 text-xs text-ink-soft md:flex-row md:items-center md:justify-between md:px-8 lg:px-10"><p><span className="font-heading text-base text-ink">Yachay</span> · Aprende con raíces.</p><div className="flex flex-wrap items-center gap-5"><Link href="/verify" className="hover:text-ink">Verificar certificado</Link><Link href="/dashboard/learn" className="hover:text-ink">Consultar catálogo</Link><Link href="/sign-in" className="hover:text-ink">Ingresar</Link></div></footer>
    </div>
  );
}
