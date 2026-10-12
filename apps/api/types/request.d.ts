import type { AccessToken } from "@atlas/schemas/lib/auth/token.ts";

declare global {
  // biome-ignore lint: because is a global declaration file
  namespace Express {
    interface Request {
      requestId?: string;
      file?: Express.Multer.File;
      auth?: {
        userId: string;
        sessionId: string;
        scope: AccessToken["scope"];
      };
    }
  }
}
