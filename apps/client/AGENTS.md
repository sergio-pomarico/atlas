# Atlas client

The client lives in `apps/client` and uses Vite, React, and TanStack Router.

- Add or modify routes in `src/routes`; do not edit `src/routeTree.gen.ts`, as TanStack Router generates it automatically.
- Keep changes aligned with the patterns already present in the client.

## Commands

- Development: `pnpm --filter @atlas/client dev`.
- Build and TypeScript validation: `pnpm --filter @atlas/client build`.
