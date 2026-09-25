# QCH-02: decisión de variedad, escritura y revisión

Versión 1.0 · 2026-09-25. Registro editorial vinculado a [QCH-01](./editorial-register-2026-09-25.md). Las páginas citadas son PDF y empiezan en 1.

## Alcance de la decisión

La variedad didáctica de trabajo para `saludos-y-presencia`, `familia-y-comunidad` y `territorio-y-tiempo` será **quechua sureño Cusco-Collao, subvariante Cusco**, con presentación inicial en **grafía pentavocálica**, como declara el libro de Pacheco (PDF 8). Se escoge porque ese libro aporta la progresión curricular directa para saludos y familia. No se infiere que una obra sobre quechua sureño comparta automáticamente la convención de la otra.

La referencia comunitaria queda descrita por ahora como hablantes de la subvariante Cusco representada por el libro. Las fuentes y el catálogo no nombran una comunidad específica de consulta; ninguna comunidad ha avalado esta decisión. Quien edite cada curso debe asignar por nombre a una persona hablante o especialista de esa variedad antes de resolver formas. La decisión editorial ya está consignada en `regionalVariant`; no equivale a aprobación lingüística o comunitaria. Las notas de `review` conservan revisión pendiente, persona y fecha nulas.

| Curso | Variedad y referencia de trabajo | Convención de presentación | Responsable de coordinar revisión | Estado lingüístico |
| --- | --- | --- | --- | --- |
| `saludos-y-presencia` | Cusco-Collao, subvariante Cusco; hablantes de esa subvariante representada en Pacheco; comunidad consultada aún no identificada | Pentavocálica para el material inicial; formas de Calvo conservadas aparte | Editor/a del curso debe asignar a una persona hablante o especialista de Cusco antes de aceptar formas | Pendiente; `draft` |
| `familia-y-comunidad` | Cusco-Collao, subvariante Cusco; hablantes de esa subvariante representada en Pacheco; comunidad consultada aún no identificada | Pentavocálica para el material inicial; formas de Calvo conservadas aparte | Editor/a del curso debe asignar a una persona hablante o especialista de Cusco antes de aceptar formas | Pendiente; `draft` |
| `territorio-y-tiempo` | Cusco-Collao, subvariante Cusco como hipótesis de coherencia del catálogo; no hay unidad territorial en Pacheco ni comunidad consultada identificada | Pentavocálica como convención de trabajo provisional; no basta para validar el léxico territorial | Editor/a del curso debe asignar a una persona hablante o especialista de Cusco y buscar una fuente contextual adicional | Pendiente; `draft` |

El diccionario de Calvo se usa para consulta por lema/acepción desde el español. Su sección de grafía (PDF 45–47) aplica convenciones que no coinciden sin más con las pentavocálicas de Pacheco. Para registrar sus hallazgos se conserva la grafía exacta de origen, dirección español→quechua, lema español, entrada quechua, acepción, marca y páginas PDF/impresa. Solo se crea una forma didáctica tras decidirla por entrada con la persona revisora. No se cambia `e`↔`i` ni `o`↔`u` de forma global ni se interpreta una diferencia gráfica como variante libre.

## Registro de formas y decisiones

Toda forma examinada debe tener estos campos, incluso cuando aún no haya forma aprobada:

| Campo | Contenido |
| --- | --- |
| `course` / `unit` | Curso y lección donde se propone usarla |
| `concept` | Intención didáctica en español, sin presuponer equivalencia |
| `sourceForm` | Grafía exacta en la fuente; se conserva página, puntuación y marcas |
| `sourceId` / `locator` | ID del manifiesto, página PDF, impresa si existe, encabezado/entrada, acepción y marca |
| `teachingForm` | Nula hasta que la apruebe la persona revisora |
| `changeType` | `none`, `typographic` o `linguistic`; explicación y forma anterior/nueva si cambia |
| `acceptedAnswers` | Solo alternativas aprobadas individualmente con fuente y revisión; lista vacía mientras estén pendientes |
| `review` | Nombre, competencia/variedad, fecha, decisión y notas; no completar por inferencia |

La normalización tipográfica se registra aparte de la forma de origen. Se preserva cada consonante simple, aspirada o glotalizada (por ejemplo, las series `ch/chh/ch’`, `p/ph/p’` y `q/qh/q’`), además de `ñ` y el apóstrofo. No se sustituye una por otra en búsquedas, renderizado o respuestas. La normalización Unicode o del glifo del apóstrofo solo se aplica cuando se demuestre que conserva el signo, se guarda la forma original y queda anotado el cambio. La aspiración, glotalización y pronunciación no se enseñan mediante inferencias de una conversión ortográfica.

