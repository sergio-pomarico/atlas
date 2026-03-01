import { PrismaPg } from "@prisma/adapter-pg";
import type {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
} from "@prisma/client/runtime/client";
import { envConfig } from "@shared/utils/config.ts";
import { PrismaClient } from "../../../../generated/prisma/client.ts";

const connectionString = `${envConfig().databaseUrl}`;
const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });

export type PrismaError =
  | PrismaClientKnownRequestError
  | PrismaClientUnknownRequestError;
export default prisma;
