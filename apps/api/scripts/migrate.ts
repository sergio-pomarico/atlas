import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { InfisicalSDK } from "@infisical/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AllowedCommand {
  command: string;
  subcommands: string[];
  allowedInProd: boolean;
}

// ─── Allowed commands whitelist ───────────────────────────────────────────────

const ALLOWED_COMMANDS: AllowedCommand[] = [
  {
    command: "migrate",
    subcommands: ["dev", "status"],
    allowedInProd: false,
  },
  {
    command: "migrate",
    subcommands: ["deploy", "status"],
    allowedInProd: true,
  },
  {
    command: "db",
    subcommands: ["push", "pull", "seed"],
    allowedInProd: false,
  },
  {
    command: "studio",
    subcommands: [],
    allowedInProd: false,
  },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateArgs(args: string[], environment: string): void {
  if (args.length === 0) {
    throw new Error(
      "You must specify a Prisma command. Example: migrate dev, migrate deploy, db push"
    );
  }

  const [command, subcommand] = args;
  const isProduction = environment === "prod" || environment === "production";

  const match = ALLOWED_COMMANDS.find(
    (entry) =>
      entry.command === command &&
      (entry.subcommands.length === 0 ||
        (subcommand !== undefined && entry.subcommands.includes(subcommand)))
  );

  if (!match) {
    throw new Error(
      `Command not allowed: "prisma ${args.join(" ")}"\n` +
        "Valid commands:\n" +
        "  migrate dev\n" +
        "  migrate deploy\n" +
        "  migrate status\n" +
        "  db push\n" +
        "  db pull\n" +
        "  db seed\n" +
        "  studio"
    );
  }

  if (isProduction && !match.allowedInProd) {
    throw new Error(
      `Command "prisma ${command} ${subcommand ?? ""}" is not allowed in "${environment}" environment.\n` +
        `Only "migrate deploy" and "migrate status" are allowed in production.`
    );
  }

  // migrate reset is always blocked — must be run manually and intentionally
  if (command === "migrate" && subcommand === "reset") {
    throw new Error(
      '"migrate reset" is blocked in this script for safety.\n' +
        "Run it manually only if you are sure: pnpm prisma migrate reset"
    );
  }
}

// ─── Load secrets ─────────────────────────────────────────────────────────────

async function loadSecretsIntoEnv(environment: string): Promise<void> {
  console.log(
    `🔐 Loading secrets from Infisical [environment: ${environment}]...`
  );

  const token = process.env.SECRET_MANAGER_TOKEN;
  const projectId = process.env.INFISICAL_PROJECT_ID;

  if (!token) {
    throw new Error(
      "Missing SECRET_MANAGER_TOKEN in .env file. Cannot authenticate with Infisical."
    );
  }

  if (!projectId) {
    throw new Error(
      "Missing INFISICAL_PROJECT_ID in .env file. Cannot fetch secrets from Infisical."
    );
  }

  const client = new InfisicalSDK();
  client.auth().accessToken(token);

  const timeoutMs = 10_000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `Timeout connecting to Infisical after ${timeoutMs}ms. Check your network or token.`
          )
        ),
      timeoutMs
    )
  );

  const databaseUrlSecret = await Promise.race([
    client.secrets().getSecret({
      environment,
      projectId,
      secretName: "DATABASE_URL",
    }),
    timeoutPromise,
  ]);

  process.env.DATABASE_URL = databaseUrlSecret.secretValue;

  console.log("✅ Secrets loaded successfully");
}

// ─── Run Prisma command ───────────────────────────────────────────────────────

function runPrismaCommand(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Running: prisma ${args.join(" ")}\n`);

    const prisma = spawn("pnpm", ["prisma", ...args], {
      stdio: "inherit",
      env: process.env,
    });

    prisma.on("close", (code) => {
      // Clean up DATABASE_URL from process.env once Prisma finishes
      process.env.DATABASE_URL = undefined;

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Prisma exited with code: ${code}`));
      }
    });

    prisma.on("error", (err) => {
      process.env.DATABASE_URL = undefined;
      reject(err);
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Load local .env to get Infisical credentials (SECRET_MANAGER_TOKEN, INFISICAL_PROJECT_ID)
  const envPath = path.resolve(import.meta.dirname, "../.env");

  try {
    process.loadEnvFile(envPath);
  } catch {
    throw new Error(
      `Could not load .env file at: ${envPath}\n` +
        "Make sure the file exists with SECRET_MANAGER_TOKEN and INFISICAL_PROJECT_ID defined."
    );
  }

  const environment = process.env.NODE_ENV ?? "dev";
  const prismaArgs = process.argv.slice(2);

  // 1. Validate args before connecting to Infisical
  validateArgs(prismaArgs, environment);

  // 2. Load secrets into process.env via Infisical SDK
  await loadSecretsIntoEnv(environment);

  // 3. Run Prisma with enriched process.env
  await runPrismaCommand(prismaArgs);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ Error: ${message}`);
  process.exit(1);
});
