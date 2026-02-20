import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadOpenApiSpec } from "../../src/openapi/load-spec";
import { normalizeOpenApiSpec } from "../../src/openapi/normalize";

describe("normalizeOpenApiSpec", () => {
  it("adds operationIds and does not mutate input", () => {
    const input = {
      openapi: "3.0.0",
      paths: {
        "/auth/login": {
          post: {
            responses: {}
          }
        },
        "/users/{user_id}": {
          get: {
            responses: {}
          }
        }
      }
    };

    const original = JSON.parse(JSON.stringify(input));
    const normalized = normalizeOpenApiSpec(input);

    expect(normalized).not.toBe(input);
    expect(input).toEqual(original);
    expect(normalized.paths["/auth/login"].post.operationId).toBe(
      "postAuthLogin"
    );
    expect(normalized.paths["/users/{user_id}"].get.operationId).toBe(
      "getUsersUserId"
    );
  });

  it("preserves existing operationId and normalizes header tokens", () => {
    const input = {
      openapi: "3.0.0",
      paths: {
        "/me": {
          parameters: [
            {
              name: "Authorization",
              in: "header",
              schema: { type: "string" }
            }
          ],
          get: {
            operationId: "getMe",
            parameters: [
              {
                name: "Token",
                in: "header",
                schema: { type: "string" }
              },
              {
                name: "ValidToken",
                in: "header",
                schema: { type: "string" }
              }
            ],
            responses: {}
          }
        }
      }
    };

    const normalized = normalizeOpenApiSpec(input);

    expect(normalized.paths["/me"].get.operationId).toBe("getMe");
    expect(normalized.paths["/me"].parameters[0].name).toBe("token");
    expect(normalized.paths["/me"].get.parameters[0].name).toBe("token");
    expect(normalized.paths["/me"].get.parameters[1].name).toBe("token");
    expect(input.paths["/me"].parameters[0].name).toBe("Authorization");
    expect(input.paths["/me"].get.parameters[0].name).toBe("Token");
  });

  it("normalizes header names case-insensitively", () => {
    const input = {
      openapi: "3.0.0",
      paths: {
        "/session": {
          get: {
            parameters: [
              {
                name: "authorization",
                in: "header",
                schema: { type: "string" }
              },
              {
                name: "TOKEN",
                in: "header",
                schema: { type: "string" }
              }
            ],
            responses: {}
          }
        }
      }
    };

    const normalized = normalizeOpenApiSpec(input);

    expect(normalized.paths["/session"].get.parameters[0].name).toBe("token");
    expect(normalized.paths["/session"].get.parameters[1].name).toBe("token");
    expect(input.paths["/session"].get.parameters[0].name).toBe(
      "authorization"
    );
    expect(input.paths["/session"].get.parameters[1].name).toBe("TOKEN");
  });

  it("normalizes header names in components.parameters", () => {
    const input = {
      openapi: "3.0.0",
      components: {
        parameters: {
          AuthHeader: {
            name: "Authorization",
            in: "header",
            schema: { type: "string" }
          },
          TokenHeader: {
            name: "TOKEN",
            in: "header",
            schema: { type: "string" }
          }
        }
      },
      paths: {
        "/me": {
          get: {
            responses: {}
          }
        }
      }
    };

    const normalized = normalizeOpenApiSpec(input);

    expect(
      normalized.components.parameters.AuthHeader.name
    ).toBe("token");
    expect(
      normalized.components.parameters.TokenHeader.name
    ).toBe("token");
    expect(input.components.parameters.AuthHeader.name).toBe("Authorization");
    expect(input.components.parameters.TokenHeader.name).toBe("TOKEN");
  });
});

describe("loadOpenApiSpec", () => {
  it("loads raw spec and returns normalized copy", () => {
    const specPath = join("openapi", "openapi.json");
    const fileContents = readFileSync(specPath, "utf-8");
    const diskSpec = JSON.parse(fileContents);

    const result = loadOpenApiSpec();

    expect(result.raw).toEqual(diskSpec);
    expect(result.normalized).not.toBe(result.raw);
    expect(result.normalized.paths["/auth/login"].post.operationId).toBe(
      "postAuthLogin"
    );
    expect(result.raw.paths["/me"].get.parameters[0].name).toBe("token");
    expect(result.normalized.paths["/me"].get.parameters[0].name).toBe(
      "token"
    );
  });
});
