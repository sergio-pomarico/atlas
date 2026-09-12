---
description: Create a pull request for the current branch
---

Create a pull request only from a published, non-protected work branch. `$ARGUMENTS`
is optional PR context. `/make-commit` alone creates branches, stages, commits,
and publishes; this command owns `gh`, base selection, the diff, draft, and PR.

## 1. Guard and delegate

Inspect `git branch --show-current`, `git status --short`, `git log --oneline -10`,
`git rev-parse --symbolic-full-name '@{upstream}'`, and
`git rev-list --left-right --count HEAD...@{upstream}` when an upstream exists.
A blank branch is detached HEAD: stop. Treat exactly `main` and `master` as
protected and never use either as a local or remote PR head. If a protected
head has working-tree changes or local commits, delegate all branch/commit/
publish work to `/make-commit`; if it is clean, stop. Likewise delegate when
a work branch has working-tree changes, unpublished commits, or no upstream.
After delegation, repeat this preflight and continue only with the same
verified, non-protected work branch and upstream. If the remote is ahead or
divergent, stop without reconciliation.

Resolve and retain these distinct values: local head branch
(`git branch --show-current`), complete upstream ref
(`git rev-parse --symbolic-full-name '@{upstream}'`), local head
SHA (`git rev-parse HEAD`), and upstream SHA (`git rev-parse '@{upstream}'`).
An existing upstream must match `refs/remotes/origin/*`; otherwise stop
without inferring a fork or owner. Derive `remote-head-branch` by removing
only the `refs/remotes/origin/` prefix, preserving slashes, and stop if it is
empty or protected. Require local head SHA = upstream SHA and ahead/behind =
`0/0`.

## 2. Verify GitHub and base

Run `which gh || command -v gh`, then `gh auth status`. If `gh` is missing,
explain installation and `gh auth login`, then stop; if unauthenticated, request
`gh auth login` and stop. Never log in automatically or open a browser. Verify
`origin/main` with `git show-ref --verify --quiet refs/remotes/origin/main`, or
otherwise verify `origin/master` with `git show-ref --verify --quiet
refs/remotes/origin/master`; if neither exists, stop. Set the confirmed base
pair to `origin/main`/`main` or `origin/master`/`master` respectively; derive
the base name by removing `origin/`. Do not invent a base or use a `HEAD~5..HEAD`
fallback. Resolve its local SHA with `git rev-parse <confirmed-base-ref>`; the
confirmed tuple below must supply the SHAs for its non-empty
triple-dot diff. Do not fetch, pull, rebase, reset, or otherwise reconcile
automatically.

## 3. Draft and confirm

Before preparing the draft, query the server with one exact command:
`git ls-remote --exit-code --heads origin "refs/heads/<confirmed-base-name>"
"refs/heads/<remote-head-branch>"`. Require one matching line for each exact
ref; a failed query, missing ref, or any mismatch stops and requests an update
and reinspection. Require remote head SHA = local head SHA = upstream SHA, and
remote base SHA = the confirmed local base SHA.

Read `.github/pull_request_template.md`. From the confirmed diff, derive type
(`feat|fix|refactor|docs|test|chore|perf`), a concise imperative title, impact,
breaking changes/migrations, and relevant tests; use `$ARGUMENTS` only when it
fits. Fill the template accurately. Capture and show one immutable confirmed
reviewed PR tuple: local head branch/SHA, upstream ref/SHA, remote head
branch/SHA, base ref/name/SHA, and ahead/behind. The base name must correspond
exactly to the base ref. Compute/show its non-empty diff with
`git diff <confirmed-base-sha>...<confirmed-head-sha>`, alongside the complete
title and body; then request a separate explicit PR confirmation (independent
of commit/push confirmation).

## 4. Create

Immediately before creation, repeat the exact `git ls-remote` command above for the confirmed refs; it must succeed and return exactly one matching line per ref.
Re-resolve each confirmed tuple field—local branch/SHA, upstream ref/SHA, remote-head branch/SHA, base ref/name/SHA, ahead/behind—and require it to equal its confirmed value; the confirmed diff `git diff <confirmed-base-sha>...<confirmed-head-sha>` must be non-empty.
On query failure, absent/duplicate ref, any difference, or empty diff, stop: redo inspection/draft and request new confirmation.

Then run:

`gh pr create --head <confirmed-remote-head-branch> --title "..." --body "..." --base <confirmed-base-name>`

Return the PR URL and next steps for CI and review. Never amend, force-push, or
perform destructive actions; do not pull, rebase, merge, reset, restore,
clean, or stash automatically, and do not create a PR from `main`/`master`.
