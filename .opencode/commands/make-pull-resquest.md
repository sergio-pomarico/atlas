---
description: Create a pull request for the current branch
---

Create a well-structured pull request for the current branch using `gh` and a clear PR template.

Optional context for PR: `$ARGUMENTS`

Rules:

- First verify the GitHub CLI is available and authenticated:
  - `which gh || command -v gh`
  - If missing, explain install steps and stop.
  - If not authenticated, ask the user to run `gh auth login` and stop.
- Inspect the repo state and branch tracking:
  - `git status --short`
  - `git branch -vv`
  - `git log --oneline -10`
- Identify the base branch (`main` or `master`) and compare changes:
  - `git diff origin/main...HEAD` or `git diff origin/master...HEAD`
  - If neither exists, use `git diff HEAD~5..HEAD`
- Check for unpushed commits:
  - `git log --oneline @{u}..HEAD` (or detect missing upstream)
  - If unpushed commits exist, run the `/make-commit` command to group and push.
- Derive PR metadata from the diff:
  - Type: feat | fix | refactor | docs | test | chore | perf
  - Title: concise, imperative, follow repo style; use `$ARGUMENTS` only if it fits.
  - Note any breaking changes or migrations.
  - List relevant testing expectations.
- Use the repo PR template from `.github/pull_request_template.md`; keep it accurate and specific.
- Before creating the PR, show the full title/body/base and request confirmation.
- Do not open a browser unless asked.
- Do not force push or amend commits.

Flow:

1. Gather git status, branch tracking, recent commits, and diff vs base.
2. Detect whether the branch tracks a remote and if it has unpushed commits.
3. If unpushed commits exist, run `/make-commit` to group and push.
4. Draft PR title, type, and description using `.github/pull_request_template.md`.
5. Present the draft and ask for edits or confirmation.
6. Create the PR with:
   `gh pr create --title "..." --body "..." --base <base>`
7. Return the PR URL and a short next-steps note (CI, review).
