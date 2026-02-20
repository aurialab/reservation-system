import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app";

describe("createApp", () => {
  it("returns NOT_FOUND for unknown routes", async () => {
    const app = createApp();

    const response = await request(app).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "NOT_FOUND",
      message: "Route not found"
    });
  });
});
