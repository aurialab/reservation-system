import { readFileSync } from "node:fs";

import { normalizeOpenApiSpec } from "./normalize";

export function loadOpenApiSpec(filePath = "openapi/openapi.json") {
  const fileContents = readFileSync(filePath, "utf-8");
  const raw = JSON.parse(fileContents) as unknown;
  const normalized = normalizeOpenApiSpec(raw);

  return { raw, normalized };
}
