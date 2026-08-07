import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import { isAxiosError } from "axios";
import { HTTPClient, type HTTPClientConfig } from "@/shared/axios/axios";
import { buildConfig } from "@/shared/axios/config";

export interface LoginResult {
  accessToken: string;
}

interface LoginSuccessResponse {
  status: "success";
  message: string;
  data: LoginResult;
}

interface ApiErrorResponse {
  message?: string;
  error?: {
    code?: string;
  };
}

export class AuthServiceError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor({
    message,
    status,
    code,
  }: {
    message: string;
    status?: number;
    code?: string;
  }) {
    super(message);
    this.name = "AuthServiceError";
    this.status = status;
    this.code = code;
  }

  static from(error: unknown): AuthServiceError {
    if (error instanceof AuthServiceError) {
      return error;
    }
    if (isAxiosError<ApiErrorResponse>(error)) {
      return new AuthServiceError({
        message: error.response?.data?.message ?? error.message,
        status: error.response?.status,
        code: error.response?.data?.error?.code ?? error.code,
      });
    }
    return new AuthServiceError({
      message: error instanceof Error ? error.message : "Something went wrong.",
    });
  }
}

export class AuthService {
  private readonly httpClient: HTTPClient;

  constructor(config: HTTPClientConfig) {
    this.httpClient = new HTTPClient(config);
  }

  async login(payload: LoginPayload): Promise<LoginResult> {
    try {
      const { data: result } = await this.httpClient.post<
        LoginSuccessResponse,
        LoginPayload
      >("/auth/login", payload);
      const { accessToken } = result.data;
      return { accessToken };
    } catch (error) {
      throw AuthServiceError.from(error);
    }
  }
}

export const authService = new AuthService(
  buildConfig(import.meta.env.VITE_API_BASE_URL, undefined, true)
);
