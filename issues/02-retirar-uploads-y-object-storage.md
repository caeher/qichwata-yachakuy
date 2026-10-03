# Issue 02 — Retirar cargas de archivos y almacenamiento de objetos

## Objetivo

Eliminar la carga, custodia y descarga de archivos, imágenes, documentos y textos arbitrarios. Mantener PostgreSQL para usuarios, progreso, certificados y comprobantes blockchain: retirar object storage no significa eliminar la persistencia de datos.

## Contexto del repositorio

- `lib/uploads/` crea documentos, calcula hashes, gestiona descargas y elimina blobs.
- `lib/storage/` incluye proveedores local, S3 y memoria, además de firmas y TTL.
- `/api/documents`, `/api/documents/text`, `/api/documents/[id]/download` y `/api/storage/download` exponen el flujo de almacenamiento.
- `documents.storageKey`, `sizeBytes`, `mimeType` y `users.storageUsedBytes` vinculan el modelo a archivos. `anchors.documentId` depende de esos documentos.
- `lib/privacy/erase-user.ts` y el webhook de Clerk también requieren almacenamiento; `/api/verify` acepta archivos y texto.

## Alcance y plan de implementación

1. Retirar formularios y acciones de carga en `app/dashboard/upload-form.tsx`, `/dashboard/documents/new` y pantallas de documentos. Definir redirecciones del dashboard antiguo y respuestas explícitas de recurso retirado para APIs; no redirigir escrituras hacia la emisión de certificados.
2. Deshabilitar creación de documentos y textos arbitrarios, descargas de blobs y anclaje manual de documentos. El futuro anclaje solo se disparará por una finalización educativa validada.
3. Eliminar proveedores de `lib/storage/`, firmas de descarga y utilidades exclusivas de uploads. Revisar `lib/uploads/hash.ts` antes de retirarlo: conservar o trasladar el cálculo SHA-256 que utilicen certificados o verificaciones históricas.
4. Retirar `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, configuración `STORAGE_*` y `S3_*`, y actualizar el lockfile. Limpiar referencias en `.env.example`, pruebas de secretos, documentación y despliegue.
5. Adaptar privacidad y webhooks para que eliminar una cuenta no instancie un proveedor de blobs. Conservar idempotencia y preparar el tratamiento de datos educativos y certificados definido en las issues 03 y 04.
6. Quitar reservas y métricas de bytes, mensajes de límite de archivo y componentes exclusivos de cuotas. Revisar `components/quota-progress.tsx`, `lib/format-bytes.ts`, `db/quota.ts` y errores de `lib/api/` antes de eliminar consumidores compartidos.
7. Retirar entradas de archivo y texto de `app/verify/verify-form.tsx` y `/api/verify`; mantener temporalmente consulta por hash y enlaces históricos `/v/[hash]`. La issue 04 los especializa para certificados.
8. Actualizar README, arquitectura y seguridad: no se requiere disco persistente, bucket, URL firmada ni almacenamiento de PDF. No reemplazar S3 por blobs o archivos codificados en la base de datos.

## Migración de datos y coordinación

- Depende del desacoplamiento comercial de la [issue 01](01-transicion-b2c-eliminar-saas.md).
- No eliminar `documents` mientras `anchors`, verificación o auditoría lo necesiten. Retirar primero las operaciones de carga; conservar registros históricos mínimos hasta completar la migración de anclajes de la issue 04.
- Preparar un inventario de objetos y relaciones; documentar respaldo/exportación y política de conservación antes de cualquier limpieza física. El despliegue no debe borrar buckets ni `.data/objects` automáticamente.
- Mantener hashes, red, contrato, transacciones y referencias históricas verificables. Los documentos antiguos no se convierten en certificados educativos.
- Añadir migraciones nuevas para retirar columnas de almacenamiento cuando sus consumidores desaparezcan. Documentar que un rollback de esquema no recupera blobs previamente eliminados.

## Criterios de aceptación

- [ ] No existe UI ni endpoint activo para cargar o guardar contenido arbitrario, incluido texto.
- [ ] No existen descargas de blobs ni emisión de URLs firmadas.
- [ ] Registro, eliminación de cuenta, dashboard y verificación funcionan sin proveedor de almacenamiento.
- [ ] No se requieren variables S3/storage ni dependencias AWS en la aplicación final.
- [ ] PostgreSQL, SHA-256 y Stellar permanecen disponibles para certificados.
- [ ] La transición preserva comprobantes y enlaces de anclajes históricos sin presentarlos como certificados.
- [ ] Se documenta el tratamiento de objetos existentes sin eliminarlos como efecto secundario de una migración.

## Validación prevista

Probar rechazo de los endpoints retirados, ausencia de formularios de carga, eliminación de cuenta sin storage y consulta de un hash histórico. Revisar imports, dependencias y configuración; ejecutar lint, typecheck, tests y build sin credenciales de almacenamiento. Sustituir tests exclusivos de proveedores retirados por pruebas del comportamiento final donde corresponda.

## Fuera de alcance

Guardar videos, imágenes de cursos, PDFs o adjuntos en otro proveedor. La plataforma educativa inicial utiliza scaffolding de contenido y datos estructurados.
