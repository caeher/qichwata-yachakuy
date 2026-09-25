# Manifiesto de fuentes QCH-01

Fecha de descarga/verificación de las dos copias: 2026-09-25. Se descargaron de nuevo desde sus URL originales. Los hashes identifican los archivos recibidos. Los PDF son copias editoriales privadas: no se incluyen en el repositorio.

| ID | Autor y título | Edición / datos editoriales | URL original | Páginas PDF | SHA-256 | Ubicación local reproducible |
| --- | --- | --- | --- | ---: | --- | --- |
| `pacheco-2021-i` | Alipio Pacheco Condori, *Lengua y Cultura Quechuas I (Autopreparación)* | Ediciones Madrigal; el PDF consigna Santiago, enero de 2021, ISBN 978-956-319-137-0, registro de propiedad intelectual 169.000. Número de edición no indicado en el ejemplar. | [Descarga oficial](https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf) | 105 | `d52939c138182b7e743598964984d9edcea82b0c1dfd7051ba1282097c7f762c` | `.private-sources/qch-01/lengua-y-cultura-quechuas-i.pdf` |
| `calvo-2022-v1` | Julio Calvo Pérez, *Nuevo diccionario español-quechua, quechua-español*, volumen 1 | Segunda edición; primera edición digital, 2022; Universidad de San Martín de Porres, Fondo Editorial; ISBN 978-612-4460-44-9. Este PDF contiene el cuerpo español→quechua A–Z. | [Descarga APL](https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_1.pdf) | 2042 | `7e6404c7fd37d6b3ffb9142c1332481307141ba192738d2d18aabba3032c4335` | `.private-sources/qch-01/nuevo-diccionario-vol-1.pdf` |

La fecha de descarga es una fecha de captura local, no una fecha de publicación. Los datos del libro de Pacheco proceden de su PDF, especialmente la portada y PDF 2. El título, autor, edición, año y dos volúmenes del diccionario constan en la [ficha editorial de la APL](https://apl.org.pe/publicaciones/nuevo-diccionario-espanol-quechua-quechua-espanol/); el volumen 1 identifica su propio ISBN.

## Volumen quechua→español localizado, aún pendiente de adquisición y revisión

El volumen 2 de la segunda edición digital aparece publicado por la APL con el mismo título general. La URL oficial directa es [DICCIONARIO-Quechua-espanol-VOL_2.pdf](https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_2.pdf). La vista de catálogo de [CENDOC Chirapaq](https://cendoc.chirapaq.org.pe/items/show/10253) identifica el volumen 2 como *Quechua-Español*. La ficha de APL confirma que son dos volúmenes, pero la cobertura de lemas no se considera comprobada hasta obtener y revisar el archivo.

Comando de adquisición para una futura revisión editorial autorizada:

```sh
mkdir -p .private-sources/qch-01
curl -L --fail 'https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_2.pdf' \
  -o .private-sources/qch-01/nuevo-diccionario-vol-2.pdf
```

Al adquirirlo, registrar fecha, SHA-256, número de páginas y paginación impresa antes de citar lemas. No reutilizar para este volumen los metadatos de página del volumen 1.