Para `activity.items.acceptedAnswers`, la respuesta principal será la forma didáctica revisada. Una variante adicional solo se agrega cuando una fuente muestra que esa forma corresponde al mismo concepto y contexto en la variedad elegida, y la persona revisora la aprueba expresamente. No se aceptan transliteraciones automáticas, cambios de vocal, eliminación de apóstrofos, cambios entre `n` y `ñ` ni todas las variantes de una entrada del diccionario por defecto. Las unidades actuales no tienen `acceptedAnswers` aprobadas; se mantienen ausentes hasta documentarlas.

## Discrepancias y revisión de los borradores actuales

| Curso/unidad y forma del borrador | Hallazgo cotejado | Decisión editorial | Estado de resolución lingüística |
| --- | --- | --- | --- |
| `saludos-y-presencia/hola`: `Allin p'unchay` como equivalente de “buen día” | Pacheco presenta en la Unidad 2 un saludo dirigido a una persona concreta y advierte que la forma cercana `Allin p’unchau` no tiene la función equivalente de “buen día” (PDF 32–33; saludo iniciado en 32). | Retirar `Allin p'unchay` de vocabulario y respuestas aceptadas. El catálogo ahora enseña a no inferir un saludo de la traducción literal. No fijar reemplazo sin revisar destinatario y contexto. | Decisión editorial aplicada; la forma de reemplazo y su uso esperan persona revisora. |
| `saludos-y-presencia/presentarse`: `Imaynallataq kanki` | La expresión exacta no se localizó en las secciones cotejadas de la Unidad 2; el libro sí trata presentación con formas propias en PDF 32–38. Una coincidencia parcial de `Imayna` en un ejercicio posterior (PDF 91) no valida esta frase. | Mantenerla como forma histórica del prototipo únicamente en el registro de candidatos; no afirmarla como pregunta validada ni aceptarla como respuesta. | Pendiente de fuente exacta y revisión de forma, significado y contexto. |
| `familia-y-comunidad/familia`: `Ayllu` definido ampliamente como “familia y comunidad” | Pacheco anota `Ayllu: familia` (PDF 63) y dedica PDF 80 a “El Ayllu”. Calvo vol. 1, entrada española `AILLO (aillu, ayllu; állo)`, PDF 148 / impresa 52, registra sentidos de unidad étnica y comunidad campesina. | QCH-04 retira la equivalencia amplia del título, conserva el término en una nota atribuida y contextualizada, y no convierte las generalizaciones históricas/culturales del libro en hechos universales evaluables. | Cotejo de pasajes y entrada completado; falta revisión de una comunidad concreta y de persona hablante/especialista. Véase [mapa QCH-04](./qch-04-familia-content-map-v1.0.md). |
| `familia-y-comunidad/mi-comunidad`: `Ñuqanchik` como “nosotros inclusivo” | La forma exacta no se localizó en los pasajes consultados de Pacheco. La entrada español→quechua “nosotras-nosotros” de Calvo vol. 1 ofrece `nuqanchis` (incl.) y `nuqayku` (excl.); su página PDF no se confirmó y la grafía no coincide con el candidato. | QCH-04 retira el candidato de título, frases, vocabulario y respuestas aceptadas. No se fuerza la correspondencia gráfica ni se fija significado para la variedad didáctica. | Hallazgo lexicográfico contrastado pero con localizador pendiente; no es fuente de contenido publicado. Antes de reconsiderar: confirmar página, variedad y revisión humana. Véase [mapa QCH-04](./qch-04-familia-content-map-v1.0.md). |
| `territorio-y-tiempo/lugares`: `Pacha` | No se halló una sección de territorio en el libro ni respaldo para el lema en los localizadores revisados. El volumen 1 de Calvo consulta español→quechua; no basta para validar este candidato quechua. | Mantenerlo en el registro como candidato sin traducción aprobada; buscar entrada inversa y contexto de uso. | Pendiente; territorio no tiene respaldo curricular directo en Pacheco. |
| `territorio-y-tiempo/tiempo`: `Kunan p'unchay` como “hoy” | Pacheco emplea `kunan` con glosa “ahora” en ejercicios (PDF 41, entre otros), pero no se localizó la frase compuesta exacta. Una palabra dentro de una expresión no valida automáticamente la expresión completa ni su traducción. | No aceptar la frase como equivalente de “hoy” por concatenación; registrar el lema/acepción y buscar una frase contextual con revisión. | Pendiente del diccionario, fuente de uso contextual y persona revisora. |

La búsqueda de texto no sustituye el examen visual de cada página ni demuestra ausencia absoluta en toda la obra. Cuando no se encontró una forma se registra como “no localizada en los pasajes cotejados”, no como prueba de que no exista en la variedad.

## Muestra de registro por forma

