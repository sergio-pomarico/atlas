---
name: make-pull-request
description: Create GitHub pull request bodies from this repo's pull request template using OpenSpec artifacts when available, or git commit/diff context when OpenSpec artifacts are absent. Use when the user asks to create, draft, fill, or prepare a PR, including /make-pull-resquest flows, changes with openspec/changes/<change-id>/proposal.md, design.md, specs/**/spec.md, linear.json, and regular branches without OpenSpec.
license: MIT
compatibility: opencode
metadata:
  author: atlas
  workflow: github-pr
---

Create a pull request body that follows `.github/pull_request_template.md`. Use OpenSpec artifacts when they exist; otherwise derive the body from branch commits and diff context. Prefer generating a reviewable PR body file first, then create the PR with `gh pr create` only after the user confirms.

## Mode Selection

- Use OpenSpec mode when `openspec/changes/<change-id>/` exists or can be inferred from the branch/arguments.
- Use commit-context mode when there is no `openspec/` directory, no active change can be inferred, or the user is working on a regular branch.
- Use `scripts/generate_pr_body.py --mode auto` by default. It selects OpenSpec mode when a matching change exists and falls back to commit-context mode otherwise.

## Workflow

1. Decide the source mode. Try OpenSpec first only when a matching change can be identified; otherwise use commit-context mode.
2. Read `.github/pull_request_template.md`; preserve its headings and checklist wording unless the user asks to change the template.
3. In OpenSpec mode, read the selected artifacts:
   - `proposal.md` for Summary, Rationale, Changes, Impact, and capabilities.
   - `design.md` for Design Documentation, decisions, risks, goals, and non-goals.
   - `specs/**/spec.md` for requirement behavior and test hints.
   - `linear.json` for Related Issues when present.
4. In commit-context mode, read branch context:
   - `git branch --show-current` for branch naming and issue hints.
   - `git log --oneline <base>..HEAD` for commit intent.
   - `git diff --stat <base>...HEAD` and `git diff --name-status <base>...HEAD` for changed areas.
5. Inspect implementation context with `git status`, `git diff --stat`, and focused `git diff` reads so the PR does not claim work that is not implemented.
6. Generate a PR body with `scripts/generate_pr_body.py`.
7. If creating the PR, verify `gh` is available and authenticated, the branch has commits, and the remote target is clear. Use `gh pr create --title "<title>" --body-file <file> --base <base>`.

## PR Body Rules

- Keep the template sections in order.
- Write concise bullets under `Changes`, based on OpenSpec `What Changes` and requirements when present, or commit subjects and changed files otherwise.
- Put OpenSpec file links under `Design Documentation` in OpenSpec mode. Use `N/A` in commit-context mode unless the diff includes explicit docs/design files.
- Convert `linear.json`, branch names, commit messages, issue keys, `#123`, and URLs into Related Issues when present. If IDs are `TBD`, use titles and mark IDs as TBD.
- Fill `Testing` as a checklist. Include whether the existing test suite still passes and list any new tests added. If no tests were run, leave the suite item unchecked and state the reason.
- Keep screenshots/video as `N/A` unless the diff includes UI changes or the user supplies media.
- Leave checklist items unchecked unless verified during the current session.
- Flag gaps explicitly in `Additional Notes`, especially when implementation differs from OpenSpec.

## Script Usage

```bash
python3 .opencode/skills/make-pull-request/scripts/generate_pr_body.py \
  --repo . \
  --output /tmp/pr-body.md
```

The script reads `.github/pull_request_template.md` and chooses the best source automatically. Add `--change-id redis-rate-limit` to force a known OpenSpec change, `--mode commits` to skip OpenSpec, or `--base main` to control the commit comparison base.

Read `references/pr-template-mapping.md` when mapping template sections manually or adapting to a non-standard OpenSpec or commit-only layout.

## PR Creation

Before running `gh pr create`:

- Confirm the user wants a live PR, not just a draft body.
- Check `git status --short` and avoid staging or committing unrelated user changes unless requested.
- Prefer `--body-file` over inline bodies.
- Use a clear title derived from the OpenSpec change, implementation diff, or user-provided title.
- Include source and base branches only when needed, for example `--base main --head feature-branch`.

## Output

When finished, report the PR URL if created. If only a body was drafted, report the output file path and summarize any sections that need human confirmation.
