import type { Request, Response } from "express";
import type { Context } from "openapi-backend";

import {
  AUTH_ERROR_RESPONSE,
  getAuthPayload
} from "../middleware/auth";
import {
  listAllBusinesses,
  getBusinessById,
  createBusiness,
  updateBusiness,
  removeBusiness
} from "../services/business";
import { logger } from "../services/logger";

const notFoundError = {
  error: "NOT_FOUND",
  message: "Business not found"
};

const invalidPayloadError = {
  error: "INVALID_PAYLOAD",
  message: "Invalid payload"
};

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
type BusinessStatus = (typeof VALID_STATUSES)[number];

function requireAuth(req: Request, res: Response) {
  const payload = getAuthPayload(req.headers.token);
  if (!payload) {
    res.status(401).json(AUTH_ERROR_RESPONSE);
    return null;
  }
  return payload;
}

function parseBusinessId(context: Context): number | null {
  const raw = context.request.params?.business_id;
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
): { name: string; status?: BusinessStatus } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  if (typeof data.name !== "string" || !data.name.trim()) {
    return null;
  }

  if (data.status !== undefined) {
    if (!VALID_STATUSES.includes(data.status as BusinessStatus)) {
      return null;
    }
  }

  return {
    name: data.name.trim(),
    ...(data.status !== undefined ? { status: data.status as BusinessStatus } : {})
  };
}

function parseUpdatePayload(
  payload: unknown
): { name?: string; status?: BusinessStatus } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const result: { name?: string; status?: BusinessStatus } = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      return null;
    }
    result.name = data.name.trim();
  }

  if (data.status !== undefined) {
    if (!VALID_STATUSES.includes(data.status as BusinessStatus)) {
      return null;
    }
    result.status = data.status as BusinessStatus;
  }

  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

export async function getBusinesses(
  _context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  let businesses;
  try {
    businesses = await listAllBusinesses();
  } catch (error) {
    logger.error("Failed to list businesses", { error });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(200).json(businesses);
}

export async function getBusinessesBusinessId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const businessId = parseBusinessId(context);
  if (businessId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let business;
  try {
    business = await getBusinessById(businessId);
  } catch (error) {
    logger.error("Failed to get business", { error, businessId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!business) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(business);
}

export async function postBusinesses(
  _context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const payload = parseCreatePayload(req.body);
  if (!payload) {
    return res.status(400).json(invalidPayloadError);
  }

  let business;
  try {
    business = await createBusiness(payload);
  } catch (error) {
    logger.error("Failed to create business", { error, payload });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(201).json(business);
}

export async function putBusinessesBusinessId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const businessId = parseBusinessId(context);
  if (businessId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  const payload = parseUpdatePayload(req.body);
  if (!payload) {
    return res.status(400).json(invalidPayloadError);
  }

  let business;
  try {
    business = await updateBusiness(businessId, payload);
  } catch (error) {
    logger.error("Failed to update business", { error, businessId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!business) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(business);
}

export async function deleteBusinessesBusinessId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const businessId = parseBusinessId(context);
  if (businessId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let deleted;
  try {
    deleted = await removeBusiness(businessId);
  } catch (error) {
    logger.error("Failed to delete business", { error, businessId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!deleted) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).send();
}
