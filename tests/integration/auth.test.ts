import bcrypt from "bcrypt";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/repositories/user", () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn()
}));

vi.mock("../../src/repositories/email-verification", () => ({
  createEmailVerificationToken: vi.fn(),
  hasValidVerificationToken: vi.fn(),
  invalidateUserEmailTokens: vi.fn(),
  markEmailTokenAsUsed: vi.fn(),
  validateEmailVerificationToken: vi.fn(),
  verifyUserEmail: vi.fn()
}));

vi.mock("../../src/repositories/password-reset", () => ({
  createPasswordResetToken: vi.fn(),
  invalidateUserTokens: vi.fn(),
  markTokenAsUsed: vi.fn(),
  validatePasswordResetToken: vi.fn()
}));

vi.mock("../../src/openapi/load-spec", () => {
  const buildOpenApiSpec = () => ({
    openapi: "3.0.2",
    info: { title: "Auth API", version: "1.0.0" },
    paths: {
      "/auth/register": {
        post: {
          operationId: "postAuthRegister",
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
      "/auth/login": {
        post: {
          operationId: "postAuthLogin",
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
      "/auth/password-reset": {
        post: {
          operationId: "postAuthPasswordReset",
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

import { createApp } from "../../src/app";
import { createUser, findUserByEmail } from "../../src/repositories/user";
import { createEmailVerificationToken, invalidateUserEmailTokens } from "../../src/repositories/email-verification";
import { createPasswordResetToken } from "../../src/repositories/password-reset";

const mockedFindUserByEmail = vi.mocked(findUserByEmail);
const mockedCreateUser = vi.mocked(createUser);
const mockedCreateEmailVerificationToken = vi.mocked(createEmailVerificationToken);
const mockedInvalidateUserEmailTokens = vi.mocked(invalidateUserEmailTokens);
const mockedCreatePasswordResetToken = vi.mocked(createPasswordResetToken);

describe("auth endpoints", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    mockedCreateEmailVerificationToken.mockResolvedValue("mock-verification-token");
    mockedInvalidateUserEmailTokens.mockResolvedValue(undefined);
    mockedCreatePasswordResetToken.mockResolvedValue("mock-reset-token");
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    vi.clearAllMocks();
  });

  it("register returns 200 with User schema", async () => {
    const app = createApp();
    const passwordHash = await bcrypt.hash("pass1234", 8);
    mockedFindUserByEmail.mockResolvedValue(null);
    mockedCreateUser.mockResolvedValue({
      id: 1,
      email: "user@example.com",
      name: "Test",
      surname: "User",
      phone: "+34 600 000 000",
      passwordHash,
      isVerified: false
    });

    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "user@example.com",
        name: "Test",
        surname: "User",
        phone: "+34 600 000 000",
        password: "pass1234"
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: 1,
        email: "user@example.com",
        name: "Test",
        surname: "User",
        phone: "+34 600 000 000",
        isVerified: false
      },
      verificationEmailSent: false
    });
  });

  it("register returns 400 when email exists", async () => {
    const app = createApp();
    mockedFindUserByEmail.mockResolvedValue({
      id: 2,
      email: "user@example.com",
      name: "Existing",
      surname: "User",
      phone: "+34 611 111 111",
      passwordHash: "hash",
      isVerified: true
    });

    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "user@example.com",
        name: "Test",
        surname: "User",
        phone: "+34 600 000 000",
        password: "pass1234"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "INVALID_INPUT",
      message: "Email already exists."
    });
  });

  it("login returns 200 with Authorization and user", async () => {
    const app = createApp();
    const passwordHash = await bcrypt.hash("pass1234", 8);
    mockedFindUserByEmail.mockResolvedValue({
      id: 3,
      email: "user@example.com",
      name: "Login",
      surname: "User",
      phone: "+34 622 222 222",
      passwordHash,
      isVerified: true
    });

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "user@example.com", password: "pass1234" });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      Authorization: expect.any(String),
      user: {
        id: 3,
        email: "user@example.com",
        name: "Login",
        surname: "User",
        phone: "+34 622 222 222"
      }
    });
  });

  it("login returns 401 on invalid credentials", async () => {
    const app = createApp();
    const passwordHash = await bcrypt.hash("pass1234", 8);
    mockedFindUserByEmail.mockResolvedValue({
      id: 4,
      email: "user@example.com",
      name: "Invalid",
      surname: "User",
      phone: "+34 633 333 333",
      passwordHash,
      isVerified: true
    });

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "user@example.com", password: "wrong" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "AUTH_FAILED",
      message: "Credencials invàlides."
    });
  });

  it("password-reset returns 200 with message", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/auth/password-reset")
      .send({ email: "user@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: expect.any(String)
    });
  });

  it("login returns 403 when email not verified", async () => {
    const app = createApp();
    const passwordHash = await bcrypt.hash("pass1234", 8);
    mockedFindUserByEmail.mockResolvedValue({
      id: 5,
      email: "user@example.com",
      name: "Unverified",
      surname: "User",
      phone: "+34 644 444 444",
      passwordHash,
      isVerified: false
    });

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "user@example.com", password: "pass1234" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "EMAIL_NOT_VERIFIED",
      message: "El correu electrònic no ha estat verificat. Revisa la teva bústia."
    });
  });
});
