---
description: Create a pull request for the current branch
---

Create a pull request only from a published, non-protected work branch. `$ARGUMENTS`
is optional PR context. `/make-commit` alone creates branches, stages, commits,
and publishes; this command owns `gh`, base selection, the diff, draft, and PR.

## 1. Guard and delegate

Inspect `git branch --show-current`, `git status --short`, `git log --oneline -10`,
`git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'`, and
`git rev-list --left-right --count HEAD...@{upstream}` when an upstream exists.
A blank branch is detached HEAD: stop. Treat exactly `main`
and `master` as protected and never use either as PR head. If a protected head
has working-tree changes or local commits, delegate all branch/commit/publish
work to `/make-commit`; if it is clean, stop. Likewise delegate when a work
branch has working-tree changes, unpublished commits, or no upstream. After
delegation, repeat this preflight and continue only with the same verified,
non-protected work branch and upstream. If the remote is ahead or divergent,
stop without reconciliation.

## 2. Verify GitHub and base

Run `which gh || command -v gh`, then `gh auth status`. If `gh` is missing,
explain installation and `gh auth login`, then stop; if unauthenticated, request
`gh auth login` and stop. Never log in automatically or open a browser. Verify
`origin/main` with `git show-ref --verify --quiet refs/remotes/origin/main`, or
otherwise verify `origin/master` with `git show-ref --verify --quiet
refs/remotes/origin/master`; if neither exists, stop. Set the confirmed base
pair to `origin/main`/`main` or `origin/master`/`master` respectively; derive
the base name by removing `origin/`. Do not invent a base or use a `HEAD~5..HEAD`
fallback. The confirmed tuple below must supply the SHAs for its non-empty
triple-dot diff.

## 3. Draft and confirm

Read `.github/pull_request_template.md`. From the diff, derive type
(`feat|fix|refactor|docs|test|chore|perf`), a concise imperative title, impact,
breaking changes/migrations, and relevant tests; use `$ARGUMENTS` only when it
fits. Fill the template accurately. Capture and show one immutable confirmed
reviewed PR tuple: head branch, head SHA (`git rev-parse HEAD`), base ref
(`<confirmed-base-ref>`: `origin/main` or `origin/master`), corresponding base
name (`<confirmed-base-name>`: `main` or `master`), base SHA (`git rev-parse
<confirmed-base-ref>`), upstream, and ahead/behind. The base name must correspond
exactly to the base ref. Compute/show its non-empty diff with
`git diff <confirmed-base-sha>...<confirmed-head-sha>`, alongside the complete
title and body; then request a separate explicit PR confirmation (independent
of commit/push confirmation).

## 4. Create

Immediately before creation, re-resolve every value in the tuple—branch,
`git rev-parse HEAD`, base ref, base name, `git rev-parse <base-ref>`, upstream,
and ahead-behind—and require all values to match the confirmation. Require the
base ref to resolve to the confirmed base SHA and the base name to correspond
exactly to that ref. Require
`git diff <confirmed-base-sha>...<confirmed-head-sha>` to remain non-empty;
if anything changed, do not create the PR: redo inspection, regenerate the
draft, and request new confirmation. Then run:

`gh pr create --head <confirmed-head> --title "..." --body "..." --base <confirmed-base-name>`

Return the PR URL and next steps for CI and review. Never amend, force-push, or
perform destructive actions; do not pull, rebase, merge, reset, restore, clean,
or stash automatically, and do not create a PR from `main`/`master`.
