# QCH-05: diseño del glosario didáctico trazable

Versión 1.0 · 2026-09-25. Depende de QCH-01 y QCH-02. Las páginas PDF se cuentan desde 1. Este documento define la selección y el modelo; no declara entradas del diccionario revisadas ni habilita contenido para publicar.

## Alcance y selección por curso

La selección se deriva de objetivos ya definidos, no de una extracción exhaustiva. El volumen 1 de Calvo va de español a quechua: sirve para consultar un concepto en español y encontrar formas, acepciones y marcas que luego deben cotejarse. No certifica una búsqueda inversa completa ni respalda por sí solo un lema quechua ni una frase. El tomo 2 quechua→español sigue pendiente según [QCH-01](./manifest.md).

En esta tabla, “respaldo curricular” indica que QCH-03/QCH-04 o el material de QCH-01 aportan contexto para el objetivo. “Respaldo lexicográfico” exige que una persona coteje en el PDF la entrada, acepción y localizador. Ningún candidato de este glosario tiene aún ese segundo estado: QCH-01 permite consulta editorial humana privada y metadatos, pero no extracción automática ni reutilización de extractos; no se solicitará ni presumirá autorización. Por tanto, las filas son pendientes editoriales y no se incorporan a las unidades publicadas ni al contexto del tutor.

| Curso / unidades | Objetivo que guía la selección | Conceptos candidatos | Respaldo hoy | Estado del candidato |
| --- | --- | --- | --- | --- |
| `saludos-y-presencia` / `hola`, `presentarse`, `practica-01` | Reconocer destinatario, formas de tratamiento y expresiones de saludo en su contexto; distinguir sustantivo, verbo y partícula cuando los objetivos lo exijan | `madre`, `padre`, `saludar`, `nombre`, `yo`, `tú`, `sí`, interrogación y pregunta de seguimiento | Respaldo curricular directo de Pacheco, Unidad 2, PDF 32–62; citas finas por término/acepción y marcas de Calvo pendientes. `Allin p'unchay` no es candidato a enseñar como equivalente de “buen día” (QCH-02/QCH-03). | Pendiente de cotejo léxico, selección de acepción y revisión Cusco; ejemplos propios pendientes de aprobación lingüística. No convertir componentes en frases nuevas. |
| `familia-y-comunidad` / `familia`, `mi-comunidad`, `practica-02` | Identificar relaciones de parentesco desde la perspectiva de quien habla; contextualizar comunidad, posesión, acciones y negación | `familia`, términos de parentesco con vínculo explícito, `ayllu`, `nosotros/nosotras` solo si se distingue inclusión y contexto, posesión, acción y negación | Respaldo curricular directo de Pacheco, Unidades 3–4, PDF 63–105. QCH-04 ya documenta `Ayllu` en contexto; no es equivalencia única. `Ñuqanchik` continúa retirado; entrada y forma alternativas no validadas. | Pendiente de cotejo de cada entrada/acepción, relación familiar y marca; revisión Cusco y revisión cultural comunitaria pendientes. No publicar `Ñuqanchik` ni derivados. |
| `territorio-y-tiempo` / `lugares`, `tiempo`, `practica-03` | Nombrar lugares, orientación y referencias temporales en situaciones comunicativas con contexto | `lugar`, `casa`, `camino`, referencias de orientación, `día`, `ahora`, `hoy`, `Pacha`, `Kunan p'unchay` como candidatos por verificar | Sin unidad territorial en Pacheco. `kunan` aparece aislado en un ejercicio (PDF 41), lo cual no respalda `Kunan p'unchay`. Calvo vol. 1 podría apoyar búsquedas desde conceptos españoles, con acepción y página por confirmar. | Pendiente de entrada, sentido, marca y página; hace falta fuente contextual para usos/frases y revisión Cusco. No concatenar entradas para fabricar expresiones. |

La lista prioriza conceptos, no impone una traducción quechua por adelantado. El editor puede descartar candidatos tras comprobar polisemia, marcas, variedad o falta de respaldo. El registro de descarte debe conservar el motivo y no elevar un hallazgo de consulta a una respuesta aceptada automáticamente.

## Ficha léxica y control editorial

Cada ficha corresponde a **una acepción de una entrada**, no a una pareja de traducciones. Una entrada polisémica tendrá varias fichas vinculadas por `entryId`; sinónimos tienen `entryId` distintos y una relación explícita de sinonimia solo si fuente y revisora la respaldan. Una locución/subentrada lleva su propio `senseId` y tipo `expression`; no se obtiene concatenando palabras. Se conserva la forma tal como aparece en la fuente, incluidos apóstrofos, signos, cortes, variantes y marcas.

