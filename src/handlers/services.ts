import type { Request, Response } from "express";
import type { Context } from "openapi-backend";

import {
  AUTH_ERROR_RESPONSE,
  getAuthPayload
} from "../middleware/auth";
import {
  listServices,
  getServiceById,
  createService,
  updateService,
  removeService
} from "../services/services";
import { logger } from "../services/logger";

const notFoundError = {
  error: "NOT_FOUND",
  message: "Service not found"
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

function parseServiceId(context: Context): number | null {
  const raw = context.request.params?.service_id;
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }

  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function parseInstructorIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const ids: number[] = [];
  for (const item of value) {
    if (!Number.isInteger(item) || (item as number) <= 0) {
      return null;
    }

    ids.push(item as number);
  }

  return Array.from(new Set(ids));
}

function parseCreatePayload(
  payload: unknown
): { name: string; instructorIds: number[] } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  if (typeof data.name !== "string" || !data.name.trim()) {
    return null;
  }

  const instructorIds = parseInstructorIds(data.instructorIds);
  if (!instructorIds) {
    return null;
  }

  return {
    name: data.name.trim(),
    instructorIds
  };
}

function parseUpdatePayload(
  payload: unknown
): { name?: string; instructorIds?: number[] } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const result: { name?: string; instructorIds?: number[] } = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      return null;
    }

    result.name = data.name.trim();
  }

  if (data.instructorIds !== undefined) {
    const instructorIds = parseInstructorIds(data.instructorIds);
    if (!instructorIds) {
      return null;
    }

    result.instructorIds = instructorIds;
  }

  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

function isPrismaRecordMissingError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2025"
  );
}

export async function getServices(
  _context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  let services;
  try {
    services = await listServices();
  } catch (error) {
    logger.error("Failed to list services", { error });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(200).json(services);
}

export async function getServicesServiceId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const serviceId = parseServiceId(context);
  if (serviceId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let service;
  try {
    service = await getServiceById(serviceId);
  } catch (error) {
    logger.error("Failed to get service", { error, serviceId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!service) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(service);
}

export async function postServices(
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

  let service;
  try {
    service = await createService(payload);
  } catch (error) {
    if (isPrismaRecordMissingError(error)) {
      return res.status(400).json(invalidPayloadError);
    }

    logger.error("Failed to create service", { error, payload });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(201).json(service);
}

export async function putServicesServiceId(
  context: Context,
  req: Request,
  res: Response
) {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const serviceId = parseServiceId(context);
  if (serviceId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  const payload = parseUpdatePayload(req.body);
  if (!payload) {
    return res.status(400).json(invalidPayloadError);
  }

  let service;
  try {
    service = await updateService(serviceId, payload);
  } catch (error) {
    if (isPrismaRecordMissingError(error)) {
      return res.status(400).json(invalidPayloadError);
    }

    logger.error("Failed to update service", { error, serviceId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!service) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(service);
}

export async function deleteServicesServiceId(
  context: Context,
  req: Request,
  res: Response
) {
  const auth = requireAuth(req, res);
  if (!auth) {
    return;
  }

  const serviceId = parseServiceId(context);
  if (serviceId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let deleted;
  try {
    deleted = await removeService(serviceId);
  } catch (error) {
    logger.error("Failed to delete service", { error, serviceId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!deleted) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).send();
}
