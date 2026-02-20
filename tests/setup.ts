import { afterEach, vi } from "vitest";

function createPrismaBlocker(path = "prisma"): unknown {
  const fn = vi.fn(() => {
    throw new Error(`Real database access is blocked in tests (${path})`);
  });

  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === "then") {
        return undefined;
      }
      return createPrismaBlocker(`${path}.${String(prop)}`);
    },
    apply() {
      throw new Error(`Real database access is blocked in tests (${path})`);
    }
  });
}

vi.mock("../src/prisma/client", () => ({
  default: createPrismaBlocker()
}));

afterEach(() => {
  vi.clearAllMocks();
});
