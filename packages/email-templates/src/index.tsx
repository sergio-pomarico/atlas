import { render } from "react-email";
import { PasswordResetEmail } from "./emails/password-reset-email.js";
import { VerificationEmail } from "./emails/verification-email.js";

export async function renderPasswordResetEmail({
  code,
}: {
  code: string;
}): Promise<string> {
  return await render(<PasswordResetEmail code={code} />);
}

export async function renderVerificationEmail({
  name,
  verificationUrl,
}: {
  name: string;
  verificationUrl: string;
}): Promise<string> {
  return await render(
    <VerificationEmail name={name} verificationUrl={verificationUrl} />
  );
}
