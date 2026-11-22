import { Plugin } from "@opencode/plugin";

const destructiveCommands = new Set(["rm", "rmdir"]);
const envFlags = new Set(["-0", "-i", "-v", "--ignore-environment", "--null"]);
const envOptionSteps = new Map([...envFlags].map((option) => [option, 1]));
envOptionSteps.set("--", 0);
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
const splitStringOption = Symbol("split-string-option");
const inlineEnvOptionsWithValue = new Set(
  [...envOptionsWithValue].filter((option) => option.startsWith("--"))
);

function executableName(token: string | undefined): string | undefined {
  return token?.slice(token.lastIndexOf("/") + 1);
}

function isPlainToken(token: string | undefined): token is string {
  return token !== undefined && !unsupportedShellSyntax.test(token);
}

function isSplitStringOption(token: string | undefined): boolean {
  return (
    token === "-S" ||
    token === "--split-string" ||
    token?.startsWith("--split-string=") === true
  );
}

function valueEnvOptionStep(
  token: string,
  nextToken: string | undefined
): number | null | undefined {
  const [option] = token.split("=", 1);

  if (envOptionsWithValue.has(token)) {
    return isPlainToken(nextToken) ? 2 : undefined;
  }
  return inlineEnvOptionsWithValue.has(option) ? 1 : null;
}

function nonValueEnvOptionStep(token: string): number | undefined {
  const optionStep = envOptionSteps.get(token);

  if (optionStep !== undefined) {
    return optionStep;
  }
  if (assignment.test(token)) {
    return 1;
  }
  return token.startsWith("-") ? undefined : 0;
}

function envOptionStep(
  token: string | undefined,
  nextToken: string | undefined
): number | typeof splitStringOption | undefined {
  if (isSplitStringOption(token)) {
    return splitStringOption;
  }
  if (!isPlainToken(token)) {
    return;
  }

  const valueStep = valueEnvOptionStep(token, nextToken);

  if (valueStep !== null) {
    return valueStep;
  }
  return nonValueEnvOptionStep(token);
}

function skipEnvOptions(
  tokens: string[],
  start: number
): number | typeof splitStringOption | undefined {
  let index = start;

  while (index < tokens.length) {
    const token = tokens[index];
    const step = envOptionStep(token, tokens[index + 1]);

    if (typeof step !== "number") {
      return step;
    }
    if (step === 0) {
      return index;
    }
    index += step;
  }
}

function envExecutableToken(
  tokens: string[]
): string | typeof splitStringOption | undefined {
  const start = 1;
  const index = skipEnvOptions(tokens, start);

  if (typeof index !== "number") {
    return index;
  }
  const token = tokens[index];
  return token === "--" ? tokens[index + 1] : token;
}

function executableToken(
  tokens: string[]
): string | typeof splitStringOption | undefined {
  return tokens[0] === "env" ? envExecutableToken(tokens) : tokens[0];
}

export function invokesDestructiveCommand(resource: string): boolean {
  const token = executableToken(resource.trim().split(whitespace));
  // Quoted or escaped env syntax and executable tokens are unsupported;
  // arguments after a classified executable do not require shell parsing.
  return (
    token === splitStringOption ||
    (isPlainToken(token) &&
      destructiveCommands.has(executableName(token) ?? ""))
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
