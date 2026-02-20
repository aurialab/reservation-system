import type { Request, Response } from "express";
import type { Context } from "openapi-backend";

import {
  AUTH_ERROR_RESPONSE,
  getAuthPayload
} from "../middleware/auth";
import { listLayers as listLayersService } from "../services/layers";

function requireAuth(req: Request, res: Response) {
  const payload = getAuthPayload(req.headers.token);
  if (!payload) {
    res.status(401).json(AUTH_ERROR_RESPONSE);
    return null;
  }

  return payload;
}

export async function getLayers(
  _context: Context,
  req: Request,
  res: Response
) {
  if (!requireAuth(req, res)) {
    return;
  }

  const layers = await listLayersService();
  return res.status(200).json(layers);
}
