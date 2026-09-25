# Manifiesto de fuentes QCH-01

Las dos fuentes requeridas por QCH-01 se descargaron/verificaron el 2026-09-25. Los volúmenes 2 y el manual Cusco-Collao se añadieron después como fuentes complementarias. Los hashes identifican los archivos recibidos. Las copias se conservan en privado y no se incluyen en el repositorio.

| ID | Autor y título | Edición / datos editoriales | URL original | Páginas PDF | SHA-256 | Ubicación local reproducible |
| --- | --- | --- | --- | ---: | --- | --- |
| `pacheco-2021-i` | Alipio Pacheco Condori, *Lengua y Cultura Quechuas I (Autopreparación)* | Ediciones Madrigal; el PDF consigna Santiago, enero de 2021, ISBN 978-956-319-137-0, registro de propiedad intelectual 169.000. Número de edición no indicado en el ejemplar. | [Descarga oficial](https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf) | 105 | `d52939c138182b7e743598964984d9edcea82b0c1dfd7051ba1282097c7f762c` | `.private-sources/qch-01/lengua-y-cultura-quechuas-i.pdf` |
| `calvo-2022-v1` | Julio Calvo Pérez, *Nuevo diccionario español-quechua, quechua-español*, volumen 1 | Segunda edición; primera edición digital, 2022; Universidad de San Martín de Porres, Fondo Editorial; ISBN 978-612-4460-44-9. Este PDF contiene el cuerpo español→quechua A–Z. | [Descarga APL](https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_1.pdf) | 2042 | `7e6404c7fd37d6b3ffb9142c1332481307141ba192738d2d18aabba3032c4335` | `.private-sources/qch-01/nuevo-diccionario-vol-1.pdf` |
| `calvo-2022-v2` | Julio Calvo Pérez, *Nuevo diccionario español-quechua, quechua-español*, volumen 2 | Segunda edición digital, 2022; Universidad de San Martín de Porres, Fondo Editorial. Volumen quechua→español según la ficha de APL; 1443 objetos de página contados en la copia recibida. Paginación impresa aún no cotejada. | [Descarga APL](https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_2.pdf) | 1443 | `35ab93830f14de0147cce178529efe5fd1733a95817c3ee13698c40d3e46b21d` | `.private-sources/qch-01/nuevo-diccionario-vol-2.pdf` |
| `cahuana-2007-manual` | Ricardo Cahuana Q., *Manual de gramática quechua Cusco-Collao* | Edición revisada; Sicuani, Perú, 2007. El PDF tiene 48 páginas. No se encontró aviso explícito de licencia o reproducción en sus páginas iniciales; titularidad y condiciones de reutilización por confirmar. | [Archivo Lengamer](https://lengamer.org/admin/language_folders/quechuadecusco/user_uploaded_files/links/File/MANUAL_GRAMATICA_QUECHUA.pdf) | 48 | `4f2f49ac8d8be00936db95856358f7b50736190e2cb343355daf7e09803ef070` | `.private-sources/qch-01/manual-gramatica-quechua-cusco-collao.pdf` |

La fecha de descarga es una fecha de captura local, no una fecha de publicación. Los datos del libro de Pacheco proceden de su PDF, especialmente la portada y PDF 2. El título, autor, edición, año y dos volúmenes del diccionario constan en la [ficha editorial de la APL](https://apl.org.pe/publicaciones/nuevo-diccionario-espanol-quechua-quechua-espanol/); el volumen 1 identifica su propio ISBN.

## Volumen quechua→español adquirido; revisión pendiente

El volumen 2 de la segunda edición digital se descargó el 2026-09-25 desde la URL oficial de APL y se conserva localmente, sin incluirlo en Git. Su hash y conteo de páginas recibidas constan arriba. La ficha de APL confirma que son dos volúmenes; la cobertura de lemas no se considera comprobada hasta cotejar visualmente cada entrada y página.

Comando de adquisición para una futura revisión editorial autorizada:

```sh
mkdir -p .private-sources/qch-01
curl -L --fail 'https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_2.pdf' \
  -o .private-sources/qch-01/nuevo-diccionario-vol-2.pdf
```

Antes de citar lemas, cotejar visualmente entrada, acepción y paginación impresa. No reutilizar para este volumen los metadatos de página del volumen 1. La consulta sigue bajo las condiciones de reserva de derechos del PDF; la descarga no otorga permiso para extraer o publicar texto.

## Manual complementario Cusco-Collao

El manual de Cahuana se descargó el 2026-09-25 desde el archivo Lengamer. La portada identifica la edición revisada, autor, lugar y año (PDF 2); el índice ubica adverbios en impresa 29 y oración en impresa 40 (PDF 30 y 41). Se encontró en PDF 30 / impresa 29 la expresión candidata `kunan p’unchay` con glosa “hoy día” y una lista temática de referencias de lugar y tiempo. Se conserva el archivo privado con hash para cotejo editorial.

No se encontró aviso de licencia en el PDF. Eso **no** concede permiso de reproducción: mantener consulta editorial privada, sin cargar, transcribir o publicar ejemplos, mientras se confirma la titularidad y las condiciones con autor/editor. El manual declara Cusco-Collao en la portada, pero no certifica equivalencia exacta con la subvariante Cusco y convención del curso; la revisión humana sigue requerida. Este manual no contiene una entrada para `Pacha` localizada en la búsqueda textual.
