# Definir variedad y criterios de escritura para combinar las fuentes

## Objetivo

Evitar que los materiales y las respuestas aceptadas mezclen convenciones sin explicación.

## Fuentes

- [Libro de Alipio Pacheco Condori](https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf): declara Cusco-Collao y grafemario pentavocálico en PDF 8; sus unidades didácticas son la base directa de saludos y parentesco.
- [Diccionario de Julio Calvo Pérez, volumen 1](https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_1.pdf): consulta léxica español→quechua; expone decisiones gráficas en PDF 45–47 (XLV–XLVII), incluidas diferencias en el tratamiento vocálico.

Las copias, los hashes y los avisos de uso constan en [QCH-01](../../quechua-sources/manifest.md). Las páginas PDF se cuentan desde 1. Esta decisión no convierte la consulta editorial en autorización de reproducción.

## Decisión y estado

El registro versionado [QCH-02: variedad, escritura y revisión](../../quechua-sources/qch-02-variety-decision-v1.0.md) selecciona como variedad de trabajo para los tres cursos el quechua sureño Cusco-Collao, subvariante Cusco, con presentación inicial pentavocálica según Pacheco. El diccionario de Calvo es fuente lexicográfica complementaria: sus grafías se conservan como formas de origen y no se convierten globalmente a la convención del curso.

La referencia comunitaria está acotada a hablantes de la subvariante Cusco representada en el libro; el proyecto aún no identifica una comunidad concreta ni una persona revisora. La responsabilidad de conseguirla recae en quien edite el curso. Por esa razón la selección editorial está especificada, mientras que la revisión lingüística y el aval comunitario siguen pendientes. Los tres cursos permanecen en borrador.

## Criterios de aceptación

- [ ] Asignar por nombre para cada curso una persona responsable de revisar la variedad seleccionada; ya están fijadas la variedad de trabajo, la convención y el rol editor que coordina, pero falta la persona revisora y el aval comunitario.
- [x] Definir un registro por forma con grafía original, forma didáctica solo si se aprueba, cita/localizador y motivo de cualquier cambio.
- [ ] Registrar discrepancias reales y obtener su resolución de una persona hablante o especialista asignada. Las encontradas están documentadas; faltan asignación y revisión humana.
- [x] Conservar consonantes simples, aspiradas y glotalizadas, `ñ` y apóstrofos; separar cambios tipográficos de cambios lingüísticos.
- [x] Definir la política para `activity.items.acceptedAnswers`: no se aceptan variantes sin respaldo concreto y revisión; no hay conversiones vocálicas automáticas.
- [x] Completar los valores que `lib/education/initial-catalog.ts` genera para `regionalVariant` y revisión; documentar en `lib/education/content.ts` que `specified` no significa aprobado, sin marcar contenido como revisado.
- [x] Diseñar una breve introducción original a lectura/escritura. La pronunciación y el audio quedan pendientes de revisión específica y grabación autorizada.

## Dependencias

QCH-01. Precede a la edición lingüística de QCH-03 a QCH-07.