| Campo | Tipo / regla |
| --- | --- |
| `entryId`, `senseId` | Identificadores estables; el primero agrupa acepciones y el segundo identifica exactamente la acepción consultada. |
| `courseSlugs`, `unitIds`, `objectiveIds` | Referencias a uno o más objetivos que justifican incluir la ficha. |
| `queryDirection` | `spanish-to-quechua` o `quechua-to-spanish`; describe la dirección realmente consultada, no una capacidad general de búsqueda. |
| `queryLemma`, `sourceLemma`, `sourceForm` | Concepto/forma de consulta, lema impreso y forma exacta de la acepción en la fuente. No normalizar uno sobre otro. |
| `senseNumber`, `senseText`, `partOfSpeech` | Acepción/subentrada tal como se identifica; categoría gramatical según la abreviatura de la fuente y glosa interna de trabajo. Si no consta, `null` y nota, sin inferencia. |
| `usageMarks`, `crossReferences` | Marcas de registro, región, gramática u otras; remisiones exactas con destino y resultado de su seguimiento. Una remisión no verificada queda pendiente. |
| `variants` | Formas de fuente relacionadas, fuente/localizador y tipo de relación; no se tratan como intercambiables ni respuestas aceptadas sin revisión. |
| `partOfSpeech`, `senseKind` | Categoría de la fuente y tipo `lexeme`, `idiom` o `subentry`; las expresiones conservan su composición y sentido propios. |
| `sourceId`, `sourceEdition`, `sourceUrl` | Enlace a identificador y edición del manifiesto QCH-01. |
| `pdfPage`, `printedPage`, `column`, `entryAnchor` | Página PDF obligatoria, página impresa opcional, columna/posición si ayuda a cotejar, y encabezado del lema. PDF es el localizador estable. |
| `teachingForm`, `teachingExplanation`, `originalExample` | Forma de curso, explicación y ejemplo redactados originalmente; nulos hasta revisión. No copiar definiciones, ejemplos o frases de la obra. |
| `sourceUse`, `permissionRecord` | `private-editorial-reference` mientras no haya autorización; identificador y alcance del permiso si en el futuro se autoriza un extracto. Este proyecto no añade extractos ni permiso supuesto. |
| `reviewStatus`, `reviewedBy`, `reviewedAt`, `reviewNotes` | `pending`, `needs-context`, `needs-permission`, `rejected` o `reviewed`; persona, fecha y decisiones. `reviewed` requiere cotejo visual, variedad y contexto resueltos. |

El extracto textual, si alguna vez se autoriza, es un campo opcional separado, inicialmente ausente: debe guardar el texto mínimo autorizado, titular/permiso, alcance (obra, medio, territorio, plazo, atribución) y localizador. Hasta registrar autorización escrita aplicable, `sourceUse` permanece consulta privada y `extract` se omite. La reserva de derechos de QCH-01 no permite este paso actualmente.

### Vínculos con el contenido de los cursos

El identificador `senseId` es la clave común, con versión del glosario, entre ficha editorial y referencias del producto:

- Cada elemento de `vocabulary` puede llevar `glossaryRef: { entryId, senseId, glossaryVersion }`; su `term` solo se rellena con la forma didáctica aprobada y `meaning` con explicación original revisada. No duplicar la ficha fuente como otra traducción sin contexto.
- Cada `phrase` puede llevar `glossaryRefs: [{ entryId, senseId, role }]` para marcar las acepciones que intervienen. La frase requiere por separado una fuente contextual y revisión; las fichas no autorizan construir frases.
- Cada `sources.items[]` conserva `sourceId`, cita, permiso/uso y `locator` con `pdfPage`, `printedPage`, `headword`, `sense` y `usageMark`; añade `glossaryRef` para no perder la acepción. Una fuente citada a nivel de unidad no reemplaza la referencia de cada forma.

El esquema actual de `CourseUnitContent` documenta páginas y lemas opcionales, pero aún no incluye referencias estables a entradas/acepciones. Al implementar estos campos, versionar el esquema de contenido y permitir que las referencias falten en unidades antiguas; no marcar contenido como revisado ni listo por migrar datos. Los registros pendientes, rechazados o sin permiso quedan fuera de `vocabulary`, `phrases` servidas al estudiante y del contexto recuperable por el tutor. El tutor puede recibir únicamente fichas `reviewed` enlazadas a una unidad autorizada.

Una búsqueda inversa en las fichas aprobadas significa exclusivamente “buscar entre acepciones ya revisadas del subconjunto del curso”. La etiqueta debe decir “búsqueda inversa del glosario seleccionado”. No presentarla como cobertura ni equivalente del tomo 2 quechua→español, cuya adquisición/revisión sigue pendiente en QCH-01.

## Extracción, cotejo y publicación

No hay autorización registrada para extracción del diccionario. Por ello no se generó corpus ni una muestra extraída, y no se amplía automatización. Si los titulares autorizan extracción por escrito, el primer lote será una muestra manual pequeña que cubra artículo simple, polisemia, abreviatura de categoría, marca de uso, sinónimo/remisión, subentrada/expresión, variante y caso con apóstrofo o corte de línea/columna. Dos personas cotejarán cada registro en la página PDF visual: orden de columnas, unión de palabras cortadas, apóstrofos, signos, jerarquía de subentradas y destino de remisiones. Se detendrá la ampliación si hay discrepancias; se archivarán muestra, correcciones, personas, fecha, permiso y criterio de aceptación antes de procesar más páginas.

Hasta entonces la consulta consiste en examinar páginas necesarias de forma editorial privada, registrar metadatos y redactar contenido original. Ningún candidato aquí listado es material para producto o tutor. QCH-05 queda como selección especificada, pero no como glosario léxico validado. Para cada unidad hacen falta cotejo y revisión lingüística de Cusco; `territorio-y-tiempo` requiere además fuente contextual. La consulta de Calvo vol. 1 no satisface la dependencia del tomo 2.
