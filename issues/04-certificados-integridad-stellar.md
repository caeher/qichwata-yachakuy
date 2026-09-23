# Issue 04 — Emitir y verificar certificados educativos mediante Stellar

## Objetivo

Emitir automáticamente un certificado por finalización educativa válida y garantizar la integridad de sus datos mediante SHA-256 y la blockchain Stellar/Soroban ya integrada. La emisión no requiere subir ni almacenar archivos, y el alumno no necesita una wallet.

## Contexto y dependencias

Depende de la finalización persistida de la [issue 03](03-scaffolding-educativo-b2c.md) y completa el retiro de dependencias de las issues [01](01-transicion-b2c-eliminar-saas.md) y [02](02-retirar-uploads-y-object-storage.md).

Reutilizar `lib/stellar/`, `lib/anchors/service.ts`, los comprobantes y enlaces al explorador. Adaptar `lib/anchors/job.ts`, `db/anchor-quota.ts` y `lib/verify/lookup.ts`, actualmente ligados a documentos y cuotas. El job usa `doc:<id>` como metadata y la clave pública del operador como owner; el contrato de `contracts/anchor/src/lib.rs` admite hashes y metadata, sin requerir un archivo.

## Plan de implementación

1. Introducir `certificates` con ID público no secuencial, usuario, finalización única, snapshot inmutable de datos emitidos, versión de esquema, hash, fecha de emisión y estado de anclaje. Fijar la unicidad por finalización para impedir certificados duplicados ante reintentos.
2. Definir por escrito el payload canónico versionado: ID del certificado, referencia del beneficiario, emisor, curso/versión y fechas estables. Precisar campos, orden de claves, codificación UTF-8, normalización de texto y formato UTC; usar vectores de prueba que permitan recalcular exactamente el mismo SHA-256.
3. Congelar el snapshot antes del primer envío. El perfil del alumno o el título del curso pueden cambiar después sin modificar el payload emitido. No incluir campos variables de renderizado o transacción en el hash original.
4. Guardar en PostgreSQL únicamente datos estructurados y evidencias. Mostrar el certificado como vista generada; una eventual exportación PDF se generaría bajo demanda y queda fuera del mínimo. Aclarar que se certifica el payload canónico, no los bytes de un PDF inexistente.
5. Crear la solicitud de emisión al consumir una finalización elegible. Persistir la intención de anclaje y habilitar un procesador recuperable, con ejecución programada o mecanismo equivalente documentado, que busque emisiones pendientes. No depender de que el alumno pulse «anclar» ni mantenga la petición abierta.
6. Adaptar reserva y job con estados explícitos `pending`, `anchored`, `failed`, control de concurrencia, hash de transacción persistido y recuperación tras timeout. Reutilizar polling/reconciliación; consultar una transacción o anclaje existente antes de reenviar. Resolver también el caso cadena confirmada + fallo al guardar el recibo en DB.
7. Sustituir cuotas comerciales por idempotencia, elegibilidad académica y límites operativos contra abuso. La firma sigue exclusivamente en servidor con la hot wallet existente; conservar alertas de saldo y redacción de secretos.
8. Usar metadata opaca y estable, por ejemplo `cert:<id>`, dentro del límite de 128 caracteres del contrato. No publicar nombre, email, notas ni contenido académico en cadena o logs. Validar hash, metadata y owner esperado al reconciliar; una coincidencia de hash aislada no basta para atribuir un certificado al emisor.
9. Migrar el vínculo de `anchors` para admitir certificados y conservar anclajes históricos: durante la transición, referencias diferenciadas a documento histórico o certificado, con restricción de exactamente una referencia. No renombrar documentos antiguos como certificados ni cambiar sus hashes o metadata. Retirar el modelo activo de documentos y cuotas solo tras actualizar todos sus consumidores.
10. Crear listado y detalle propios en `/dashboard/certificates`; mostrar pendiente, fallo recuperable y anclaje confirmado. Exponer un enlace público propuesto `/certificates/[publicId]` y adaptar `/verify`, `/api/verify` y `/v/[hash]` para comprobar certificados por identificador/hash, sin uploads.
11. En la verificación, recalcular el hash del snapshot y contrastarlo con la evidencia del contrato y red correctos. Distinguir certificado desconocido, datos alterados, emisión pendiente, fallo, RPC no disponible y confirmación on-chain. No presentar una respuesta obtenida solo de DB como validación blockchain actual; corregir el fallback de red fija `testnet` que aparece en `lib/verify/lookup.ts`.
12. Definir una proyección pública mínima que no exponga IDs internos de Clerk ni datos privados. Mostrar el alcance de la comprobación: integridad y registro del emisor, sin afirmar acreditación académica externa.
13. Actualizar auditoría (`lib/audit/record.ts` y restricciones del esquema) para eventos de emisión y reconciliación. Definir tratamiento de snapshot y enlaces públicos al borrar una cuenta; documentar que los registros on-chain no se eliminan. No prometer borrado del hash en cadena.
14. Completar documentación de configuración, estados, recuperación, migraciones y operación sin object storage. Conservar red y contrato configurados; no sustituir blockchain ni redesplegar el contrato sin una necesidad técnica demostrada.

## Decisiones pendientes y alcance mínimo

- El diseño e identidad visible del certificado y el emisor dependen de producto. La estructura puede probarse con fixtures; la emisión real requiere la política académica de la issue 03.
- Correcciones, reemisión y revocación quedan para una decisión posterior. El certificado emitido es inmutable; no sobrescribir su snapshot ni presentar borrado de DB como revocación on-chain.
- Documentar la política de datos públicos y conservación antes de habilitar certificados de alumnos reales.

## Criterios de aceptación

- [ ] Una finalización elegible genera automáticamente una única emisión persistida, incluso bajo concurrencia o reintentos.
- [ ] Sin finalización validada no se puede emitir ni anclar un certificado mediante llamadas directas a la API.
- [ ] El mismo snapshot produce siempre el mismo hash y cualquier alteración relevante invalida la comparación.
- [ ] Stellar/Soroban existente registra el hash; recibo, red, contrato y transacción quedan vinculados al certificado.
- [ ] Un timeout o reinicio no pierde la emisión ni crea otra; existe un procedimiento verificable de recuperación.
- [ ] Sin configuración blockchain la emisión queda pendiente/configuración requerida, nunca confirmada artificialmente.
- [ ] La verificación pública distingue confirmación real, indisponibilidad y discrepancias, y no filtra datos privados.
- [ ] No hay subida de archivos, object storage, anclajes arbitrarios ni cuotas comerciales en el recorrido final.
- [ ] Los enlaces históricos siguen verificando evidencias antiguas claramente diferenciadas de certificados educativos.

## Validación y entrega

Probar con clientes Stellar simulados: éxito, pendiente, fallo, RPC caído, confirmación tras timeout, reinicio después de enviar y fallo de DB después de confirmar. Cubrir unicidad concurrente, emisión no autorizada, canonicalización, datos alterados, owner/metadata incorrectos y aislamiento testnet/mainnet.

Validar migraciones sobre una base con usuarios, documentos y anclajes antiguos, además de una instalación limpia. Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y pruebas existentes del contrato; CI debe seguir funcionando sin secretos ni RPC real. Como comprobación de integración previa a publicación, realizar una emisión controlada en testnet con credenciales del entorno y verificar su recibo público.

La transición se considera terminada cuando el recorrido cuenta individual → aprendizaje → finalización → certificado → verificación funciona con fixtures controlados y los contenidos/políticas pendientes están claramente señalados, sin activar una oferta académica ficticia.
