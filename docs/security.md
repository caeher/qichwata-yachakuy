# Modelo de amenazas

## Activos

- El archivo (blob) y su SHA-256.
- La semilla del hot wallet (`STELLAR_HOT_WALLET_SECRET`).
- Claves de Clerk, de R2/S3 y `DATABASE_URL`.
- La fila `anchors` y el registro on-chain (hash, `doc:<uuid>`, ledger, tx).

## Límites de confianza

- El navegador no firma transacciones y no ve secretos de servidor.
- `/verify` y `/api/verify` son públicos. No revelan el archivo ni el nombre.
- `GET /api/storage/download` es público y solo vale con el token HMAC de vida corta. La URL de R2 es una URL firmada de vida corta.
- El webhook de Clerk es público y solo vale con la firma Svix.

## Amenazas y controles

| Amenaza                             | Control                                                                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secreto en el cliente               | Variables sin `NEXT_PUBLIC_` salvo la publishable key de Clerk. `redact()` en logs (`lib/stellar/redact.ts`, lista en `lib/env/secret-names.ts`).                     |
| Robo del hot wallet                 | Secret solo en el servidor. Alerta si el XLM nativo baja del mínimo (`GET /api/stellar/health`, campo `wallet`, `console.warn`). No hay Friendbot en el proceso Next. |
| Abuso de upload, anclaje o verify   | Límites en memoria por proceso (`lib/http/limits.ts`, verify 30/min/IP). 429 `rate_limited`.                                                                          |
| CSRF sobre mutaciones               | Sesión Clerk en `proxy.ts` y otra vez en el handler (`sessionContext`). No hay token CSRF propio.                                                                     |
| Archivo peligroso o enorme          | `lib/uploads/sniff.ts`, `max_upload_bytes` en `db/constants.ts` (Free: 26 214 400 bytes). Proxy: `experimental.proxyClientMaxBodySize: "30mb"`.                       |
| Borrar el documento de otro usuario | `userId` de la sesión, no del body. `keyBelongsToUser` antes de borrar o firmar descarga.                                                                             |
| Anclaje no atribuible               | Tabla `audit_events` (`lib/audit/record.ts`).                                                                                                                         |
| Derecho de supresión                | `eraseUserAccount`: blob borrado, email y nombre redactados, soft-delete. `anchors` y la cadena se conservan.                                                         |

## Lo que no protegemos

- Un hash ya anclado en Stellar no se puede retirar. El UUID del documento viaja en `meta` (`doc:<uuid>`). No viaja el email ni el nombre del archivo.
- El límite de tasa es por proceso Node. Varias instancias no comparten contador.
- No hay antivirus. La lista de tipos es un filtro, no un sandbox.
- Un token de descarga local es un bearer token durante su TTL. Por eso el TTL es corto y la respuesta lleva `no-store` y `no-referrer`.

## Operación

- CI no tiene secretos reales. `STORAGE_DRIVER=local`.
- Producción con disco efímero: `STORAGE_DRIVER=s3` (R2). Ver `.env.example`.
- Rotar `STELLAR_HOT_WALLET_SECRET` implica dejar de firmar con la semilla anterior. Los anclajes ya hechos siguen siendo válidos.
- Los secretos viven en variables de entorno del host (Vercel, Doppler, etc.); no hay integración Vault en el código.
