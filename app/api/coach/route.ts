import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/client";
import { courseUnits, courses, enrollments } from "@/db/schema";
import { loadDashboardUser } from "@/lib/dashboard/load-dashboard-user";
import {
  isCourseUnitContent,
  isUnitReadyForPublication,
} from "@/lib/education/content";
import { rateLimitedResponse } from "@/lib/http/rate-limited";
import { consumeToken } from "@/lib/http/rate-limit";
import {
  CoachServiceError,
  generateCoachReply,
  isCoachConfigured,
  isCoachContextWithinLimit,
  MAX_COACH_HISTORY_MESSAGES,
  MAX_COACH_MESSAGE_LENGTH,
  MAX_COACH_SESSION_TURNS,
  type CoachTurn,
} from "@/lib/coach/service";

export const runtime = "nodejs";

const minuteStore = new Map<string, { timestamps: number[] }>();
const dailyStore = new Map<string, { timestamps: number[] }>();
const sessionTurns = new Map<
  string,
  { sessionId: string; turns: number; inFlight: boolean; expiresAt: number }
>();

type CoachRequest = {
  enrollmentId: string;
  unitId: string;
  sessionId: string;
  message: string;
  history: CoachTurn[];
};

function parseRequest(body: unknown): CoachRequest | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const candidate = body as Record<string, unknown>;
  if (
    typeof candidate.enrollmentId !== "string" ||
    typeof candidate.unitId !== "string" ||
    typeof candidate.sessionId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      candidate.sessionId,
    ) ||
    typeof candidate.message !== "string"
  )
    return null;
  const message = candidate.message.trim();
  if (!message || message.length > MAX_COACH_MESSAGE_LENGTH) return null;
  const history = candidate.history ?? [];
  if (
    !Array.isArray(history) ||
    history.length > MAX_COACH_HISTORY_MESSAGES ||
    !history.every(
      (turn) =>
        turn &&
        typeof turn === "object" &&
        ((turn as Record<string, unknown>).role === "user" ||
          (turn as Record<string, unknown>).role === "assistant") &&
        typeof (turn as Record<string, unknown>).content === "string" &&
        (turn as Record<string, string>).content.trim().length > 0 &&
        (turn as Record<string, string>).content.length <=
          MAX_COACH_MESSAGE_LENGTH,
    )
  )
    return null;
  return {
    enrollmentId: candidate.enrollmentId,
    unitId: candidate.unitId,
    sessionId: candidate.sessionId,
    message,
    history: history.map((turn) => ({
      role: (turn as CoachTurn).role,
      content: (turn as CoachTurn).content.trim(),
    })),
  };
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const user = await loadDashboardUser();
  if (user.kind === "clerk_missing") return errorResponse("unauthorized", 401);
  if (user.kind === "database_missing")
    return errorResponse("database_unavailable", 503);
  if (!isCoachConfigured()) return errorResponse("coach_unavailable", 503);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 12_000) return errorResponse("invalid_input", 400);
  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 12_000) return errorResponse("invalid_input", 400);
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse("invalid_input", 400);
  }
  const input = parseRequest(body);
  if (!input) return errorResponse("invalid_input", 400);

  const now = Date.now();
  const minute = consumeToken({
    key: user.appUser.id,
    now,
    store: minuteStore,
    limit: 8,
    windowMs: 60_000,
  });
  if (!minute.ok) return rateLimitedResponse(minute.retryAfterSeconds);
  const today = new Date(now).toISOString().slice(0, 10);
  const configuredDailyLimit = Number.parseInt(
    process.env.OPENAI_COACH_DAILY_REQUEST_LIMIT ?? "1000",
    10,
  );
  const daily = consumeToken({
    key: `user:${today}:${user.appUser.id}`,
    now,
    store: dailyStore,
    limit: 30,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!daily.ok) return rateLimitedResponse(daily.retryAfterSeconds);
  const globalDaily = consumeToken({
    key: `global:${today}`,
    now,
    store: dailyStore,
    limit:
      Number.isFinite(configuredDailyLimit) && configuredDailyLimit > 0
        ? configuredDailyLimit
        : 1000,
    windowMs: 24 * 60 * 60 * 1000,
  });
  if (!globalDaily.ok)
    return rateLimitedResponse(globalDaily.retryAfterSeconds);

  let session:
    | { sessionId: string; turns: number; inFlight: boolean; expiresAt: number }
    | undefined;
  try {
    const db = getDb();
    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.id, input.enrollmentId),
        eq(enrollments.userId, user.appUser.id),
        eq(enrollments.status, "active"),
      ),
    });
    if (!enrollment) return errorResponse("session_expired", 401);
    const [course, unit] = await Promise.all([
      db.query.courses.findFirst({
        where: and(
          eq(courses.id, enrollment.courseId),
          eq(courses.version, enrollment.courseVersion),
          eq(courses.status, "published"),
          eq(courses.enrollmentEnabled, true),
          eq(courses.demo, false),
        ),
      }),
      db.query.courseUnits.findFirst({
        where: and(
          eq(courseUnits.id, input.unitId),
          eq(courseUnits.courseId, enrollment.courseId),
        ),
      }),
    ]);
    if (!course || !unit) return errorResponse("unit_unavailable", 404);
    const content = isCourseUnitContent(unit.content) ? unit.content : null;
    if (!content || !isUnitReadyForPublication(content)) {
      return errorResponse("unit_unavailable", 404);
    }
    const coachContext = {
      courseTitle: course.title,
      unitTitle: unit.title,
      content,
    };
    if (!isCoachContextWithinLimit(coachContext))
      return errorResponse("context_too_large", 422);

    const sessionKey = `${user.appUser.id}:${enrollment.id}:${unit.id}`;
    const activeSession = sessionTurns.get(sessionKey);
    if (activeSession && activeSession.expiresAt > now) {
      if (activeSession.turns >= MAX_COACH_SESSION_TURNS)
        return errorResponse("session_limit", 429);
      if (activeSession.sessionId !== input.sessionId)
        return errorResponse("session_active", 409);
      if (activeSession.inFlight)
        return errorResponse("request_in_progress", 409);
      session = activeSession;
    } else {
      session = {
        sessionId: input.sessionId,
        turns: 0,
        inFlight: false,
        expiresAt: now + 30 * 60 * 1000,
      };
    }
    session.inFlight = true;
    sessionTurns.set(sessionKey, session);
    if (sessionTurns.size > 5_000) {
      const oldest = sessionTurns.keys().next().value;
      if (oldest) sessionTurns.delete(oldest);
    }

    const result = await generateCoachReply({
      context: coachContext,
      message: input.message,
      history: input.history,
    });
    session.turns += 1;
    session.inFlight = false;
    session.expiresAt = Date.now() + 30 * 60 * 1000;
    return NextResponse.json({
      reply: result.reply,
      turnsRemaining: MAX_COACH_SESSION_TURNS - session.turns,
    });
  } catch (error) {
    if (session) session.inFlight = false;
    if (error instanceof CoachServiceError) {
      return errorResponse(
        error.code === "rate_limited"
          ? "provider_rate_limited"
          : error.code === "timeout"
            ? "provider_timeout"
            : error.code === "invalid_output"
              ? "invalid_response"
              : "coach_unavailable",
        error.code === "rate_limited"
          ? 503
          : error.code === "invalid_output"
            ? 502
            : 503,
      );
    }
    console.error("[coach] request failed", { code: "server_error" });
    return errorResponse("coach_unavailable", 503);
  }
}
