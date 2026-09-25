import type { CourseUnitContent, LessonKind } from "@/lib/education/content";

type UnitSeed = {
  lessonId: string;
  title: string;
  description: string;
  kind: LessonKind;
  durationMinutes: number;
  objectives: string[];
  reading: string[];
  vocabulary?: [string, string][];
  phrases?: [string, string, string][];
  examplePrompt: string;
  exampleResponse: string;
  activityTitle: string;
  activityPrompt: string;
  activityAnswer: string;
  activityItems?: {
    prompt: string;
    options?: string[];
    answer: string;
    feedback: string;
    acceptedAnswers?: string[];
  }[];
  sourceItems?: CourseUnitContent["sources"]["items"];
};

export type CourseSeed = {
  slug: string;
  title: string;
  description: string;
  level: "beginner";
  accent: "leaf" | "clay" | "gold";
  estimatedDurationMinutes: number;
  version: string;
  completionPolicyVersion: string;
  units: UnitSeed[];
};

export const INITIAL_COURSES: CourseSeed[] = [
  {
    slug: "saludos-y-presencia",
    title: "Saludos y presencia",
    description:
      "Explora saludos, presentaciones y un primer diálogo en comunidad.",
    level: "beginner",
    accent: "leaf",
    estimatedDurationMinutes: 26,
    version: "1.0.0",
    completionPolicyVersion: "pending-v1",
    units: [
      {
        lessonId: "hola",
        title: "Un saludo dirigido a alguien",
        description:
          "Lee un saludo con destinatario y distingue su función de una traducción literal.",
        kind: "vocabulary",
        durationMinutes: 7,
        objectives: [
          "Reconocer que el ejemplo de saludo se dirige a una segunda persona concreta.",
          "Interpretar -y como posesivo de primera persona en Mamay y Tatay.",
          "Explicar por qué una traducción literal no basta para elegir un saludo equivalente.",
        ],
        reading: [
          "En la primera escena de la Unidad 2, el saludo se dirige a una persona concreta. El texto presenta Mamay y Tatay como formas de tratamiento que significan «madre mía» y «padre mío», seguidas de napaykuyki, «te saludo». Aprende estas expresiones en ese contexto del libro; una persona hablante debe revisar antes de generalizarlas a otras relaciones o situaciones.",
          "Observa la construcción: mama + -y → Mamay; tata + -y → Tatay. En este paso, -y expresa «mi». La secuencia -yki forma parte del verbo napaykuyki en el ejemplo y se interpreta allí como «te saludo»; no se separará ni generalizará sin una lección gramatical revisada.",
          "Una expresión parecida a «día bueno» no funciona necesariamente como el saludo castellano «buen día». Por eso se retira Allin p'unchay del vocabulario y no se reemplaza por una frase traducida palabra por palabra. El objetivo aquí es comprender el destinatario y la estructura del ejemplo, no memorizar un saludo universal.",
        ],
        vocabulary: [
          ["Mamay", "madre mía; forma de tratamiento del ejemplo de saludo."],
          ["Tatay", "padre mío; forma de tratamiento del ejemplo de saludo."],
          [
            "napaykuyki",
            "te saludo; verbo de saludo dirigido a un tú en el pasaje.",
          ],
          ["-y", "mi; sufijo posesivo que aparece en Mamay y Tatay."],
        ],
        phrases: [
          [
            "Mamay, napaykuyki.",
            "Madre mía, te saludo.",
            "Ejemplo dirigido a una persona concreta; el contexto interpersonal requiere revisión.",
          ],
          [
            "Tatay, napaykuyki.",
            "Padre mío, te saludo.",
            "Ejemplo dirigido a una persona concreta; el contexto interpersonal requiere revisión.",
          ],
        ],
        examplePrompt:
          "En Mamay, napaykuyki, ¿quién recibe el saludo y qué aporta -y en Mamay?",
        exampleResponse:
          "Lo recibe un tú concreto; -y significa «mi», por eso Mamay se glosa «madre mía».",
        activityTitle: "Lee el saludo en contexto",
        activityPrompt:
          "Elige la lectura que corresponde al ejemplo Mamay, napaykuyki.",
        activityAnswer:
          "Es un saludo dirigido a una persona concreta: «Madre mía, te saludo»; -y expresa «mi» en Mamay.",
        activityItems: [
          {
            prompt:
              "Elige la lectura que corresponde al ejemplo Mamay, napaykuyki.",
            options: [
              "Un saludo dirigido a una persona: «Madre mía, te saludo».",
              "Un saludo general equivalente a «buen día».",
              "Una pregunta sobre el nombre de la madre.",
            ],
            answer: "Un saludo dirigido a una persona: «Madre mía, te saludo».",
            feedback:
              "Correcto: el pasaje identifica un destinatario en segunda persona y glosa la expresión así. La traducción literal no convierte la frase en un saludo general.",
          },
          {
            prompt:
              "¿Qué significa -y en Mamay y Tatay según la explicación del pasaje?",
            options: ["mi", "te", "y (conjunción)"],
            answer: "mi",
            feedback:
              "En estos dos sustantivos, -y es el posesivo de primera persona «mi». No confundas este sufijo con -ri, que aparecerá como pregunta de seguimiento.",
          },
          {
            prompt:
              "¿Cuál expresión del prototipo se retira como equivalente de «buen día»?",
            options: [
              "Allin p'unchay",
              "Mamay, napaykuyki",
              "Tatay, napaykuyki",
            ],
            answer: "Allin p'unchay",
            feedback:
              "Se retira porque una traducción cercana a «día bueno» no confirma la función social de «buen día». No la uses como respuesta aceptada.",
          },
        ],
        sourceItems: [
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 2, ‘Saludar y presentarse’, PDF 32–33.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto. El contenido explicativo de esta unidad es una propuesta original.",
            usedFor:
              "Respaldo temático y localización de los ejemplos de saludo, el destinatario de segunda persona y la advertencia contra traducir literalmente ‘buen día’. Las explicaciones y actividades son originales.",
            supportType: "direct",
            locator: {
              pdfPage: 32,
              printedPage: null,
              heading: "Unidad 2, 1. Saludar y presentarse",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 2, ‘Saludar y presentarse’, PDF 33.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Referencia directa para la decisión de retirar Allin p'unchay como equivalente de ‘buen día’; no se enseña como vocabulario.",
            supportType: "direct",
            locator: {
              pdfPage: 33,
              printedPage: null,
              heading: "Unidad 2, 1. Saludar y presentarse",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 2, ‘Saludar y presentarse’, PDF 32–33.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Pasaje que motivó la explicación original y las actividades de comprensión del destinatario, -y y la diferencia entre glosa y función. No se reproduce la actividad de la fuente.",
            supportType: "pedagogical-proposal",
            locator: {
              pdfPage: 32,
              printedPage: null,
              heading: "Unidad 2, 1. Saludar y presentarse",
            },
          },
        ],
      },
      {
        lessonId: "presentarse",
        title: "Decir quién soy y preguntar por ti",
        description:
          "Presenta un nombre y practica una pregunta de seguimiento con -ri y una pregunta con -chu.",
        kind: "phrases",
        durationMinutes: 9,
        objectives: [
          "Construir una presentación nominal con Ñoqa ... kani y Qam ... kanki.",
          "Reconocer -chu como marca interrogativa en un elemento focalizado.",
          "Usar Qamri? como pregunta de seguimiento equivalente a «¿y tú?» en el patrón estudiado.",
        ],
        reading: [
          "La presentación de esta lección trata de nombres, no de preguntar por el bienestar. Usa exactamente la grafía Ñoqa que aparece en el libro: Ñoqa Pedro kani se traduce «Yo soy Pedro» y Qam Rosa kanki, «Tú eres Rosa». La forma Imaynallataq kanki del prototipo no se localizó en estos pasajes y queda retirada como modelo.",
          "Paso 1: observa sujeto + nombre + forma de kay (ser): Ñoqa + nombre + kani para «yo soy»; Qam + nombre + kanki para «tú eres». Paso 2: agrega -chu al elemento que se pregunta: Qamchu ...? pregunta si la persona interlocutora es quien se nombra. La respuesta afirmativa comienza con Ari y no repite -chu.",
          "Paso 3: para devolver la pregunta de manera breve, el diálogo usa Qamri? («¿y tú?»). En esta secuencia -ri enlaza el turno con la otra persona. Esta explicación se limita al patrón de presentación de la Unidad 2; no es una regla para todas las preguntas.",
        ],
        vocabulary: [
          [
            "Ñoqa",
            "yo; sujeto de primera persona en los ejemplos del libro. Se conserva su grafía original.",
          ],
          ["Qam", "tú; sujeto de segunda persona en los ejemplos del libro."],
          [
            "kani / kanki",
            "formas de kay usadas con Ñoqa / Qam en los ejemplos: «soy» / «eres».",
          ],
          [
            "Ari",
            "sí; inicio de la respuesta afirmativa en el patrón del libro.",
          ],
          [
            "-chu",
            "sufijo interrogativo agregado al elemento por el que se pregunta.",
          ],
          [
            "-ri",
            "marca usada en Qamri? para continuar la pregunta: «¿y tú?» en este intercambio.",
          ],
        ],
        phrases: [
          [
            "Ñoqa Ana kani.",
            "Yo soy Ana.",
            "Presentación del nombre con la primera persona; composición didáctica original basada en el patrón citado.",
          ],
          [
            "Qamchu Ana kanki?",
            "¿Tú eres Ana?",
            "-chu se coloca en el elemento focalizado en esta pregunta.",
          ],
          [
            "Ari, ñoqa Ana kani.",
            "Sí, yo soy Ana.",
            "Respuesta afirmativa; no conserva -chu.",
          ],
          [
            "Qamri?",
            "¿Y tú?",
            "Pregunta de seguimiento breve en un intercambio de presentación.",
          ],
          [
            "Ñoqa Luis kani.",
            "Yo soy Luis.",
            "Presentación del nombre con la primera persona.",
          ],
        ],
        examplePrompt:
          "En Qamchu Ana kanki?, ¿qué elemento se pregunta y qué cambia en la respuesta afirmativa?",
        exampleResponse:
          "Se pregunta si la otra persona es Ana; la respuesta afirmativa empieza con Ari y omite -chu: Ari, ñoqa Ana kani.",
        activityTitle: "Comprende las preguntas de presentación",
        activityPrompt:
          "Lee el intercambio y selecciona la explicación correcta: Qamchu Ana kanki? — Ari, ñoqa Ana kani. — Qamri? — Ñoqa Luis kani.",
        activityAnswer:
          "Se pregunta a la otra persona si es Ana, luego se responde afirmativamente y se devuelve el turno con «¿y tú?».",
        activityItems: [
          {
            prompt:
              "Lee: Qamchu Ana kanki? — Ari, ñoqa Ana kani. ¿Qué indica -chu aquí?",
            options: [
              "Que se pregunta si la otra persona es Ana.",
              "Que Ana saluda por la mañana.",
              "Que la respuesta debe repetir -chu.",
            ],
            answer: "Que se pregunta si la otra persona es Ana.",
            feedback:
              "-chu marca la pregunta sobre el elemento señalado. En la respuesta afirmativa del ejemplo se usa Ari y desaparece -chu.",
          },
          {
            prompt:
              "Completa la respuesta afirmativa: Qamchu Ana kanki? — ___, ñoqa Ana kani.",
            options: ["Ari", "Qamri", "-chu"],
            answer: "Ari",
            feedback:
              "Ari introduce la respuesta afirmativa. La forma interrogativa -chu no se copia en la respuesta.",
          },
          {
            prompt: "¿Qué función tiene Qamri? en el intercambio?",
            options: [
              "Devolver el turno con «¿y tú?».",
              "Cerrar la conversación con agradecimiento.",
              "Negar la identidad de la persona.",
            ],
            answer: "Devolver el turno con «¿y tú?».",
            feedback:
              "En este patrón, Qamri? invita a la otra persona a presentarse. La unidad limita la explicación a este uso dialogal.",
          },
          {
            prompt:
              "¿Cuál frase actual del prototipo se retira porque no se localizó en los pasajes cotejados?",
            options: [
              "Imaynallataq kanki",
              "Ñoqa Ana kani",
              "Ari, ñoqa Ana kani",
            ],
            answer: "Imaynallataq kanki",
            feedback:
              "La frase queda en el registro histórico de candidatos, no como pregunta enseñada ni respuesta aceptada. Se requiere una fuente y revisión antes de recuperarla.",
          },
        ],
        sourceItems: [
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 2, diálogo y formas afirmativa/interrogativa, PDF 35–37.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto. Los ejemplos con nombres son composición pedagógica original y requieren revisión.",
            usedFor:
              "Respaldo directo para el patrón de presentación nominal, las formas interrogativas -chu/-ri y la respuesta afirmativa. Las explicaciones simplificadas y los ejemplos con Ana/Luis son propuestas pedagógicas originales.",
            supportType: "direct",
            locator: {
              pdfPage: 35,
              printedPage: null,
              heading: "Unidad 2, Rimanakuy, forma afirmativa e interrogativa",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 2, sufijos -chu y -ri, PDF 36–37; conjugación, PDF 35.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Localizador de -ri como pregunta de seguimiento y de los patrones Ñoqa ... kani / Qam ... kanki usados en los ejemplos originales de la unidad.",
            supportType: "direct",
            locator: {
              pdfPage: 37,
              printedPage: null,
              heading: "Unidad 2, forma interrogativa con -chu y -ri",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 2, Rimanakuy, PDF 35–37.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Pasaje que motivó el diálogo original con nombres de ejemplo, la secuencia de explicación en tres pasos y las actividades de interpretación/producción.",
            supportType: "pedagogical-proposal",
            locator: {
              pdfPage: 35,
              printedPage: null,
              heading: "Unidad 2, Rimanakuy",
            },
          },
        ],
      },
      {
        lessonId: "practica-01",
        title: "Un primer intercambio completo",
        description:
          "Integra saludo, nombres, preguntas y respuestas afirmativas, despedida y agradecimiento.",
        kind: "practice",
        durationMinutes: 10,
        objectives: [
          "Comprender un diálogo original breve que combina formas estudiadas en las dos lecciones anteriores.",
          "Identificar saludo, presentación, pregunta con -chu, seguimiento con -ri y cierre.",
          "Producir un intercambio escrito guiado y comprobar que pregunta y respuesta concuerdan.",
        ],
        reading: [
          "Lee este diálogo original. Ana y Luis se encuentran y se presentan. Las líneas combinan patrones de la Unidad 2; no son una transcripción del diálogo de la fuente. Se conserva la ortografía de origen (por ejemplo, Ñoqa).",
          "Ana: Mamay, napaykuyki.\nLuis: Ñoqa Luis kani.\nAna: Qamchu Luis kanki?\nLuis: Ari, ñoqa Luis kani. Qamri?\nAna: Ñoqa Ana kani.\nLuis: Qamchu Ana kanki?\nAna: Ari, ñoqa Ana kani.\nLuis: Ana mamay, tinkunanchiskama.\nAna: Añaychayki.\nLuis: Imamanta.",
          "La secuencia avanza así: abrir con saludo dirigido; decir el nombre; preguntar con -chu; responder con Ari; ceder el turno con Qamri?; y cerrar con tinkunanchiskama, «hasta que nos encontremos», seguido del agradecimiento Añaychayki, «te agradezco», y la respuesta Imamanta, «de qué o por qué». Las líneas nuevas requieren revisión lingüística y del contexto de tratamiento.",
          "Pista gramatical: el quechua estudiado forma palabras mediante sufijos unidos a una base. En el saludo se observa -y en Mamay; en las preguntas, -chu o -ri se adjuntan a la forma que lleva el foco. Empieza reconociendo cada sufijo en una frase antes de intentar producir una conversación completa.",
        ],
        phrases: [
          [
            "tinkunanchiskama",
            "hasta que nos encontremos",
            "Cierre dirigido a la persona interlocutora en el pasaje.",
          ],
          [
            "Añaychayki.",
            "Te agradezco.",
            "Agradecimiento al final del intercambio.",
          ],
          [
            "Imamanta.",
            "De qué o por qué.",
            "Respuesta que el pasaje coloca tras el agradecimiento; sentido pragmático pendiente de revisión.",
          ],
        ],
        examplePrompt: "¿Qué partes gramaticales aparecen en Qamchu Ana kanki?",
        exampleResponse:
          "Qam + -chu marca la pregunta sobre Ana; kanki concuerda con el sujeto tú en el patrón estudiado.",
        activityTitle: "Comprende y completa el diálogo",
        activityPrompt:
          "Lee el diálogo y responde quién se presenta después de la pregunta Qamri?",
        activityAnswer: "Ana se presenta: Ñoqa Ana kani.",
        activityItems: [
          {
            prompt: "En el diálogo, ¿quién se presenta después de Qamri?",
            options: ["Ana", "Luis", "La madre de Ana"],
            answer: "Ana",
            feedback:
              "Después de Qamri? Luis devuelve el turno; Ana responde con Ñoqa Ana kani («Yo soy Ana»).",
          },
          {
            prompt:
              "¿Qué línea cierra el encuentro con el sentido «hasta que nos encontremos»?",
            options: [
              "Ana mamay, tinkunanchiskama.",
              "Qamchu Ana kanki?",
              "Ari, ñoqa Ana kani.",
            ],
            answer: "Ana mamay, tinkunanchiskama.",
            feedback:
              "Esa es la despedida del diálogo. La pregunta con -chu y la respuesta con Ari pertenecen al intercambio de presentación.",
          },
          {
            prompt:
              "Completa la respuesta: Qamchu Ana kanki? — ___, ñoqa Ana kani.",
            options: ["Ari", "Qamri", "Tinkunanchiskama"],
            answer: "Ari",
            feedback:
              "La respuesta afirmativa comienza con Ari y no lleva -chu.",
          },
          {
            prompt:
              "Escribe una pregunta y una respuesta para presentarte con un nombre distinto. Usa Qamchu [nombre] kanki? y Ari, ñoqa [nombre] kani.",
            answer:
              "Modelo: Qamchu Sara kanki? — Ari, ñoqa Sara kani. También sirve cualquier otro nombre en ambas líneas, siempre que coincida en pregunta y respuesta y se mantenga el patrón indicado.",
            feedback:
              "Revisa que el mismo nombre aparezca en ambas líneas, que la pregunta tenga -chu y que la respuesta afirmativa empiece con Ari y omita -chu. La respuesta modelo es un ejemplo original; la forma final requiere revisión humana.",
          },
          {
            prompt:
              "Ordena las funciones de un intercambio: cierre y agradecimiento; pregunta de presentación; saludo; respuesta y devolución del turno.",
            options: [
              "Saludo → pregunta de presentación → respuesta/devolución del turno → cierre/agradecimiento.",
              "Agradecimiento → pregunta → saludo → presentación.",
              "Pregunta → cierre → respuesta → saludo.",
            ],
            answer:
              "Saludo → pregunta de presentación → respuesta/devolución del turno → cierre/agradecimiento.",
            feedback:
              "La secuencia sigue el propósito comunicativo del diálogo: abrir, intercambiar nombres, ceder el turno y cerrar.",
          },
        ],
        sourceItems: [
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 2, saludo y diálogo, PDF 32–37.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto. El diálogo de esta unidad es una composición pedagógica original sujeta a revisión.",
            usedFor:
              "Respaldo directo de los patrones y localizadores de saludo, presentación, interrogación y despedida; el diálogo y las actividades se redactaron para este material.",
            supportType: "direct",
            locator: {
              pdfPage: 35,
              printedPage: null,
              heading: "Unidad 2, Rimanakuy",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 2, despedida y agradecimiento, PDF 39.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Localizador directo para tinkunanchiskama, Añaychayki e Imamanta; contexto de cierre retomado como propuesta original pendiente de revisión.",
            supportType: "direct",
            locator: {
              pdfPage: 39,
              printedPage: null,
              heading: "Unidad 2, 3. Despedida y agradecimiento",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 2, lengua aglutinante y sintaxis interrogativa, PDF 43 y 57.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Respaldo curricular para introducir morfología aglutinante e interrogación en pasos breves. La explicación sencilla y los ejercicios son propuestas pedagógicas originales.",
            supportType: "direct",
            locator: {
              pdfPage: 43,
              printedPage: null,
              heading: "Gramática, Morfología, lengua aglutinante",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 2, Rimanakuy y despedida, PDF 32–39.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Pasajes que motivaron el diálogo compuesto y original, la progresión por turnos y las actividades de comprensión y producción; el diálogo no se copia de la fuente.",
            supportType: "pedagogical-proposal",
            locator: {
              pdfPage: 35,
              printedPage: null,
              heading: "Unidad 2, Rimanakuy",
            },
          },
        ],
      },
    ],
  },
  {
    slug: "familia-y-comunidad",
    title: "Familia y comunidad",
    description:
      "Acerca vocabulario de vínculos y expresiones para hablar en colectivo.",
    level: "beginner",
    accent: "clay",
    estimatedDurationMinutes: 26,
    version: "1.0.0",
    completionPolicyVersion: "pending-v1",
    units: [
      {
        lessonId: "familia",
        title: "¿Quién es quién en mi familia?",
        description:
          "Relaciona parentescos con quién habla y con quién describe.",
        kind: "vocabulary",
        durationMinutes: 9,
        objectives: [
          "Identificar parentescos con la perspectiva de quien habla, en especial en los términos de hermana y hermano.",
          "Relacionar los términos de parentesco mayor con la clasificación que presenta Pacheco, sin extenderlos a relaciones no descritas.",
          "Explicar por qué una traducción aislada no conserva siempre quién habla ni de quién se habla.",
        ],
        reading: [
          "Lee cada término desde una escena. En la Unidad 4, Pacheco distingue ñaña (hermana, entre mujeres), tura (hermano, dicho por una mujer), wauqe/wayqe (hermano, entre hombres) y pana (hermana, dicho por un hombre). El parentesco se entiende junto con la perspectiva del hablante; no memorices una sola traducción desligada de esa relación.",
          "En la Unidad 3, el cuadro separa vocabulario bajo Warmi y Qhari: por ejemplo, ipa/ipalla para tía y kaka/kakalla para tío; mama también aparece como mamá, doña o señora, y tata/tayta como papá, don o señor. Son las glosas y agrupaciones de este libro, no una regla universal ni una descripción completa de todos los parentescos de una comunidad.",
          "El libro titula una sección cultural El Ayllu y también lo glosa como «familia» en una nota. No uses Ayllu como equivalente único de «familia» o «comunidad»: su alcance necesita contexto y revisión con una comunidad concreta. Aquí el objetivo es mapear relaciones familiares descritas, no afirmar una definición cultural general.",
        ],
        vocabulary: [
          ["ñaña", "Hermana, en la relación descrita entre mujeres."],
          ["tura", "Hermano, desde la perspectiva de una mujer hablante."],
          ["wauqe / wayqe", "Hermano, en la relación descrita entre hombres."],
          ["pana", "Hermana, desde la perspectiva de un hombre hablante."],
          [
            "ipa / ipalla",
            "Tía, según la glosa de la tabla de parentesco de Pacheco.",
          ],
          [
            "kaka / kakalla",
            "Tío, según la glosa de la tabla de parentesco de Pacheco.",
          ],
          [
            "paya / yaya / hatun mama",
            "Abuela, con variantes enumeradas por Pacheco; uso final pendiente de revisión.",
          ],
          [
            "machu / hatun tata",
            "Abuelo o persona mayor masculina, según el contexto de la tabla.",
          ],
        ],
        examplePrompt:
          "Marta habla con otra mujer y se refiere a su hermana. ¿Qué perspectiva debes comprobar antes de escoger el término?",
        exampleResponse:
          "La persona que habla es mujer y la relación descrita es hermana entre mujeres; el cuadro de Pacheco asocia esa relación con ñaña. La forma posesiva necesita su propio paso de revisión.",
        activityTitle: "Lee la relación, no solo la traducción",
        activityPrompt:
          "En una ficha de parentesco, Marta (mujer) dice a otra mujer que Julia es su hermana. Elige la relación que coincide con el cuadro de la Unidad 4.",
        activityAnswer: "ñaña: hermana en la relación descrita entre mujeres.",
        activityItems: [
          {
            prompt:
              "Marta (mujer) habla con Elena (mujer) de Julia, su hermana. ¿Qué término de relación del cuadro corresponde?",
            options: ["ñaña", "pana", "wauqe / wayqe"],
            answer: "ñaña",
            feedback:
              "Correcto: el cuadro distingue ñaña como hermana entre mujeres. pana corresponde a hermana desde un hablante hombre; wauqe/wayqe se refiere a hermano entre hombres. Referencia: objetivo 1, Pacheco, PDF 85.",
          },
          {
            prompt:
              "Pedro (hombre) habla de su hermana Rosa. ¿Qué término aparece para esa relación?",
            options: ["tura", "pana", "ñaña"],
            answer: "pana",
            feedback:
              "Correcto: pana es hermana de hombre a mujer. tura es hermano desde una hablante mujer; ñaña es hermana entre mujeres. Referencia: objetivo 1, Pacheco, PDF 85.",
          },
          {
            prompt:
              "Una estudiante traduce wauqe como «hermano» y omite que el cuadro lo presenta entre hombres. ¿Qué información perdió?",
            options: [
              "La perspectiva de quién habla y la relación descrita.",
              "El tiempo verbal de la frase.",
              "El nombre de la comunidad donde ocurre la escena.",
            ],
            answer: "La perspectiva de quién habla y la relación descrita.",
            feedback:
              "Esa es la información necesaria para interpretar la entrada. El cuadro de Pacheco agrupa las relaciones bajo Warmi/Qhari y especifica algunas como «entre mujeres», «mujer a hombre» o «entre hombres». Referencia: objetivos 1 y 3, Pacheco, PDF 85.",
          },
          {
            prompt:
              "En el cuadro de la Unidad 3, ¿qué término aparece para «tía»?",
            options: ["ipa / ipalla", "kaka / kakalla", "aukillu"],
            answer: "ipa / ipalla",
            feedback:
              "Correcto: Pacheco glosa ipa/ipalla como tía y kaka/kakalla como tío; aukillu aparece como bisabuelo. Estas glosas se enseñan con referencia al cuadro, pendientes de confirmación por una persona revisora. Referencia: objetivo 2, Pacheco, PDF 64.",
          },
        ],
        sourceItems: [
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 3, ‘Descendencia paralela’, PDF 64–65; Unidad 4, ‘Runa Simi en descendencia paralela’, PDF 85.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto. Explicaciones y actividades son propuestas originales.",
            usedFor:
              "Objetivos 1–2: glosas y relaciones de parentesco en tablas clasificadas por Warmi/Qhari y ejemplos según la persona hablante. Objetivo 3: la fuente muestra por qué cada glosa debe permanecer unida a su relación; no se copian sus ejercicios.",
            supportType: "direct",
            locator: {
              pdfPage: 85,
              printedPage: null,
              heading: "Unidad 4, Runa Simi en descendencia paralela",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 3, ‘El Ayllu’, PDF 80; nota de glosario en PDF 63.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Objetivo 3: localizar el uso del título El Ayllu y la glosa breve ‘familia’, sin convertir las afirmaciones culturales del pasaje en una equivalencia universal.",
            supportType: "direct",
            locator: {
              pdfPage: 80,
              printedPage: null,
              heading: "Unidad 3, Identidad cultural: El Ayllu",
            },
          },
          {
            sourceId: "calvo-2022-v1",
            citation:
              "Calvo Pérez, Julio. Nuevo diccionario español-quechua, quechua-español, volumen 1. Segunda edición, primera edición digital, 2022, entrada ‘AILLO’ (aillu, ayllu; állo), impresa 52 / PDF 148.",
            url: "https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_1.pdf",
            license:
              "Derechos reservados. PDF 5 reserva todos los derechos y prohíbe reproducción sin autorización escrita. Consulta editorial privada según QCH-01; no se reproducen extractos de la entrada.",
            usedFor:
              "Contraste editorial del candidato Ayllu: la entrada español→quechua registra sentidos etiquetados como unidad étnica y comunidad campesina. No fija una glosa única para el curso ni sustituye revisión comunitaria.",
            supportType: "direct",
            locator: {
              pdfPage: 148,
              printedPage: 52,
              heading: "Cuerpo español→quechua, letra A",
              headword: "AILLO (aillu, ayllu; állo)",
              sense: "unidad étnica; comunidad campesina",
              usageMark: "q.; viv.; col.; loc.",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 3, PDF 64; Unidad 4, PDF 85.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Objetivos 1–3: pasajes que motivaron la secuencia y las actividades originales. La autoría de explicaciones, escenas y retroalimentación no se atribuye al libro.",
            supportType: "pedagogical-proposal",
            locator: {
              pdfPage: 85,
              printedPage: null,
              heading: "Unidades 3–4, parentesco",
            },
          },
        ],
      },
      {
        lessonId: "mi-comunidad",
        title: "Posesión y relaciones en contexto",
        description:
          "Lee posesivos y distingue a quién alcanza una acción con -ta y -man.",
        kind: "phrases",
        durationMinutes: 8,
        objectives: [
          "Reconocer -y, -yki y -n como los posesivos presentados en la Unidad 4.",
          "Distinguir el complemento con -ta del destinatario o beneficiario con -man en ejemplos localizados.",
          "Describir el alcance de Ayllu como término contextualizado en las fuentes, sin convertirlo en una definición universal.",
        ],
        reading: [
          "La Unidad 4 presenta -y ‘mi’, -yki ‘tu’ y -n ‘su’ con el nombre mama. Relaciona primero la persona poseedora y después el objeto poseído. Los ejemplos de esta lección separan esa relación de la marca que indica qué persona u objeto recibe la acción.",
          "En los ejemplos del libro, -ta aparece con el objeto directo (Luista, «a Luis», en el ejemplo de conocer) y -man expresa destinatario o provecho (Mamayman, «a/para mi mamá»). Es una primera lectura de los ejemplos de Pacheco, no una regla completa para combinar sufijos; evita deducir oraciones nuevas sin revisión.",
          "El libro titula una sección cultural El Ayllu y la describe desde la voz de su autor en una explicación situada en PDF 80. Calvo, en su entrada española AILLO, registra más de un sentido y marcas de uso. Estas referencias no autorizan a presentar como actual y universal cada afirmación del libro; no se ha elegido una comunidad específica para validar cómo se usa hoy el término.",
        ],
        vocabulary: [
          [
            "-y",
            "Mi; posesivo de primera persona singular en el cuadro de Pacheco.",
          ],
          [
            "-yki",
            "Tu; posesivo de segunda persona singular en el cuadro de Pacheco.",
          ],
          [
            "-n",
            "Su; posesivo de tercera persona singular en el cuadro de Pacheco.",
          ],
          ["-ta", "Marca de objeto directo en los ejemplos de la Unidad 4."],
          [
            "-man",
            "Marca de destinatario o provecho en los ejemplos de la Unidad 4.",
          ],
          [
            "ayllu",
            "Término tratado por Pacheco y Calvo en contextos relacionados, con alcances que no se reducen aquí a una equivalencia única.",
          ],
        ],
        phrases: [
          [
            "Mamayman",
            "A/para mi mamá.",
            "Forma nominal localizada en el ejemplo de -man de Pacheco; no es una oración nueva.",
          ],
          [
            "Luista",
            "A Luis.",
            "Objeto directo marcado con -ta en el ejemplo citado por Pacheco.",
          ],
        ],
        examplePrompt:
          "En Mamayman, ¿qué expresa -y y qué relación indica -man en el ejemplo del libro?",
        exampleResponse:
          "-y indica «mi» en Mamay; -man marca el destinatario o provecho («a/para») en el ejemplo dirigido a la mamá.",
        activityTitle: "Sigue la posesión y el complemento",
        activityPrompt:
          "En el ejemplo del libro Marta Mamayman takishan, identifica la persona destinataria y el elemento que expresa «mi». Después compara Luista con el uso de -man.",
        activityAnswer:
          "Mamayman se refiere a mi mamá como destinataria/beneficiaria; -y expresa «mi». Luista lleva -ta como objeto directo, mientras -man no tiene esa función en el ejemplo.",
        activityItems: [
          {
            prompt:
              "En el ejemplo de posesivos, ¿qué valor atribuye Pacheco a -yki en Mamayki?",
            options: ["tu", "mi", "su"],
            answer: "tu",
            feedback:
              "Correcto: el cuadro relaciona -y con «mi», -yki con «tu» y -n con «su». Se refiere a una persona poseedora y no marca el objeto de la acción. Referencia: objetivo 1, Pacheco, PDF 85.",
          },
          {
            prompt:
              "En el ejemplo Pedro Luista reqsin, ¿qué función ilustra -ta según el pasaje?",
            options: [
              "Objeto directo: a Luis",
              "Destinatario: para Luis",
              "Posesión: su Luis",
            ],
            answer: "Objeto directo: a Luis",
            feedback:
              "Correcto: Pacheco presenta Luista como objeto directo de «conocer». -man se ilustra aparte con una relación de destinatario/provecho. Referencia: objetivo 2, Pacheco, PDF 85.",
          },
          {
            prompt:
              "En el ejemplo de Marta Mamayman takishan, ¿qué aporta -man en la explicación de Pacheco?",
            options: [
              "A/para; destinatario o provecho",
              "Mi; poseedor",
              "No; negación",
            ],
            answer: "A/para; destinatario o provecho",
            feedback:
              "Correcto: el ejemplo se glosa ‘Marta está cantando a/para mi mamá’. -y dentro de Mamay expresa ‘mi’; -man marca la relación indirecta. Referencia: objetivos 1 y 2, Pacheco, PDF 85.",
          },
          {
            prompt:
              "¿Qué conclusión es prudente sobre la palabra Ayllu en esta unidad?",
            options: [
              "Las fuentes presentan varios alcances; el uso actual local necesita contexto y revisión.",
              "Siempre significa exactamente ‘mi familia’ en cualquier comunidad.",
              "Es una forma de posesivo equivalente a -y.",
            ],
            answer:
              "Las fuentes presentan varios alcances; el uso actual local necesita contexto y revisión.",
            feedback:
              "Correcto: Pacheco ofrece una descripción cultural propia y Calvo registra sentidos distintos en una entrada español→quechua. Ninguna fuente permite generalizar sin identificar y consultar la comunidad. Referencia: objetivo 3, Pacheco, PDF 80; Calvo, entrada AILLO, PDF 148.",
          },
        ],
        sourceItems: [
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 4, ‘Adjetivos posesivos’, ‘Sufijo de objeto directo -ta’ y ‘Sufijo de objeto indirecto -man’, PDF 85–86.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Objetivos 1–2: cuadro de posesivos y ejemplos concretos para -ta y -man; base para explicar la diferencia en actividades originales.",
            supportType: "direct",
            locator: {
              pdfPage: 85,
              printedPage: null,
              heading:
                "Unidad 4, posesivos, objeto directo -ta e indirecto -man",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 3, ‘Identidad cultural: El Ayllu’, PDF 80.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Objetivo 3: atribuir explícitamente al autor la interpretación cultural incluida en el libro y excluirla de la evaluación como generalización presente.",
            supportType: "direct",
            locator: {
              pdfPage: 80,
              printedPage: null,
              heading: "Unidad 3, Identidad cultural: El Ayllu",
            },
          },
          {
            sourceId: "calvo-2022-v1",
            citation:
              "Calvo Pérez, Julio. Nuevo diccionario español-quechua, quechua-español, volumen 1. Segunda edición, primera edición digital, 2022, entrada ‘AILLO’ (aillu, ayllu; állo), impresa 52 / PDF 148.",
            url: "https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_1.pdf",
            license:
              "Derechos reservados. PDF 5 reserva todos los derechos y prohíbe reproducción sin autorización escrita. Consulta editorial privada según QCH-01; no se reproducen extractos de la entrada.",
            usedFor:
              "Objetivo 3: contraste lexicográfico de los sentidos comunitario y étnico recogidos bajo AILLO; no se selecciona una sola acepción como definición didáctica.",
            supportType: "direct",
            locator: {
              pdfPage: 148,
              printedPage: 52,
              heading: "Cuerpo español→quechua, letra A",
              headword: "AILLO (aillu, ayllu; állo)",
              sense: "unidad étnica; comunidad campesina",
              usageMark: "q.; viv.; col.; loc.",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidades 3–4, PDF 63–88.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Objetivos 1–3: pasajes que motivaron lecturas y ejercicios escritos propios; la secuencia y el contenido evaluable no reproducen ejercicios de la fuente.",
            supportType: "pedagogical-proposal",
            locator: {
              pdfPage: 85,
              printedPage: null,
              heading: "Unidades 3–4, familia, posesivos y complementos",
            },
          },
        ],
      },
      {
        lessonId: "practica-02",
        title: "Práctica textual: acciones y respuestas",
        description:
          "Lee escenas breves para reconocer progresivo, negación y relaciones familiares.",
        kind: "practice",
        durationMinutes: 9,
        objectives: [
          "Reconocer -sha- como progresivo en formas conjugadas del presente presentadas por Pacheco.",
          "Interpretar la negación con manam y conservar -chu en el patrón de respuesta negativa estudiado.",
          "Resolver por escrito una escena que combine un parentesco contextualizado con un complemento ya presentado, sin tratar el ejercicio como escucha.",
        ],
        reading: [
          "Lee las escenas; no hay grabación ni evaluación auditiva. En esta variedad de trabajo, la Unidad 3 presenta -sha- entre la raíz verbal y las terminaciones personales para expresar una acción en curso: rimashani, «estoy hablando». Observa la terminación junto al sujeto; no aísles -sha- de la forma conjugada.",
          "En una escena escrita, Marta recibe una llamada mientras está ocupada. Para informar que ella no está hablando en ese momento, el material ensaya Ñoqa manam rimashanichu («No estoy hablando»). Esta oración es una composición pedagógica original que combina patrones de Pacheco y requiere revisión antes de enseñar su forma final.",
          "En la misma escena, identifica el sujeto, la acción en curso y el alcance de la negación. Las respuestas califican comprensión escrita en español; no piden producir una frase quechua nueva sin revisión. No hay grabación ni se mide escucha o pronunciación.",
        ],
        phrases: [
          [
            "rimashani",
            "Estoy hablando.",
            "Forma conjugada de progresivo citada por Pacheco en la explicación de -sha-.",
          ],
          [
            "manam",
            "No.",
            "Adverbio de negación de los ejemplos de la Unidad 3; debe leerse con la oración y su -chu.",
          ],
          [
            "Mamayman",
            "A/para mi mamá.",
            "Complemento nominal ya presentado en mi-comunidad; no se crea una oración nueva.",
          ],
          [
            "Ñoqa manam rimashanichu.",
            "No estoy hablando.",
            "Composición pedagógica original con formas citadas por Pacheco; requiere revisión lingüística.",
          ],
        ],
        examplePrompt:
          "En una respuesta negativa con manam y -chu, ¿qué debes conservar al leerla?",
        exampleResponse:
          "La marca -chu permanece con el elemento negado en el patrón presentado; manam aporta la negación. El sujeto y el contexto determinan qué se niega.",
        activityTitle: "Lee la escena y da evidencia",
        activityPrompt:
          "Marta recibe una llamada y responde Ñoqa manam rimashanichu. Según la glosa de esta escena, ¿qué dice sobre lo que está haciendo? Identifica también las marcas de progresivo y negación. Es una actividad de lectura.",
        activityAnswer:
          "Dice «No estoy hablando»: -sha- forma parte del progresivo conjugado y manam niega la acción; -chu se conserva en la forma negada según el patrón estudiado.",
        activityItems: [
          {
            prompt:
              "Pacheco explica rima-sha-y y después presenta Ñoqa rima-sha-ni. ¿Qué comunica -sha- en esa forma conjugada?",
            options: [
              "La acción de hablar está en curso.",
              "La acción ocurrió en el pasado.",
              "La oración es una pregunta negativa.",
            ],
            answer: "La acción de hablar está en curso.",
            feedback:
              "Correcto: Pacheco glosa -sha- como «estar haciendo»; el ejemplo con Ñoqa comunica «estoy hablando». La terminación de persona sigue presente. Referencia: objetivo 1, Pacheco, PDF 63–64.",
          },
          {
            prompt:
              "En la pauta negativa de Pacheco, ¿qué ocurre con -chu en la respuesta que usa manam?",
            options: [
              "Se conserva con el elemento negado.",
              "Se elimina siempre al aparecer manam.",
              "Se sustituye por -man.",
            ],
            answer: "Se conserva con el elemento negado.",
            feedback:
              "Correcto: el pasaje indica que -chu permanece con el elemento dudoso/negado en la respuesta negativa. No cambies -chu por -man: uno aparece en el patrón interrogativo-negativo y el otro marca la relación de destinatario/beneficio. Referencia: objetivo 2, Pacheco, PDF 77–79.",
          },
          {
            prompt:
              "Marta responde Ñoqa manam rimashanichu. La glosa de esta escena dice ‘No estoy hablando’. ¿Qué lectura en español coincide?",
            options: [
              "No estoy hablando.",
              "Estoy hablando.",
              "Hablo para mi mamá.",
            ],
            answer: "No estoy hablando.",
            feedback:
              "Correcto: manam aporta negación y -chu se conserva en el patrón escrito; -sha- forma parte de la acción en curso. La oración completa es propuesta original pendiente de revisión. Referencia: objetivos 1–2, Pacheco, PDF 63–64 y 77–79.",
          },
          {
            prompt:
              "La hoja dice expresamente ‘Lee la escena escrita’. ¿Qué destreza mide esta práctica?",
            options: [
              "Comprensión de texto.",
              "Comprensión auditiva.",
              "Pronunciación de una grabación.",
            ],
            answer: "Comprensión de texto.",
            feedback:
              "Correcto: no se proporciona audio, transcripción sincronizada ni modelo sonoro. Por eso la unidad se llama Práctica textual y no promete escucha. Referencia: objetivo 3 y decisión editorial QCH-04.",
          },
          {
            prompt:
              "En la escena familiar, se sabe que la acción va dirigida a Mamay. ¿Qué forma nominal vista en la unidad anterior expresa esa relación con -man?",
            options: ["Mamayman", "Mamayki", "Luista"],
            answer: "Mamayman",
            feedback:
              "Correcto: Mamayman es la forma localizada para «a/para mi mamá». Mamayki contiene el posesivo «tu» y Luista ilustra el objeto directo con -ta. Referencia: objetivos 2–3, Pacheco, PDF 85.",
          },
        ],
        sourceItems: [
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 3, ‘Verbos derivados con -sha-’ y ‘Adverbio de negación: manam’, PDF 63–64 y 77–79.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Objetivos 1–2: explicación y ejemplos concretos de progresivo, negación y respuesta negativa con -chu. La práctica y sus escenas son originales.",
            supportType: "direct",
            locator: {
              pdfPage: 63,
              printedPage: null,
              heading: "Unidad 3, progresivo -sha- y negación manam",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidad 4, ‘Sufijo de objeto indirecto -man’, PDF 85.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Objetivo 3: reconocer en contexto escrito el complemento nominal previamente estudiado, sin inferir una oración nueva.",
            supportType: "direct",
            locator: {
              pdfPage: 85,
              printedPage: null,
              heading: "Unidad 4, objeto indirecto -man",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, Unidades 3–4, PDF 63–88.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. PDF 2 prohíbe reproducción parcial o total. Consulta editorial privada según QCH-01; no implica permiso para redistribuir texto.",
            usedFor:
              "Objetivos 1–3: respaldo temático de una nueva secuencia textual que integra formas ya citadas; la composición, preguntas y retroalimentación son originales.",
            supportType: "pedagogical-proposal",
            locator: {
              pdfPage: 77,
              printedPage: null,
              heading: "Unidades 3–4, acciones progresivas y familia",
            },
          },
        ],
      },
    ],
  },
  {
    slug: "territorio-y-tiempo",
    title: "Territorio y tiempo",
    description:
      "Interpreta referencias espaciales y temporales con atención al contexto y a las fuentes.",
    level: "beginner",
    accent: "gold",
    estimatedDurationMinutes: 27,
    version: "1.1.0",
    completionPolicyVersion: "pending-v1",
    units: [
      {
        lessonId: "lugares",
        title: "Orientarse con referencias",
        description: "Distingue sentidos espaciales antes de describir un recorrido.",
        kind: "vocabulary",
        durationMinutes: 9,
        objectives: [
          "Reconocer que una referencia espacial puede variar según la relación y el contexto.",
          "Seleccionar conceptos de orientación para describir un recorrido y señalar qué formas aún requieren revisión.",
        ],
        reading: [
          "Para explicar cómo llegar a un lugar conocido, registra el punto de partida, el destino y desde qué referencia se describe la posición. Una palabra de orientación puede tener sentidos distintos según indique altura, ubicación o movimiento.",
          "El diccionario de Calvo, en la entrada española ARRIBA, separa varios sentidos locativos y de movimiento y ofrece más de una forma. Esta evidencia sirve para reconocer polisemia; no autoriza a escoger una forma del curso ni a redactar una ruta en quechua sin cotejo y revisión Cusco.",
          "Pacha permanece como candidato editorial, no como equivalencia de ‘territorio’. El volumen 1 consultado va de español a quechua y no verifica el lema quechua ni sus sentidos. El volumen 2 se descargó para revisión privada, pero la entrada y su página aún no se cotejaron visualmente.",
        ],
        vocabulary: [
          [
            "arriba / abajo (conceptos en español)",
            "Punto de partida para contrastar relaciones espaciales. Las formas quechuas, su contexto y su variedad quedan pendientes de revisión.",
          ],
        ],
        examplePrompt:
          "Al describir un recorrido, ¿qué datos ayudan a interpretar una referencia de orientación?",
        exampleResponse:
          "El punto de referencia, la relación espacial, la situación y la perspectiva de quien habla.",
        activityTitle: "Ubica la referencia",
        activityPrompt:
          "Lee la situación del mapa de palabras y elige qué información contextual y lexicográfica debe acompañar cada concepto de orientación.",
        activityAnswer:
          "Punto de partida y destino, perspectiva, situación, acepción consultada, página y variedad pendiente de revisión.",
        activityItems: [
          {
            prompt:
              "Dos personas describen el mismo punto como ‘arriba’ desde referencias distintas. ¿Qué debe anotarse antes de elegir una forma quechua?",
            options: [
              "La referencia espacial y el sentido concreto que expresa cada persona.",
              "Una traducción única de ‘arriba’ para todos los recorridos.",
              "Solo el nombre del destino.",
            ],
            answer:
              "La referencia espacial y el sentido concreto que expresa cada persona.",
            feedback:
              "La entrada española ARRIBA distingue sentidos según relación y movimiento. El contexto determina qué acepción se está buscando; aún hace falta revisión para seleccionar una forma del curso.",
          },
          {
            prompt:
              "¿Qué dato convierte una forma de diccionario en una referencia editorial comprobable?",
            options: [
              "Lema, acepción, marca pertinente y página PDF.",
              "Solo una traducción memorizada.",
              "Una oración creada al unir dos entradas.",
            ],
            answer: "Lema, acepción, marca pertinente y página PDF.",
            feedback:
              "La ficha debe conservar la acepción y el localizador. Las entradas aisladas no validan frases compuestas.",
          },
        ],
        sourceItems: [
          {
            sourceId: "calvo-2022-v1",
            citation:
              "Calvo Pérez, Julio. Nuevo diccionario español-quechua, quechua-español, vol. 1. Segunda edición digital, 2022, entrada española ‘ARRIBA’, impresa 147 / PDF 243.",
            url: "https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_1.pdf",
            license:
              "Derechos reservados. Consulta editorial privada según QCH-01; sin autorización para reproducir entradas o exportar extractos al producto.",
            usedFor:
              "Comprobar que el lema español reúne sentidos locativos y de movimiento y orientar la selección conceptual. No se reproducen las formas ni la definición del diccionario.",
            supportType: "direct",
            locator: {
              pdfPage: 243,
              printedPage: 147,
              heading: "ARRIBA (adv.), sentidos locativos y de movimiento",
              headword: "ARRIBA",
              sense: "sentidos locativos diferenciados por relación espacial y movimiento",
            },
          },
          {
            sourceId: "pacheco-2021-i",
            citation:
              "Pacheco Condori, Alipio. Lengua y Cultura Quechuas I (Autopreparación). Ediciones Madrigal, 2021, ejercicio de la Unidad 1, PDF 41.",
            url: "https://www.pueblosoriginarios.gob.cl/sites/www.pueblosoriginarios.gob.cl/files/2022-02/Lengua%20y%20Cultura%20Quechuas_Alipio%20Pacheco.pdf",
            license:
              "Derechos reservados. Consulta editorial privada según QCH-01; sin autorización para reproducir texto.",
            usedFor:
              "Constatar que kunan aparece aislado en un ejercicio; no se usa como respaldo de la frase Kunan p'unchay.",
            supportType: "direct",
            locator: {
              pdfPage: 41,
              printedPage: null,
              heading: "Ejercicio de la Unidad 1; forma aislada kunan",
              headword: "kunan",
              sense: "forma aislada en un ejercicio; no valida una frase",
            },
          },
          {
            sourceId: "cahuana-2007-manual",
            citation:
              "Cahuana Q., Ricardo. Manual de gramática quechua Cusco-Collao. Edición revisada, Sicuani, 2007, sección ‘Adverbios’, referencias de lugar, PDF 30 / impresa 29.",
            url: "https://lengamer.org/admin/language_folders/quechuadecusco/user_uploaded_files/links/File/MANUAL_GRAMATICA_QUECHUA.pdf",
            license:
              "No se encontró aviso de licencia en el PDF. Consulta editorial privada solamente hasta confirmar titularidad y autorización de reutilización.",
            usedFor:
              "Respaldar la selección de conceptos de procedencia, dirección, posición, orientación y cercanía en una lista organizada por sentido. No se generalizan formas del manual como respuestas aprobadas del curso.",
            supportType: "direct",
            locator: {
              pdfPage: 30,
              printedPage: 29,
              heading: "Adverbios, referencias de lugar",
            },
          },
        ],
      },
      {
        lessonId: "tiempo",
        title: "Referencias temporales por verificar",
        description: "Distingue tiempo presente y pasado sin inferir una frase.",
        kind: "phrases",
        durationMinutes: 8,
        objectives: [
          "Distinguir conceptos de momento actual y tiempo pasado en una situación comunicativa.",
          "Reconocer una frase temporal documentada y señalar qué revisión falta antes de enseñarla como forma Cusco aprobada.",
        ],
        reading: [
          "Para ordenar un relato, primero decide si necesitas ubicar una acción en el momento actual o en un tiempo anterior. El diccionario español→quechua documenta acepciones temporales distintas y no intercambiables para estos conceptos.",
          "El Manual de gramática quechua Cusco-Collao registra la expresión compuesta kunan p’unchay con el sentido «hoy día» (Cahuana, impresa 29 / PDF 30). Es respaldo explícito para la frase del candidato, no una composición inferida de dos entradas. Pacheco presenta kunan aislado en un ejercicio (PDF 41), que por sí solo no la respalda. Antes de calificarla, una persona revisora debe confirmar grafía, variedad y uso para la subvariante Cusco elegida.",
          "La entrada española ACTUALMENTE de Calvo vol. 1 asocia el momento actual con una forma, y AYER diferencia el día anterior de otros sentidos de tiempo pasado. Son consultas español→quechua; las grafías del diccionario no se convierten automáticamente a la convención pentavocálica del curso.",
        ],
        vocabulary: [
          [
            "momento actual / tiempo anterior (conceptos en español)",
            "Conceptos distintos que se sitúan en contexto. Las formas del curso requieren revisión lingüística.",
          ],
        ],
        phrases: [
          [
            "kunan p’unchay",
            "hoy día",
            "La fuente complementaria registra la frase compuesta en su lista temporal (Cahuana, impresa 29 / PDF 30); grafía y uso para la variedad del curso pendientes de revisión.",
          ],
        ],
        examplePrompt:
          "¿Qué evidencia documenta la frase candidata y qué revisión falta antes de usarla en un diálogo del curso?",
        exampleResponse:
          "Cahuana registra la expresión y su sentido en PDF 30; aún hacen falta revisión humana de la grafía y el uso en la variedad Cusco del curso.",
        activityTitle: "Ubica el tiempo",
        activityPrompt:
          "Clasifica las referencias temporales y distingue el respaldo documental de la aprobación lingüística para el curso.",
        activityAnswer:
          "La pista temporal sitúa la acción. Cahuana documenta kunan p’unchay como «hoy día» (PDF 30), pero la forma todavía requiere revisión Cusco antes de ser una respuesta aceptada.",
        activityItems: [
          {
            prompt:
              "En un relato, una nota de calendario indica el día anterior al momento en que se habla. ¿Qué función cumple esa nota?",
            options: [
              "Ubica la acción en un tiempo pasado respecto del momento de habla.",
              "Indica por sí sola una forma quechua para cualquier variedad.",
              "Convierte una palabra aislada en una frase validada.",
            ],
            answer:
              "Ubica la acción en un tiempo pasado respecto del momento de habla.",
            feedback:
              "La situación temporal puede comprenderse en español. La elección y producción de la forma quechua sigue sujeta a fuente y revisión.",
          },
          {
            prompt:
              "¿Qué registra el Manual de gramática quechua Cusco-Collao en su sección de expresiones temporales compuestas?",
            options: [
              "Kunan p’unchay con el sentido «hoy día», en PDF 30 / impresa 29.",
              "Que pacha siempre equivale a territorio.",
              "Que cualquier combinación de kunan con un nombre expresa hoy.",
            ],
            answer: "Kunan p’unchay con el sentido «hoy día», en PDF 30 / impresa 29.",
            feedback:
              "La sección del manual registra la expresión completa; no se deriva de entradas sueltas. Su uso en la subvariante Cusco del curso todavía requiere revisión humana.",
          },
          {
            prompt:
              "¿Qué estado editorial corresponde antes de recibir esa revisión humana?",
            options: [
              "Candidata documentada, pendiente de revisión Cusco; no respuesta aceptada todavía.",
              "Publicada para todas las variedades quechuas.",
              "Descartada porque no aparece en Pacheco.",
            ],
            answer:
              "Candidata documentada, pendiente de revisión Cusco; no respuesta aceptada todavía.",
            feedback:
              "La evidencia contextual de Cahuana resuelve el vacío de localizador para esta frase, pero no sustituye la revisión de variedad ni el permiso editorial pendiente.",
          },
        ],
        sourceItems: [
          {
            sourceId: "calvo-2022-v1",
            citation:
              "Calvo Pérez, Julio. Nuevo diccionario español-quechua, quechua-español, vol. 1. Segunda edición digital, 2022, entrada ‘ACTUALMENTE’, impresa 24 / PDF 120.",
            url: "https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_1.pdf",
            license:
              "Derechos reservados. Consulta editorial privada según QCH-01; sin autorización para reproducir entradas o extractos.",
            usedFor:
              "Referencia lexicográfica del concepto de momento actual. No respalda por sí sola Kunan p'unchay ni un diálogo.",
            supportType: "direct",
            locator: {
              pdfPage: 120,
              printedPage: 24,
              heading: "ACTUALMENTE, acepción de momento actual",
              headword: "ACTUALMENTE",
              sense: "momento actual, uso deíctico",
            },
          },
          {
            sourceId: "calvo-2022-v1",
            citation:
              "Calvo Pérez, Julio. Nuevo diccionario español-quechua, quechua-español, vol. 1. Segunda edición digital, 2022, entrada ‘AYER’, impresa 178 / PDF 274.",
            url: "https://apl.org.pe/wp-content/uploads/2022/07/DICCIONARIO-Quechua-espanol-VOL_1.pdf",
            license:
              "Derechos reservados. Consulta editorial privada según QCH-01; sin autorización para reproducir entradas o extractos.",
            usedFor:
              "Distinguir la acepción de día anterior de otros sentidos de tiempo pasado y de las marcas de uso que el diccionario consigna.",
            supportType: "direct",
            locator: {
              pdfPage: 274,
              printedPage: 178,
              heading: "AYER, acepciones temporales",
              headword: "AYER",
              sense: "día anterior; otros sentidos de tiempo pasado diferenciados",
            },
          },
          {
            sourceId: "cahuana-2007-manual",
            citation:
              "Cahuana Q., Ricardo. Manual de gramática quechua Cusco-Collao. Edición revisada, Sicuani, 2007, sección ‘Adverbios’, impresa 29 / PDF 30.",
            url: "https://lengamer.org/admin/language_folders/quechuadecusco/user_uploaded_files/links/File/MANUAL_GRAMATICA_QUECHUA.pdf",
            license:
              "No se encontró aviso de licencia en el PDF. Consulta editorial privada solamente hasta confirmar titularidad y autorización de reutilización.",
            usedFor:
              "Respaldo contextual directo de la expresión temporal completa y su glosa en la lista de expresiones compuestas. No demuestra aprobación para respuestas del curso.",
            supportType: "direct",
            locator: {
              pdfPage: 30,
              printedPage: 29,
              heading: "Adverbios, expresiones compuestas y referencias temporales",
              headword: "kunan p’unchay",
              sense: "expresión compuesta con sentido de ‘hoy día’",
            },
          },
        ],
      },
      {
        lessonId: "practica-03",
        title: "Mapa contextual de lugar y tiempo",
        description:
          "Comprende un mapa, produce una descripción contextual y registra qué requiere revisión.",
        kind: "practice",
        durationMinutes: 10,
        objectives: [
          "Comprender una descripción original de recorrido y localizar sus referencias espaciales y temporales.",
          "Producir un mapa o descripción breve y separar información personal libre de criterios evaluables.",
          "Registrar una fuente, acepción y página para cada forma quechua propuesta, o etiquetarla como pendiente.",
        ],
        reading: [
          "Una ruta de ejemplo puede describirse primero en español: se parte de la plaza, se localiza la biblioteca respecto de un punto de referencia y se anota cuándo se realiza el recorrido. La descripción de este material es original; no ofrece frases quechuas traducidas por concatenación.",
          "Después puedes dibujar una ruta propia en la lengua que prefieras. Los nombres de lugares y las experiencias personales son información libre y no se califican. Sí se califican la identificación de referencias espaciales y temporales, la claridad del mapa y el registro de respaldo; toda forma quechua sin fuente y revisión se etiqueta como pendiente.",
        ],
        examplePrompt:
          "¿Cómo presentar una forma quechua sin respaldo completo?",
        exampleResponse:
          "Como candidata pendiente, con entrada, acepción y página si se comprobaron, además de la variedad y revisión requeridas.",
        activityTitle: "Crea un mapa de palabras",
        activityPrompt:
          "Dibuja o describe una ruta personal con un punto de partida, un destino, una relación espacial y un momento. Luego completa el registro de respaldo para cualquier forma quechua que quieras proponer.",
        activityAnswer:
          "La ruta personal es libre. Para obtener puntaje, identifica las relaciones y referencias del escenario común, cita la fuente y el localizador de cada forma revisable y marca como pendiente cualquier forma sin respaldo o revisión.",
        activityItems: [
          {
            prompt:
              "Comprensión: en el mapa común, la biblioteca queda por encima de la plaza y la visita ocurre el día anterior al momento narrado. ¿Qué dos relaciones reconoces?",
            options: [
              "Una relación espacial de posición y una referencia temporal pasada.",
              "Dos traducciones quechuas validadas.",
              "Una relación de parentesco y una de posesión.",
            ],
            answer:
              "Una relación espacial de posición y una referencia temporal pasada.",
            feedback:
              "El escenario permite comprender espacio y tiempo en español. No proporciona una traducción ni valida por sí mismo formas quechuas.",
          },
          {
            prompt:
              "Producción: ¿qué debe incluir el registro evaluable de una forma quechua propuesta?",
            options: [
              "Lema, acepción, página PDF, contexto y estado de revisión; o una marca explícita de pendiente.",
              "Una traducción creada a partir de palabras separadas.",
              "El nombre personal del lugar, que se califica como correcto o incorrecto.",
            ],
            answer:
              "Lema, acepción, página PDF, contexto y estado de revisión; o una marca explícita de pendiente.",
            feedback:
              "El respaldo debe ser trazable. La información personal del mapa puede variar libremente; se califican los criterios comunes y no el contenido autobiográfico.",
          },
        ],
      },
    ],
  },
];

export function buildUnitContent(
  course: CourseSeed,
  unit: UnitSeed,
): CourseUnitContent {
  const item = (unit.vocabulary ?? []).map(([term, meaning]) => ({
    term,
    meaning,
  }));
  const phrases = (unit.phrases ?? []).map(([text, translation, context]) => ({
    text,
    translation,
    context,
  }));
  return {
    schemaVersion: 1,
    status: "draft",
    kind: unit.kind,
    durationMinutes: unit.durationMinutes,
    objectives: unit.objectives,
    reading: { title: unit.title, paragraphs: unit.reading },
    vocabulary: item,
    phrases,
    examples: [
      {
        prompt: unit.examplePrompt,
        response: unit.exampleResponse,
        explanation:
          "Respuesta orientativa del borrador; revisar junto con el contenido lingüístico antes de cualquier publicación.",
      },
    ],
    activity: {
      title: unit.activityTitle,
      instructions: [unit.activityPrompt],
      items: unit.activityItems ?? [
        {
          prompt: unit.activityPrompt,
          answer: unit.activityAnswer,
          feedback:
            "Solución propuesta para la actividad textual; requiere revisión académica.",
        },
      ],
      modality: "text",
      audioStatus: "not_required",
    },
    review: {
      status: "draft",
      reviewedBy: null,
      reviewedAt: null,
      notes: [
        "Revisión humana pendiente; no hay una persona revisora asignada todavía.",
        "La revisión requerida corresponde a una persona hablante o especialista en quechua sureño Cusco-Collao, subvariante Cusco, con experiencia en su escritura pentavocálica.",
        "No aprobar variantes de respuesta por conversión automática entre las grafías de Pacheco y Calvo; consultar el registro editorial QCH-02.",
        "No es material validado ni certificable.",
      ],
    },
    sources: {
      status: unit.sourceItems?.length ? "documented" : "pending",
      items: unit.sourceItems ?? [],
      requirements: [
        "Una persona hablante o especialista debe revisar las formas, traducciones, contexto social y ejemplos nuevos.",
        "Obtener la autorización de uso necesaria antes de publicar cualquier material que reproduzca contenido protegido.",
      ],
    },
    regionalVariant: {
      status: "specified",
      name: "Quechua sureño Cusco-Collao, subvariante Cusco; convención didáctica pentavocálica",
      notes:
        "Variedad de trabajo seleccionada para saludos-y-presencia, familia-y-comunidad y territorio-y-tiempo por ser la variedad declarada en el libro curricular de Pacheco (PDF 8). Referencia comunitaria: hablantes de la subvariante Cusco representada en esa fuente; no se ha nombrado ni consultado una comunidad concreta. Convención de presentación inicial: conservar la escritura pentavocálica del libro. El diccionario de Calvo mantiene una política gráfica distinta; registrar su forma original y decidir cada correspondencia individualmente, sin sustitución global. Esta decisión editorial no equivale a revisión lingüística ni a aprobación comunitaria.",
    },
    authorship: {
      status: "pending",
      author: unit.sourceItems?.length
        ? "OpenAI Codex (asistencia de redacción); autoría editorial humana y titularidad por confirmar."
        : null,
      license: null,
    },
    source: {
      system: "yachay-convex",
      moduleSlug: course.slug,
      lessonId: unit.lessonId,
    },
  };
}
