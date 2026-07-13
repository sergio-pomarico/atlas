# Atlas API

The API lives in `apps/api` and uses Express with ESM TypeScript. Before changing its structure, endpoints, tests, or database, consult the relevant guide in [`docs/backend`](../../docs/backend/).

## Implementation

- Preserve the existing flow and modular architecture; for structural changes, see [architecture.md](../../docs/backend/architecture.md).
- To add or modify endpoints, follow [add-new-endpoint-guide.md](../../docs/backend/add-new-endpoint-guide.md).
- ESM imports of TypeScript files use explicit `.ts` extensions; preserve the existing aliases (`@shared/*`, `@modules/*`, and `@helpers/*`).
- Inversify requires `reflect-metadata`; shared services initialize before the server starts. Do not introduce module wiring outside the documented pattern.

## Tests

- Keep tests next to the code in `__test__` directories, and choose unit, integration, or e2e tests according to [testing.md](../../docs/backend/testing.md).
- Integration and e2e tests may require Docker for Testcontainers.

## Database and secrets

- Follow [database.md](../../docs/backend/database.md) for the schema, models, and migrations, and [infisical-secrets.md](../../docs/backend/infisical-secrets.md) for secrets.
- Use the API package's `db:*` scripts to generate the client, create or deploy migrations, check their status, run `db:push`, or open Studio. Do not run direct Prisma commands for these operations.
- Database scripts require `DATABASE_URL` or the Infisical configuration defined in `apps/api/.env`.

## Commands

- Type-check: `pnpm --filter @atlas/api type-check`.
- Development: `pnpm --filter @atlas/api dev`.
- Tests: `pnpm --filter @atlas/api test`.
