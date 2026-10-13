---
description: Group changes into semantic commits; publish when requested
agent: coder
---

Group the authorized changes into semantic commits on a non-protected work
branch. A commit-only request ends after local commits. Publish only when the
user explicitly requests it or when preparing an explicitly requested PR,
subject to the confirmations below. `$ARGUMENTS` is optional commit-message
context; do not treat it as blanket publication authorization. Return required
confirmations and the context needed to resume to orchestrator; wait for the
human decision before the corresponding mutation.

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

For a commit-only request with no staged, unstaged, or untracked changes,
report any existing local commits and stop without creating a branch, an
empty commit, or a push.

If a protected branch has work, derive `<type>/<scope-kebab>` from the intent,
falling back to `chore/work-<short-HEAD>`. Check the candidate locally and on
`origin` before proposing:
`git show-ref --verify --quiet refs/heads/<candidate>` and
`git ls-remote --exit-code --heads origin <candidate>`. A found name or a remote
check that cannot establish absence requires another name; never overwrite or
reuse one. Show source, HEAD, all preserved work/commits, commit plan, and
whether publication is requested (with its exact destination if applicable);
get one explicit confirmation, then `git switch -c <candidate>`.
Explain that this preserves staged, unstaged, untracked, and reachable commits
without stash/reset/restore/clean, and does not move the protected branch. Repeat
the preflight on the new branch before staging anything.

If a protected branch is clean with no local commits, stop without a branch or
empty commit. On an existing non-protected work branch, keep it (never nest a
branch) and report ahead/behind. Without its upstream, use only a verified
`origin/main` or `origin/master` comparison; a clean branch ahead of that base
has commits eligible for publication, while one with none has no work. If
publication is authorized, confirm the exact `origin/<current-branch>`
destination before `git push -u origin <current-branch>`. With an upstream,
show and confirm its exact destination before authorized publication; never
publish to `main` or `master`.

## 3. Plan and confirm

Check for secrets or suspicious files (`.env`, tokens, credentials, keys,
secrets) and stop for review if found. Group related additions, modifications,
and deletions by intent (feature, fix, refactor, test, docs, chore, release,
config); split independent groups and do not revert existing work. Use concise
semantic messages, using `$ARGUMENTS` only when accurate. Show files per group,
messages, existing commits, and the publication decision, then get explicit
confirmation before staging or committing. Include the exact destination and
push action in that confirmation only when publication is authorized; otherwise
confirm local commits only. Clarify genuinely ambiguous grouping instead of
guessing. Without changes to commit or authorized commits to publish, stop
without an empty commit.

## 4. Execute and optionally publish

For each confirmed group, run `git add <files>` and create its commit. Without
publication authorization, summarize the created/preserved local commits and
stop without pushing. If publication is authorized and only existing local
commits remain, publish them without an empty commit. Immediately before
pushing, re-run branch, upstream, and divergence checks; stop if the
branch is detached/protected or the upstream became ahead/divergent. Push only
to the confirmed destination (`git push` for an existing upstream, otherwise
`git push -u origin <branch>`), then summarize created/preserved commits and
the exact branch/destination.

Never use amend, `--no-verify`, force-push, overwrite, or automatic pull,
rebase, merge, reset, restore, clean, or stash; never add, commit, or publish
on `main`/`master`.
