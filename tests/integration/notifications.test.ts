import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/repositories/notifications", () => ({
  listNotifications: vi.fn(),
  createNotifications: vi.fn(),
  listNotificationsByUser: vi.fn(),
  savePushToken: vi.fn()
}));

vi.mock("../../src/openapi/load-spec", () => {
  const buildOpenApiSpec = () => ({
    openapi: "3.0.2",
    info: { title: "Notifications API", version: "1.0.0" },
    paths: {
      "/notifications": {
        get: {
          operationId: "getNotifications",
          responses: {
            "200": { description: "ok" },
            "404": { description: "not found" }
          }
        },
        post: {
          operationId: "postNotifications",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          },
          responses: {
            "200": { description: "ok" }
          }
        }
      },
      "/me/notifications": {
        get: {
          operationId: "getMeNotifications",
          responses: {
            "200": { description: "ok" }
          }
        }
      },
      "/me/notifications/token": {
        post: {
          operationId: "postMeNotificationsToken",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          },
          responses: {
            "200": { description: "ok" }
          }
        }
      }
    }
  });

  return {
    loadOpenApiSpec: () => {
      const openApiSpec = buildOpenApiSpec();
      return { raw: openApiSpec, normalized: structuredClone(openApiSpec) };
    }
  };
});

import { signToken } from "../../src/auth/jwt";
import { createApp } from "../../src/app";
import {
  createNotifications,
  listNotifications,
  listNotificationsByUser,
  savePushToken
} from "../../src/repositories/notifications";

const mockedListNotifications = vi.mocked(listNotifications);
const mockedCreateNotifications = vi.mocked(createNotifications);
const mockedListNotificationsByUser = vi.mocked(listNotificationsByUser);
const mockedSavePushToken = vi.mocked(savePushToken);

describe("notifications endpoints", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    vi.clearAllMocks();
  });

  it("GET /notifications returns a single notification", async () => {
    const app = createApp();
    const createdAt = new Date("2026-01-01T08:00:00.000Z");
    mockedListNotifications.mockResolvedValue([
      {
        id: 1,
        userId: 2,
        text: "Hello",
        createdAt
      }
    ]);

    const token = signToken({ userId: "1", email: "user@example.com" });
    const response = await request(app)
      .get("/notifications")
      .set("token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      created: createdAt.toISOString(),
      text: "Hello"
    });
  });

  it("GET /notifications returns 404 when no notifications", async () => {
    const app = createApp();
    mockedListNotifications.mockResolvedValue([]);

    const token = signToken({ userId: "1", email: "user@example.com" });
    const response = await request(app)
      .get("/notifications")
      .set("token", token);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "NOT_FOUND",
      message: "Notifications not found"
    });
  });

  it("POST /notifications returns 200 and creates notifications", async () => {
    const app = createApp();
    mockedCreateNotifications.mockResolvedValue(undefined);

    const token = signToken({ userId: "1", email: "user@example.com" });
    const response = await request(app)
      .post("/notifications")
      .set("token", token)
      .send({ text: "Update", users: [1, 2] });

    expect(response.status).toBe(200);
    expect(response.text).toBe("");
    expect(mockedCreateNotifications).toHaveBeenCalledWith({
      text: "Update",
      users: [1, 2]
    });
  });

  it("POST /notifications returns 400 when users array is empty", async () => {
    const app = createApp();

    const token = signToken({ userId: "1", email: "user@example.com" });
    const response = await request(app)
      .post("/notifications")
      .set("token", token)
      .send({ text: "Update", users: [] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "INVALID_FORMAT",
      message: "Invalid payload"
    });
    expect(mockedCreateNotifications).not.toHaveBeenCalled();
  });

  it("GET /me/notifications returns array for token user", async () => {
    const app = createApp();
    const createdAt = new Date("2026-01-02T10:15:00.000Z");
    mockedListNotificationsByUser.mockResolvedValue([
      {
        id: 5,
        userId: 9,
        text: "Personal",
        createdAt
      }
    ]);

    const token = signToken({ userId: "9", email: "me@example.com" });
    const response = await request(app)
      .get("/me/notifications")
      .set("token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { created: createdAt.toISOString(), text: "Personal" }
    ]);
    expect(mockedListNotificationsByUser).toHaveBeenCalledWith(9);
  });

  it("POST /me/notifications/token saves token", async () => {
    const app = createApp();
    mockedSavePushToken.mockResolvedValue(undefined);

    const token = signToken({ userId: "7", email: "user7@example.com" });
    const response = await request(app)
      .post("/me/notifications/token")
      .set("token", token)
      .send({ token: "firebase-token" });

    expect(response.status).toBe(200);
    expect(response.text).toBe("");
    expect(mockedSavePushToken).toHaveBeenCalledWith(7, "firebase-token");
  });

  it("GET /notifications returns 401 when missing token", async () => {
    const app = createApp();

    const response = await request(app).get("/notifications");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "AUTH_FAILED",
      message: "Token invalid"
    });
  });
});
