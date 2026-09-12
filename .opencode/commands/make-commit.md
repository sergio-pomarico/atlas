---
description: Group changes into semantic commits and push
---

Group current changes into semantic commits and publish them only from a
non-protected work branch. `$ARGUMENTS` is optional commit-message context.

## 1. Preflight (before `add`, commit, or push)

Run `git branch --show-current`, `git status --short`, `git diff --stat`,
`git diff`, `git log --oneline -10`, `git status -sb`, then inspect the upstream
with `git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'` and, when it
exists, `git rev-list --left-right --count HEAD...@{upstream}` (ahead, behind).
An upstream that is ahead or diverged is a hard stop: report counts and do not
reconcile automatically. Without an upstream, verify `origin/main` or
`origin/master`, compare the same counts, and stop if the base is unavailable,
ahead, or divergent; this also establishes the publishable local commits and
the possible destination.

A blank branch name is detached HEAD: stop completely; do not create a branch,
commit, or push automatically. Treat exactly `main` and `master` as protected.
On a protected branch, detect staged, unstaged, or untracked work and local
commits (upstream comparison, or verified `origin/main`/`origin/master`; if no
base exists, inspect the recent log and stop if locality is unknowable).

## 2. Select the work branch

If a protected branch has work, derive `<type>/<scope-kebab>` from the intent,
falling back to `chore/work-<short-HEAD>`. Check the candidate locally and on
`origin` before proposing:
`git show-ref --verify --quiet refs/heads/<candidate>` and
`git ls-remote --exit-code --heads origin <candidate>`. A found name or a remote
check that cannot establish absence requires another name; never overwrite or
reuse one. Show source, HEAD, all preserved work/commits, commit plan, and exact
push destination; get one explicit confirmation, then `git switch -c <candidate>`.
Explain that this preserves staged, unstaged, untracked, and reachable commits
without stash/reset/restore/clean, and does not move the protected branch. Repeat
the preflight on the new branch before staging anything.

If a protected branch is clean with no local commits, stop without a branch or
empty commit. On an existing non-protected work branch, keep it (never nest a
branch) and report ahead/behind. Without its upstream, use only a verified
`origin/main` or `origin/master` comparison; a clean branch ahead of that base
has commits to publish, while one with none has no work. Confirm the exact
`origin/<current-branch>` destination before `git push -u origin <current-branch>`.
With an upstream, show and confirm its exact destination; never publish to
`main` or `master`.

## 3. Plan and confirm

Check for secrets or suspicious files (`.env`, tokens, credentials, keys,
secrets) and stop for review if found. Group related additions, modifications,
and deletions by intent (feature, fix, refactor, test, docs, chore, release,
config); split independent groups and do not revert existing work. Use concise
semantic messages, using `$ARGUMENTS` only when accurate. Show files per group,
messages, existing commits, and exact destination, then get explicit
confirmation before any staging, commit, or push; clarify genuinely ambiguous
grouping instead of guessing. If there is no work, stop without an empty commit.

## 4. Execute and publish

For each confirmed group, run `git add <files>` and create its commit. If only
existing local commits remain, publish them without an empty commit. Immediately
before pushing, re-run branch, upstream, and divergence checks; stop if the
branch is detached/protected or the upstream became ahead/divergent. Push only
to the confirmed destination (`git push` for an existing upstream, otherwise
`git push -u origin <branch>`), then summarize created/preserved commits and
the exact branch/destination.

Never use amend, `--no-verify`, force-push, overwrite, or automatic pull,
rebase, merge, reset, restore, clean, or stash; never add, commit, or publish
on `main`/`master`.
