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
const forcePushOptions = new Set(["-f", "--force", "--force-with-lease"]);
const pushOptionsWithValue = new Set([
  "-o",
  "--push-option",
  "--receive-pack",
  "--exec",
  "--repo",
  "--recurse-submodules",
]);
const shortPushOption = /^-([uvqnd46f]*)(?:o(.*))?$/;

interface TokenizerState {
  tokens: string[];
  token: string | undefined;
  quote: "'" | '"' | undefined;
  escaped: boolean;
}

function flushToken(state: TokenizerState): void {
  if (state.token === undefined) {
    return;
  }
  state.tokens.push(state.token);
  state.token = undefined;
}

function beginToken(state: TokenizerState): string {
  if (state.token === undefined) {
    state.token = "";
  }
  return state.token;
}

function isQuote(char: string): char is "'" | '"' {
  return char === "'" || char === '"';
}

function isEscape(char: string, quote: TokenizerState["quote"]): boolean {
  return char === "\\" && quote !== "'";
}

function consumeQuotedCharacter(state: TokenizerState, char: string): void {
  if (char === state.quote) {
    state.quote = undefined;
  } else {
    state.token = `${state.token ?? ""}${char}`;
  }
}

function consumeUnquotedCharacter(state: TokenizerState, char: string): void {
  if (isQuote(char)) {
    state.quote = char;
    beginToken(state);
    return;
  }
  if (whitespace.test(char)) {
    flushToken(state);
    return;
  }
  state.token = `${beginToken(state)}${char}`;
}

function consumeCharacter(state: TokenizerState, char: string): void {
  if (state.escaped) {
    state.token = `${beginToken(state)}${char}`;
    state.escaped = false;
    return;
  }
  if (isEscape(char, state.quote)) {
    state.escaped = true;
    beginToken(state);
    return;
  }
  if (state.quote) {
    consumeQuotedCharacter(state, char);
    return;
  }
  consumeUnquotedCharacter(state, char);
}

function tokenize(resource: string): string[] {
  const state: TokenizerState = {
    tokens: [],
    token: undefined,
    quote: undefined,
    escaped: false,
  };

  for (const char of resource) {
    consumeCharacter(state, char);
  }
  if (state.escaped) {
    state.token = `${state.token ?? ""}\\`;
  }
  flushToken(state);
  return state.tokens;
}

function executableName(token: string | undefined): string | undefined {
  return token?.slice(token.lastIndexOf("/") + 1);
}

const inlineOptionPrefixes = [...optionsWithInlineValue].map(
  (option) => `${option}=`
);
const exactOptionAdvances = new Map([
  ...[...globalFlags].map((option) => [option, 1] as const),
  ...[...optionsWithValue].map((option) => [option, 2] as const),
]);

function hasInlineValue(option: string): boolean {
  return inlineOptionPrefixes.some((prefix) => option.startsWith(prefix));
}

function hasAttachedShortValue(option: string): boolean {
  return (
    option.length > 2 && (option.startsWith("-C") || option.startsWith("-c"))
  );
}

function optionAdvance(option: string): number | undefined {
  return (
    exactOptionAdvances.get(option) ??
    (hasInlineValue(option) || hasAttachedShortValue(option) ? 1 : undefined)
  );
}

function gitSubcommand(
  tokens: string[]
): { name: string; index: number } | undefined {
  let index = 1;
  while (index < tokens.length) {
    const option = tokens[index];
    if (!option.startsWith("-")) {
      return { name: option, index };
    }
    const advance = optionAdvance(option);
    if (advance === undefined) {
      return;
    }
    index += advance;
  }
}

const blockedSubcommands = new Set(["reset", "clean", "restore"]);

function parseShortPushOption(option: string): {
  hasForce: boolean;
  takesNextArgument: boolean;
} {
  const [, flags, attachedValue] = shortPushOption.exec(option) ?? [];
  return {
    hasForce: flags?.includes("f") ?? false,
    takesNextArgument: attachedValue === "",
  };
}

function pushOptionAdvance(option: string, takesNextArgument: boolean): number {
  if (pushOptionsWithValue.has(option)) {
    return 2;
  }
  if (takesNextArgument) {
    return 2;
  }
  return 1;
}

function isForcePushOption(option: string, hasShortForce: boolean): boolean {
  const optionName = option.split("=", 1)[0];
  return forcePushOptions.has(optionName) || hasShortForce;
}

function hasForcePushOption(tokens: string[], commandIndex: number): boolean {
  let index = commandIndex + 1;
  while (index < tokens.length) {
    const option = tokens[index];
    if (option === "--") {
      return false;
    }
    const shortOption = parseShortPushOption(option);
    if (isForcePushOption(option, shortOption.hasForce)) {
      return true;
    }
    index += pushOptionAdvance(option, shortOption.takesNextArgument);
  }
  return false;
}

function hasCheckoutPathspec(tokens: string[], commandIndex: number): boolean {
  const separator = tokens.indexOf("--", commandIndex + 1);
  return separator >= 0 && separator < tokens.length - 1;
}

type CommandBlocker = (tokens: string[], commandIndex: number) => boolean;

const commandBlockers = new Map<string, CommandBlocker>([
  ["checkout", hasCheckoutPathspec],
  ["push", hasForcePushOption],
]);

function isBlockedGitCommand(
  tokens: string[],
  command: { name: string; index: number }
): boolean {
  return (
    blockedSubcommands.has(command.name) ||
    (commandBlockers.get(command.name)?.(tokens, command.index) ?? false)
  );
}

function matchesBlockedGitInvocation(tokens: string[]): boolean {
  if (executableName(tokens[0]) !== "git") {
    return false;
  }
  const command = gitSubcommand(tokens);
  return command ? isBlockedGitCommand(tokens, command) : false;
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
          "Atlas blocks git reset, clean, and restore, git checkout -- <path>, and force git push shell commands.";
      }
    });
  },
});
