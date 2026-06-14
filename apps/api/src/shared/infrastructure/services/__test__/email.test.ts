import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import type {
  EmailServiceError as EmailServiceErrorType,
  EmailService as EmailServiceType,
  SendMailOptions,
} from "@shared/infrastructure/services/email.ts";
import type { SecretManagerService as SecretManagerServiceType } from "@shared/infrastructure/services/secret-manager.ts";
import type { Resend as ResendType } from "resend";

const mockedResend = jest.fn();
interface SendResponse {
  data: { id: string } | null;
}

const createSendMock = (response: SendResponse) =>
  jest
    .fn<(payload: unknown) => Promise<SendResponse>>()
    .mockResolvedValue(response);

jest.unstable_mockModule("resend", () => ({
  Resend: mockedResend,
}));

let EmailService: typeof EmailServiceType;
let EmailServiceError: typeof EmailServiceErrorType;
const mockGetSecret = jest.fn<SecretManagerServiceType["getSecret"]>();
const secretManager = {
  getSecret: mockGetSecret,
} as unknown as SecretManagerServiceType;

const baseMailOptions: SendMailOptions = {
  to: "user@example.com",
  subject: "Welcome",
  htmlBody: "<p>Hello</p>",
};

const createEmailService = async (response: SendResponse) => {
  const send = createSendMock(response);

  mockedResend.mockImplementation(
    () =>
      ({
        emails: {
          send,
        },
      }) as unknown as ResendType
  );

  const emailService = new EmailService(secretManager);
  await emailService.initialize();

  return { emailService, send };
};

describe("EmailService", () => {
  beforeAll(async () => {
    ({ EmailService, EmailServiceError } = await import(
      "@shared/infrastructure/services/email.ts"
    ));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSecret.mockResolvedValue({ secretKey: "resend-api-key" } as never);
    mockedResend.mockImplementation(
      () =>
        ({
          emails: {
            send: createSendMock({ data: { id: "email-id" } }),
          },
        }) as unknown as ResendType
    );
  });

  it("initializes Resend with the API key from the secret manager", async () => {
    const emailService = new EmailService(secretManager);

    await emailService.initialize();

    expect(mockGetSecret).toHaveBeenCalledWith("RESEND_API_KEY");
    expect(mockedResend).toHaveBeenCalledWith("resend-api-key");
  });

  it("throws an EmailServiceError when the transporter is not initialized", async () => {
    const emailService = new EmailService(secretManager);

    await expect(emailService.send(baseMailOptions)).rejects.toBeInstanceOf(
      EmailServiceError
    );
  });

  it("sends an email with the expected payload", async () => {
    const { emailService, send } = await createEmailService({
      data: { id: "email-id" },
    });

    await expect(
      emailService.send({
        ...baseMailOptions,
        to: ["user@example.com"],
        attachments: [{ filename: "invoice.pdf", path: "/tmp/invoice.pdf" }],
      })
    ).resolves.toBe(true);

    expect(send).toHaveBeenCalledWith({
      from: "codeo <hola@codeo.co>",
      to: ["user@example.com"],
      subject: "Welcome",
      html: "<p>Hello</p>",
      attachments: [{ filename: "invoice.pdf", path: "/tmp/invoice.pdf" }],
    });
  });

  it("uses an empty attachments array by default", async () => {
    const { emailService, send } = await createEmailService({
      data: { id: "email-id" },
    });

    await emailService.send(baseMailOptions);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: [] })
    );
  });

  it("returns false when Resend does not return data", async () => {
    const { emailService } = await createEmailService({ data: null });

    await expect(emailService.send(baseMailOptions)).resolves.toBe(false);
  });

  it("propagates errors from Resend", async () => {
    const send = jest
      .fn<(payload: unknown) => Promise<SendResponse>>()
      .mockRejectedValue(new Error("Resend failed") as never);

    mockedResend.mockImplementation(
      () => ({ emails: { send } }) as unknown as ResendType
    );

    const emailService = new EmailService(secretManager);
    await emailService.initialize();

    await expect(emailService.send(baseMailOptions)).rejects.toThrow(
      "Resend failed"
    );
  });
});
