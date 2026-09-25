# Issue 10 — Migrar el inicio y las métricas de progreso con datos reales

Prioridad: media. Depende de [07](07-landing-acceso-navegacion.md), [08](08-catalogo-contenido-inicial.md) y [09](09-lecciones-practica-progreso.md).

## Objetivo

Recrear las vistas Inicio y Progreso de Yachay para mostrar avance verificable, módulos y próximos pasos de cada alumno.

## Referencias

Secciones `home` y `progress` de `quechua-convex/components/yachay-dashboard.tsx`, funciones de progreso de `quechua-convex/lib/domain/learning.ts`, `app/dashboard/page.tsx` y `lib/dashboard/load-dashboard-user.ts`.

## Trabajo propuesto

1. Construir bienvenida, tarjeta de continuación, mapa de módulos y desglose de progreso utilizando `StatCard`, `ModuleCard` y `Progress` compartidos.
2. Calcular porcentajes con unidades válidas y únicas de la versión inscrita. Para el avance global, usar unidades completadas / unidades totales de los cursos inscritos elegibles; tratar cero unidades como 0 %, sin división inválida.
3. Mostrar contadores de lecciones y módulos completados, próximos pasos y estado de certificados derivados del servidor.
4. Sustituir las cifras fijas del origen —4 días de racha, mejor racha de 7 días y 24 palabras— por estados sin datos. Rachas y palabras vistas quedan como ampliación posterior hasta definir eventos, zona horaria y reglas de cómputo.
5. Sin inscripciones, invitar a elegir curso; si todo está terminado, mostrar cierre del recorrido y certificados disponibles o política pendiente. Mantener consistencia al cambiar de curso y recargar.

## Criterios de aceptación

- [ ] Inicio y Progreso consumen el mismo cálculo y muestran valores consistentes.
- [ ] No hay métricas personales inventadas ni IDs inválidos contabilizados.
- [ ] Los estados sin cursos, sin avance, parcial y completado tienen acciones útiles.
- [ ] La siguiente lección apunta a una unidad pendiente válida de la cuenta.
- [ ] El panel preserva tarjetas, tipografía y composición responsiva del origen.

## Validación prevista

Comprobar cuentas con cero, uno y varios cursos; avances desiguales, módulos completos y cambios de versión. Verificar fórmulas con cantidades distintas de unidades y aislamiento entre usuarios.
