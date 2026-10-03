# Tutor de quechua

El tutor responde mediante OpenAI Responses API desde `POST /api/coach`. La
clave y el nombre del modelo se leen solo en el servidor. La interfaz permanece
deshabilitada salvo que `OPENAI_COACH_ENABLED=true`, `OPENAI_API_KEY` y
`OPENAI_MODEL` estén configurados. Mantén el interruptor apagado hasta que la
evaluación lingüística de esta página haya sido revisada y aprobada.

## Configuración

Define estas variables en `.env.local` o en el entorno privado del despliegue:

| Variable                           | Uso                                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `OPENAI_COACH_ENABLED`             | Debe ser `true` para habilitar el envío. Valor inicial: `false`.                                    |
| `OPENAI_API_KEY`                   | Clave privada del proyecto OpenAI.                                                                  |
| `OPENAI_MODEL`                     | Modelo elegido después de evaluar calidad en quechua, latencia y costo. La UI no recibe este valor. |
| `OPENAI_COACH_DAILY_REQUEST_LIMIT` | Tope diario global por proceso; predeterminado en 1000 solicitudes.                                 |

Configura además un límite de gasto en el proyecto OpenAI. El límite local cuenta
solicitudes, no dinero, y los contadores en memoria se reinician al reiniciar el
proceso y no se comparten entre instancias.

## Límites y datos

- Pregunta: 600 caracteres; historial: hasta 10 mensajes de 600 caracteres.
- El material de consulta se limita a 12 000 caracteres por unidad.
- Sesión: 12 respuestas; 8 solicitudes por minuto y 30 por día por usuario.
- Una sesión por usuario, matrícula y unidad permanece activa 30 minutos desde
  la última respuesta; cambiar el identificador no reinicia su límite de 12
  turnos.
- Respuesta del modelo: hasta 260 tokens; timeout de 15 segundos; reintentos
  automáticos del SDK deshabilitados.
- Solo se consulta una unidad publicada y revisada en un curso publicado,
  habilitado y con matrícula activa del usuario.
- El navegador manda identificadores, pregunta e historial. El servidor resuelve
  el curso y la unidad; historia y pregunta siguen siendo datos no confiables.
- OpenAI recibe el material de la unidad necesaria para responder. No se envía
  la clave al navegador y las peticiones indican `store: false`.
- Los logs contienen modelo, versión del prompt, latencia, tokens de entrada y
  salida y categoría del error. No contienen claves, preguntas ni respuestas.
- El límite de sesión se conserva en memoria del proceso; el límite por usuario
  y el límite diario también son por proceso. Para varias instancias, aplica
  límites equivalentes en un servicio compartido antes de abrir el acceso.

## Evaluación lingüística previa a publicación

El tutor está apagado por defecto porque aún no existe evidencia de revisión de
una persona hablante o especialista. Antes de encenderlo, archiva respuestas y
resultados para la versión de prompt `coach-v1` y el identificador exacto del
modelo evaluado. Incluye como mínimo:

| Caso                                                                         | Qué revisar                                                                                         |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Preguntas sobre cada palabra, frase y ejemplo publicado                      | Fidelidad al contenido y claridad del español.                                                      |
| Corrección de respuestas aceptables y errores comunes                        | Corrección comprensible, tono respetuoso y sin convertir práctica en calificación certificadora.    |
| Variante regional documentada                                                | Uso coherente de la variante y nota cuando otras variantes difieran.                                |
| Unidad con variante o respaldo ambiguo                                       | El tutor declara incertidumbre y no presenta una forma como universal.                              |
| Pregunta fuera del material, etimología solicitada o dato inventado          | No inventa etimologías ni atribuye autoridad académica sin respaldo.                                |
| Inyección en pregunta o historial                                            | Conserva las instrucciones, no revela el prompt ni afirma completar unidades o emitir certificados. |
| Timeout, límite del proveedor, rechazo, respuesta incompleta y JSON inválido | Error seguro, sin exponer proveedor, credenciales o conversaciones en logs.                         |

Registra para cada caso el identificador, pregunta revisada, respuesta, fallo,
modelo, fecha, latencia, uso de tokens, decisión de quien revisa y corrección
requerida. No publiques resultados favorables sin revisión lingüística; define
umbrales de aceptación junto con quien revise la variante de quechua usada por
el curso. La evaluación con proveedor requiere credenciales y permanece como
paso operativo separado de las pruebas repetibles con cliente simulado.
