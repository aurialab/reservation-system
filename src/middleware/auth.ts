import { type NextFunction, type Request, type Response } from "express";

import { type AuthPayload, verifyToken } from "../auth/jwt";

export const AUTH_ERROR_RESPONSE = {
  error: "AUTH_FAILED",
  message: "Token invalid"
};

export function getAuthPayload(
  headerValue: unknown
): AuthPayload | null {
  const token = typeof headerValue === "string" ? headerValue : undefined;

  if (!token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const payload = getAuthPayload(req.headers.token);
  if (!payload) {
    return res.status(401).json(AUTH_ERROR_RESPONSE);
  }

  req.user = payload;
  return next();
}
