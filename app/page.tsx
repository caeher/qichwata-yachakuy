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
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const principles = [
  {
    number: "01",
    title: "Aprende con contexto",
    text: "Cada palabra llega acompañada de una escena, una intención y una nota cultural.",
  },
  {
    number: "02",
    title: "Practica sin presión",
    text: "Lecciones breves para acercarte al idioma con curiosidad y a tu propio ritmo.",
  },
  {
    number: "03",
    title: "Avanza paso a paso",
    text: "Tu espacio reunirá las rutas y actividades disponibles a medida que se preparen.",
  },
] as const;

const routes = [
  {
    title: "Saludos y presencia",
    description: "Saludos y presentaciones en escenas cotidianas.",
    status: "En preparación",
  },
  {
    title: "Familia y comunidad",
    description: "Palabras y expresiones para hablar de tus vínculos.",
    status: "En preparación",
  },
  {
    title: "Territorio y tiempo",
    description: "Explora cómo hablar de lugares y momentos.",
    status: "En preparación",
  },
] as const;

const benefits = [
  {
    icon: BookOpen,
    title: "Rutas con raíces",
    text: "Un catálogo organizado por situaciones y temas cotidianos.",
  },
  {
    icon: MessageCircle,
    title: "Práctica acompañada",
    text: "Actividades de aprendizaje que se incorporarán cuando estén disponibles.",
  },
  {
    icon: Compass,
    title: "Un mapa para continuar",
    text: "Consulta tu espacio y encuentra las secciones habilitadas.",
  },
] as const;

