import type { Request, Response } from "express";
import type { Context } from "openapi-backend";

import {
  AUTH_ERROR_RESPONSE,
  getAuthPayload
} from "../middleware/auth";
import {
  getLatestNotification,
  listUserNotifications,
  saveUserNotificationToken,
  sendNotifications
} from "../services/notifications";
import { InvalidNotificationUsersError } from "../repositories/notifications";

const invalidPayloadError = {
  error: "INVALID_FORMAT",
  message: "Invalid payload"
};

const notFoundError = {
  error: "NOT_FOUND",
  message: "Notifications not found"
};

function requireAuth(req: Request, res: Response) {
  const payload = getAuthPayload(req.headers.token);
  if (!payload) {
    res.status(401).json(AUTH_ERROR_RESPONSE);
    return null;
  }

  return payload;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseNotificationRequest(
  payload: unknown
): { text: string; users?: number[] } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  if (!isNonEmptyString(data.text)) {
    return null;
  }

  if (data.users === undefined) {
    return { text: data.text };
  }

  if (!Array.isArray(data.users)) {
    return null;
  }

  if (data.users.length === 0) {
    return null;
  }

  const users = data.users.filter((user) => typeof user === "number");
  if (users.length !== data.users.length) {
    return null;
  }

  return { text: data.text, users };
}

function parseTokenRequest(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  return isNonEmptyString(data.token) ? data.token : null;
}

export async function getNotifications(
  _context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const notification = await getLatestNotification();
  if (!notification) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(notification);
}

export async function postNotifications(
  _context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const payload = parseNotificationRequest(req.body);
  if (!payload) {
    return res.status(400).json(invalidPayloadError);
  }

  try {
    await sendNotifications(payload);
  } catch (error) {
    if (error instanceof InvalidNotificationUsersError) {
      return res.status(400).json({
        error: "INVALID_USERS",
        message: "Alguns usuaris no existeixen.",
        missingUsers: error.missingUserIds
      });
    }
    throw error;
  }
  return res.status(200).send();
}

export async function getMeNotifications(
  _context: Context,
  req: Request,
  res: Response
) {
  const payload = requireAuth(req, res);
  if (!payload) {
    return;
  }

  const userId = Number(payload.userId);
  if (!Number.isFinite(userId)) {
    return res.status(401).json(AUTH_ERROR_RESPONSE);
  }

  const notifications = await listUserNotifications(userId);
  return res.status(200).json(notifications);
}

export async function postMeNotificationsToken(
  _context: Context,
  req: Request,
  res: Response
) {
  const payload = requireAuth(req, res);
  if (!payload) {
    return;
  }

  const userId = Number(payload.userId);
  if (!Number.isFinite(userId)) {
    return res.status(401).json(AUTH_ERROR_RESPONSE);
  }

  const token = parseTokenRequest(req.body);
  if (!token) {
    return res.status(400).json(invalidPayloadError);
  }

  await saveUserNotificationToken(userId, token);
  return res.status(200).send();
}
