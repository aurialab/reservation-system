import type { Request, Response } from "express";
import type { Context } from "openapi-backend";

import {
  AUTH_ERROR_RESPONSE,
  getAuthPayload
} from "../middleware/auth";
import {
  listInstructors,
  getInstructorById,
  createInstructor,
  updateInstructor,
  removeInstructor
} from "../services/instructors";
import { logger } from "../services/logger";

const notFoundError = {
  error: "NOT_FOUND",
  message: "Instructor not found"
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

function parseInstructorId(context: Context): number | null {
  const raw = context.request.params?.instructor_id;
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }

  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function parseCreatePayload(
  payload: unknown
): { name: string; email: string; phone: string } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  if (typeof data.name !== "string" || !data.name.trim()) {
    return null;
  }

  if (typeof data.email !== "string" || !data.email.trim()) {
    return null;
  }

  if (typeof data.phone !== "string" || !data.phone.trim()) {
    return null;
  }

  return {
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone.trim()
  };
}

function parseUpdatePayload(
  payload: unknown
): { name?: string; email?: string; phone?: string } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const result: { name?: string; email?: string; phone?: string } = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      return null;
    }
    result.name = data.name.trim();
  }

  if (data.email !== undefined) {
    if (typeof data.email !== "string" || !data.email.trim()) {
      return null;
    }
    result.email = data.email.trim();
  }

  if (data.phone !== undefined) {
    if (typeof data.phone !== "string" || !data.phone.trim()) {
      return null;
    }
    result.phone = data.phone.trim();
  }

  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

export async function getInstructors(
  _context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  let instructors;
  try {
    instructors = await listInstructors();
  } catch (error) {
    logger.error("Failed to list instructors", { error });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(200).json(instructors);
}

export async function getInstructorsInstructorId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const instructorId = parseInstructorId(context);
  if (instructorId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let instructor;
  try {
    instructor = await getInstructorById(instructorId);
  } catch (error) {
    logger.error("Failed to get instructor", { error, instructorId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!instructor) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(instructor);
}

export async function postInstructors(
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

  let instructor;
  try {
    instructor = await createInstructor(payload);
  } catch (error) {
    logger.error("Failed to create instructor", { error, payload });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(201).json(instructor);
}

export async function putInstructorsInstructorId(
  context: Context,
  req: Request,
  res: Response
) {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const instructorId = parseInstructorId(context);
  if (instructorId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  const payload = parseUpdatePayload(req.body);
  if (!payload) {
    return res.status(400).json(invalidPayloadError);
  }

  let instructor;
  try {
    instructor = await updateInstructor(instructorId, payload);
  } catch (error) {
    logger.error("Failed to update instructor", { error, instructorId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!instructor) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(instructor);
}

export async function deleteInstructorsInstructorId(
  context: Context,
  req: Request,
  res: Response
) {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const instructorId = parseInstructorId(context);
  if (instructorId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let deleted;
  try {
    deleted = await removeInstructor(instructorId);
  } catch (error) {
    logger.error("Failed to delete instructor", { error, instructorId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!deleted) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).send();
}
