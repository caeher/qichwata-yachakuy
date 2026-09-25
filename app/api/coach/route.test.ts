import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: {
    kind: "ready",
    appUser: { id: "coach-test-user" } as { id: string } | null,
    email: null,
  } as { kind: string; appUser: { id: string } | null; email: null },
  enrollment: {
    id: "enrollment-1",
    courseId: "course-1",
    courseVersion: "1.0",
  },
  course: { id: "course-1", version: "1.0", title: "Saludos" },
  unit: null as unknown,
  generate: vi.fn(),
}));

vi.mock("@/lib/dashboard/load-dashboard-user", () => ({
  loadDashboardUser: vi.fn(async () => mocks.user),
}));
vi.mock("@/lib/coach/service", () => ({
  CoachServiceError: class CoachServiceError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  },
  generateCoachReply: mocks.generate,
  isCoachContextWithinLimit: () => true,
  isCoachConfigured: () => true,
  MAX_COACH_HISTORY_MESSAGES: 10,
  MAX_COACH_MESSAGE_LENGTH: 600,
  MAX_COACH_SESSION_TURNS: 12,
}));
vi.mock("@/db/client", () => ({
  getDb: () => ({
    query: {
      enrollments: { findFirst: vi.fn(async () => mocks.enrollment) },
      courses: { findFirst: vi.fn(async () => mocks.course) },
      courseUnits: { findFirst: vi.fn(async () => mocks.unit) },
    },
  }),
}));

import { POST } from "@/app/api/coach/route";

const approvedContent = {
  schemaVersion: 1,
  status: "published",
  kind: "vocabulary",
  durationMinutes: 5,
  objectives: ["Saludar"],
  reading: { title: "Saludos", paragraphs: ["Material revisado."] },
  vocabulary: [{ term: "allin", meaning: "bien" }],
  phrases: [],
  examples: [],
  activity: {
    title: "Práctica",
    instructions: ["Responde"],
    items: [{ prompt: "Saluda", answer: "allin" }],
    modality: "text",
    audioStatus: "not_required",
  },
  review: {
    status: "reviewed",
    reviewedBy: "reviewer",
    reviewedAt: "2026-01-01",
    notes: [],
  },
  sources: {
    status: "documented",
    items: [
      { citation: "Fuente primaria", license: "CC", usedFor: "Vocabulario" },
    ],
    requirements: [],
  },
  regionalVariant: { status: "specified", name: "Chanka", notes: "Revisada" },
  authorship: { status: "attributed", author: "Autora", license: "CC" },
  source: {
    system: "yachay-convex",
    moduleSlug: "saludos",
    lessonId: "unidad-1",
  },
};

function makeRequest(payload: unknown) {
  return new Request("http://localhost/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  mocks.user = {
    kind: "ready",
    appUser: { id: `coach-test-${crypto.randomUUID()}` },
    email: null,
  };
  mocks.enrollment = {
    id: "enrollment-1",
    courseId: "course-1",
    courseVersion: "1.0",
  };
  mocks.course = { id: "course-1", version: "1.0", title: "Saludos" };
  mocks.unit = { id: "unit-1", content: approvedContent, title: "Saludar" };
  mocks.generate.mockReset().mockResolvedValue({
    reply: {
      answer: "Hola",
      explanation: "Saludo breve.",
      regionalNote: "Nota de variante.",
    },
    usage: { input: 10, output: 5 },
  });
});

describe("POST /api/coach", () => {
  it("rejects requests without a signed-in session", async () => {
    mocks.user = { kind: "clerk_missing", appUser: null, email: null };
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("validates the question length before calling OpenAI", async () => {
    const response = await POST(
      makeRequest({
        enrollmentId: "enrollment-1",
        unitId: "unit-1",
        sessionId: crypto.randomUUID(),
        message: "x".repeat(601),
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("resolves the unit from an active enrollment and returns structured feedback", async () => {
    const response = await POST(
      makeRequest({
        enrollmentId: "enrollment-1",
        unitId: "unit-1",
        sessionId: crypto.randomUUID(),
        message: "Corrige mi saludo",
        history: [],
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      reply: {
        answer: "Hola",
        explanation: "Saludo breve.",
        regionalNote: "Nota de variante.",
      },
      turnsRemaining: 11,
    });
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ unitTitle: "Saludar" }),
        message: "Corrige mi saludo",
      }),
    );
  });

  it("does not tutor from a draft or unreviewed unit", async () => {
    mocks.unit = {
      id: "unit-1",
      title: "Borrador",
      content: {
        ...approvedContent,
        review: { ...approvedContent.review, status: "draft" },
      },
    };
    const response = await POST(
      makeRequest({
        enrollmentId: "enrollment-1",
        unitId: "unit-1",
        sessionId: crypto.randomUUID(),
        message: "Explica",
      }),
    );
    expect(response.status).toBe(404);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("enforces the server-side turn cap even if the browser changes session ID", async () => {
    let now = Date.now();
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const sessionId = crypto.randomUUID();
    for (let turn = 0; turn < 12; turn += 1) {
      const response = await POST(
        makeRequest({
          enrollmentId: "enrollment-1",
          unitId: "unit-1",
          sessionId,
          message: `Pregunta ${turn + 1}`,
        }),
      );
      expect(response.status).toBe(200);
      now += 61_000;
    }
    const changedIdResponse = await POST(
      makeRequest({
        enrollmentId: "enrollment-1",
        unitId: "unit-1",
        sessionId: crypto.randomUUID(),
        message: "Una pregunta más",
      }),
    );
    expect(changedIdResponse.status).toBe(429);
    expect(await changedIdResponse.json()).toEqual({ error: "session_limit" });
  });
});
