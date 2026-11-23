import { Plugin } from "@opencode/plugin";

const whitespace = /\s/;
const globalFlags = new Set([
  "-P",
  "-p",
  "--bare",
  "--no-pager",
  "--paginate",
  "--no-replace-objects",
  "--no-optional-locks",
  "--literal-pathspecs",
  "--glob-pathspecs",
  "--noglob-pathspecs",
  "--icase-pathspecs",
]);
const optionsWithValue = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--config-env",
  "--shallow-file",
  "--attr-source",
]);
const optionsWithInlineValue = new Set([
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
  "--config-env",
  "--shallow-file",
  "--attr-source",
  "--list-cmds",
]);

function tokenize(resource: string): string[] {
  const tokens: string[] = [];
  let token = "";
  let started = false;
  let quote: "'" | '"' | undefined;
  let escaped = false;

  for (const char of resource) {
    if (escaped) {
      token += char;
      escaped = false;
    } else if (char === "\\" && quote !== "'") {
      escaped = true;
      started = true;
    } else if (quote) {
      if (char === quote) {
        quote = undefined;
      } else {
        token += char;
      }
    } else if (char === "'" || char === '"') {
      quote = char;
      started = true;
    } else if (whitespace.test(char)) {
      if (started) {
        tokens.push(token);
        token = "";
        started = false;
      }
    } else {
      token += char;
      started = true;
    }
  }
  if (escaped) {
    token += "\\";
  }
  if (started) {
    tokens.push(token);
  }
  return tokens;
}

function executableName(token: string | undefined): string | undefined {
  return token?.slice(token.lastIndexOf("/") + 1);
}

function gitSubcommand(
  tokens: string[]
): { name: string; index: number } | undefined {
  let index = 1;
  while (index < tokens.length) {
    const option = tokens[index];
    if (globalFlags.has(option)) {
      index += 1;
    } else if (optionsWithValue.has(option)) {
      index += 2;
    } else if (
      [...optionsWithInlineValue].some(
        (name) =>
          option.startsWith(`${name}=`) && option.length >= name.length + 1
      ) ||
      (option.startsWith("-C") && option.length > 2) ||
      (option.startsWith("-c") && option.length > 2)
    ) {
      index += 1;
    } else if (option.startsWith("-")) {
      return;
    } else {
      return { name: option, index };
    }
  }
}

function matchesBlockedGitInvocation(tokens: string[]): boolean {
  if (executableName(tokens[0]) !== "git") {
    return false;
  }
  const command = gitSubcommand(tokens);
  if (!command) {
    return false;
  }
  if (
    command.name === "reset" ||
    command.name === "clean" ||
    command.name === "restore"
  ) {
    return true;
  }
  if (command.name !== "checkout") {
    return false;
  }
  const separator = tokens.indexOf("--", command.index + 1);
  return separator >= 0 && separator < tokens.length - 1;
}

export function invokesBlockedGitCommand(resource: string): boolean {
  return matchesBlockedGitInvocation(tokenize(resource));
}

export function shouldDenyShellEvaluation(
  action: string,
  resources: readonly string[]
): boolean {
  return action === "shell" && resources.some(invokesBlockedGitCommand);
}

export default Plugin.define({
  id: "git-guard",
  async setup(ctx) {
    await ctx.permission.hook("evaluate", (evaluation) => {
      if (shouldDenyShellEvaluation(evaluation.action, evaluation.resources)) {
        evaluation.effect = "deny";
        evaluation.message =
          "Atlas blocks git reset, clean, and restore, and git checkout -- <path> shell commands.";
      }
    });
  },
});
