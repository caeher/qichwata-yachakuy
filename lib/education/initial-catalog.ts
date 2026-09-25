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
    estimatedDurationMinutes: 19,
    version: "1.0.0",
    completionPolicyVersion: "pending-v1",
    units: [
      {
        lessonId: "hola",
        title: "Saludos en contexto",
        description:
          "Reconoce que una traducción palabra por palabra no siempre cumple la misma función social.",
        kind: "vocabulary",
        durationMinutes: 6,
        objectives: [
          "Identificar a quién se dirige un saludo y qué relación expresa.",
          "Distinguir una glosa literal de un saludo validado para la variedad de trabajo.",
        ],
        reading: [
          "Un saludo depende de la persona destinataria, la relación y la situación. La traducción palabra por palabra no demuestra que una frase tenga la misma función social en español.",
          "El borrador anterior proponía una frase para decir «buen día». Se retira como vocabulario y respuesta aceptada: el libro de referencia advierte que una forma muy cercana no equivale al saludo castellano «buen día» (Pacheco Condori, PDF 33). Un reemplazo requiere revisión en la variedad seleccionada.",
        ],
        vocabulary: [],
        examplePrompt:
          "¿Qué evidencia hace falta antes de aceptar una expresión como saludo equivalente?",
        exampleResponse:
          "Una fuente localizada y revisión humana de su uso en la variedad elegida.",
        activityTitle: "Revisa la función de un saludo",
        activityPrompt:
          "Una traducción literal sugiere «buen día», pero la fuente cuestiona esa equivalencia. ¿Se conserva como respuesta aceptada?",
        activityAnswer:
          "No. Se retira del vocabulario hasta documentar una forma y función aprobadas para la variedad.",
      },
      {
        lessonId: "presentarse",
        title: "Imaynallataq kanki",
        description:
          "Una conversación inicial para preguntar y responder cómo está alguien.",
        kind: "phrases",
        durationMinutes: 8,
        objectives: [
          "Identificar el propósito comunicativo de una pregunta de presentación.",
          "Distinguir una frase candidata de una frase revisada.",
        ],
        reading: [
          "Presentarse puede incluir un saludo, una pregunta sobre el bienestar y una respuesta. La forma lingüística depende de la variedad y del contexto interpersonal.",
          "El título reproduce la frase del prototipo; aquí no se ofrece como traducción certificada ni como modelo pronunciable.",
        ],
        phrases: [
          [
            "Imaynallataq kanki",
            "Frase candidata asociada en el prototipo a preguntar cómo está alguien.",
            "Presentación inicial; forma pendiente de validación",
          ],
        ],
        examplePrompt:
          "¿Qué debe acompañar a una frase que se publique como modelo?",
        exampleResponse:
          "Fuente, variedad, traducción revisada y autoría/licencia aplicable.",
        activityTitle: "Revisa una presentación",
        activityPrompt:
          "Marca el estado correcto de la frase del título mientras no tenga revisión documentada.",
        activityAnswer: "Borrador: no validada ni certificable.",
      },
      {
        lessonId: "practica-01",
        title: "Práctica guiada",
        description: "Ordena los pasos de un primer diálogo de presentación.",
        kind: "practice",
        durationMinutes: 5,
        objectives: [
          "Ordenar turnos básicos de un diálogo.",
          "Explicar qué partes aún requieren validación lingüística.",
        ],
        reading: [
          "Esta práctica de lectura trabaja la estructura de un intercambio en español. Las expresiones quechuas sugeridas por el prototipo se mantienen como borradores hasta documentar una variedad y una revisión humana.",
        ],
        examplePrompt: "¿Qué secuencia organiza una presentación inicial?",
        exampleResponse:
          "Saludo, presentación o pregunta, respuesta y cierre; las expresiones concretas requieren revisión regional.",
        activityTitle: "Ordena el diálogo",
        activityPrompt:
          "Ordena estos turnos descritos en español: respuesta; saludo; pregunta de cortesía.",
        activityAnswer: "Saludo → pregunta de cortesía → respuesta.",
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
    estimatedDurationMinutes: 22,
    version: "1.0.0",
    completionPolicyVersion: "pending-v1",
    units: [
      {
        lessonId: "familia",
        title: "Ayllu",
        description: "Palabras para hablar de familia y vínculos cercanos.",
        kind: "vocabulary",
        durationMinutes: 7,
        objectives: [
          "Explorar el concepto de vínculos familiares y comunitarios.",
          "Reconocer que el alcance de un término depende del uso regional y social.",
        ],
        reading: [
          "Las palabras de parentesco expresan relaciones y pueden organizarse de manera distinta entre comunidades.",
          "Ayllu aparece en el prototipo como título. Su alcance semántico en la variedad elegida debe documentarse con fuentes y consulta de hablantes antes de publicarlo como definición.",
        ],
        vocabulary: [
          [
            "Ayllu",
            "Entrada candidata del prototipo; definición y alcance pendientes de revisión.",
          ],
        ],
        examplePrompt:
          "¿Por qué no basta una equivalencia de diccionario para explicar un vínculo?",
        exampleResponse:
          "El uso puede depender del contexto comunitario y de la variedad.",
        activityTitle: "Mapa de vínculos",
        activityPrompt:
          "Para crear un mapa familiar, ¿qué decisión editorial debe preceder a las equivalencias?",
        activityAnswer:
          "Definir variedad y contexto de uso, y revisar términos con fuentes y hablantes.",
      },
      {
        lessonId: "mi-comunidad",
        title: "Ñuqanchik",
        description: "Frases candidatas para hablar de un grupo inclusivo.",
        kind: "phrases",
        durationMinutes: 9,
        objectives: [
          "Distinguir referencias individuales y colectivas en una actividad guiada.",
          "Evitar presentar una frase sin revisar su contexto regional.",
        ],
        reading: [
          "Hablar en colectivo invita a considerar quiénes forman parte del grupo y a quién se incluye en cada expresión.",
          "Ñuqanchik es el título conservado del prototipo. La traducción, forma de escritura y matiz inclusivo necesitan confirmación para una variedad concreta.",
        ],
        phrases: [
          [
            "Ñuqanchik",
            "Forma candidata vinculada por el prototipo a hablar en colectivo.",
            "Referencia colectiva; interpretación pendiente",
          ],
        ],
        examplePrompt:
          "¿Qué pregunta ayuda a revisar una referencia colectiva?",
        exampleResponse:
          "A quién incluye, en qué situación se usa y cómo lo expresa la variedad documentada.",
        activityTitle: "¿A quién incluye?",
        activityPrompt:
          "Antes de enseñar una expresión colectiva, ¿qué debe quedar claro?",
        activityAnswer:
          "Su significado y alcance en la variedad y el contexto revisados.",
      },
      {
        lessonId: "practica-02",
        title: "Reto de escucha",
        description:
          "Actividad textual de identificación; el audio aún no está disponible.",
        kind: "practice",
        durationMinutes: 6,
        objectives: [
          "Relacionar una pista escrita con vocabulario candidato de familia y comunidad.",
          "Diferenciar una actividad textual de una experiencia de escucha.",
        ],
        reading: [
          "Esta versión no incluye audio. El reto se presenta como actividad textual para identificar una pista de contexto; no simula pronunciación ni comprensión auditiva.",
        ],
        examplePrompt: "¿Qué recurso falta para ofrecer escucha real?",
        exampleResponse:
          "Un audio de una persona hablante de la variedad definida, revisado y autorizado para este uso.",
        activityTitle: "Reto textual: identifica el contexto",
        activityPrompt:
          "La pista dice: «hablamos de personas que forman parte de nuestro entorno cercano». ¿Qué tema del módulo corresponde?",
        activityAnswer:
          "Familia y comunidad. Es una respuesta de comprensión lectora, no de escucha.",
      },
    ],
  },
  {
    slug: "territorio-y-tiempo",
    title: "Territorio y tiempo",
    description:
      "Explora lugares, orientación y referencias al día en que ocurre algo.",
    level: "beginner",
    accent: "gold",
    estimatedDurationMinutes: 23,
    version: "1.0.0",
    completionPolicyVersion: "pending-v1",
    units: [
      {
        lessonId: "lugares",
        title: "Pacha",
        description: "Territorio, lugares y orientación.",
        kind: "vocabulary",
        durationMinutes: 8,
        objectives: [
          "Describir relaciones espaciales con vocabulario candidato.",
          "Reconocer que una palabra puede tener varios usos según el contexto.",
        ],
        reading: [
          "Orientarse requiere relacionar lugares, referencias y perspectiva de quien habla.",
          "Pacha se conserva como título del prototipo. No se fija una equivalencia única: su significado y ejemplos necesitan fuentes y revisión en una variedad documentada.",
        ],
        vocabulary: [
          [
            "Pacha",
            "Entrada candidata del prototipo; sentidos y contexto regional pendientes.",
          ],
        ],
        examplePrompt:
          "¿Qué información evita reducir un término territorial a una sola traducción?",
        exampleResponse:
          "Sus sentidos en contexto y la variedad lingüística con fuente documentada.",
        activityTitle: "Ubica la referencia",
        activityPrompt:
          "Una persona explica cómo llegar a un lugar. ¿Qué información contextual conviene registrar para revisar su vocabulario?",
        activityAnswer:
          "Lugar, perspectiva, situación de uso, variedad y fuente de las expresiones.",
      },
      {
        lessonId: "tiempo",
        title: "Kunan p'unchay",
        description: "Frase candidata para hablar del día de hoy.",
        kind: "phrases",
        durationMinutes: 8,
        objectives: [
          "Reconocer una referencia temporal en un contexto guiado.",
          "Comprobar traducción y uso antes de publicar una frase.",
        ],
        reading: [
          "Las expresiones de tiempo sitúan acciones y relatos. Su escritura y uso deben comprobarse en la variedad que se enseñe.",
          "Kunan p'unchay se conserva del prototipo como candidata asociada al día de hoy; la asociación y su traducción aún no están revisadas.",
        ],
        phrases: [
          [
            "Kunan p'unchay",
            "Frase candidata del prototipo asociada al día de hoy.",
            "Referencia temporal; forma pendiente de validación",
          ],
        ],
        examplePrompt:
          "¿Cuál es el primer paso antes de usarla en una conversación evaluada?",
        exampleResponse:
          "Validar forma, traducción y contexto con fuentes y revisión humana.",
        activityTitle: "Ubica el tiempo",
        activityPrompt:
          "En un relato se indica cuándo ocurre algo. ¿Qué función cumple esa pista?",
        activityAnswer:
          "Sitúa temporalmente la acción; no valida por sí sola una expresión quechua.",
      },
      {
        lessonId: "practica-03",
        title: "Mapa de palabras",
        description:
          "Conecta descripciones de tu entorno con referencias espaciales y temporales.",
        kind: "practice",
        durationMinutes: 7,
        objectives: [
          "Organizar referencias de lugar y tiempo en un mapa personal.",
          "Separar observaciones propias de traducciones que necesitan revisión.",
        ],
        reading: [
          "Un mapa puede reunir lugares importantes y momentos asociados a ellos. Esta actividad permite anotar primero en español y reservar las formas quechuas hasta contar con revisión regional.",
        ],
        examplePrompt:
          "¿Cómo registrar una palabra que todavía no está validada?",
        exampleResponse:
          "Como candidata pendiente, con la fuente, variedad y revisión aún requeridas.",
        activityTitle: "Crea un mapa de palabras",
        activityPrompt:
          "Anota un lugar, cuándo lo visitas y una palabra candidata del módulo. ¿Qué etiqueta debe llevar esta última?",
        activityAnswer:
          "Borrador pendiente de fuente y revisión en una variedad regional definida.",
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
      items: [
        {
          prompt: unit.activityPrompt,
          answer: unit.activityAnswer,
          feedback:
            "Solución propuesta para la actividad textual; requiere revisión académica.",
        },
      ],
      modality: "text",
      audioStatus: unit.lessonId === "practica-02" ? "planned" : "not_required",
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
      status: "pending",
      items: [],
      requirements: [
        "Añadir citas concretas para cada forma y explicación lingüística.",
        "Registrar autoría y licencia aplicable antes de publicar.",
      ],
    },
    regionalVariant: {
      status: "specified",
      name: "Quechua sureño Cusco-Collao, subvariante Cusco; convención didáctica pentavocálica",
      notes:
        "Variedad de trabajo seleccionada para saludos-y-presencia, familia-y-comunidad y territorio-y-tiempo por ser la variedad declarada en el libro curricular de Pacheco (PDF 8). Referencia comunitaria: hablantes de la subvariante Cusco representada en esa fuente; no se ha nombrado ni consultado una comunidad concreta. Convención de presentación inicial: conservar la escritura pentavocálica del libro. El diccionario de Calvo mantiene una política gráfica distinta; registrar su forma original y decidir cada correspondencia individualmente, sin sustitución global. Esta decisión editorial no equivale a revisión lingüística ni a aprobación comunitaria.",
    },
    authorship: { status: "pending", author: null, license: null },
    source: {
      system: "yachay-convex",
      moduleSlug: course.slug,
      lessonId: unit.lessonId,
    },
  };
}
