# Issue 12 — Aplicar el diseño Yachay a certificados y verificación real

Prioridad: alta. Depende de [06](06-design-system-yachay.md), [08](08-catalogo-contenido-inicial.md) y [09](09-lecciones-practica-progreso.md). Reutiliza lo implementado para la [issue 04](04-certificados-integridad-stellar.md).

## Objetivo

Conservar la presentación de certificados del origen y conectarla a la emisión y verificación efectivas que ya ofrece la raíz.

## Referencias

`quechua-convex/pages/verificar.tsx`, `quechua-convex/convex/learning.ts`, `app/dashboard/certificates/page.tsx`, `app/certificates/[publicId]/page.tsx`, `app/verify/`, `lib/certificates/` y `lib/verify/`.

## Trabajo propuesto

1. Extraer `CertificateCard`, `CertificateDetails` y `VerificationStatus` con variantes preview, pending, anchored, failed y unavailable según corresponda; reutilizarlos en vistas privada y pública.
2. Mostrar el certificado por curso/módulo y versión con datos persistidos. Conectar la finalización elegible al servicio existente y mantener la emisión idempotente.
3. Sustituir el certificado válido fijo de `/verificar` por consulta real de identificador/hash, enlazada con `/verify` y el detalle público existente.
   Los identificadores Convex con formato `YCH-...` se presentan como referencias heredadas sin evidencia de finalización/anclaje; no se importan como `certificates` raíz ni se muestran como válidos.
4. Mostrar red, estado, evidencia y enlace real al explorador desde configuración y recibo. El botón del origen no tiene acción y no debe mantenerse como control aparente.
5. Distinguir desconocido, pendiente, fallo de anclaje, discrepancia y RPC no disponible. La etiqueta «verificado» depende del resultado real; no basta el texto `SHA-256` o `Stellar Testnet` guardado en Convex.
6. Mantener snapshot canónico inmutable y proyección pública mínima. No publicar nombre o identificador Clerk por copiar el diseño privado; respetar las reglas de datos públicos existentes.
7. Mostrar el requisito académico pendiente cuando no haya política aprobada. Los certificados heredados identificados en la issue 05 no se presentan como anclados sin evidencia.

## Criterios de aceptación

- [ ] El alumno consulta sus certificados con estados reales y estilo Yachay.
- [ ] No se emite por un clic aislado sin finalización elegible validada en servidor.
- [ ] La verificación pública recupera datos reales y distingue indisponibilidad de invalidez.
- [ ] Un enlace al explorador abre la transacción/red correspondiente y solo se ofrece con evidencia.
- [ ] La migración visual conserva hashes, snapshots, IDs públicos y enlaces existentes.
- [ ] Un certificado de demostración o heredado no adquiere estado de verificado automáticamente.

## Validación prevista

Reutilizar las pruebas de canonicalización, verificación y anclaje de la raíz. Revisar las variantes visuales con fixtures de todos los estados y realizar el recorrido finalización elegible → certificado → enlace público con servicios simulados; usar testnet para una comprobación controlada antes de publicación.
