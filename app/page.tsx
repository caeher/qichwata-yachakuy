import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
const features = [
  {
    title: "Aprendizaje personal",
    description:
      "Una cuenta individual para acercarte a la integridad de datos y avanzar a tu ritmo.",
  },
  {
    title: "Pruebas verificables",
    description:
      "Explora cómo una huella SHA-256 permite comprobar que un contenido no cambió.",
  },
  {
    title: "Certificados",
    description:
      "La plataforma se prepara para acompañar el aprendizaje con certificados verificables.",
  },
] as const;

const steps = [
  "Aprende cómo SHA-256 representa datos con una huella verificable.",
  "Los certificados educativos futuros se vincularán con comprobantes en Stellar.",
  "Consulta por SHA-256 los comprobantes históricos disponibles, sin crear una cuenta.",
] as const;

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader
        trailing={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" render={<Link href="/verify" />}>
              Verificar
            </Button>
            <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}>
              Entrar
            </Button>
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
        <section className="flex flex-col gap-6">
          <p className="text-muted-foreground text-sm font-medium">
            Aprendizaje e integridad digital
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Aprende a comprender y verificar la integridad de los datos
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg text-pretty">
            Una cuenta individual para aprender sobre SHA-256 y pruebas
            verificables en Stellar. Puedes explorar la verificación pública
            mientras preparamos la experiencia educativa.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button render={<Link href="/sign-up" />}>Crear cuenta</Button>
            <Button variant="outline" render={<Link href="/verify" />}>
              Verificar
            </Button>
            <Link
              href="#como-funciona"
              className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
            >
              Ver cómo funciona
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section
          id="como-funciona"
          className="flex scroll-mt-20 flex-col gap-6"
        >
          <h2 className="text-2xl font-semibold tracking-tight">
            Cómo funciona
          </h2>
          <ol className="flex flex-col gap-4">
            {steps.map((step, index) => (
              <li
                key={step}
                className="border-border bg-card text-card-foreground flex gap-4 rounded-xl border p-4"
              >
                <span
                  className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed sm:text-base">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Consulta de comprobantes históricos
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Consulta por SHA-256</CardTitle>
              <CardDescription>
                La plataforma no recibe ni guarda archivos o textos. Puedes
                consultar huellas existentes y sus referencias de Stellar.
              </CardDescription>
            </CardHeader>
            <CardHeader className="pt-0">
              <p className="text-muted-foreground text-sm">
                La verificación pública está disponible sin iniciar sesión.
              </p>
              <Button
                variant="outline"
                className="mt-4 w-fit"
                render={<Link href="/verify" />}
              >
                Consultar un hash
              </Button>
            </CardHeader>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Qué se publica
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Solo el hash</CardTitle>
                <CardDescription>
                  Los comprobantes históricos contienen huellas y referencias de
                  transacción, no los contenidos originales.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Sin almacenamiento de objetos
                </CardTitle>
                <CardDescription>
                  La aplicación no carga, custodia ni descarga archivos o PDFs.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Verificar sin cuenta
                </CardTitle>
                <CardDescription>
                  Cualquiera puede usar /verify o un enlace /v/&lt;hash&gt; sin
                  iniciar sesión.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-8 text-sm sm:px-6">
          <p>stellar-data-integrity</p>
          <p>Las huellas históricas se pueden consultar por SHA-256.</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/verify" className="underline">
              Verificar
            </Link>
            <Link href="/sign-up" className="underline">
              Crear cuenta
            </Link>
            <Link href="/sign-in" className="underline">
              Entrar
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
