type UnknownRecord = Record<string, unknown>;

const headerTokenNames = new Set([
  "token",
  "validtoken",
  "authorization"
]);
const httpMethods = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
  "trace"
];

export function normalizeOpenApiSpec(spec: unknown): unknown {
  if (spec === null || spec === undefined) {
    return spec;
  }

  const clone = deepClone(spec);

  if (!isRecord(clone)) {
    return clone;
  }

  const paths = clone.paths;
  if (!isRecord(paths)) {
    return clone;
  }

  for (const pathKey of Object.keys(paths)) {
    const pathItem = paths[pathKey];
    if (!isRecord(pathItem)) {
      continue;
    }

    normalizeParameters(pathItem.parameters);

    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!isRecord(operation)) {
        continue;
      }

      normalizeParameters(operation.parameters);

      if (!operation.operationId) {
        operation.operationId = buildOperationId(method, pathKey);
      }
    }
  }

  const components = clone.components;
  if (isRecord(components)) {
    const parameters = components.parameters;
    if (isRecord(parameters)) {
      for (const parameterKey of Object.keys(parameters)) {
        normalizeParameterEntry(parameters[parameterKey]);
      }
    }
  }

  return clone;
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON cloning for non-cloneable values.
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function normalizeParameters(parameters: unknown): void {
  if (!Array.isArray(parameters)) {
    return;
  }

  for (const parameter of parameters) {
    normalizeParameterEntry(parameter);
  }
}

function normalizeParameterEntry(parameter: unknown): void {
  if (!isRecord(parameter)) {
    return;
  }

  if (parameter.in === "header" && typeof parameter.name === "string") {
    const normalizedName = parameter.name.toLowerCase();
    if (headerTokenNames.has(normalizedName)) {
      parameter.name = "token";
    }
  }
}

function buildOperationId(method: string, path: string): string {
  const words: string[] = [];
  const segments = path.split("/").filter(Boolean);

  for (const segment of segments) {
    const cleaned = segment.replace(/[{}]/g, "");
    const normalized = cleaned.replace(/[^a-zA-Z0-9]+/g, " ").trim();
    if (!normalized) {
      continue;
    }
    const parts = normalized.split(" ");
    for (const part of parts) {
      if (part) {
        words.push(part);
      }
    }
  }

  const pascal = words.map(capitalizeWord).join("");
  return `${method.toLowerCase()}${pascal}`;
}

function capitalizeWord(word: string): string {
  if (!word) {
    return "";
  }
  return word[0].toUpperCase() + word.slice(1);
}
