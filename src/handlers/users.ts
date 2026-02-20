import type { Request, Response } from "express";
import type { Context } from "openapi-backend";

import {
  AUTH_ERROR_RESPONSE,
  getAuthPayload
} from "../middleware/auth";
import { type UpdateUserInput } from "../repositories/user";
import {
  getUserByEmail,
  getUserById,
  listAllUsers,
  removeUser,
  setUserBoStatus,
  updateUser
} from "../services/users";

const notFoundError = {
  error: "NOT_FOUND",
  message: "User not found"
};

const invalidFormatError = {
  error: "INVALID_FORMAT",
  message: "Invalid user_id format"
};

const invalidUpdateError = {
  error: "INVALID_FORMAT",
  message: "Invalid update payload"
};

const emailConflictError = {
  error: "CONFLICT",
  message: "Email already exists."
};

function requireAuth(req: Request, res: Response) {
  const payload = getAuthPayload(req.headers.token);
  if (!payload) {
    res.status(401).json(AUTH_ERROR_RESPONSE);
    return null;
  }

  return payload;
}

function parseUserId(context: Context): number | null {
  const raw = context.request.params?.user_id;
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }

  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function sanitizeUpdatePayload(
  payload: unknown
): UpdateUserInput | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  if (
    !("email" in data) ||
    !("name" in data) ||
    !("surname" in data) ||
    !("phone" in data)
  ) {
    return null;
  }

  if (!isNonEmptyString(data.email)) {
    return null;
  }

  if (!isNonEmptyString(data.name)) {
    return null;
  }

  if (!isNonEmptyString(data.surname)) {
    return null;
  }

  if (!isNonEmptyString(data.phone)) {
    return null;
  }

  return {
    email: data.email,
    name: data.name,
    surname: data.surname,
    phone: data.phone,
    isVerified: data.isVerified === true,
    isBO: data.isBO === true
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function getUsers(
  _context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const users = await listAllUsers();
  return res.status(200).json(users);
}

export async function getUsersUserId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const userId = parseUserId(context);
  if (userId === null) {
    return res.status(400).json(invalidFormatError);
  }

  const user = await getUserById(userId);
  if (!user) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(user);
}

export async function putUsersUserId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const userId = parseUserId(context);
  if (userId === null) {
    return res.status(400).json(invalidFormatError);
  }

  const updatePayload = sanitizeUpdatePayload(req.body);
  if (!updatePayload) {
    return res.status(400).json(invalidUpdateError);
  }

  const currentUser = await getUserById(userId);
  if (!currentUser) {
    return res.status(404).json(notFoundError);
  }

  const existingUser = await getUserByEmail(updatePayload.email);
  if (existingUser && existingUser.id !== userId) {
    return res.status(409).json(emailConflictError);
  }

  const user = await updateUser(userId, updatePayload);
  if (!user) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(user);
}

export async function deleteUsersUserId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const userId = parseUserId(context);
  if (userId === null) {
    return res.status(400).json(invalidFormatError);
  }

  const deleted = await removeUser(userId);
  if (!deleted) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).send();
}

export async function getMe(
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

  const user = await getUserById(userId);
  if (!user) {
    return res.status(401).json(AUTH_ERROR_RESPONSE);
  }

  return res.status(200).json(user);
}

export async function deleteMe(
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

  const deleted = await removeUser(userId);
  if (!deleted) {
    return res.status(401).json(AUTH_ERROR_RESPONSE);
  }

  return res.status(200).send();
}

const forbiddenBoError = {
  error: "FORBIDDEN",
  message: "No tens permisos de Back-Office"
};

function sanitizeSetUserBoPayload(
  payload: unknown
): { userId: number; isBO: boolean } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  if (!("userId" in data) || !("isBO" in data)) {
    return null;
  }

  const rawUserId = data.userId;
  if (typeof rawUserId !== "number" || !Number.isInteger(rawUserId) || rawUserId <= 0) {
    return null;
  }

  const rawIsBO = data.isBO;
  if (typeof rawIsBO !== "boolean") {
    return null;
  }

  return {
    userId: rawUserId,
    isBO: rawIsBO
  };
}

export async function postSetUserBo(
  _context: Context,
  req: Request,
  res: Response
) {
  const payload = requireAuth(req, res);
  if (!payload) {
    return;
  }

  const requestingUserId = Number(payload.userId);
  if (!Number.isFinite(requestingUserId)) {
    return res.status(401).json(AUTH_ERROR_RESPONSE);
  }

  // Check if the requesting user has BO permissions
  const requestingUser = await getUserById(requestingUserId);
  if (!requestingUser || !requestingUser.isBO) {
    return res.status(403).json(forbiddenBoError);
  }

  const setUserBoPayload = sanitizeSetUserBoPayload(req.body);
  if (!setUserBoPayload) {
    return res.status(400).json(invalidUpdateError);
  }

  const targetUserId = setUserBoPayload.userId;

  // Check if the target user exists
  const targetUser = await getUserById(targetUserId);
  if (!targetUser) {
    return res.status(404).json(notFoundError);
  }

  // Update the user's BO status
  const updatedUser = await setUserBoStatus(targetUserId, setUserBoPayload.isBO);
  if (!updatedUser) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(updatedUser);
}
