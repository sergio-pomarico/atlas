import { SecretManagerService } from "@shared/infrastructure/services/secret-manager.ts";
import { Resend } from "resend";

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  htmlBody: string;
  attachements?: Attachement[];
}

export interface Attachement {
  filename: string;
  path: string;
}

export class EmailService {
  constructor() {
    this.initialize().catch((err) => {
      console.error("Error initializing EmailService:", err);
      throw err;
    });
  }

  private readonly secretManager: SecretManagerService =
    SecretManagerService.getInstance();
  transporter: Resend | null = null;

  async initialize(): Promise<void> {
    const resendApiKey = await this.secretManager.getSecret("RESEND_API_KEY");
    this.transporter = new Resend(resendApiKey.secretKey);
  }

  send = async (options: SendMailOptions): Promise<boolean> => {
    const { to, subject, htmlBody, attachements = [] } = options;
    if (!this.transporter) {
      return false;
    }
    const { data } = await this.transporter.emails.send({
      from: "codeo <hola@codeo.co>",
      to,
      subject,
      html: htmlBody,
      attachments: attachements,
    });
    if (data) {
      return true;
    }
    return false;
  };
}
