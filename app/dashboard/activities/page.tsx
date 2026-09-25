import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading, StatusBadge } from "@/components/yachay/components";

export default function ActivitiesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <SectionHeading level="h1" size="compact" eyebrow="Yachay · práctica" title="Actividades" description="Aquí se reunirán las actividades de práctica vinculadas con el catálogo publicado." />
      <Card variant="learning" accent="clay">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Actividades en preparación <StatusBadge tone="pending">Aún no disponibles</StatusBadge></CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm leading-6">
          Todavía no hay ejercicios publicados. Consulta el catálogo para ver su disponibilidad actual.
          <p className="mt-4"><Link href="/dashboard/learn" className="font-medium text-leaf-dark underline underline-offset-4">Ir a módulos</Link></p>
        </CardContent>
      </Card>
    </main>
  );
}
