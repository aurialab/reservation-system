import express from "express";
import type { NextFunction, Request, Response } from "express";
import OpenAPIBackend from "openapi-backend";
import swaggerUi from "swagger-ui-express";

import { handlers } from "./handlers";
import { loadOpenApiSpec } from "./openapi/load-spec";
import { logger } from "./services/logger";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectOperationIds(spec: unknown): Set<string> {
  const operationIds = new Set<string>();
  if (!isRecord(spec) || !isRecord(spec.paths)) {
    return operationIds;
  }

  for (const pathItem of Object.values(spec.paths)) {
    if (!isRecord(pathItem)) {
      continue;
    }

    for (const operation of Object.values(pathItem)) {
      if (isRecord(operation) && typeof operation.operationId === "string") {
        operationIds.add(operation.operationId);
      }
    }
  }

  return operationIds;
}

function filterHandlersForSpec(spec: unknown): typeof handlers {
  const operationIds = collectOperationIds(spec);
  const filtered = {} as typeof handlers;

  for (const [name, handler] of Object.entries(handlers)) {
    if (name === "notFound" || name === "notImplemented" || operationIds.has(name)) {
      filtered[name] = handler;
    }
  }

  return filtered;
}

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const allowedOrigins = new Set(
    (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:4200,http://127.0.0.1:4200")
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
  );

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (typeof origin === "string" && allowedOrigins.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,token");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  });

  const { raw, normalized } = loadOpenApiSpec();
  const api = new OpenAPIBackend({
    definition: normalized as any,
    quick: true,
    handlers: filterHandlersForSpec(normalized)
  });
  const initPromise = api.init();

  app.get("/openapi.json", (_req, res) => {
    res.json(raw);
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(raw as any));

  app.use((req, res, next) => {
    initPromise
      .then(() => api.handleRequest(req as any, req as any, res))
      .catch(next);
  });

  // JSON error handler — must be last, after all routes
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Unhandled error", { error: err });
    res.status(500).json({
      error: "SERVER_ERROR",
      message: "Error intern del servidor"
    });
  });

  return app;
}
