# Atlas

Atlas is an ERP for small and medium-sized pharmaceutical distributors. It is organized as a `pnpm` monorepo orchestrated with Turbo, with applications in `apps/*` and shared packages in `packages/*`.

## Shared rules

- Prefer small, cohesive changes; avoid abstractions until there is a concrete need.
- Executable configuration (`package.json`, `turbo.json`, `biome.jsonc`, and `.fallowrc.json`) takes precedence over documentation when they differ.
- Use Biome through Ultracite for formatting and linting. Commit messages follow Conventional Commits.

## Root commands

- Install dependencies: `pnpm install`.
- Run all applications in development: `pnpm run dev`.
- Build all packages and applications: `pnpm run build`.
- Run formatting and lint checks: `pnpm run check`.
- Run configured tests: `pnpm run test`.
- Type-check packages that declare this script: `pnpm run type-check`.

`apps/client` does not declare `type-check`; its TypeScript validation runs with `pnpm --filter @atlas/client build`.

## Area guides

- For API, database, or backend test changes, see [apps/api/AGENTS.md](apps/api/AGENTS.md).
- For client changes, see [apps/client/AGENTS.md](apps/client/AGENTS.md).
- Backend documentation is in [docs/backend](docs/backend/).
