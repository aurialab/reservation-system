import "express";

import type { AuthPayload } from "../auth/jwt";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthPayload;
  }
}
