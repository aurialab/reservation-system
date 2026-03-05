import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/repositories/reservations", () => ({
  listReservations: vi.fn(),
  createReservation: vi.fn(),
  findReservationById: vi.fn(),
  deleteReservationById: vi.fn()
}));

vi.mock("../../src/services/notifications", () => ({
  sendNotifications: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../../src/services/users", () => ({
  getUserById: vi.fn().mockResolvedValue({
    id: 3,
    email: "user@example.com",
    name: "Name",
    surname: "Surname",
    phone: "600000000",
    isVerified: true,
    isBO: false
  })
}));

vi.mock("../../src/services/email", () => ({
  sendReservationCreatedEmail: vi.fn().mockResolvedValue({ ok: true }),
  sendReservationCancelledEmail: vi.fn().mockResolvedValue({ ok: true })
}));

vi.mock("../../src/openapi/load-spec", () => {
  const buildOpenApiSpec = () => ({
    openapi: "3.0.2",
    info: { title: "Reservations API", version: "1.0.0" },
    paths: {
      "/reservations": {
        get: {
          operationId: "getReservations",
          responses: {
            "200": { description: "ok" }
          }
        },
        post: {
          operationId: "postReservations",
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
      "/reservations/{reservation_id}": {
        get: {
          operationId: "getReservationsReservationId",
          responses: {
            "200": { description: "ok" }
          }
        },
        put: {
          operationId: "putReservationsReservationId",
          responses: {
            "200": { description: "ok" }
          }
        },
        delete: {
          operationId: "deleteReservationsReservationId",
          responses: {
            "200": { description: "ok" }
          }
        }
      },
      "/me/reservations": {
        get: {
          operationId: "getMeReservations",
          responses: {
            "200": { description: "ok" }
          }
        },
        post: {
          operationId: "postMeReservations",
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
  createReservation,
  deleteReservationById,
  findReservationById,
  listReservations
} from "../../src/repositories/reservations";

const mockedListReservations = vi.mocked(listReservations);
const mockedCreateReservation = vi.mocked(createReservation);
const mockedFindReservationById = vi.mocked(findReservationById);
const mockedDeleteReservationById = vi.mocked(deleteReservationById);

const mockSession = {
  id: 5,
  startTime: "09:00",
  endTime: "11:00",
  activity: { id: 1, name: "Yoga", description: null },
  instructor: { id: 1, name: "Joan", email: "joan@example.com", phone: "600111222" }
};

const expectedSession = {
  id: 5,
  startTime: "09:00",
  endTime: "11:00",
  activity: { id: 1, name: "Yoga", description: null },
  instructor: { id: 1, name: "Joan", email: "joan@example.com", phone: "600111222" }
};

describe("reservations endpoints", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    vi.clearAllMocks();
  });

  it("GET /reservations returns an array", async () => {
    const app = createApp();
    mockedListReservations.mockResolvedValue([
      {
        id: 1,
        userId: 2,
        sessionId: 5,
        occurrenceDate: null,
        session: mockSession,
        observations: "Note",
        state: "APPROVED"
      }
    ]);

    const token = signToken({ userId: "1", email: "user@example.com" });
    const response = await request(app).get("/reservations").set("token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 1,
        userId: 2,
        sessionId: 5,
        session: expectedSession,
        observations: "Note",
        state: { status: "APPROVED" }
      }
    ]);
  });

  it("GET /reservations passes user_id filter to repo", async () => {
    const app = createApp();
    mockedListReservations.mockResolvedValue([]);

    const token = signToken({ userId: "1", email: "user@example.com" });
    const response = await request(app)
      .get("/reservations?user_id=5")
      .set("token", token);

    expect(response.status).toBe(200);
    expect(mockedListReservations).toHaveBeenCalledWith({ userId: 5 });
  });

  it("POST /reservations returns a reservation", async () => {
    const app = createApp();
    mockedCreateReservation.mockResolvedValue({
      id: 4,
      userId: 3,
      sessionId: 5,
      occurrenceDate: null,
      session: mockSession,
      observations: "Testing",
      state: "PENDING"
    });

    const token = signToken({ userId: "3", email: "user3@example.com" });
    const response = await request(app)
      .post("/reservations")
      .set("token", token)
      .send({ userId: 3, sessionId: 5, observations: "Testing" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 4,
      userId: 3,
      sessionId: 5,
      session: expectedSession,
      observations: "Testing",
      state: { status: "PENDING" }
    });
    expect(mockedCreateReservation).toHaveBeenCalledWith({
      userId: 3,
      sessionId: 5,
      occurrenceDate: null,
      observations: "Testing"
    });
  });

  it("GET /reservations/:id returns a reservation", async () => {
    const app = createApp();
    mockedFindReservationById.mockResolvedValue({
      id: 7,
      userId: 4,
      sessionId: 5,
      occurrenceDate: null,
      session: mockSession,
      observations: null,
      state: "APPROVED"
    });

    const token = signToken({ userId: "4", email: "user4@example.com" });
    const response = await request(app)
      .get("/reservations/7")
      .set("token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 7,
      userId: 4,
      sessionId: 5,
      session: expectedSession,
      state: { status: "APPROVED" }
    });
  });

  it("DELETE /reservations/:id returns 200 with empty body", async () => {
    const app = createApp();
    mockedFindReservationById.mockResolvedValue({
      id: 9,
      userId: 5,
      sessionId: 5,
      occurrenceDate: null,
      session: mockSession,
      observations: null,
      state: "APPROVED"
    });
    mockedDeleteReservationById.mockResolvedValue(true);

    const token = signToken({ userId: "5", email: "user5@example.com" });
    const response = await request(app)
      .delete("/reservations/9")
      .set("token", token);

    expect(response.status).toBe(200);
    expect(response.text).toBe("");
  });

  it("GET /me/reservations returns array for token user", async () => {
    const app = createApp();
    mockedListReservations.mockResolvedValue([
      {
        id: 10,
        userId: 9,
        sessionId: 5,
        occurrenceDate: null,
        session: mockSession,
        observations: "Personal",
        state: "PENDING"
      }
    ]);

    const token = signToken({ userId: "9", email: "me@example.com" });
    const response = await request(app)
      .get("/me/reservations")
      .set("token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 10,
        userId: 9,
        sessionId: 5,
        session: expectedSession,
        observations: "Personal",
        state: { status: "PENDING" }
      }
    ]);
    expect(mockedListReservations).toHaveBeenCalledWith({ userId: 9 });
  });

  it("POST /me/reservations returns reservation payload", async () => {
    const app = createApp();
    mockedCreateReservation.mockResolvedValue({
      id: 12,
      userId: 6,
      sessionId: 5,
      occurrenceDate: null,
      session: mockSession,
      observations: "",
      state: "PENDING"
    });

    const token = signToken({ userId: "6", email: "user6@example.com" });
    const response = await request(app)
      .post("/me/reservations")
      .set("token", token)
      .send({ sessionId: 5 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 12,
      userId: 6,
      sessionId: 5,
      session: expectedSession,
      observations: "",
      state: { status: "PENDING" }
    });
  });

  it("GET /reservations returns 401 when missing token", async () => {
    const app = createApp();

    const response = await request(app).get("/reservations");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "AUTH_FAILED",
      message: "Token invalid"
    });
  });
});
