---
description: Group changes into semantic commits; publish when requested
agent: coder
---

Group authorized changes into semantic commits. Commit-only ends locally; publish only when explicitly requested or to prepare an explicitly requested PR. `$ARGUMENTS` is context only, never publication authorization.

## Rules

- Before mutation, inspect `git branch --show-current`, `git status --short`, unstaged and staged diffs,
  `git log --oneline -10`, `git rev-parse --symbolic-full-name '@{upstream}'`, and `git rev-list --left-right --count HEAD...@{upstream}` when an upstream exists.
- Stop on detached HEAD, an unknown base, `behind>0` (report divergence when also ahead), secrets or suspicious `.env`/token/credential/key files, or any local or remote destination named `main` or `master`; never reconcile automatically.
- Treat exactly `main` and `master` as protected. When starting there with work or local
  commits, propose a free `<type>/<scope-kebab>` (or `chore/work-<short-HEAD>`) after
  `git show-ref --verify --quiet refs/heads/<candidate>` and `git ls-remote --exit-code --heads origin <candidate>` establish absence locally and remotely; otherwise choose another name.
- Keep an existing non-protected work branch; never nest branches, reuse or overwrite a branch, or revert existing work. A clean protected branch with no local commits stops.
- Compare a branch without upstream only to a verified `origin/main` or `origin/master`;
  resolve and show the exact non-protected upstream/destination. For PR preparation,
  `@{upstream}` must resolve exactly to `refs/remotes/origin/<current-branch>`; after
  publication and before handoff, require `HEAD = @{upstream}` and ahead/behind `0/0`.
- Inspect untracked candidates before staging; account for staged, unstaged, and untracked
  work. Group additions, modifications, and deletions by intent, split independent groups,
  use concise semantic messages, and never create empty commits.
- Before any mutation, show the complete plan—branch, preserved/existing commits, files and
  message per new commit, and optional push/destination—and wait for one explicit confirmation.
- Never amend, use `--no-verify`, force-push, overwrite, or automatically pull, rebase, merge, reset, restore, clean, or stash.

## Flow

1. Inspect branch, status, diffs, history, upstream/base, and ahead/behind; stop on any guard failure.
2. Show the complete branch, commit, and optional publication plan.
3. Wait for one explicit confirmation before changing anything.
4. Create a confirmed work branch when needed, then stage and commit each confirmed group.
5. Revalidate branch and ahead/behind; publish only if authorized to the confirmed destination, verify the PR rule when applicable, then summarize preserved and created commits.
