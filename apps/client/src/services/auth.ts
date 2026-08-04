import { buildConfig } from "@/shared/axios/config";
import { AuthService } from "./auth-service";

export const authService = new AuthService(
  buildConfig(import.meta.env.VITE_API_BASE_URL)
);
