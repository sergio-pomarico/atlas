import { Plugin } from "@opencode/plugin";

const destructiveCommands = new Set(["rm", "rmdir"]);
const envFlags = new Set(["-0", "-i", "-v", "--ignore-environment", "--null"]);
const envOptionsWithValue = new Set([
  "-C",
  "-S",
  "-u",
  "--block-signal",
  "--chdir",
  "--default-signal",
  "--ignore-signal",
  "--split-string",
  "--unset",
]);
const assignment = /^[A-Za-z_][A-Za-z0-9_]*=/;
const whitespace = /\s+/;
const unsupportedShellSyntax = /["'\\]/;

function executableName(token: string | undefined): string | undefined {
  return token?.slice(token.lastIndexOf("/") + 1);
}

function isPlainToken(token: string | undefined): token is string {
  return token !== undefined && !unsupportedShellSyntax.test(token);
}

function hasInlineLongOptionValue(
  token: string,
  options: Set<string>
): boolean {
  return [...options].some(
    (option) => option.startsWith("--") && token.startsWith(`${option}=`)
  );
}

function skipEnvOptions(tokens: string[], start: number): number | undefined {
  let index = start;

  while (index < tokens.length) {
    const token = tokens[index];

    if (!isPlainToken(token)) {
      return;
    }
    if (token === "--") {
      return index + 1;
    }
    if (envOptionsWithValue.has(token)) {
      if (!isPlainToken(tokens[index + 1])) {
        return;
      }
      index += 2;
      continue;
    }
    if (hasInlineLongOptionValue(token, envOptionsWithValue)) {
      index++;
      continue;
    }
    if (envFlags.has(token) || assignment.test(token)) {
      index++;
      continue;
    }
    if (token.startsWith("-")) {
      return;
    }
    return index;
  }
}

export function invokesDestructiveCommand(resource: string): boolean {
  const tokens = resource.trim().split(whitespace);
  let index = 0;

  if (tokens[index] === "env") {
    index = skipEnvOptions(tokens, index + 1) ?? -1;
  }

  // Quoted or escaped env syntax and executable tokens are unsupported;
  // arguments after a classified executable do not require shell parsing.
  return (
    isPlainToken(tokens[index]) &&
    destructiveCommands.has(executableName(tokens[index]) ?? "")
  );
}

export function shouldDenyShellEvaluation(
  action: string,
  resources: readonly string[]
): boolean {
  return action === "shell" && resources.some(invokesDestructiveCommand);
}

export default Plugin.define({
  id: "rm-guard",
  async setup(ctx) {
    await ctx.permission.hook("evaluate", (evaluation) => {
      if (shouldDenyShellEvaluation(evaluation.action, evaluation.resources)) {
        evaluation.effect = "deny";
        evaluation.message = "Atlas blocks rm and rmdir shell commands.";
      }
    });
  },
});
