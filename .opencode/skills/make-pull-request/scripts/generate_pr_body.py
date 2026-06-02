#!/usr/bin/env python3
"""Generate a GitHub PR body from OpenSpec artifacts or git commit context."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path
from typing import cast


SECTION_RE = re.compile(r"^##\s+(?:[^\w\s]+)?\s*(.+?)\s*$", re.MULTILINE)
ISSUE_RE = re.compile(r"(?:(?:[A-Z][A-Z0-9]+-\d+)|(?:#\d+)|(?:https?://\S+))")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def context_str(context: dict[str, object], key: str) -> str:
    value = context.get(key)
    return value if isinstance(value, str) else ""


def context_str_list(context: dict[str, object], key: str) -> list[str]:
    value = context.get(key)
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)]


def run_git(repo: Path, args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=repo,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else ""


def extract_section(markdown: str, heading: str) -> str:
    pattern = re.compile(rf"^##\s+{re.escape(heading)}\s*$", re.MULTILINE | re.IGNORECASE)
    match = pattern.search(markdown)
    if not match:
        return ""
    start = match.end()
    next_match = re.search(r"^##\s+", markdown[start:], re.MULTILINE)
    end = start + next_match.start() if next_match else len(markdown)
    return markdown[start:end].strip()


def bullets_from_markdown(text: str) -> list[str]:
    bullets: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("- "):
            bullets.append(stripped)
    return bullets


def first_paragraph(text: str) -> str:
    for block in re.split(r"\n\s*\n", text.strip()):
        clean = " ".join(line.strip() for line in block.splitlines() if line.strip())
        if clean and not clean.startswith("- "):
            return clean
    return ""


def prose_from_bullets(bullets: list[str]) -> str:
    cleaned = [bullet[2:].strip().rstrip(".") for bullet in bullets]
    if not cleaned:
        return ""
    if len(cleaned) == 1:
        return f"This PR includes: {cleaned[0]}."
    return "This PR includes: " + "; ".join(cleaned) + "."


def requirement_names(spec_texts: list[tuple[Path, str]]) -> list[str]:
    names: list[str] = []
    for _, text in spec_texts:
        for match in re.finditer(r"^### Requirement:\s+(.+?)\s*$", text, re.MULTILINE):
            names.append(match.group(1).strip())
    return names


def load_linear_issues(path: Path) -> list[str]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    issues = []
    for issue in data.get("issues", []):
        issue_id = issue.get("id") or "TBD"
        title = issue.get("title") or "Untitled issue"
        suffix = "" if issue_id != "TBD" else " (TBD)"
        issues.append(f"- {issue_id}: {title}{suffix}")
    return issues


def detect_base(repo: Path, requested_base: str | None) -> str:
    if requested_base:
        return requested_base
    for candidate in ["origin/main", "origin/master", "main", "master"]:
        if run_git(repo, ["rev-parse", "--verify", candidate]):
            return candidate
    return "HEAD~5"


def current_branch(repo: Path) -> str:
    return run_git(repo, ["branch", "--show-current"]) or "current branch"


def infer_change_id(repo: Path, explicit_change_id: str | None) -> str | None:
    if explicit_change_id:
        return explicit_change_id
    changes_dir = repo / "openspec" / "changes"
    if not changes_dir.exists():
        return None
    branch = current_branch(repo)
    candidates = sorted(path.name for path in changes_dir.iterdir() if path.is_dir() and path.name != "archive")
    for candidate in candidates:
        if candidate in branch:
            return candidate
    return candidates[0] if len(candidates) == 1 else None


def resolve_mode(repo: Path, mode: str, change_id: str | None) -> tuple[str, str | None]:
    inferred_change_id = infer_change_id(repo, change_id)
    change_exists = bool(inferred_change_id and (repo / "openspec" / "changes" / inferred_change_id).exists())
    if mode == "openspec":
        if not change_exists:
            raise SystemExit("OpenSpec mode requested, but no matching openspec/changes/<change-id> directory was found.")
        return "openspec", inferred_change_id
    if mode == "commits":
        return "commits", inferred_change_id
    return ("openspec", inferred_change_id) if change_exists else ("commits", inferred_change_id)


def extract_issues(*texts: str) -> list[str]:
    seen: dict[str, None] = {}
    for text in texts:
        for match in ISSUE_RE.findall(text):
            seen[match.rstrip(".,)")] = None
    return [f"- {issue}" for issue in seen]


def parse_diff_stat(stat: str) -> list[str]:
    files: list[str] = []
    for line in stat.splitlines():
        if "|" not in line:
            continue
        path = line.split("|", 1)[0].strip()
        if path and path != "..." and "files changed" not in path:
            files.append(path)
    return files


def parse_name_status(name_status: str) -> list[str]:
    files: list[str] = []
    for line in name_status.splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        paths = parts[1:]
        files.append(paths[-1])
    return files


def area_from_path(path: str) -> str:
    parts = path.split("/")
    if len(parts) >= 2 and parts[0] in {"apps", "packages", "docs"}:
        return "/".join(parts[:2])
    return parts[0]


def build_openspec_context(repo: Path, change_id: str) -> dict[str, object]:
    change_dir = repo / "openspec" / "changes" / change_id
    spec_files = sorted(change_dir.glob("specs/**/spec.md"))
    spec_texts = [(path.relative_to(repo), read_text(path)) for path in spec_files]
    return {
        "mode": "openspec",
        "change_id": change_id,
        "proposal": read_text(change_dir / "proposal.md"),
        "design": read_text(change_dir / "design.md"),
        "issues": load_linear_issues(change_dir / "linear.json"),
        "spec_paths": [path.relative_to(repo) for path in spec_files],
        "spec_texts": spec_texts,
    }


def build_commit_context(repo: Path, base: str, title_hint: str | None) -> dict[str, object]:
    branch = current_branch(repo)
    commits = run_git(repo, ["log", "--oneline", f"{base}..HEAD"])
    if not commits:
        commits = run_git(repo, ["log", "--oneline", "-10"])
    diff_stat = run_git(repo, ["diff", "--stat", f"{base}...HEAD"]) or run_git(repo, ["diff", "--stat", "HEAD~5..HEAD"])
    diff_name_status = run_git(repo, ["diff", "--name-status", f"{base}...HEAD"]) or run_git(repo, ["diff", "--name-status", "HEAD~5..HEAD"])
    files = parse_name_status(diff_name_status) or parse_diff_stat(diff_stat)
    areas = sorted({area_from_path(path) for path in files})[:8]
    issues = extract_issues(branch, commits, title_hint or "")
    return {
        "mode": "commits",
        "base": base,
        "branch": branch,
        "title_hint": title_hint or "",
        "commits": commits,
        "commit_subjects": [line.split(" ", 1)[1] if " " in line else line for line in commits.splitlines()],
        "diff_stat": diff_stat,
        "diff_name_status": diff_name_status,
        "files": files,
        "areas": areas,
        "issues": issues,
    }


def testing_checklist() -> str:
    return "\n".join(
        [
            "- [ ] Existing test suite still passes",
            "  - Command(s): TODO: list commands run, or explain why they were not run.",
            "- [ ] New tests added for this change",
            "  - TODO: list new test files/cases, or mark N/A if no new tests were needed.",
            "- [ ] Manual checks completed",
            "  - TODO: describe manual validation, or mark N/A.",
        ]
    )


def checklist() -> list[str]:
    return [
        "- [ ] Code follows the project's coding standards",
        "- [ ] Unit tests covering the new feature have been added",
        "- [ ] All existing tests pass",
        "- [ ] The documentation has been updated to reflect the new feature",
    ]


def commit_summary(context: dict[str, object]) -> str:
    hint = context_str(context, "title_hint").strip()
    subjects = context_str_list(context, "commit_subjects")
    files = context_str_list(context, "files")
    if hint:
        return hint
    if subjects:
        primary = subjects[0].rstrip(".")
        conventional = re.match(r"^(feat|fix|docs|test|refactor|chore|perf|build|ci)(?:\([^)]+\))?:\s+(.+)$", primary)
        if conventional:
            kind, subject = conventional.groups()
            verbs = {
                "feat": "adds",
                "fix": "fixes",
                "docs": "updates documentation for",
                "test": "updates tests for",
                "refactor": "refactors",
                "chore": "updates maintenance work for",
                "perf": "improves performance for",
                "build": "updates build configuration for",
                "ci": "updates CI for",
            }
            return f"This PR {verbs[kind]} {subject}."
        return f"This PR includes {primary[0].lower() + primary[1:]}."
    if files:
        return "This PR updates " + ", ".join(files[:4]) + "."
    return "TODO: Summarize the changes introduced by this PR."


def commit_changes(context: dict[str, object]) -> str:
    subjects = context_str_list(context, "commit_subjects")
    files = context_str_list(context, "files")
    bullets = [f"- {subject.rstrip('.')}" for subject in subjects[:8]]
    if files:
        bullets.append("- Updated files: " + ", ".join(files[:8]) + ("." if len(files) <= 8 else ", ..."))
    return "\n".join(dict.fromkeys(bullets)) or "- TODO: List the major changes made."


def commit_impact(context: dict[str, object]) -> str:
    areas = context_str_list(context, "areas")
    files = context_str_list(context, "files")
    if not areas and not files:
        return "- TODO: Describe impact and risks based on the diff."
    lines = []
    if areas:
        lines.append("- Affected areas: " + ", ".join(areas) + ".")
    sensitive = [path for path in files if any(token in path.lower() for token in ["schema", "migration", "config", "auth", "api", "route"])]
    if sensitive:
        lines.append("- Review behavior/configuration impact for: " + ", ".join(sensitive[:8]) + ".")
    lines.append("- Review the generated PR body against the implementation diff before opening the PR.")
    return "\n".join(lines)


def openspec_section_content(title: str, context: dict[str, object]) -> str:
    proposal = context_str(context, "proposal")
    design = context_str(context, "design")
    change_id = context_str(context, "change_id")
    issues = context_str_list(context, "issues")
    spec_paths = cast("list[Path]", context.get("spec_paths", []))
    spec_texts = cast("list[tuple[Path, str]]", context.get("spec_texts", []))

    normalized = title.lower()
    if "summary" in normalized:
        changes = extract_section(proposal, "What Changes")
        return first_paragraph(changes) or prose_from_bullets(bullets_from_markdown(changes)) or "TODO: Summarize the feature introduced by this PR."
    if "rationale" in normalized:
        rationale = first_paragraph(extract_section(proposal, "Why"))
        design_context = first_paragraph(extract_section(design, "Context"))
        return "\n\n".join(part for part in [rationale, design_context] if part) or "TODO: Explain why this change is needed."
    if "related issues" in normalized:
        return "\n".join(issues) or "- N/A"
    if "design documentation" in normalized:
        docs = [
            f"- `openspec/changes/{change_id}/proposal.md`",
            f"- `openspec/changes/{change_id}/design.md`",
        ]
        docs.extend(f"- `{path}`" for path in spec_paths)
        return "\n".join(docs)
    if normalized == "changes" or "changes" in normalized:
        bullets = bullets_from_markdown(extract_section(proposal, "What Changes"))
        bullets.extend(f"- Implement requirement: {name}" for name in requirement_names(spec_texts))
        return "\n".join(dict.fromkeys(bullets)) or "- TODO: List the major changes made."
    if "impact" in normalized:
        impact = bullets_from_markdown(extract_section(proposal, "Impact"))
        risks = bullets_from_markdown(extract_section(design, "Risks / Trade-offs"))
        return "\n".join(impact + risks) or "- TODO: Describe impact and risks."
    if "additional notes" in normalized:
        notes = []
        if any("(TBD)" in issue for issue in issues):
            notes.append("- Linear issue IDs include TBD values; update them before merging if available.")
        notes.append("- Review generated content against the implementation diff before opening the PR.")
        return "\n".join(notes)
    return shared_section_content(title, context)


def commit_section_content(title: str, context: dict[str, object]) -> str:
    normalized = title.lower()
    issues = context_str_list(context, "issues")
    if "summary" in normalized:
        return commit_summary(context)
    if "rationale" in normalized:
        return "Derived from commit history and branch diff. Replace with business/user rationale if the commits do not capture the motivation."
    if "related issues" in normalized:
        return "\n".join(issues) or "- N/A"
    if "design documentation" in normalized:
        return "- N/A"
    if normalized == "changes" or "changes" in normalized:
        return commit_changes(context)
    if "impact" in normalized:
        return commit_impact(context)
    if "additional notes" in normalized:
        return "\n".join(
            [
                f"- Generated from commit context against `{context_str(context, 'base')}` because no matching OpenSpec artifacts were found.",
                "- Review Summary, Rationale, and Impact before opening the PR.",
            ]
        )
    return shared_section_content(title, context)


def shared_section_content(title: str, context: dict[str, object]) -> str:
    normalized = title.lower()
    if "testing" in normalized:
        return testing_checklist()
    if "screenshots" in normalized or "video" in normalized:
        return "N/A"
    if "checklist" in normalized:
        return "\n".join(checklist())
    return "TODO"


def section_content(title: str, context: dict[str, object]) -> str:
    if context_str(context, "mode") == "openspec":
        return openspec_section_content(title, context)
    return commit_section_content(title, context)


def generate_body(template: str, context: dict[str, object]) -> str:
    matches = list(SECTION_RE.finditer(template))
    if not matches:
        return template

    output: list[str] = []
    for index, match in enumerate(matches):
        heading_start = match.start()
        heading_end = match.end()
        if index == 0:
            output.append(template[:heading_start].rstrip())
        title = match.group(1).strip()
        output.append(template[heading_start:heading_end])
        output.append("")
        output.append(section_content(title, context))
        output.append("")
    return "\n".join(part for part in output if part != "").rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="Repository root")
    parser.add_argument("--change-id", help="OpenSpec change id")
    parser.add_argument("--mode", choices=["auto", "openspec", "commits"], default="auto", help="Source mode")
    parser.add_argument("--base", help="Base branch/ref for commit-context mode")
    parser.add_argument("--title-hint", help="Optional title or summary hint for commit-context mode")
    parser.add_argument("--output", type=Path, required=True, help="PR body output path")
    args = parser.parse_args()

    repo = args.repo.resolve()
    template_path = repo / ".github" / "pull_request_template.md"
    if not template_path.exists():
        raise SystemExit(f"Missing PR template: {template_path}")

    selected_mode, change_id = resolve_mode(repo, args.mode, args.change_id)
    template = read_text(template_path)
    if selected_mode == "openspec":
        context = build_openspec_context(repo, change_id or "")
    else:
        context = build_commit_context(repo, detect_base(repo, args.base), args.title_hint)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(generate_body(template, context), encoding="utf-8")
    print(args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
