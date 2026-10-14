---
description: Create a pull request for the current branch
agent: coder
---

Create PRs only from published, non-protected work branches. `$ARGUMENTS` is optional context.
When preparation is needed, follow `.opencode/commands/make-commit.md` in this assignment;
its commit/push confirmations apply, and PR creation needs separate confirmation. Return requests
and resume context to the primary Build agent. Do not launch subagents or invoke slash commands via Bash.

## Rules

- Inspect `git branch --show-current`, `git status --short`, history, `@{upstream}`, and
  `git rev-list --left-right --count HEAD...@{upstream}` when it exists. Detached HEAD stops.
  Exactly `main` and `master` are protected: stop unless they have work or local commits, then prepare
  through make-commit. On a work branch, use make-commit for work, unpublished commits, or no upstream,
  then reinspect; remote-ahead/divergent branches stop without reconciliation.
- Require a local branch other than `main`/`master`, `@{upstream}` exactly
  `refs/remotes/origin/<current-branch>`, `HEAD = @{upstream}`, and ahead/behind `0/0`.
- Require available, authenticated `gh` (`command -v gh`, `gh auth status`); request login or installation,
  never authenticate or open a browser automatically.
- Use only verified `origin/main`, else verified `origin/master`, as base; never invent a base or use `HEAD~`.
  Resolve its local SHA. Do not amend, force-push, pull, rebase, merge, reset, restore, clean, or stash.
- Per validation pass, query both exact refs together once with `git ls-remote --exit-code --heads origin
  "refs/heads/<base>" "refs/heads/<head>"`; require one line per ref and remote SHAs equal their confirmed local base/head SHAs.
- Read `.github/pull_request_template.md`; derive an imperative type (`feat|fix|refactor|docs|test|chore|perf`),
  title, impact, breaking changes/migrations, and tests from a non-empty triple-dot diff. Use `$ARGUMENTS` only if fitting.
- Confirm one snapshot: local branch/SHA; upstream ref/SHA; remote head/SHA; base ref/name/SHA; ahead/behind.
  Show its diff, title, and complete body, then request explicit separate confirmation to create the PR.

## Flow

1. Inspect branch/status/upstream/ahead-behind; prepare through make-commit when required, then reinspect.
2. Verify `gh`, base, exact upstream/head, and exact remote refs/SHAs.
3. Capture and show the snapshot, non-empty diff, and template-derived draft.
4. Wait for explicit PR-creation confirmation.
5. Immediately before creating, repeat that command and revalidate the snapshot, remote refs/SHAs, and non-empty diff;
   on any change redo the draft and
   confirmation. Run `gh pr create --head <head> --title "..." --body "..." --base <base>`, then return URL, CI, and review steps.
