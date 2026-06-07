# PR Template Mapping

Use this reference when filling `.github/pull_request_template.md` from either `openspec/changes/<change-id>/` or git commit/diff context.

## Source Priority

1. Actual implementation diff and tests run in the current branch.
2. OpenSpec artifacts in the selected change directory, when available.
3. Commit messages, branch names, and changed files when OpenSpec is unavailable.
4. User-provided context.

If sources conflict, state the discrepancy instead of hiding it.

## OpenSpec Section Mapping

- `Summary`: Summarize `proposal.md` `What Changes` in 1-3 sentences.
- `Rationale`: Use `proposal.md` `Why` plus `design.md` `Context`.
- `Related Issues`: Use `linear.json` issue IDs and titles. If IDs are `TBD`, list titles with `(TBD)`.
- `Design Documentation`: Link `openspec/changes/<change-id>/proposal.md`, `design.md`, and each `specs/**/spec.md`.
- `Changes`: Combine `proposal.md` `What Changes`, `Capabilities`, requirement headings, and implementation diff.
- `Impact`: Use `proposal.md` `Impact`, `design.md` risks/trade-offs, and affected files from the diff.
- `Testing`: Use a checklist that says whether existing tests still pass and lists new tests added. Include commands actually run and manual checks. Use spec scenarios as suggested coverage only when tests were not run.
- `Screenshots/Video`: Use `N/A` unless UI changes are present.
- `Checklist`: Check only items verified in the current session.
- `Additional Notes`: Add unresolved risks, assumptions, missing issue IDs, or OpenSpec/implementation mismatches.

## Commit Context Mapping

- `Summary`: Summarize the first meaningful commit subject, title hint, or dominant changed area.
- `Rationale`: Derive from commit messages when possible; otherwise mark that rationale needs human confirmation.
- `Related Issues`: Extract issue keys from branch names, commit messages, `#123` references, and URLs.
- `Design Documentation`: Use `N/A` unless changed files include design docs, specs, ADRs, or user-provided links.
- `Changes`: List commit subjects, then include the main changed files or packages from `git diff --stat`.
- `Impact`: Mention affected packages/apps and call out config, schema, migration, auth, API, or route changes.
- `Testing`: Use the same checklist as OpenSpec mode; include commands actually run.
- `Screenshots/Video`: Use `N/A` unless UI changes are present.
- `Checklist`: Check only items verified in the current session.
- `Additional Notes`: State that the body was generated from commit context and should be reviewed for business rationale.

## Title Hints

Prefer a title that starts with an imperative verb and names the capability:

- `Add Redis-backed rate limiting`
- `Introduce <capability> support`
- `Wire <feature> into <surface>`
