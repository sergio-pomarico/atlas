# Atlas

Atlas is an ERP for small and medium-sized pharmaceutical distributors. It is organized as a `pnpm` monorepo orchestrated with Turbo, with applications in `apps/*` and shared packages in `packages/*`.

## Shared rules

- Prefer small, cohesive changes; avoid abstractions until there is a concrete need.
- Executable configuration (`package.json`, `turbo.json`, `biome.jsonc`, and `.fallowrc.json`) takes precedence over documentation when they differ.
- Use Biome through Ultracite for formatting and linting. Commit messages follow Conventional Commits.

## Build agent workflow

When Build is the primary agent, it owns coordination and the final response. Delegate only when the work matches a specialized role:

- Use `explorer` for repository investigation and, after implementation, for an independent functional review of acceptance criteria, regressions, and contracts.
- Use `coder` for all code or configuration edits and for running the relevant verification commands. Keep only one implementation active in a workspace.
- Use `reviewer` only after the complete feature, fix, or refactor is stable, coder has reported its checks, and explorer's functional findings are resolved. Reviewer performs the final maintainability audit.

Give every subagent a self-contained assignment because child sessions start with fresh context. Include the objective, authorized scope, initial state, relevant evidence and guides, acceptance criteria, and expected output. Do not delegate simple questions, diagnoses, or plans unless repository investigation is needed.

Route confirmed functional defects back through coder and then repeat explorer's review. Present reviewer findings and proposed corrections to the user before assigning those corrections; after authorized changes, repeat the applicable checks and both reviews. Never treat an unavailable agent, blocked check, or incomplete review as passed.

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
