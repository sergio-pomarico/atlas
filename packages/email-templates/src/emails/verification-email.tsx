import { EmailLayout } from "./email-layout.js";

const headingStyle = {
  color: "#333333",
  fontSize: "24px",
  lineHeight: "1.2",
  margin: "0 0 20px",
  textAlign: "center" as const,
};

const paragraphStyle = {
  fontSize: "16px",
  margin: "0 0 20px",
};

export function VerificationEmail({
  name,
  verificationUrl,
}: {
  name: string;
  verificationUrl: string;
}) {
  return (
    <EmailLayout title="Verificación de Correo Electrónico">
      <h1 style={headingStyle}>Verifica tu dirección de correo electrónico</h1>

      <p style={paragraphStyle}>Hola {name},</p>

      <p style={paragraphStyle}>
        Gracias por registrarte. Para completar tu registro y verificar tu
        cuenta, por favor haz clic en el botón de abajo:
      </p>

      <table
        cellPadding="0"
        cellSpacing="0"
        style={{ border: "0", padding: "30px 0" }}
        width="100%"
      >
        <tbody>
          <tr>
            <td align="center">
              <a
                href={verificationUrl}
                style={{
                  backgroundColor: "#212121",
                  borderRadius: "4px",
                  color: "#ffffff",
                  display: "inline-block",
                  fontSize: "16px",
                  fontWeight: "bold",
                  padding: "14px 30px",
                  textDecoration: "none",
                }}
                target="_blank"
              >
                Verificar mi correo
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <p style={paragraphStyle}>
        Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu
        navegador:
      </p>

      <p
        style={{
          ...paragraphStyle,
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
          fontSize: "14px",
          padding: "16px",
          wordBreak: "break-all",
        }}
      >
        <a href={verificationUrl} style={{ color: "inherit" }}>
          {verificationUrl}
        </a>
      </p>

      <p style={paragraphStyle}>
        Este enlace y código expirarán en 24 horas. Si no solicitaste esta
        verificación, puedes ignorar este correo.
      </p>
    </EmailLayout>
  );
}
