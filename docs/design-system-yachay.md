# Sistema visual Yachay

La identidad del prototipo vive en `app/globals.css` y se expone como tokens
semánticos de la aplicación. Las primitivas con Base UI y CVA están en
`components/ui/`; los componentes de dominio sin acceso a datos están en
`components/yachay/components.tsx`.

## Paleta y temas

El tema claro conserva los colores principales del prototipo: fondo `#f2eee4`,
papel `#fbfaf5`, tinta `#233127` y hoja `#355f4a`. También conserva papel
profundo `#e8e4d8`, hoja oscura `#214936`, hoja pálida `#dce8dc`, arcilla
`#c67852`, arcilla pálida `#f1d9ca` y bordes de tinta al 12%. La tinta suave se
oscureció a `#536055` y la arcilla oscura a `#8f4b2e` para que los textos
pequeños sobre superficies claras superen el contraste AA.

El tema oscuro traduce los papeles a verdes profundos (`#18231c`, `#243229`,
`#34463a`), eleva la tinta a `#f2eee4` y aclara hoja y arcilla. El claro es el
tema inicial; el selector permite elegir oscuro o sistema. No hay componentes
Yachay que dependan de un tema externo ni de modo claro forzado en una vista.

`gold` es un alias de papel profundo (`--yachay-gold: var(--yachay-paper-deep)`)
y usa texto arcilla oscura. El CSS original no define un pigmento dorado; esta
equivalencia conserva la tarjeta original de papel/arcilla y evita inventar una
tercera familia cromática.

## Tipografía, forma y movimiento

DM Sans se usa para texto y Fraunces para títulos. Las variables de fuente
emitidas por `next/font` se llaman `--font-dm-sans` y `--font-fraunces`; Tailwind
las mapea a `--font-sans`, `--font-heading` y `--font-serif` sin autorreferencias.
Se mantiene el radio base de 0.9rem, radio editorial de tarjeta de 1.25rem,
borde suave y sombra verde de baja opacidad. Se conservan `motion-rise`,
`motion-fade`, `motion-drift` y el límite para `prefers-reduced-motion`.

## Componentes compartidos

| Componente | Variantes | Uso actual |
| --- | --- | --- |
| `Button` / `ActionLink` | primary, secondary, outline, ghost; sm, md, lg, icon; loading y disabled | Landing, acciones de lección y galería |
| `Card` / `ModuleCard` | marketing, learning; leaf, clay, gold; available, in-progress, completed | Landing, catálogo y galería |
| `StatusBadge` | neutral, success, pending, error | Panel, certificados y galería |
| `YachayProgress` | leaf, clay; compact, normal | Módulos y galería |
| `SectionHeading` / `StatCard` | compact, hero; paper, leaf, ink | Panel y galería |
| `LessonRow` | pending/completed | Aprendizaje y galería |
| `ChatMessage` | user/assistant/error | Galería; la vista de tutor corresponde a la issue 11 |

`FeedbackState` unifica las presentaciones vacías, de carga y de error. Los
estados se anuncian con `role=status`/`aria-live` o `role=alert`. Botones y
enlaces conservan foco visible; las variantes icónicas requieren un nombre
accesible del consumidor.

## Contraste de colores

Relaciones calculadas según WCAG 2.2 para colores sólidos; AA exige 4.5:1 en
texto normal y 3:1 para texto grande. Se validaron las parejas principales de
texto y superficie:

| Pareja | Contraste |
| --- | ---: |
| tinta / papel | 13.05:1 |
| tinta suave `#536055` / fondo claro | 5.71:1 |
| tinta suave / papel profundo | 5.21:1 |
| hoja oscura / hoja pálida | 8.02:1 |
| arcilla oscura `#8f4b2e` / arcilla pálida | 4.83:1 |
| error `#9e3d2f` / papel | 6.35:1 |
| tinta clara / papel oscuro | 11.59:1 |
| tinta suave oscura / papel oscuro | 8.04:1 |
| hoja clara / hoja pálida oscura | 6.99:1 |
| arcilla clara / arcilla pálida oscura | 6.24:1 |
| error oscuro `#ff9384` / papel oscuro | 6.24:1 |

## Galería local

`/dev/design-system` muestra variantes, tamaños, estados, contenido largo y
movimiento. La ruta devuelve 404 fuera de desarrollo y no consulta servicios.
La galería permite revisar con teclado y cambiar tema desde el selector global.
