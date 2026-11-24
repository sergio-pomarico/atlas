import assert from "node:assert/strict";
import test from "node:test";
import {
  invokesBlockedGitCommand,
  shouldDenyShellEvaluation,
} from "./index.ts";

test("blocks reset, clean, and restore regardless of flags", () => {
  for (const resource of [
    "git reset",
    "git reset --hard",
    "git reset --soft HEAD~1",
    "git -C /repo reset --soft HEAD",
    'git -C "a\\" b" reset --hard',
    'git -C "" reset --hard',
    "git -C/repo -cuser.name=Atlas reset --hard",
    "git -P reset --hard",
    "git -p clean -fd",
    "git clean",
    "git clean -n",
    "git clean -fd",
    "git clean -nfd",
    "git restore file",
    "git restore --staged file",
    "git restore --worktree --source=HEAD file",
    "/usr/bin/git reset --hard",
    "./tools/git clean -fd",
  ]) {
    assert.equal(invokesBlockedGitCommand(resource), true, resource);
  }
});

test("blocks checkout with a nonempty explicit pathspec after --", () => {
  for (const resource of [
    "git checkout -- file",
    "git checkout HEAD -- file",
    'git checkout -- "file with spaces"',
    "git checkout -- 'file with spaces'",
    "git checkout -- *.ts",
    "git checkout \\-- file",
    "git checkout -- file\\ with\\ spaces",
    "git -C /repo checkout -- file",
    "git -c user.name=Atlas --work-tree '/repo with spaces' checkout HEAD -- file",
    "git --work-tree=/repo checkout -- file",
    "/usr/bin/git --git-dir '/repo/.git' checkout -- file",
  ]) {
    assert.equal(invokesBlockedGitCommand(resource), true, resource);
  }
});

test("does not block allowed checkout forms or empty separators", () => {
  for (const resource of [
    "git checkout",
    "git checkout main",
    "git -C /repo checkout other",
    "git checkout -b feature",
    "git checkout --detach HEAD",
    "git checkout --",
    "git checkout HEAD --",
  ]) {
    assert.equal(invokesBlockedGitCommand(resource), false, resource);
  }
});

test("does not treat mentions, option values, or other executables as git calls", () => {
  for (const resource of [
    'printf "git checkout -- file"',
    "printf '%s\\n' 'git reset --hard'",
    "echo git reset --hard",
    "diff --git a/file b/file",
    "printf '%s' -- git checkout -- file",
    "git -c 'message=--' status",
    "git --work-tree '--' status",
    "git -C checkout --work-tree -- checkout main",
    "git --unknown reset --hard",
    "git checkout --detach",
    "git checkout --branch=feature",
    "not-git reset --hard",
  ]) {
    assert.equal(invokesBlockedGitCommand(resource), false, resource);
  }
});

test("denies the complete shell evaluation if any resource is blocked", () => {
  assert.equal(
    shouldDenyShellEvaluation("shell", ["printf safe", "git reset --hard"]),
    true
  );
  assert.equal(
    shouldDenyShellEvaluation("shell", [
      "touch marker",
      "git checkout -- file",
    ]),
    true
  );
  assert.equal(
    shouldDenyShellEvaluation("shell", ['printf "git checkout -- file"']),
    false
  );
  assert.equal(shouldDenyShellEvaluation("read", ["git reset --hard"]), false);
});
