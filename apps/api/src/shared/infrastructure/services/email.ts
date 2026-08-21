import type { SecretManagerService } from "@shared/infrastructure/services/secret-manager.ts";
import { inject, injectable } from "inversify";
import { Resend } from "resend";

const EMAIL_DELIVERY_TIMEOUT_MS = 30_000;

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

export interface EmailDeliveryResult {
  accepted: boolean;
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
  private readonly timeoutMs: number;

  constructor(
    @inject("SecretManagerService")
    secretManager: SecretManagerService,
    timeoutMs = EMAIL_DELIVERY_TIMEOUT_MS
  ) {
    this.secretManager = secretManager;
    this.timeoutMs = timeoutMs;
  }

  // fallow-ignore-next-line unused-class-member
  async initialize(): Promise<void> {
    const resendApiKey = await this.secretManager.getSecret("RESEND_API_KEY");
    this.transporter = new Resend(resendApiKey.secretKey);
  }

  // fallow-ignore-next-line unused-class-member
  send = async (options: SendMailOptions): Promise<boolean> => {
    const result = await this.sendWithResult(options);
    return result.accepted;
  };

  async sendWithResult(options: SendMailOptions): Promise<EmailDeliveryResult> {
    if (!this.transporter) {
      throw EmailServiceError.notInitialized();
    }

    const { to, subject, htmlBody, attachments = [] } = options;

    const response = await withTimeout(
      this.transporter.emails.send({
        from: this.from,
        to,
        subject,
        html: htmlBody,
        attachments,
      }),
      this.timeoutMs
    );

    return { accepted: Boolean(response.data) && !response.error };
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Email delivery timed out.")),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
