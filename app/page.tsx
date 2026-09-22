import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    description: "Preparado para documentos que quieras verificar después.",
  },
] as const;

const steps = [
  "Calcula el SHA-256 del contenido en el cliente o en tu flujo de trabajo.",
  "Ancla el hash en Stellar (Soroban) como prueba inmutable.",
  "Comprueba más tarde que el contenido no ha cambiado.",
] as const;

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <p className="text-sm font-medium tracking-tight sm:text-base">
            stellar-data-integrity
          </p>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
        <section className="flex flex-col gap-6">
          <p className="text-muted-foreground text-sm font-medium">
            Integridad verificable
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ancla la huella de tus datos en Stellar
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg text-pretty">
            Calcula el SHA-256 de archivos, textos y documentos y deja una
            prueba anclada en Stellar (Soroban).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>Empezar pronto</Button>
            <Link
              href="#como-funciona"
              className="border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 inline-flex h-8 items-center justify-center rounded-lg border px-2.5 text-sm font-medium whitespace-nowrap transition-all"
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
      </main>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-8 text-sm sm:px-6">
          <p>stellar-data-integrity</p>
          <p>Aún sin cuentas ni anclaje — solo el scaffold de la aplicación.</p>
        </div>
      </footer>
    </div>
  );
}
