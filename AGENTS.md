# AGENTS.md

## Project DNA
- API backend for Reservation System.
- Stack: Node.js + TypeScript + Express + OpenAPI Backend + Prisma + PostgreSQL.
- Auth model: JWT in `token` header (custom header, not Bearer auth middleware).
- Build and run:
  - `npm run build`
  - `npm run dev`
  - `npm start`

## Architecture Blueprint
- `src/app.ts`: Express app bootstrap, OpenAPI wiring, docs endpoint.
- `src/server.ts`: process entrypoint and scheduler startup.
- `src/handlers/*`: HTTP layer (validation, auth gate, HTTP status mapping).
- `src/services/*`: business logic orchestration.
- `src/repositories/*`: data access (Prisma).
- `src/openapi/*`: spec loading and normalization.
- `openapi/openapi.json`: contract source of truth.
- `tests/*`: endpoint/service tests using Vitest + Supertest.

## Golden Rules
- Keep handler/service/repository separation strict.
- On `/me/*` endpoints, user identity is implicit from JWT payload.
  - Never trust `userId` from request body/query for `/me/*`.
- Preserve OpenAPI contract alignment with runtime behavior.
  - Any request/response shape change must update `openapi/openapi.json`.
- Use structured logging via `src/services/logger.ts`.
  - Avoid `console.log`/`console.error` in runtime code.
- Prefer fail-safe behavior for side effects:
  - Core action succeeds/fails independently from notification/email side effects.
  - Side-effect failures must be logged with context.

## Testing Strategy (Mandatory)
- Default testing mode is isolated: no real DB/network side effects.
- `tests/setup.ts` blocks direct Prisma access during tests.
  - If a test hits real Prisma, it should fail immediately.
- For endpoint tests:
  - Use `createApp()` + Supertest.
  - Mock repository/service dependencies explicitly.
- For outbound HTTP integration logic:
  - Use MSW (`msw/node`) to mock external APIs.
  - Never depend on live third-party endpoints in CI.
- Test naming:
  - Behavior-first, include endpoint and expected outcome.
  - Cover happy path + auth + validation + critical failure path.

## Definition Of Done For Backend Changes
- `npm run build` passes.
- Relevant Vitest suites pass.
- OpenAPI updated when contract changes.
- Security invariants maintained:
  - No cross-user access via spoofed `userId`.
  - Auth checks present where needed.
- Logging and error responses remain consistent.

## Collaboration Protocol For Future Agents
- Before implementing, inspect affected handler + service + repository together.
- Prefer minimal, targeted changes over broad refactors.
- If touching endpoint behavior, update tests in the same change.
- If touching notification/email flows, verify both channels:
  - notification persistence path
  - email dispatch path
- Report:
  - changed files,
  - verification commands run,
  - any residual risk or follow-up.

## Current Notes / Tech Debt
- Many tests mock reduced OpenAPI specs and can emit noisy `Unknown operationId` warnings if handler/spec drift appears; keep mocked specs aligned with targeted handlers.
- Consider introducing role middleware (e.g., BO-only guard) to avoid repeating role checks in handlers.