| Curso/unidad/concepto | Grafía original localizada | Forma didáctica aprobada | Localizador | Cambio o decisión |
| --- | --- | --- | --- | --- |
| `saludos-y-presencia/hola`, saludo dirigido a una persona | `Mamay, napaykuyki`; `Tatay, napaykuyki` | Pendiente | Pacheco, PDF 32; Unidad 2 | Conservar cada cadena como está en la fuente y su contexto de destinatario; no convertirlas en un saludo universal sin revisión. |
| `saludos-y-presencia/hola`, candidato para “buen día” | Pacheco registra la forma cercana `Allin p’unchau`; el prototipo tenía `Allin p'unchay` | Ninguna; retirado del vocabulario | Pacheco, PDF 33 | Cambio de uso/significado; no reemplazar letras ni presentar la forma del prototipo como variante ortográfica. |
| `saludos-y-presencia/presentarse` | `Imaynallataq kanki` no localizada en los pasajes cotejados | Pendiente | Candidato sin localizador; cotejo de Unidad 2, PDF 32–62 | No afirmar equivalencia ni dar por aprobada la grafía. |
| `familia-y-comunidad/familia`, concepto de ayllu | Pacheco anota `Ayllu: familia` y desarrolla una sección cultural en PDF 80; Calvo, entrada `AILLO`, PDF 148 / impresa 52, registra varios sentidos | Sin equivalencia única aprobada | Pacheco, PDF 63 y 80; Calvo, entrada `AILLO`, PDF 148 / impresa 52 | El material QCH-04 atribuye la explicación a Pacheco y no evalúa sus generalizaciones; solicitar contexto/revisión de comunidad. |
| `familia-y-comunidad/mi-comunidad` | `Ñuqanchik` no localizada en los pasajes de Pacheco; Calvo registra `nuqanchis`/`nuqayku` bajo el lema español “nosotras-nosotros”, con grafía distinta y página pendiente | Retirado del contenido enseñado | Pacheco, Unidades 3–4; Calvo, entrada “nosotras-nosotros” (PDF pendiente) | No fijar número/inclusividad ni permitir la forma candidata hasta confirmar localizador, variedad y revisión. |
| `territorio-y-tiempo/lugares` | `Pacha` no localizada en los pasajes cotejados | Pendiente | Sin localizador quechua→español disponible | No atribuir sentido; esperar fuente inversa y revisión. |
| `territorio-y-tiempo/tiempo` | `kunan` aparece por separado con la glosa “ahora”; frase `Kunan p'unchay` no localizada | Pendiente | Pacheco, PDF 41 para `kunan`; sin localizador de frase | No ensamblar una equivalencia de frase a partir de componentes aislados. |

## Introducción original a lectura y escritura

Propuesta breve para abrir `saludos-y-presencia/hola` como subactividad escrita; no requiere añadir otra unidad al catálogo. Es material original de práctica visual y ortográfica, no modelo de pronunciación.

**Lectura.** “Dos libros pueden escribir de manera distinta una misma variedad. Copia primero cada forma tal como aparece en su fuente. Las vocales y marcas que ves no se cambian por parecerse. Una persona revisora debe confirmar qué forma se enseñará y en qué contexto.”

**Ejercicios y clave.**

1. En las secuencias `ch`, `chh`, `ch’`, marca la que lleva `h` y la que lleva apóstrofo. Clave: `chh` lleva `h`; `ch’` lleva apóstrofo; `ch` no lleva ninguno de esos dos signos adicionales.
2. Copia `p`, `ph`, `p’` y `q`, `qh`, `q’` en dos columnas. Señala qué cadenas incluyen `h` y cuáles apóstrofo. Clave: `ph`, `qh` llevan `h`; `p’`, `q’` llevan apóstrofo. No se les asigna pronunciación en esta actividad.
3. Cuenta las letras vocales de los dos inventarios gráficos presentados por las fuentes: Pacheco, `a e i o u`; Calvo, `a i u`. Clave: cinco y tres letras, respectivamente. La comparación describe dos convenciones escritas; no pide decidir un sistema fonológico ni transformar palabras.
4. Copia una `n` y una `ñ` y subraya la marca que las distingue. Clave: `ñ` lleva virgulilla; las cadenas se conservan diferentes.

El material no incluye audio ni instrucción de pronunciación. No convertir estas respuestas visuales en actividad de escucha u oralidad. Antes de publicarlo, confirmar todos los ejemplos con la persona revisora; cualquier grabación exige revisión, autorización y transcripción propias.

## Cambios en el catálogo y pendientes

`buildUnitContent` declara la variedad de trabajo seleccionada en `regionalVariant` para las tres ofertas y añade a `review.notes` el rol pendiente, el conflicto de grafías y la advertencia de que la decisión no es una revisión. `review.status` permanece `draft`; `reviewedBy` y `reviewedAt` siguen nulos. Se retiró del vocabulario inicial la forma que el libro desaconseja como equivalente de saludo diurno. El resto de los candidatos queda en estado de borrador, sin formas alternas aceptadas.

Antes de marcar QCH-02 completo falta asignar por nombre a una persona revisora de la subvariante Cusco y resolver con ella las formas pendientes. `territorio-y-tiempo` además necesita una fuente de uso contextual. La pronunciación y los audios siguen fuera de alcance hasta tener revisión y permisos.
