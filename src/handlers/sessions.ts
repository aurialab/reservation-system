import type { Request, Response } from "express";
import type { Context } from "openapi-backend";

import {
  AUTH_ERROR_RESPONSE,
  getAuthPayload
} from "../middleware/auth";
import {
  listAllSessions,
  getSessionById,
  createSession,
  updateSession,
  removeSession
} from "../services/sessions";
import { logger } from "../services/logger";

const notFoundError = {
  error: "NOT_FOUND",
  message: "Session not found"
};

const invalidPayloadError = {
  error: "INVALID_PAYLOAD",
  message: "Invalid payload"
};

function requireAuth(req: Request, res: Response) {
  const payload = getAuthPayload(req.headers.token);
  if (!payload) {
    res.status(401).json(AUTH_ERROR_RESPONSE);
    return null;
  }

  return payload;
}

function parseSessionId(context: Context): number | null {
  const raw = context.request.params?.session_id;
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }

  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function parseNumberFilter(value: unknown): number | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    if (!value.trim()) {
      return null;
    }
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function parseDateFilter(value: unknown): Date | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parseCreatePayload(payload: unknown): {
  activityId: number;
  instructorId: number;
  date: string;
  startTime: string;
  endTime: string;
} | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;

  if (typeof data.activityId !== "number" || !Number.isInteger(data.activityId) || data.activityId <= 0) {
    return null;
  }

  if (typeof data.instructorId !== "number" || !Number.isInteger(data.instructorId) || data.instructorId <= 0) {
    return null;
  }

  if (typeof data.date !== "string" || !data.date.trim()) {
    return null;
  }

  if (typeof data.startTime !== "string" || !data.startTime.trim()) {
    return null;
  }

  if (typeof data.endTime !== "string" || !data.endTime.trim()) {
    return null;
  }

  return {
    activityId: data.activityId,
    instructorId: data.instructorId,
    date: data.date.trim(),
    startTime: data.startTime.trim(),
    endTime: data.endTime.trim()
  };
}

function parseUpdatePayload(payload: unknown): {
  activityId?: number;
  instructorId?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
} | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const result: {
    activityId?: number;
    instructorId?: number;
    date?: string;
    startTime?: string;
    endTime?: string;
  } = {};

  if (data.activityId !== undefined) {
    if (typeof data.activityId !== "number" || !Number.isInteger(data.activityId) || data.activityId <= 0) {
      return null;
    }
    result.activityId = data.activityId;
  }

  if (data.instructorId !== undefined) {
    if (typeof data.instructorId !== "number" || !Number.isInteger(data.instructorId) || data.instructorId <= 0) {
      return null;
    }
    result.instructorId = data.instructorId;
  }

  if (data.date !== undefined) {
    if (typeof data.date !== "string" || !data.date.trim()) {
      return null;
    }
    result.date = data.date.trim();
  }

  if (data.startTime !== undefined) {
    if (typeof data.startTime !== "string" || !data.startTime.trim()) {
      return null;
    }
    result.startTime = data.startTime.trim();
  }

  if (data.endTime !== undefined) {
    if (typeof data.endTime !== "string" || !data.endTime.trim()) {
      return null;
    }
    result.endTime = data.endTime.trim();
  }

  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

export async function getSessions(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const rawActivityId = context.request.query?.activity_id;
  const rawInstructorId = context.request.query?.instructor_id;
  const rawFrom = context.request.query?.from;
  const rawTo = context.request.query?.to;

  const activityId = parseNumberFilter(rawActivityId);
  const instructorId = parseNumberFilter(rawInstructorId);
  const fromDate = parseDateFilter(rawFrom);
  const toDate = parseDateFilter(rawTo);

  if (rawActivityId !== undefined && activityId === null) {
    return res.status(400).json(invalidPayloadError);
  }
  if (rawInstructorId !== undefined && instructorId === null) {
    return res.status(400).json(invalidPayloadError);
  }
  if (rawFrom !== undefined && fromDate === null) {
    return res.status(400).json(invalidPayloadError);
  }
  if (rawTo !== undefined && toDate === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let sessions;
  try {
    sessions = await listAllSessions({
      ...(activityId ? { activityId } : {}),
      ...(instructorId ? { instructorId } : {}),
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {})
    });
  } catch (error) {
    logger.error("Failed to list sessions", { error });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(200).json(sessions);
}

export async function getSessionsSessionId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const sessionId = parseSessionId(context);
  if (sessionId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let session;
  try {
    session = await getSessionById(sessionId);
  } catch (error) {
    logger.error("Failed to get session", { error, sessionId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!session) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(session);
}

export async function postSessions(
  _context: Context,
  req: Request,
  res: Response
) {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const payload = parseCreatePayload(req.body);
  if (!payload) {
    return res.status(400).json(invalidPayloadError);
  }

  let session;
  try {
    session = await createSession(payload);
  } catch (error) {
    logger.error("Failed to create session", { error, payload });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!session) {
    return res.status(400).json(invalidPayloadError);
  }

  return res.status(201).json(session);
}

export async function putSessionsSessionId(
  context: Context,
  req: Request,
  res: Response
) {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const sessionId = parseSessionId(context);
  if (sessionId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  const payload = parseUpdatePayload(req.body);
  if (!payload) {
    return res.status(400).json(invalidPayloadError);
  }

  let session;
  try {
    session = await updateSession(sessionId, payload);
  } catch (error) {
    logger.error("Failed to update session", { error, sessionId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!session) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(session);
}

export async function deleteSessionsSessionId(
  context: Context,
  req: Request,
  res: Response
) {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const sessionId = parseSessionId(context);
  if (sessionId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let deleted;
  try {
    deleted = await removeSession(sessionId);
  } catch (error) {
    logger.error("Failed to delete session", { error, sessionId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!deleted) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).send();
}
