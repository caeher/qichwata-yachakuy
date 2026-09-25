# Certificados educativos

## Estado de producto

El modelo, recorrido de inscripción/progreso, hash canónico y verificación están implementados. No hay cursos publicados por defecto. La política productiva `pendingCompletionPolicy` siempre devuelve `criteria_pending`; por ello no se genera una finalización elegible ni un certificado real hasta aprobar y desplegar criterios académicos, identidad del emisor y el contenido del curso. No se debe publicar un curso de demostración como oferta real.

## Payload canónico v1

`lib/certificates/canonical.ts` serializa en UTF-8 JSON compacto, con claves en este orden fijo:

```json
{
  "schemaVersion": 1,
  "certificateId": "018f0000-0000-7000-8000-000000000001",
  "beneficiaryRef": "018f0000-0000-7000-8000-000000000001",
  "issuer": "Instituto Quechua",
  "course": {
    "slug": "introduccion-quechua",
    "version": "1.0",
    "title": "Quechua básico"
  },
  "completion": {
    "policyVersion": "v1",
    "completedAt": "2026-01-02T03:04:05.000Z"
  },
  "issuedAt": "2026-01-02T03:05:00.000Z"
}
```

Los textos se recortan y normalizan a Unicode NFC. Las fechas se serializan con `Date.toISOString()` en UTC y milisegundos. SHA-256 del vector anterior:

```text
3686598766f1a8b18de273f1381b6d2675aff95fedeba783c4ce5831c007666d
```

El snapshot JSON se congela en la misma transacción que `course_completions`; el hash corresponde a ese payload, no a un PDF. No se incluyen nombre, correo, ID interno de usuario, datos variables de presentación ni transacción.

## Estados y recuperación

- `pending`: intención guardada; puede significar configuración requerida, envío aún sin respuesta final o transacción en curso.
- `anchored`: existe recibo en `anchors` con red, contrato, transacción y ledger.
- `failed`: intento fallido; el procesador lo vuelve a reservar y consulta el hash antes de reenviar.

`POST /api/jobs/certificates` procesa hasta 20 certificados por ejecución. Configura `CERTIFICATE_WORKER_TOKEN` como secreto y programa el host para invocar ese endpoint, por ejemplo cada minuto. La reserva usa bloqueo de fila; el tx hash se guarda antes del siguiente polling. Timeout/RPC caído deja una intención recuperable. Tras confirmar la cadena, el recibo y el estado `anchored` se escriben en la misma transacción, junto con la clave pública del owner de emisión. Al reintentar se consulta Stellar y se contrasta SHA-256, `cert:<publicId>` y owner. Las rotaciones posteriores de hot wallet no cambian la clave esperada de certificados ya emitidos.

El procesador soporta tanto PostgreSQL como Convex. En ambos casos una política del curso marcada `approved` y su `completionPolicyVersion` validan la finalización del lado servidor. En PostgreSQL, al igual que en Convex, la política pendiente bloquea la creación del certificado. El botón del recorrido prepara una sola emisión idempotente; el registro en Stellar lo realiza el job programado y su estado se consulta desde la vista pública o privada.

Si no hay configuración Stellar, el certificado se conserva `pending` con `configuration_required`; no se presenta como confirmado. Si el contrato confirma el hash pero se pierde el tx hash antes de persistirlo, la consulta Soroban disponible no devuelve transacción; el job deja la emisión pendiente y audita la discrepancia en vez de fabricar un recibo. La operación debe resolver esta condición con la transacción de envío/RPC y el hash del certificado antes de reintentar. Si el recibo ya quedó en DB, el polling repara el estado aunque falle el primer guardado de `certificates.status`.

## Privacidad y borrado

La vista pública solo expone identificador aleatorio, emisor, curso/versión, fechas, SHA-256 y recibo. El snapshot usa como referencia de beneficiario el ID aleatorio del propio certificado; no expone IDs Clerk ni correo. El borrado de cuenta soft-delete conserva matrícula, progreso y finalizaciones con la fila tombstone, y conserva el snapshot mínimo para seguir verificando evidencias. Los registros Stellar no se pueden eliminar. Esta conservación no revoca un certificado ni equivale a acreditación académica externa. Corrección, reemisión y revocación quedan pendientes de una política de producto; el snapshot nunca se sobrescribe. Antes de admitir alumnos reales, producto debe aprobar esta política de datos y conservación.

## Recorrido y operación

- `POST /api/education/enrollments` inscribe solo en cursos publicados no demo.
- `POST /api/education/enrollments/[id]/units/[unitId]` guarda progreso idempotente y valida propiedad/curso.
- `POST /api/education/enrollments/[id]/complete` no acepta elegibilidad del cliente. Con la política actual responde `criteria_pending`.
- `/dashboard/certificates` es privado. `/certificates/[publicId]` y `/api/verify` consultan el contrato configurado para verificación actual; una respuesta solo de base de datos no confirma Stellar.
- Los anclajes antiguos continúan ligados a `document_id` y usan su metadata original `doc:<id>`. Los nuevos anclajes usan exclusivamente `certificate_id` y `cert:<publicId>`.

Aplicar `pnpm db:migrate` antes de desplegar. Añade `CERTIFICATE_ISSUER` y `CERTIFICATE_WORKER_TOKEN` al entorno; `STELLAR_NETWORK`, `STELLAR_CONTRACT_ID` y la hot wallet existentes se conservan. No se requiere object storage, subida ni PDF.
