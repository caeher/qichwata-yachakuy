# Issue 11 — Integrar el tutor de quechua y la práctica asistida con OpenAI

Prioridad: alta. Depende de [06](06-design-system-yachay.md), [07](07-landing-acceso-navegacion.md) y [08](08-catalogo-contenido-inicial.md).

## Objetivo

Migrar el tutor textual de Yachay a la raíz utilizando OpenAI para toda generación de IA, con contexto educativo validado y una interfaz reutilizable.

## Referencias

`quechua-convex/pages/api/coach.ts`, `createCoachPrompt` en `quechua-convex/lib/domain/learning.ts`, sección `practice` del dashboard y `lib/http/rate-limit.ts`.

El origen usa `gateway('openai/gpt-4.1-nano')`. Se propone una integración directa desde servidor con el SDK oficial de OpenAI y Responses API. El modelo será configurable y se seleccionará por evaluación de calidad en quechua, latencia y costo antes de habilitarlo.

## Funcionalidades iniciales

- Explicar vocabulario y frases de la lección en español claro.
- Proponer un diálogo textual breve y corregir una respuesta con contexto regional.
- Mantener conversación acotada durante la sesión; guardar historial entre sesiones queda fuera del mínimo.

## Trabajo propuesto

1. Crear un servicio exclusivo de servidor y un Route Handler de `/api/coach`; configurar `OPENAI_API_KEY` y el modelo en variables privadas documentadas. La UI no debe depender de identificadores técnicos de modelos.
2. Validar sesión, cuerpo, longitud y contexto. Conservar inicialmente el límite de 600 caracteres por pregunta; definir además límite de turnos, tokens, frecuencia por usuario y presupuesto operativo.
3. Resolver curso/unidad y contenido autorizado desde el servidor. Tratar mensajes e historial del cliente como datos no confiables; separar instrucciones del tutor y material de consulta.
4. Usar ejemplos revisados y declarar incertidumbre cuando no haya respaldo; respetar variantes regionales y evitar inventar etimologías o afirmar autoridad académica.
5. Para correcciones con campos de UI, proponer Structured Outputs con respuesta, explicación y nota regional; validar el resultado y manejar rechazos o respuestas incompletas. [Documentación oficial de OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs).
6. Extraer `TutorPanel`, `ChatMessage`, `PromptComposer` y sugerencias como componentes con variantes. Mostrar enviando, respuesta, límite alcanzado, sesión vencida y servicio no disponible; conservar el texto para reintentar sin duplicar turnos.
7. Registrar latencia, consumo y código de error sin claves ni conversaciones completas. Sin configuración, deshabilitar el envío con mensaje claro. La práctica autónoma debe seguir disponible.
8. Toda ampliación de IA utilizará OpenAI. Audio, generación masiva de cursos y calificación certificadora automática quedan fuera del alcance inicial.

## Criterios de aceptación

- [ ] El tutor responde sobre la unidad seleccionada mediante OpenAI desde servidor.
- [ ] Las claves no llegan al navegador y las solicitudes sin sesión se rechazan.
- [ ] Hay límites efectivos y manejo de timeout, 429, fallos del proveedor y salida inválida.
- [ ] La conversación respeta el contexto y se limpia al cerrar sesión o cambiar de usuario.
- [ ] Las respuestas no completan lecciones ni emiten certificados por sí mismas.
- [ ] Una evaluación con preguntas revisadas, variantes regionales, ambigüedad y entradas adversas documenta calidad y limitaciones antes de publicación.

## Validación prevista

Usar un cliente OpenAI simulado para pruebas repetibles de contrato y errores; realizar una evaluación controlada con el proveedor al disponer de credenciales. Registrar modelo y versión del prompt usados y evidencia de revisión lingüística.
