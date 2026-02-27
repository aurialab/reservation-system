import type { Request, Response } from "express";
import type { Context } from "openapi-backend";

import {
  AUTH_ERROR_RESPONSE,
  getAuthPayload
} from "../middleware/auth";
import {
  listAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  removeLocation
} from "../services/locations";
import { logger } from "../services/logger";

const notFoundError = {
  error: "NOT_FOUND",
  message: "Location not found"
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

function parseLocationId(context: Context): number | null {
  const raw = context.request.params?.location_id;
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
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

function parseOptionalInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseOptionalFloat(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function parseCreatePayload(
  payload: unknown
): {
  name: string;
  city: string;
  postalCode: string;
  address: string;
  businessId: number;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
} | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;

  if (typeof data.name !== "string" || !data.name.trim()) return null;
  if (typeof data.city !== "string" || !data.city.trim()) return null;
  if (typeof data.postalCode !== "string" || !data.postalCode.trim()) return null;
  if (typeof data.address !== "string" || !data.address.trim()) return null;
  if (typeof data.businessId !== "number" || !Number.isInteger(data.businessId) || data.businessId <= 0) return null;

  const result: {
    name: string;
    city: string;
    postalCode: string;
    address: string;
    businessId: number;
    latitude?: number | null;
    longitude?: number | null;
    phone?: string | null;
    email?: string | null;
    isActive?: boolean;
  } = {
    name: data.name.trim(),
    city: data.city.trim(),
    postalCode: data.postalCode.trim(),
    address: data.address.trim(),
    businessId: data.businessId
  };

  if (data.latitude !== undefined) {
    const lat = parseOptionalFloat(data.latitude);
    if (lat === undefined) return null;
    result.latitude = lat;
  }
  if (data.longitude !== undefined) {
    const lng = parseOptionalFloat(data.longitude);
    if (lng === undefined) return null;
    result.longitude = lng;
  }
  if (data.phone !== undefined) {
    result.phone = data.phone === null ? null : typeof data.phone === "string" ? data.phone.trim() : null;
  }
  if (data.email !== undefined) {
    result.email = data.email === null ? null : typeof data.email === "string" ? data.email.trim() : null;
  }
  if (data.isActive !== undefined) {
    if (typeof data.isActive !== "boolean") return null;
    result.isActive = data.isActive;
  }

  return result;
}

function parseUpdatePayload(
  payload: unknown
): {
  name?: string;
  city?: string;
  postalCode?: string;
  address?: string;
  businessId?: number;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean;
} | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const result: {
    name?: string;
    city?: string;
    postalCode?: string;
    address?: string;
    businessId?: number;
    latitude?: number | null;
    longitude?: number | null;
    phone?: string | null;
    email?: string | null;
    isActive?: boolean;
  } = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) return null;
    result.name = data.name.trim();
  }
  if (data.city !== undefined) {
    if (typeof data.city !== "string" || !data.city.trim()) return null;
    result.city = data.city.trim();
  }
  if (data.postalCode !== undefined) {
    if (typeof data.postalCode !== "string" || !data.postalCode.trim()) return null;
    result.postalCode = data.postalCode.trim();
  }
  if (data.address !== undefined) {
    if (typeof data.address !== "string" || !data.address.trim()) return null;
    result.address = data.address.trim();
  }
  if (data.businessId !== undefined) {
    if (typeof data.businessId !== "number" || !Number.isInteger(data.businessId) || data.businessId <= 0) return null;
    result.businessId = data.businessId;
  }
  if (data.latitude !== undefined) {
    const lat = parseOptionalFloat(data.latitude);
    if (lat === undefined) return null;
    result.latitude = lat;
  }
  if (data.longitude !== undefined) {
    const lng = parseOptionalFloat(data.longitude);
    if (lng === undefined) return null;
    result.longitude = lng;
  }
  if (data.phone !== undefined) {
    result.phone = data.phone === null ? null : typeof data.phone === "string" ? data.phone.trim() : null;
  }
  if (data.email !== undefined) {
    result.email = data.email === null ? null : typeof data.email === "string" ? data.email.trim() : null;
  }
  if (data.isActive !== undefined) {
    if (typeof data.isActive !== "boolean") return null;
    result.isActive = data.isActive;
  }

  if (Object.keys(result).length === 0) {
    return null;
  }

  return result;
}

export async function getLocations(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const rawBusinessId = context.request.query?.business_id;
  let businessId: number | undefined;
  if (rawBusinessId !== undefined) {
    const parsed = parseOptionalInt(rawBusinessId);
    if (!parsed || parsed <= 0) {
      return res.status(400).json(invalidPayloadError);
    }
    businessId = parsed;
  }

  let locations;
  try {
    locations = await listAllLocations(businessId);
  } catch (error) {
    logger.error("Failed to list locations", { error });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(200).json(locations);
}

export async function getLocationsLocationId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const locationId = parseLocationId(context);
  if (locationId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let location;
  try {
    location = await getLocationById(locationId);
  } catch (error) {
    logger.error("Failed to get location", { error, locationId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!location) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(location);
}

export async function getBusinessesBusinessIdLocations(
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

  let locations;
  try {
    locations = await listAllLocations(businessId);
  } catch (error) {
    logger.error("Failed to list locations for business", { error, businessId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(200).json(locations);
}

export async function postLocations(
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

  let location;
  try {
    location = await createLocation(payload);
  } catch (error) {
    logger.error("Failed to create location", { error, payload });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  return res.status(201).json(location);
}

export async function putLocationsLocationId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const locationId = parseLocationId(context);
  if (locationId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  const payload = parseUpdatePayload(req.body);
  if (!payload) {
    return res.status(400).json(invalidPayloadError);
  }

  let location;
  try {
    location = await updateLocation(locationId, payload);
  } catch (error) {
    logger.error("Failed to update location", { error, locationId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!location) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).json(location);
}

export async function deleteLocationsLocationId(
  context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const locationId = parseLocationId(context);
  if (locationId === null) {
    return res.status(400).json(invalidPayloadError);
  }

  let deleted;
  try {
    deleted = await removeLocation(locationId);
  } catch (error) {
    logger.error("Failed to delete location", { error, locationId });
    return res.status(500).json({ error: "SERVER_ERROR", message: "Error intern del servidor" });
  }

  if (!deleted) {
    return res.status(404).json(notFoundError);
  }

  return res.status(200).send();
}