export default function Home() {
  return (
    <div className="bg-background text-ink min-h-svh">
      <SiteHeader
        title="Yachay · lengua viva"
        trailing={<SiteAuthControls />}
      />

      <main className="overflow-hidden">
        <section className="mx-auto grid min-h-[min(780px,calc(100svh-72px))] w-full max-w-7xl items-center gap-12 px-5 py-14 md:px-8 lg:grid-cols-[1.03fr_0.97fr] lg:px-10 lg:py-20">
          <div className="relative z-10">
            <div className="border-leaf/15 bg-leaf-pale text-leaf-dark mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-bold tracking-[0.16em] uppercase">
              <span className="bg-clay size-1.5 rounded-full" /> Aprende con
              raíces
            </div>
            <h1 className="font-heading max-w-3xl text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.05em] text-balance">
              Una lengua viva merece un lugar en tu vida.
            </h1>
            <p className="text-ink-soft mt-7 max-w-xl text-base leading-7 md:text-lg">
              Acércate al quechua desde la curiosidad, con rutas cotidianas,
              práctica gradual y respeto por sus variantes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ActionLink href="/sign-up" size="lg">
                Empezar mi recorrido <ArrowRight className="ml-2 size-4" />
              </ActionLink>
              <Link
                href="#rutas"
                className="text-ink hover:bg-paper-deep inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition"
              >
                <BookOpen className="text-clay size-4" /> Explorar las rutas
              </Link>
            </div>
            <div className="text-ink-soft mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold">
              <span className="inline-flex items-center gap-2">
                <Check className="text-leaf-dark size-4" /> A tu ritmo
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="text-leaf-dark size-4" /> Acceso gratuito
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="text-leaf-dark size-4" /> Progreso personal
              </span>
            </div>
          </div>

          <div
            className="relative min-h-[27rem] md:min-h-[33rem]"
            aria-label="Vista ilustrativa de una ruta de aprendizaje"
          >
            <div className="bg-leaf absolute top-0 right-0 h-[78%] w-[78%] rounded-[3rem]" />
            <Card
              variant="learning"
              className="border-ink/10 bg-paper absolute bottom-0 left-0 w-[82%] gap-5 rounded-[2rem] p-5 shadow-[0_24px_70px_rgba(35,49,39,0.14)] md:p-7"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-ink-soft text-[10px] font-bold tracking-[0.18em] uppercase">
                    Vista ilustrativa
                  </p>
                  <h2 className="font-heading mt-3 text-3xl leading-tight">
                    Saludos y presencia
                  </h2>
                </div>
                <span className="bg-clay-pale text-clay-dark flex size-11 items-center justify-center rounded-2xl">
                  <Sprout className="size-5" />
                </span>
              </div>
              <div className="bg-paper-deep rounded-3xl p-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Ejemplo de una actividad</span>
                  <span className="text-ink-soft">Demostración</span>
                </div>
                <div className="bg-paper mt-3 h-2 rounded-full">
                  <div className="bg-clay h-full w-1/3 rounded-full" />
                </div>
                <p className="font-heading mt-4 text-2xl">
                  Allin p&apos;unchay
                </p>
                <p className="text-ink-soft mt-1 text-xs leading-5">
                  Ejemplo visual; no representa progreso guardado ni contenido
                  publicado.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-leaf-pale rounded-2xl p-4">
                  <Waves className="text-leaf-dark size-4" />
                  <p className="text-leaf-dark mt-4 text-xs font-bold">
                    Contexto
                  </p>
                  <p className="text-ink-soft mt-1 text-xs leading-5">
                    Escena cotidiana
                  </p>
                </div>
                <div className="bg-clay-pale rounded-2xl p-4">
                  <MessageCircle className="text-clay-dark size-4" />
                  <p className="text-clay-dark mt-4 text-xs font-bold">
                    Práctica
                  </p>
                  <p className="text-ink-soft mt-1 text-xs leading-5">
                    Disponibilidad próxima
                  </p>
                </div>
              </div>
            </Card>
            <div className="bg-ink text-paper absolute -right-1 bottom-8 hidden w-44 rounded-3xl p-4 shadow-lg sm:block">
              <Leaf className="text-clay size-4" />
              <p className="font-heading mt-5 text-xl leading-tight">
                Una palabra puede abrir un camino.
              </p>
            </div>
          </div>
        </section>

        <div className="border-ink/10 bg-paper border-y py-5">
          <div className="text-ink-soft mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 text-center text-xs font-bold tracking-[0.14em] uppercase md:justify-between md:px-8 lg:px-10">
            <span>Aprendizaje con contexto</span>
            <span>Práctica gradual</span>
            <span>Progreso personal</span>
            <span>Construido con respeto</span>
          </div>
        </div>

        <section
          id="metodo"
          className="mx-auto flex max-w-7xl scroll-mt-20 flex-col gap-12 px-5 py-20 md:px-8 lg:px-10 lg:py-28"
        >
          <SectionHeading
            eyebrow="El método Yachay"
            title="Menos ruido. Más relación con la lengua."
            description="Cada encuentro busca acercarte a una palabra y a la situación en que puede usarse. El catálogo educativo está en preparación."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {principles.map((item, index) => (
              <article
                key={item.number}
                className={`border-ink/10 rounded-[1.75rem] border p-6 transition hover:-translate-y-1 hover:shadow-lg ${index === 1 ? "bg-leaf text-paper" : "bg-paper"}`}
              >
                <span className="text-clay-dark font-mono text-xs font-bold">
                  {item.number}
                </span>
                <h3 className="font-heading mt-12 text-2xl leading-tight">
                  {item.title}
                </h3>
                <p
                  className={`mt-4 text-sm leading-6 ${index === 1 ? "text-paper/75" : "text-ink-soft"}`}
                >
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="rutas"
          className="bg-paper-deep scroll-mt-20 px-5 py-20 md:px-8 lg:px-10 lg:py-28"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-10">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <SectionHeading
                eyebrow="Rutas iniciales"
                title="Pequeños pasos para empezar."
                description="Estas rutas describen el catálogo previsto. El contenido todavía no está publicado."
              />
              <ActionLink variant="outline" href="/dashboard/learn">
                Ver disponibilidad <ArrowRight className="ml-2 size-4" />
              </ActionLink>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {routes.map((route, index) => (
                <Card
                  key={route.title}
                  variant="learning"
                  className="border-ink/10 bg-paper min-h-60 justify-between rounded-[1.75rem] p-6"
                >
                  <CardHeader className="p-0">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`flex size-11 items-center justify-center rounded-2xl ${index === 1 ? "bg-clay-pale text-clay-dark" : "bg-leaf-pale text-leaf-dark"}`}
                      >
                        {index === 0 ? (
                          <Sprout className="size-5" />
                        ) : index === 1 ? (
                          <Waves className="size-5" />
                        ) : (
                          <Compass className="size-5" />
                        )}
                      </span>
                      <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-[10px] font-bold tracking-wide uppercase">
                        {route.status}
                      </span>
                    </div>
                    <CardTitle className="font-heading mt-7 text-2xl">
                      {route.title}
                    </CardTitle>
                    <CardDescription className="leading-6">
                      {route.description}
                    </CardDescription>
                  </CardHeader>
                  <Link
                    href="/dashboard/learn"
                    className="text-leaf-dark mt-6 inline-flex items-center gap-2 text-sm font-bold hover:gap-3"
                  >
                    Consultar catálogo <ArrowRight className="size-4" />
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-28">
          <div>
            <div className="bg-clay-pale text-clay-dark flex size-12 items-center justify-center rounded-2xl">
              <Leaf className="size-5" />
            </div>
            <p className="font-heading mt-7 max-w-md text-3xl leading-tight md:text-4xl">
              Aprender una lengua también es aprender a mirar de nuevo.
            </p>
            <p className="text-ink-soft mt-6 text-sm font-bold">
              La intención detrás de Yachay
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {benefits.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="border-ink/10 bg-paper rounded-3xl border p-5"
              >
                <Icon className="text-leaf-dark size-5" />
                <h3 className="font-heading mt-10 text-xl">{title}</h3>
                <p className="text-ink-soft mt-3 text-sm leading-6">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-ink text-paper mx-5 mb-8 overflow-hidden rounded-[2rem] px-6 py-12 md:mx-8 md:px-12 lg:mx-auto lg:max-w-7xl lg:px-16 lg:py-16">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-clay text-xs font-bold tracking-[0.2em] uppercase">
                Tu primer paso empieza aquí
              </p>
              <h2 className="font-heading mt-4 text-4xl leading-tight md:text-6xl">
                Haz espacio para una lengua viva.
              </h2>
              <p className="text-paper/70 mt-5 max-w-xl text-sm leading-6">
                Crea una cuenta y revisa el catálogo mientras preparamos las
                primeras actividades.
              </p>
            </div>
            <ActionLink variant="secondary" href="/sign-up">
              Crear mi cuenta <ArrowRight className="ml-2 size-4" />
            </ActionLink>
          </div>
        </section>
      </main>

      <footer className="text-ink-soft mx-auto flex max-w-7xl flex-col gap-4 px-5 pt-5 pb-10 text-xs md:flex-row md:items-center md:justify-between md:px-8 lg:px-10">
        <p>
          <span className="font-heading text-ink text-base">Yachay</span> ·
          Aprende con raíces.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <Link href="/verify" className="hover:text-ink">
            Verificar certificado
          </Link>
          <Link href="/dashboard/learn" className="hover:text-ink">
            Consultar catálogo
          </Link>
          <Link href="/sign-in" className="hover:text-ink">
            Ingresar
          </Link>
        </div>
      </footer>
    </div>
  );
}
