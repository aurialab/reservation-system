import type { Request, Response } from "express";
import type { Context } from "openapi-backend";

import {
  AUTH_ERROR_RESPONSE,
  getAuthPayload
} from "../middleware/auth";
import {
  listActivities,
  getActivityById,
  createActivity,
  updateActivity,
  removeActivity
} from "../services/activities";
import { logger } from "../services/logger";

const notFoundError = {
  error: "NOT_FOUND",
  message: "Activity not found"
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

function parseActivityId(context: Context): number | null {
  const raw = context.request.params?.activity_id;
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
): { name: string; description?: string } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  if (typeof data.name !== "string" || !data.name.trim()) {
    return null;
  }

  if (data.description !== undefined && typeof data.description !== "string") {
    return null;
  }

  return {
    name: data.name.trim(),
    description: data.description as string | undefined
  };
}

function parseUpdatePayload(
  payload: unknown
): { name?: string; description?: string } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const result: { name?: string; description?: string } = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      return null;
    }
    result.name = data.name.trim();
  }

  if (data.description !== undefined) {
    if (typeof data.description !== "string") {
      return null;
    }
    result.description = data.description;
  }

  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

export async function getActivities(
  _context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  let activities;
  try {
    activities = await listActivities();
  } catch (error) {
    logger.error("Failed to list activities", { error });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(200).json(activities);
}

export async function getActivitiesActivityId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const activityId = parseActivityId(context);
  if (activityId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let activity;
  try {
    activity = await getActivityById(activityId);
  } catch (error) {
    logger.error("Failed to get activity", { error, activityId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!activity) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(activity);
}

export async function postActivities(
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

  let activity;
  try {
    activity = await createActivity(payload);
  } catch (error) {
    logger.error("Failed to create activity", { error, payload });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(201).json(activity);
}

export async function putActivitiesActivityId(
  context: Context,
  req: Request,
  res: Response
) {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const activityId = parseActivityId(context);
  if (activityId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  const payload = parseUpdatePayload(req.body);
  if (!payload) {
    return res.status(400).json(invalidPayloadError);
  }

  let activity;
  try {
    activity = await updateActivity(activityId, payload);
  } catch (error) {
    logger.error("Failed to update activity", { error, activityId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!activity) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(activity);
}

export async function deleteActivitiesActivityId(
  context: Context,
  req: Request,
  res: Response
) {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const activityId = parseActivityId(context);
  if (activityId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let deleted;
  try {
    deleted = await removeActivity(activityId);
  } catch (error) {
    logger.error("Failed to delete activity", { error, activityId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!deleted) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).send();
}
