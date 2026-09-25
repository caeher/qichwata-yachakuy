# Issue 07 — Migrar landing, acceso y navegación de Yachay

Prioridad: alta. Depende de [05](05-arquitectura-migracion-yachay.md) y [06](06-design-system-yachay.md).

## Objetivo

Ofrecer el recorrido público de Yachay y un área autenticada coherente, conservando el diseño del origen y la integración Clerk de la raíz.

## Referencias

`quechua-convex/components/yachay-landing.tsx`, `quechua-convex/pages/aprender.tsx`, `components/app-clerk-provider.tsx`, `components/dashboard-nav.tsx`, `lib/auth/public-paths.ts`, `proxy.ts` y `app/dashboard/layout.tsx`.

## Trabajo propuesto

1. Migrar a `/` el hero, método, rutas iniciales, beneficios, llamada a registro y pie de página. Separar secciones y consumir componentes compartidos.
2. Aplicar identidad Yachay, título, descripción y recursos visuales pertinentes. Los ejemplos de progreso de la landing deben identificarse como ilustrativos.
3. Reutilizar registro, ingreso, cierre de sesión y aprovisionamiento local existentes. Al autenticarse, volver al destino interno solicitado con validación de la URL de retorno.
4. Crear navegación de Inicio, Módulos, Actividades, Progreso y Certificados usando rutas reales. Mantener acceso a configuración y cuenta. Incluir Certificados también en móvil: el origen solo muestra cuatro secciones en su barra móvil.
5. Incorporar `/aprender` como redirección unidireccional a `/dashboard` y `/verificar` a `/verify`, conservando la consulta URL. `/dashboard/learn` sigue siendo la ruta del catálogo. Si la entrada de verificación contiene un identificador heredado `YCH-...`, mostrar su estado legado no verificado sin convertirlo en UUID raíz ni certificado actual. Resolver navegación activa, enlaces profundos, recarga y atrás/adelante del navegador.
6. Hacer funcionales los enlaces de rutas y llamadas a la acción; sustituir destinos `#` sin propósito. Durante la preparación del catálogo, mostrar disponibilidad real y evitar afirmar revisión académica sin respaldo.

## Criterios de aceptación

- [ ] Un visitante puede explorar la landing, registrarse e ingresar al área de aprendizaje.
- [ ] Las rutas privadas requieren sesión y la verificación pública sigue accesible.
- [ ] Todas las secciones son alcanzables desde móvil y escritorio.
- [ ] Los enlaces de acceso y retorno funcionan sin perder el destino autorizado.
- [ ] El diseño utiliza las variantes de la issue 06 y mantiene la composición del origen.
- [ ] Sin configuración de autenticación se muestra un estado honesto y utilizable.

## Validación prevista

Recorrer visitante → registro/ingreso → inicio → módulos → cierre de sesión; comprobar acceso directo, sesión vencida, retorno seguro, menú móvil, anclas públicas y rutas antiguas.
