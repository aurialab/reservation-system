import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { signToken } from "../../src/auth/jwt";
import { requireAuth } from "../../src/middleware/auth";

describe("auth middleware", () => {
  const secret = "test-secret";

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it("signToken signs payload with JWT_SECRET", () => {
    const token = signToken({ userId: "user-1", email: "user@example.com" });
    const decoded = jwt.verify(token, secret);

    expect(typeof decoded).toBe("object");
    if (typeof decoded === "object" && decoded !== null) {
      expect(decoded).toMatchObject({
        userId: "user-1",
        email: "user@example.com"
      });
    }
  });

  it("requireAuth attaches user and allows access", async () => {
    const app = express();
    app.get("/protected", requireAuth, (req, res) => {
      res.status(200).json({ user: req.user });
    });

    const token = signToken({ userId: "user-2", email: "a@b.com" });
    const response = await request(app)
      .get("/protected")
      .set("token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: { userId: "user-2", email: "a@b.com" }
    });
  });

  it("requireAuth returns 401 on missing token", async () => {
    const app = express();
    app.get("/protected", requireAuth, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "AUTH_FAILED",
      message: "Token invalid"
    });
  });

  it("requireAuth returns 401 on invalid token", async () => {
    const app = express();
    app.get("/protected", requireAuth, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const response = await request(app)
      .get("/protected")
      .set("token", "bad-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "AUTH_FAILED",
      message: "Token invalid"
    });
  });
});
