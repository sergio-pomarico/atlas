import assert from "node:assert/strict";
import test from "node:test";
import plugin, {
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

test("blocks direct force-push options and grouped -f regardless of position", () => {
  for (const resource of [
    "git push -f",
    "git push -ff",
    "git push -fuf origin main",
    "git push --force",
    "git push --force-with-lease",
    "git push --force-with-lease=main:abc123",
    "git push --force=value origin main",
    "git push -f=value origin main",
    "git push origin --force",
    "git push origin main -f",
    "git push -uf origin main",
    "git push -fuo --force origin main",
    "git push -4uf origin main",
    "git push -6f origin main",
    "git push origin --follow-tags -f",
    "git --git-dir=/repo push -f origin main",
  ]) {
    assert.equal(invokesBlockedGitCommand(resource), true, resource);
  }
});

test("does not block non-force push options, values, refspecs, or options after --", () => {
  for (const resource of [
    "git push",
    "git push origin main",
    "git push -u origin main",
    "git push --force-if-includes origin main",
    "git push --mirror",
    "git push origin +main",
    "git push -o --force origin main",
    "git push -uo --force origin main",
    "git push -uof origin main",
    "git push -uo -ff origin main",
    "git push -oflag origin main",
    "git push --push-option --force origin main",
    "git push --push-option=--force origin main",
    "git push --receive-pack --force origin main",
    "git push --receive-pack=--force origin main",
    "git push --exec=--force origin main",
    "git push --repo --force origin main",
    "git push --repo=--force origin main",
    "git push -Df origin main",
    "git push -tf origin main",
    "git push --recurse-submodules=on-demand origin main",
    "git push origin --follow-tags main",
    "git push origin -- --force",
    "git push origin -- -f",
    "echo git push --force",
    "git --unknown push --force",
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
  assert.equal(shouldDenyShellEvaluation("read", ["git push --force"]), false);
  assert.equal(
    shouldDenyShellEvaluation("shell", [
      "git push origin main",
      "git push --force",
      "printf safe",
    ]),
    true
  );
});

test("the permission.evaluate hook only changes force-push shell evaluations", async () => {
  interface Evaluation {
    action: string;
    resources: readonly string[];
    effect: string;
    message: string;
  }
  let evaluate: ((evaluation: Evaluation) => void) | undefined;
  const context = {
    permission: {
      hook: (name: string, callback: (evaluation: Evaluation) => void) => {
        assert.equal(name, "evaluate");
        evaluate = callback;
      },
    },
  } as unknown as Parameters<typeof plugin.setup>[0];

  await plugin.setup(context);
  assert.ok(evaluate);

  for (const effect of ["allow", "ask", "deny"]) {
    const normalPush = {
      action: "shell",
      resources: ["git push origin main"],
      effect,
      message: "unchanged",
    };
    evaluate(normalPush);
    assert.equal(normalPush.effect, effect);
    assert.equal(normalPush.message, "unchanged");
  }

  const forcePush = {
    action: "shell",
    resources: ["git push --force"],
    effect: "ask",
    message: "initial",
  };
  evaluate(forcePush);
  assert.equal(forcePush.effect, "deny");
});
