# Descargar las fuentes y mapear sus índices al catálogo educativo

## Objetivo

Preparar las fuentes para complementar los nueve borradores de `lib/education/initial-catalog.ts`.

## Documentos que se deben descargar

- [Libro de Alipio Pacheco Condori](https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf).
- [Diccionario de Julio Calvo Pérez, volumen 1](https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_1.pdf).

Registrar las descargas y condiciones de uso según QCH-01. Las páginas PDF indicadas se cuentan desde 1.

## Análisis de cobertura

El libro tiene 105 páginas PDF; índice en 3–7. Contiene cuatro unidades: cultura/escritura, presentación, familia extensa y parentesco cercano, con inicios reales en PDF 13, 32, 63 y 85. El índice tiene desfases: anuncia saludos en 28, pero aparecen en 32. No aplicar un desplazamiento fijo. La introducción menciona doce unidades, pero este archivo solo contiene cuatro.

El diccionario tiene 2042 páginas PDF. Sus marcadores sitúan marco en 11, manejo en 21, pistas de interpretación en 37, ortografía en 43, estrategias léxicas en 52, abreviaturas en 56 y bibliografía en 82. El cuerpo A–Z ocupa PDF 97–2041 (impresas 1–1945) y corresponde a español→quechua. El título general no demuestra que el volumen incluya la sección inversa.

## Criterios de aceptación

- [x] Descargar ambos archivos desde los enlaces anteriores; registrar autor, título, edición, URL, fecha, SHA-256, páginas y ubicación reproducible fuera de los assets públicos.
- [x] Construir matriz sección → página del índice → página PDF comprobada → curso/unidad → ampliación propuesta → carencia pendiente.
- [x] Cubrir los cursos `saludos-y-presencia`, `familia-y-comunidad` y `territorio-y-tiempo` distinguiendo respaldo directo y nuevas propuestas pedagógicas.
- [x] Localizar y verificar el tomo/sección quechua→español; añadir URL e instrucciones de descarga. Su cobertura de artículos continúa pendiente hasta descargarlo y revisarlo.
- [x] Registrar condiciones de uso: aviso del libro en PDF 2 y del diccionario en PDF 5. Ambos reservan reproducción; documentar los usos autorizados antes de incorporar extractos o procesar un corpus para el producto.
- [x] Definir citas con página real y entrada/acepción cuando corresponda, y la evolución mínima de `CourseUnitContent.sources` para conservarlas.
- [x] Documentar cobertura faltante y decisiones en un registro editorial versionado.

El manifiesto, el registro editorial y las instrucciones de descarga están en [`docs/quechua-sources/`](../../quechua-sources/). Las copias descargadas se guardan localmente en `.private-sources/qch-01/`, ignoradas por Git para no redistribuir obras con reproducción reservada. La descarga es reproducible con `scripts/download-qch-01-sources.sh`.

Esta descarga es editorial y no requiere reactivar las antiguas rutas de carga de documentos de la aplicación.

## Dependencias

Ninguna. Habilita QCH-02 a QCH-07.
