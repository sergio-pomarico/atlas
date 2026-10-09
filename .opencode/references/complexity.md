# Complexity verification in Atlas

For JavaScript/TypeScript implementations, load the existing `fallow` skill. Do not change the skill, thresholds, suppressions, configuration, or CI to pass checks.

## Analyze

Record the initial repository state. Run this command from the root before editing, after implementation, and after each correction; retain the original report throughout the task:

```sh
pnpm exec fallow health --complexity --complexity-breakdown --format json --quiet --explain 2>/dev/null || true
```

Use the installed version and discovered configuration. Filter the complete reports to files actually modified by coder, including new files; exclude unrelated user changes. Do not use `--top`, tracked report files, auto-fix, hooks, watch, or telemetry. Global counts are not task-scoped counts.

Documentation-only/non-analyzable changes are N/A with a reason. Deleted files have no final functions. Excluded or skipped files are coverage gaps, not clean results.

## Validate analysis coverage

Require valid JSON with `kind: "health"`, a `findings` array, and `summary`. Empty/invalid output or error envelopes fail verification; `|| true` does not imply success. Report failures and obtain permission for additional diagnostics when needed.

Check `workspace_diagnostics` when present, particularly `source-read-failure`, `skipped-large-file`, and `skipped-minified-file`. Disclose affected in-scope files and unresolved discovery/read failures. Also check configuration exclusions: absent diagnostics, global counters, or empty findings do not establish that an individual file was analyzed. Do not declare affected scope clean while coverage is incomplete.

## Attribute findings

Include cyclomatic, cognitive, CRAP, and combined findings using effective thresholds/overrides. Read defaults from `summary.max_cyclomatic_threshold`, `summary.max_cognitive_threshold`, and `summary.max_crap_threshold`; currently cyclomatic > 20, cognitive > 15, CRAP >= 30. Do not discard emitted findings through hard-coded filters.

Compare functions by path, name, and diff context, not lines alone. Distinguish assignment changes from the initial worktree state:

| Attribution | Evidence |
|---|---|
| New | New function or previously unflagged function now has a finding. |
| Aggravated | Existing metric worsens or another metric exceeds its threshold. |
| Pre-existing | Finding remains without aggravation; note improvement if still flagged. |
| Uncertain | Missing initial report, incomplete coverage, or ambiguous moves/renames/identities. |

An absent initial finding means “not previously reported,” not zero.

For CRAP, compare coverage provenance, availability, and inputs between runs: `coverage_source`, `coverage_tier`, `coverage_pct` when measured, and mixed-source notices. If coverage source/model or data changes, report CRAP attribution as uncertain until comparable evidence distinguishes code changes from coverage changes. Estimated coverage is not proof of missing tests. Do not switch coverage models without an authorized plan.

## Report and hand off

Return command/result, scoped files, gaps/errors, and a concise table grouped by function: path/name/current line, exceeded metrics, initial/final values when available, effective thresholds, Fallow severity, attribution/diff evidence, relevant `contributions`, and CRAP coverage provenance. Separate new/aggravated, pre-existing, and uncertain findings; omit full JSON. Claim no in-scope findings only after validating analysis coverage.

Return findings normally without delegating or independently refactoring. Orchestrator assigns bounded corrections for confirmed new/aggravated findings and presents a separate plan for pre-existing ones. Repeat analysis against the original report and relevant [verification.md](verification.md) checks after correction. Report actual tests separately; explorer reviews independently. Apply the existing two-attempt limit.
