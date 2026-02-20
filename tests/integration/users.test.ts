import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/repositories/user", () => ({
  listUsers: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  updateUserById: vi.fn(),
  deleteUserById: vi.fn()
}));

vi.mock("../../src/openapi/load-spec", () => {
  const buildOpenApiSpec = () => ({
    openapi: "3.0.2",
    info: { title: "Users API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          operationId: "getUsers",
          responses: {
            "200": { description: "ok" }
          }
        }
      },
      "/users/{user_id}": {
        get: {
          operationId: "getUsersUserId",
          responses: {
            "200": { description: "ok" }
          }
        },
        put: {
          operationId: "putUsersUserId",
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
        },
        delete: {
          operationId: "deleteUsersUserId",
          responses: {
            "200": { description: "ok" }
          }
        }
      },
      "/me": {
        get: {
          operationId: "getMe",
          responses: {
            "200": { description: "ok" }
          }
        },
        delete: {
          operationId: "deleteMe",
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
  deleteUserById,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUserById
} from "../../src/repositories/user";

const mockedListUsers = vi.mocked(listUsers);
const mockedFindUserByEmail = vi.mocked(findUserByEmail);
const mockedFindUserById = vi.mocked(findUserById);
const mockedUpdateUserById = vi.mocked(updateUserById);
const mockedDeleteUserById = vi.mocked(deleteUserById);

describe("users endpoints", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    mockedFindUserByEmail.mockResolvedValue(null);
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    vi.clearAllMocks();
  });

  it("GET /users returns an array", async () => {
    const app = createApp();
    mockedListUsers.mockResolvedValue([
      {
        id: 1,
        email: "user@example.com",
        name: "Test",
        surname: "User",
        phone: "+34 600 000 000",
        passwordHash: "hash",
        isVerified: false,
        isBO: false
      }
    ]);

    const token = signToken({ userId: "1", email: "user@example.com" });
    const response = await request(app).get("/users").set("token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 1,
        email: "user@example.com",
        name: "Test",
        surname: "User",
        phone: "+34 600 000 000",
        isVerified: false,
        isBO: false
      }
    ]);
  });

  it("GET /users returns 401 when missing token", async () => {
    const app = createApp();

    const response = await request(app).get("/users");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "AUTH_FAILED",
      message: "Token invalid"
    });
  });

  it("GET /users/:id returns a user", async () => {
    const app = createApp();
    mockedFindUserById.mockResolvedValue({
      id: 2,
      email: "user2@example.com",
      name: "Second",
      surname: "User",
      phone: "+34 611 111 111",
      passwordHash: "hash",
      isVerified: false,
      isBO: false
    });

    const token = signToken({ userId: "2", email: "user2@example.com" });
    const response = await request(app).get("/users/2").set("token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 2,
      email: "user2@example.com",
      name: "Second",
      surname: "User",
      phone: "+34 611 111 111",
      isVerified: false,
      isBO: false
    });
  });

  it("PUT /users/:id returns updated user", async () => {
    const app = createApp();
    mockedFindUserById.mockResolvedValue({
      id: 3,
      email: "user3@example.com",
      name: "Current",
      surname: "User",
      phone: "+34 600 000 003",
      passwordHash: "hash",
      isVerified: false,
      isBO: false
    });
    mockedFindUserByEmail.mockResolvedValue(null);
    mockedUpdateUserById.mockResolvedValue({
      id: 3,
      email: "user3@example.com",
      name: "Updated",
      surname: "User",
      phone: "+34 622 222 222",
      passwordHash: "hash",
      isVerified: false,
      isBO: false
    });

    const token = signToken({ userId: "3", email: "user3@example.com" });
    const response = await request(app)
      .put("/users/3")
      .set("token", token)
      .send({
        id: 3,
        email: "user3@example.com",
        name: "Updated",
        surname: "User",
        phone: "+34 622 222 222"
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 3,
      email: "user3@example.com",
      name: "Updated",
      surname: "User",
      phone: "+34 622 222 222",
      isVerified: false,
      isBO: false
    });
  });

  it("PUT /users/:id returns 409 when email already exists", async () => {
    const app = createApp();
    mockedFindUserById.mockResolvedValue({
      id: 3,
      email: "user3@example.com",
      name: "Current",
      surname: "User",
      phone: "+34 600 000 003",
      passwordHash: "hash",
      isVerified: false,
      isBO: false
    });
    mockedFindUserByEmail.mockResolvedValue({
      id: 10,
      email: "existing@example.com",
      name: "Existing",
      surname: "User",
      phone: "+34 699 999 999",
      passwordHash: "hash",
      isVerified: false,
      isBO: false
    });

    const token = signToken({ userId: "3", email: "user3@example.com" });
    const response = await request(app)
      .put("/users/3")
      .set("token", token)
      .send({
        id: 3,
        email: "existing@example.com",
        name: "Updated",
        surname: "User",
        phone: "+34 622 222 222"
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: "CONFLICT",
      message: "Email already exists."
    });
  });

  it("PUT /users/:id returns 400 when required fields are missing", async () => {
    const app = createApp();

    const token = signToken({ userId: "3", email: "user3@example.com" });
    const response = await request(app)
      .put("/users/3")
      .set("token", token)
      .send({ name: "Updated" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "INVALID_FORMAT",
      message: "Invalid update payload"
    });
  });

  it("PUT /users/:id ignores passwordHash in payload", async () => {
    const app = createApp();
    mockedFindUserById.mockResolvedValue({
      id: 3,
      email: "user3@example.com",
      name: "Current",
      surname: "User",
      phone: "+34 600 000 003",
      passwordHash: "hash",
      isVerified: false,
      isBO: false
    });
    mockedUpdateUserById.mockResolvedValue({
      id: 3,
      email: "user3@example.com",
      name: "Updated",
      surname: "User",
      phone: "+34 622 222 222",
      passwordHash: "hash",
      isVerified: false,
      isBO: false
    });

    const token = signToken({ userId: "3", email: "user3@example.com" });
    await request(app)
      .put("/users/3")
      .set("token", token)
      .send({
        id: 3,
        email: "user3@example.com",
        name: "Updated",
        surname: "User",
        phone: "+34 622 222 222",
        passwordHash: "new-hash"
      });

    expect(mockedUpdateUserById).toHaveBeenCalledWith(3, {
      email: "user3@example.com",
      name: "Updated",
      surname: "User",
      phone: "+34 622 222 222",
      isVerified: false,
      isBO: false
    });
  });

  it("PUT /users/:id returns 400 when body id is missing", async () => {
    const app = createApp();

    const token = signToken({ userId: "3", email: "user3@example.com" });
    const response = await request(app)
      .put("/users/3")
      .set("token", token)
      .send({
        email: "user3@example.com",
        name: "Updated",
        surname: "User",
        phone: "+34 622 222 222"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "INVALID_FORMAT",
      message: "Invalid update payload"
    });
  });

  it("PUT /users/:id returns 400 when body id mismatches path", async () => {
    const app = createApp();

    const token = signToken({ userId: "3", email: "user3@example.com" });
    const response = await request(app)
      .put("/users/3")
      .set("token", token)
      .send({
        id: 4,
        email: "user3@example.com",
        name: "Updated",
        surname: "User",
        phone: "+34 622 222 222"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "INVALID_FORMAT",
      message: "Invalid update payload"
    });
  });

  it("PUT /users/:id returns 400 when required fields are empty", async () => {
    const app = createApp();

    const token = signToken({ userId: "3", email: "user3@example.com" });
    const response = await request(app)
      .put("/users/3")
      .set("token", token)
      .send({
        id: 3,
        email: " ",
        name: "Updated",
        surname: "User",
        phone: "+34 622 222 222"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "INVALID_FORMAT",
      message: "Invalid update payload"
    });
  });

  it("PUT /users/:id returns 404 when user missing even if email conflicts", async () => {
    const app = createApp();
    mockedFindUserById.mockResolvedValue(null);
    mockedFindUserByEmail.mockResolvedValue({
      id: 10,
      email: "existing@example.com",
      name: "Existing",
      surname: "User",
      phone: "+34 699 999 999",
      passwordHash: "hash",
      isVerified: false,
      isBO: false
    });

    const token = signToken({ userId: "3", email: "user3@example.com" });
    const response = await request(app)
      .put("/users/3")
      .set("token", token)
      .send({
        id: 3,
        email: "existing@example.com",
        name: "Updated",
        surname: "User",
        phone: "+34 622 222 222"
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "NOT_FOUND",
      message: "User not found"
    });
    expect(mockedFindUserByEmail).not.toHaveBeenCalled();
  });

  it("DELETE /users/:id returns 200", async () => {
    const app = createApp();
    mockedDeleteUserById.mockResolvedValue(true);

    const token = signToken({ userId: "4", email: "user4@example.com" });
    const response = await request(app)
      .delete("/users/4")
      .set("token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });

  it("GET /me returns user based on token", async () => {
    const app = createApp();
    mockedFindUserById.mockResolvedValue({
      id: 9,
      email: "me@example.com",
      name: "Me",
      surname: "User",
      phone: "+34 633 333 333",
      passwordHash: "hash",
      isVerified: false,
      isBO: false
    });

    const token = signToken({ userId: "9", email: "me@example.com" });
    const response = await request(app).get("/me").set("token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 9,
      email: "me@example.com",
      name: "Me",
      surname: "User",
      phone: "+34 633 333 333",
      isVerified: false,
      isBO: false
    });
    expect(mockedFindUserById).toHaveBeenCalledWith(9);
  });

  it("GET /me returns 401 when user not found", async () => {
    const app = createApp();
    mockedFindUserById.mockResolvedValue(null);

    const token = signToken({ userId: "9", email: "me@example.com" });
    const response = await request(app).get("/me").set("token", token);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "AUTH_FAILED",
      message: "Token invalid"
    });
    expect(mockedFindUserById).toHaveBeenCalledWith(9);
  });

  it("DELETE /me returns 401 when user not found", async () => {
    const app = createApp();
    mockedDeleteUserById.mockResolvedValue(false);

    const token = signToken({ userId: "9", email: "me@example.com" });
    const response = await request(app).delete("/me").set("token", token);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "AUTH_FAILED",
      message: "Token invalid"
    });
    expect(mockedDeleteUserById).toHaveBeenCalledWith(9);
  });

  it("DELETE /me returns 200", async () => {
    const app = createApp();
    mockedDeleteUserById.mockResolvedValue(true);

    const token = signToken({ userId: "9", email: "me@example.com" });
    const response = await request(app).delete("/me").set("token", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
    expect(mockedDeleteUserById).toHaveBeenCalledWith(9);
  });

  it("GET /users/:id returns 400 when id is invalid", async () => {
    const app = createApp();

    const token = signToken({ userId: "1", email: "user@example.com" });
    const response = await request(app)
      .get("/users/not-a-number")
      .set("token", token);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "INVALID_FORMAT",
      message: "Invalid user_id format"
    });
  });

  it("GET /me returns 401 when missing token", async () => {
    const app = createApp();

    const response = await request(app).get("/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "AUTH_FAILED",
      message: "Token invalid"
    });
  });
});
