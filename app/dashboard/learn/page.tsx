import Link from "next/link";
import { eq } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db/client";
import { courses } from "@/db/schema";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";

export default async function LearnPage() {
  const ctx = await loadDashboardUser();
  if (ctx.kind !== "ready")
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-muted-foreground text-sm">
          Configura la sesión y la base de datos para aprender.
        </p>
      </main>
    );
  const catalog = await getDb().query.courses.findMany({
    where: eq(courses.status, "published"),
  });
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Aprendizaje</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          La oferta de Quechua se publicará cuando el contenido y los criterios
          académicos estén validados.
        </p>
      </header>
      {catalog.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No hay cursos publicados</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            El curso de introducción, vocabulario y práctica todavía está en
            preparación. El tutor y los ejercicios de IA esperan una base de
            contenido validada. No se emiten certificados desde cursos de
            demostración.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {catalog.map((course) => (
            <li key={course.id}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Link
                      href={`/dashboard/learn/${course.id}`}
                      className="hover:underline"
                    >
                      {course.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {course.description}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm">
        <Link href="/dashboard/certificates" className="font-medium underline">
          Ver mis certificados
        </Link>
      </p>
    </main>
  );
}
