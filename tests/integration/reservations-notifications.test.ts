import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/services/reservations", () => ({
  createReservation: vi.fn(),
  getReservationById: vi.fn(),
  listAllReservations: vi.fn(),
  removeReservation: vi.fn(),
  updateReservation: vi.fn()
}));

vi.mock("../../src/services/notifications", () => ({
  sendNotifications: vi.fn()
}));

vi.mock("../../src/services/users", () => ({
  getUserById: vi.fn()
}));

vi.mock("../../src/services/email", () => ({
  sendReservationCreatedEmail: vi.fn(),
  sendReservationCancelledEmail: vi.fn()
}));

vi.mock("../../src/openapi/load-spec", () => {
  const buildOpenApiSpec = () => ({
    openapi: "3.0.2",
    info: { title: "Reservations API", version: "1.0.0" },
    paths: {
      "/reservations": {
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
            "200": { description: "ok" },
            "403": { description: "forbidden" }
          }
        }
      },
      "/me/reservations": {
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
      },
      "/reservations/{reservation_id}": {
        put: {
          operationId: "putReservationsReservationId",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { type: "object" }
              }
            }
          },
          parameters: [
            {
              in: "path",
              name: "reservation_id",
              required: true,
              schema: { type: "string" }
            }
          ],
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
  getReservationById,
  updateReservation
} from "../../src/services/reservations";
import { sendNotifications } from "../../src/services/notifications";
import { getUserById } from "../../src/services/users";
import {
  sendReservationCancelledEmail,
  sendReservationCreatedEmail
} from "../../src/services/email";

const mockedCreateReservation = vi.mocked(createReservation);
const mockedGetReservationById = vi.mocked(getReservationById);
const mockedUpdateReservation = vi.mocked(updateReservation);
const mockedSendNotifications = vi.mocked(sendNotifications);
const mockedGetUserById = vi.mocked(getUserById);
const mockedSendReservationCreatedEmail = vi.mocked(sendReservationCreatedEmail);
const mockedSendReservationCancelledEmail = vi.mocked(sendReservationCancelledEmail);

const mockSession = {
  id: 2,
  startTime: "12:00",
  endTime: "15:00",
  activity: { id: 1, name: "Yoga", description: null },
  instructor: { id: 1, name: "Joan", email: "joan@example.com", phone: "600111222" }
};

describe("reservations notifications and security", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    mockedGetUserById.mockResolvedValue({
      id: 42,
      email: "user@example.com",
      name: "User",
      surname: "Test",
      phone: "600000000",
      isVerified: true,
      isBO: false
    });
    mockedSendReservationCreatedEmail.mockResolvedValue({ ok: true });
    mockedSendReservationCancelledEmail.mockResolvedValue({ ok: true });
    mockedSendNotifications.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    vi.clearAllMocks();
  });

  it("POST /me/reservations ignores body userId and uses token userId", async () => {
    const app = createApp();
    mockedCreateReservation.mockResolvedValue({
      id: 10,
      userId: 7,
      sessionId: 2,
      occurrenceDate: "2026-02-15",
      session: mockSession,
      observations: "obs",
      state: { status: "PENDING" }
    });

    const token = signToken({ userId: "7", email: "me@example.com" });
    const response = await request(app)
      .post("/me/reservations")
      .set("token", token)
      .send({
        userId: 999,
        sessionId: 2,
        occurrenceDate: "2026-02-15",
        observations: "obs"
      });

    expect(response.status).toBe(200);
    expect(mockedCreateReservation).toHaveBeenCalledWith({
      userId: 7,
      sessionId: 2,
      occurrenceDate: "2026-02-15",
      observations: "obs"
    });
    expect(mockedSendNotifications).toHaveBeenCalledWith({
      text: "La teva reserva per a Yoga el 2026-02-15 s'ha creat correctament.",
      users: [7]
    });
    expect(mockedSendReservationCreatedEmail).toHaveBeenCalledWith(
      "user@example.com",
      "2026-02-15",
      "Yoga",
      "obs"
    );
  });

  it("POST /reservations denies creating reservations for another user when requester is not BO", async () => {
    const app = createApp();

    const token = signToken({ userId: "7", email: "me@example.com" });
    const response = await request(app)
      .post("/reservations")
      .set("token", token)
      .send({
        userId: 8,
        sessionId: 2,
        observations: "obs"
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "FORBIDDEN",
      message: "No tens permisos de Back-Office"
    });
    expect(mockedCreateReservation).not.toHaveBeenCalled();
  });

  it("PUT /reservations/:id cancelled creates notification and sends cancellation email", async () => {
    const app = createApp();
    const reservationSession = {
      id: 3,
      startTime: "15:00",
      endTime: "18:00",
      activity: { id: 2, name: "Pilates", description: null },
      instructor: { id: 2, name: "Maria", email: "maria@example.com", phone: "600222333" }
    };
    mockedGetReservationById.mockResolvedValue({
      id: 9,
      userId: 8,
      sessionId: 3,
      occurrenceDate: "2026-02-16",
      session: reservationSession,
      observations: undefined,
      state: { status: "APPROVED" }
    });
    mockedUpdateReservation.mockResolvedValue({
      id: 9,
      userId: 8,
      sessionId: 3,
      occurrenceDate: "2026-02-16",
      session: reservationSession,
      observations: undefined,
      state: { status: "CANCELLED" }
    });

    const token = signToken({ userId: "1", email: "bo@example.com" });
    const response = await request(app)
      .put("/reservations/9")
      .set("token", token)
      .send({ status: "CANCELLED" });

    expect(response.status).toBe(200);
    expect(mockedSendNotifications).toHaveBeenCalledWith({
      text: "La teva reserva per a Pilates el 2026-02-16 ha estat cancel.lada pel Back Office.",
      users: [8]
    });
    expect(mockedSendReservationCancelledEmail).toHaveBeenCalledWith(
      "user@example.com",
      "2026-02-16",
      "Pilates",
      "MANUAL_CANCELLATION"
    );
  });
});
