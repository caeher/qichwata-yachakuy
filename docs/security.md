# Modelo de amenazas

## Activos

- Los SHA-256 históricos y sus comprobantes de anclaje.
- Los snapshots estructurados de certificados educativos.
- La semilla del hot wallet (`STELLAR_HOT_WALLET_SECRET`).
- Claves de Clerk y `DATABASE_URL`.
- La fila `anchors` y el registro on-chain (hash, `doc:<uuid>`, ledger, tx).

## Límites de confianza

- El navegador no firma transacciones y no ve secretos de servidor.
- `/verify`, `/api/verify` y los enlaces públicos consultan SHA-256 y certificados. No aceptan archivos ni textos.
- Las rutas de carga, documentos y descarga están retiradas y responden `410 resource_retired`.
- El webhook de Clerk es público y solo vale con la firma Svix.

## Amenazas y controles

| Amenaza               | Control                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secreto en el cliente | Variables sin `NEXT_PUBLIC_` salvo la publishable key de Clerk. `redact()` en logs (`lib/stellar/redact.ts`, lista en `lib/env/secret-names.ts`).                                 |
| Robo del hot wallet   | Secret solo en el servidor. Alerta si el XLM nativo baja del mínimo (`GET /api/stellar/health`, campo `wallet`, `console.warn`). No hay Friendbot en el proceso Next.             |
| Abuso de verify       | Límite en memoria por proceso (30/min/IP). 429 `rate_limited`.                                                                                                                    |
| CSRF sobre mutaciones | Sesión Clerk en `proxy.ts` y otra vez en el handler (`sessionContext`). No hay token CSRF propio.                                                                                 |
| Anclaje no atribuible | Tabla `audit_events` (`lib/audit/record.ts`).                                                                                                                                     |
| Derecho de supresión  | `eraseUserAccount`: email y nombres históricos redactados, cuenta y documentos soft-delete. Hashes y anclajes se conservan.                                                       |
| Emisión no autorizada | Solo una `course_completion` elegible crea el certificado. Los endpoints de aprendizaje resuelven el usuario en servidor; el cliente no puede enviar el resultado de la política. |
| Certificado alterado  | El verificador recalcula el hash del snapshot canónico versionado y comprueba red, contrato, metadata opaca y owner del emisor.                                                   |
| Trabajo duplicado     | Unicidad por finalización, bloqueo de fila y worker idempotente; reintentos consultan primero Stellar.                                                                            |

## Lo que no protegemos

- Un hash ya anclado en Stellar no se puede retirar. En evidencia antigua viaja `doc:<id>` y en certificados `cert:<publicId>`; no viajan email, nombre ni contenido académico.
- La cuenta borrada conserva el snapshot mínimo de certificado y la relación privada soft-delete para que se siga verificando. La huella pública es inmutable y no funciona como revocación.
- El estado `pending` o una consulta DB sin una comprobación actual de cadena no significa certificado confirmado.
- El límite de tasa es por proceso Node. Varias instancias no comparten contador.
- Los objetos físicos de instalaciones anteriores pueden seguir existiendo. `legacy_object_inventory` conserva sus claves y relaciones; antes de una limpieza manual hay que exportar esa tabla y los comprobantes, registrar el proveedor/bucket y definir conservación. Un rollback de esquema no restaura objetos eliminados.

## Operación

- CI y producción no necesitan credenciales de almacenamiento de objetos ni disco persistente.
- Rotar `STELLAR_HOT_WALLET_SECRET` implica dejar de firmar con la semilla anterior. Los anclajes ya hechos siguen siendo válidos.
- Los secretos viven en variables de entorno del host (Vercel, Doppler, etc.); no hay integración Vault en el código.
