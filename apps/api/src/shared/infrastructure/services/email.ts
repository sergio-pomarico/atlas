import type { SecretManagerService } from "@shared/infrastructure/services/secret-manager.ts";
import { inject, injectable } from "inversify";
import { Resend } from "resend";

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  htmlBody: string;
  attachments?: Attachment[];
}

export interface Attachment {
  filename: string;
  path: string;
}

export class EmailServiceError extends Error {
  private constructor(message: string) {
    super(message);
    this.name = "EmailServiceError";
    Error.captureStackTrace(this, EmailServiceError);
  }

  static notInitialized(): EmailServiceError {
    return new EmailServiceError(
      "EmailService has not been initialized. Call initialize() before send()."
    );
  }
}

@injectable()
export class EmailService {
  private readonly from = "codeo <hola@codeo.co>";
  private transporter: Resend | null = null;
  private readonly secretManager: SecretManagerService;

  constructor(
    @inject("SecretManagerService")
    secretManager: SecretManagerService
  ) {
    this.secretManager = secretManager;
  }

  async initialize(): Promise<void> {
    const resendApiKey = await this.secretManager.getSecret("RESEND_API_KEY");
    this.transporter = new Resend(resendApiKey.secretKey);
  }

  send = async (options: SendMailOptions): Promise<boolean> => {
    if (!this.transporter) {
      throw EmailServiceError.notInitialized();
    }

    const { to, subject, htmlBody, attachments = [] } = options;

    const { data } = await this.transporter.emails.send({
      from: this.from,
      to,
      subject,
      html: htmlBody,
      attachments,
    });

    return Boolean(data);
  };
}
