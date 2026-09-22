import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FREE_MAX_UPLOAD_BYTES,
  FREE_MONTHLY_ANCHORS,
  FREE_STORAGE_LIMIT_BYTES,
} from "@/db/constants";
import { formatBytes } from "@/lib/format-bytes";

const features = [
  {
    title: "Archivos",
    description:
      "Huella SHA-256 de un archivo. El contenido no se publica en la cadena.",
  },
  {
    title: "Texto",
    description: "La misma prueba para un fragmento de texto.",
  },
  {
    title: "Documentos",
    description: "Gestiona borradores y anclajes desde tu panel.",
  },
] as const;

const steps = [
  "Subes un archivo o pegas un texto. El servidor calcula el SHA-256 de esos bytes.",
  "Anclas ese hash en Stellar (Soroban). El contenido no entra en la transacción.",
  "Cualquiera puede comprobar el hash en Verificar, sin crear una cuenta.",
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
            Integridad verificable
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ancla la huella de tus datos en Stellar
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg text-pretty">
            El servidor calcula el SHA-256 de un archivo o texto y ancla esa
            huella en Stellar (Soroban). El archivo en sí no se escribe en la
            cadena.
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
          <h2 className="text-2xl font-semibold tracking-tight">Plan Gratis</h2>
          <Card>
            <CardHeader>
              <CardTitle>Gratis</CardTitle>
              <CardDescription>
                {formatBytes(FREE_STORAGE_LIMIT_BYTES)} de almacenamiento ·{" "}
                {FREE_MONTHLY_ANCHORS} anclajes al mes ·{" "}
                {formatBytes(FREE_MAX_UPLOAD_BYTES)} por archivo
              </CardDescription>
            </CardHeader>
            <CardHeader className="pt-0">
              <p className="text-muted-foreground text-sm">
                La red de desarrollo es testnet. Mainnet es un ajuste del
                servidor, no un plan de pago.
              </p>
              <Button className="mt-4 w-fit" render={<Link href="/sign-up" />}>
                Crear cuenta
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
                  En la cadena va el hash (32 bytes) y un metadato corto. No se
                  sube el archivo.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fuera de la cadena</CardTitle>
                <CardDescription>
                  El archivo se guarda en almacenamiento privado. La clave del
                  monedero no llega al navegador.
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
          <p>Solo el hash se ancla en Stellar.</p>
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
