# Final maintainability review in Atlas

## Responsibilities and trigger

Orchestrator owns every assignment and decision. Explorer investigates and reviews behavior; coder implements and runs checks; reviewer performs the final maintainability audit. Read the original [SKILL.md](../skills/thermo-nuclear-code-quality-review/SKILL.md) directly for review criteria, output priorities, tone, and approval bar. Those instructions belong only in the skill.

Automatically invoke reviewer only after the entire agreed feature, fix, or refactor is implemented, coder has stopped editing and reported the applicable checks, and explorer's functional review is resolved. Do not launch it for individual implementation steps, questions, diagnoses, plans, or Git-only operations. An explicit maintainability review request may invoke it without implementing anything.

Fix confirmed functional defects through the existing coder/explorer loop before the final audit. If tests cannot run because of the environment, the stable result may still be audited, but pending verification remains explicit and the work is not fully verified. Keep one implementation active at a time and never audit a moving result.

## Assignment and report

Give reviewer a self-contained bundle: objective and authorized scope, acceptance criteria, original repository state, the complete task changes and current result, affected paths/guides, coder's check and Fallow summaries, and explorer's functional conclusion. Include staged, unstaged, new files, and any in-scope committed changes. Obtain missing baseline/comparison evidence from coder; do not silently assume that the entire branch or working-tree diff belongs to the task.

Preserve the original state and Fallow baseline through every correction. Separate unrelated user changes and pre-existing debt from new/aggravated findings; broader pre-existing cleanup belongs in a separate proposal. Reuse coder's analysis through [complexity.md](complexity.md), with coverage and attribution limitations kept explicit.

Return Markdown in the assignment's language, in the conversation:

- **Verdict:** approved / requires changes / incomplete review, with a brief rationale and the reviewed scope. Use the equivalent labels in the user's language.
- **Findings:** use the original skill's output expectations. Add severity, path/current line, attribution evidence, impact, proposed correction, and whether the finding blocks delivery.
- **Pre-existing debt and hypotheses:** keep these separate; do not treat unconfirmed hypotheses or unrelated debt as confirmed task regressions.
- **Verification and limitations:** distinguish the reviewer's source inspection from checks reported by coder, and list pending checks, evidence gaps, and unresolved functional limitations.

Use an incomplete verdict when the local SKILL.md/model is unavailable or missing/changed evidence prevents a reliable audit. Do not switch models or substitute a rubric silently.

## User decision and correction loop

Orchestrator presents the findings and proposed corrections before requesting a decision. Do not assign corrections originating from reviewer until the user authorizes their scope, including findings also expressed as Fallow complexity issues.

| Decision | Next action |
|---|---|
| Correct | Assign only the selected corrections to coder; repeat applicable verification/Fallow analysis against the original baseline, explorer's functional review, then reviewer's audit of the complete updated result. |
| Justify | Send the user's justification and supporting evidence to reviewer for reevaluation without editing; retain or revise the finding and verdict explicitly. |
| Postpone | Deliver with the outstanding findings and the user's decision. Do not relabel unresolved blocking findings as approved. |

The user's authorization applies to the agreed correction scope; materially new proposals require another decision. Maintain the existing limit of two failed correction attempts for the same reason across the loop, rather than resetting it when a new review starts. At the limit, stop that loop and present evidence and alternatives.

Changes to the reviewed implementation invalidate earlier verdicts. Orchestrator must return the updated result through the applicable checks and both reviews before final approval. Unavailable evidence or agents must be reported without pretending that the omitted phase passed. Reviews do not authorize commits, pushes, or PRs; retain the existing Git workflows and confirmations.

## Skill reference

Use the user's installation at `.opencode/skills/thermo-nuclear-code-quality-review/SKILL.md` as a local reference, just like this guide. Installation and updates are separate maintenance operations; reviewer never performs them or changes the original skill's content, frontmatter, or resources. Always read the current local file when starting an audit.
