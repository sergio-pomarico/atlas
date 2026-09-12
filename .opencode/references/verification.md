# Verifying changes in Atlas

Consult this guide when planning or running verification checks. Recheck commands against package.json and turbo.json; do not assume every package declares the same scripts.

| Affected area | Guide to consult | Usual verification from the repository root |
|---|---|---|
| API | apps/api/AGENTS.md; docs/backend/testing.md for tests | pnpm --filter @atlas/api type-check; pnpm --filter @atlas/api test |
| Client | apps/client/AGENTS.md | pnpm --filter @atlas/client build; pnpm --filter @atlas/client test |
| Shared package | The package's package.json and its consumers' guides | Checks for the affected API/client; the package may have no scripts of its own |
| Formatting and lint | biome.jsonc and root scripts | pnpm run check |
| Cross-cutting configuration | package.json and turbo.json | pnpm run type-check, pnpm run test, or pnpm run build depending on impact |

The client validates TypeScript through build; the root type-check does not replace that validation. For focused tests, use runner arguments verified against its configuration; do not invent a new script.

In the API, Jest uses --passWithNoTests: a zero exit code does not prove that any tests ran. Check how many were executed. Docker/Testcontainers may be needed for integration and e2e tests; report an environment blocker as such. Do not replace the isolated test environment with a shared database.

coder runs tests and builds and may produce coverage or generated artifacts; explorer reviews the code, diff, and those results. If another run is needed, return the command and its purpose to orchestrator.

To format affected files, consult the fix script and limit its scope; avoid unrelated bulk formatting. Consult the existing .opencode/skills/fallow skill only for dependency, duplication, or unused-code analysis tasks that need it.

Do not run the entire matrix for documentation-only changes: check links and consistency. These commands are current references, not a requirement to run all of them.
