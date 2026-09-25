# Issue 06 — Migrar el design system Yachay con componentes reutilizables y variantes

Prioridad: alta. Depende de [05](05-arquitectura-migracion-yachay.md).

## Objetivo

Preservar los estilos de `quechua-convex` y convertirlos en un sistema compartido por landing, aprendizaje, tutor y certificados.

## Referencias

- `quechua-convex/app/globals.css`: paleta, radios y animaciones.
- `quechua-convex/pages/_app.tsx`: DM Sans y Fraunces.
- `quechua-convex/components/yachay-landing.tsx` y `yachay-dashboard.tsx`: composición y estilos.
- `components/ui/`, `app/globals.css` y `app/layout.tsx`: base de destino.

## Trabajo propuesto

1. Centralizar los colores originales: fondo `#f2eee4`, papel `#fbfaf5`, tinta `#233127`, hoja `#355f4a`, arcilla `#c67852` y sus tonos auxiliares. Conservar bordes suaves, radios, sombras, espaciados y jerarquía editorial.
2. Integrar DM Sans para texto y Fraunces para títulos; evitar referencias circulares entre variables de fuentes. Conectar los tokens Yachay con los tokens semánticos ya usados por los componentes de la raíz.
3. Resolver explícitamente el tema: Yachay de origen es claro y la raíz permite modo oscuro. Mantener el claro como referencia de fidelidad y definir equivalentes legibles para oscuro antes de ofrecerlo en las vistas migradas.
4. Reutilizar Base UI y `class-variance-authority`; extender las primitivas existentes y extraer componentes de dominio sin dependencias de Clerk, Convex o peticiones de red.

| Componente | Variantes mínimas propuestas |
| --- | --- |
| Button / ActionLink | primary, secondary, outline, ghost; sm, md, lg, icon; loading y disabled |
| Card / ModuleCard | marketing y learning; leaf, clay, gold; available, in-progress, completed |
| Badge / StatusBadge | neutral, success, pending, error |
| Progress | leaf y clay; tamaños compacto y normal |
| SectionHeading / StatCard | compact y hero; superficie paper, leaf e ink |
| LessonRow / ChatMessage | pending/completed; user/assistant/error |

5. Resolver el acento `gold`: el dominio lo referencia, pero el CSS del origen no define esos tokens y la tarjeta usa papel/arcilla como alternativa. Documentar y centralizar esa equivalencia visual, o definir una paleta revisada.
6. Conservar `motion-rise`, `motion-fade`, `motion-drift` y el respeto por `prefers-reduced-motion`. Unificar estados de carga, vacío y error.

## Criterios de aceptación

- [ ] La paleta y tipografía del origen son reconocibles en todas las vistas migradas.
- [ ] Las variantes están tipadas, documentadas y consumidas por al menos dos vistas cuando el componente sea compartido.
- [ ] No se duplican cadenas de estilos para botones, tarjetas, progreso o mensajes entre pantallas.
- [ ] Hay foco visible, navegación por teclado, etiquetas accesibles y contraste comprobado.
- [ ] Una galería de desarrollo muestra variantes, estados y tamaños sin servicios externos.

## Validación prevista

Comparación visual a 375, 768 y 1440 px de ancho; revisión con movimiento reducido, teclado, textos largos y ambos temas si se ofrecen. Documentar diferencias justificadas respecto al origen.
