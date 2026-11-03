import { useAuthStore } from "@/stores/auth-store";
import { HTTPClient } from "./axios";
import { buildConfig } from "./config";

export const apiClient = new HTTPClient({
  ...buildConfig(import.meta.env.VITE_API_BASE_URL, undefined, true),
  getAccessToken: () => useAuthStore.getState().accessToken,
});
