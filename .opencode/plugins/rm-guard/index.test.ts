import assert from "node:assert/strict";
import test from "node:test";
import {
  invokesDestructiveCommand,
  shouldDenyShellEvaluation,
} from "./index.ts";

test("matches direct rm and rmdir commands", () => {
  for (const resource of [
    "rm",
    "rm -f /missing",
    "rmdir /missing",
    "./rm /missing",
    "../rmdir /missing",
    "/bin/rm /missing",
    "/usr/bin/rmdir /missing",
    'rm "file with spaces"',
    "rmdir 'directory with spaces'",
    "/bin/rm 'file'",
  ]) {
    assert.equal(invokesDestructiveCommand(resource), true, resource);
  }
});

test("matches supported env wrappers", () => {
  for (const resource of [
    "env PATH=/bin rm /missing",
    "env -i PATH=/bin rmdir /missing",
    "env --chdir /tmp ./rm /missing",
    "env --chdir=/tmp rm /missing",
    "env --unset=value rm /missing",
  ]) {
    assert.equal(invokesDestructiveCommand(resource), true, resource);
  }
});

test("denies env split-string options before their payloads", () => {
  for (const resource of [
    "env -S printf safe",
    'env -S "printf safe"',
    "env --split-string printf safe",
    "env --split-string=printf safe",
    "env -u -- -S printf safe",
  ]) {
    assert.equal(invokesDestructiveCommand(resource), true, resource);
  }
});

test("env -- ends option scanning", () => {
  for (const resource of ["env -- printf safe", "env -- -S printf safe"]) {
    assert.equal(invokesDestructiveCommand(resource), false, resource);
  }
  assert.equal(invokesDestructiveCommand("env -- rm /missing"), true);
});

test("does not match sudo because it is outside scope", () => {
  assert.equal(invokesDestructiveCommand("sudo rm /missing"), false);
});

test("does not match text or arguments mentioning destructive commands", () => {
  for (const resource of [
    'printf "rm /missing"',
    "echo rm /missing",
    "printf rmdir",
    "git commit -m rm",
    "xrm /missing",
    'sudo printf "rm /missing"',
    "env MESSAGE=rm printf safe",
    "env -u rm printf safe",
    "env -C rm printf safe",
    "env --chdir rmdir printf safe",
    "env --unset rm printf safe",
    "env --chdir",
    "env --unset=rmdir printf safe",
    "env printf -S safe",
    "env -u -S printf safe",
    'printf "env -S printf safe"',
    "env --unknown rmdir /missing",
    'env VALUE="a rm b" printf safe',
    'env --chdir "/safe dir" rm /missing',
    "env VALUE=a\\ rm printf safe",
    '"rm" /missing',
    "r\\m /missing",
  ]) {
    assert.equal(invokesDestructiveCommand(resource), false, resource);
  }
});

test("denies a shell evaluation when any scanner resource is destructive", () => {
  assert.equal(
    shouldDenyShellEvaluation("shell", ["printf before", "rm /missing"]),
    true
  );
  assert.equal(
    shouldDenyShellEvaluation("shell", ['printf "rm /missing"']),
    false
  );
  assert.equal(shouldDenyShellEvaluation("read", ["rm /missing"]), false);
});
