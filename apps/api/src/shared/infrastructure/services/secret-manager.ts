import { InfisicalSDK, type Secret } from "@infisical/sdk";
import { envConfig } from "@shared/utils/config.ts";

export class SecretMangerService {
  private static instance: SecretMangerService;
  private readonly client: InfisicalSDK;

  private constructor() {
    this.client = new InfisicalSDK();
    this.client.auth().accessToken(envConfig().secretToken);
  }

  static getIntance(): SecretMangerService {
    if (!SecretMangerService.instance) {
      SecretMangerService.instance = new SecretMangerService();
    }
    return SecretMangerService.instance;
  }

  async getSecret(key: string): Promise<Secret> {
    const secret = await this.client.secrets().getSecret({
      environment: envConfig().environment,
      projectId: "48f6cdd7-7e10-40f6-9662-f82e6847cd60",
      secretName: key,
    });
    return secret;
  }
}
