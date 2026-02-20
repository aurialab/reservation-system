import jwt from "jsonwebtoken";

export type AuthPayload = {
  userId: string;
  email: string;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret());
}

export function verifyToken(token: string): AuthPayload {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  const { userId, email } = decoded as Record<string, unknown>;
  if (typeof userId !== "string" || typeof email !== "string") {
    throw new Error("Invalid token payload");
  }

  return { userId, email };
}
