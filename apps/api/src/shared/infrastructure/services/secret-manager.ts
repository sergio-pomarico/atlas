import { InfisicalSDK, type Secret } from "@infisical/sdk";
import { envConfig } from "@shared/utils/config.ts";

export class SecretManagerService {
  private static instance: SecretManagerService;
  private readonly client: InfisicalSDK;

  private constructor() {
    this.client = new InfisicalSDK();
    this.client.auth().accessToken(envConfig().secretToken);
  }

  static getInstance(): SecretManagerService {
    if (!SecretManagerService.instance) {
      SecretManagerService.instance = new SecretManagerService();
    }
    return SecretManagerService.instance;
  }

  async getSecret(key: string): Promise<Secret> {
    const secret = await this.client.secrets().getSecret({
      environment: envConfig().environment,
      projectId: envConfig().infisicalProjectId,
      secretName: key,
    });
    return secret;
  }
}
