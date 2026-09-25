import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeading, StatusBadge } from "@/components/yachay/components";

export default function ProgressPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12 sm:px-6">
      <SectionHeading level="h1" size="compact" eyebrow="Yachay · mi espacio" title="Mi progreso" description="Tu avance se mostrará cuando haya rutas y actividades disponibles para completar." />
      <Card variant="learning" accent="gold">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Aún no hay progreso registrado <StatusBadge tone="pending">En espera</StatusBadge></CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm leading-6">
          No mostramos avances de ejemplo como si fueran actividad de tu cuenta. Revisa qué módulos están publicados.
          <p className="mt-4"><Link href="/dashboard/learn" className="font-medium text-leaf-dark underline underline-offset-4">Consultar módulos</Link></p>
        </CardContent>
      </Card>
    </main>
  );
}
