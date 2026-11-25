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

export function PasswordResetEmail({ code }: { code: string }) {
  return (
    <EmailLayout title="Restablecimiento de Contraseña">
      <h1 style={headingStyle}>Restablecimiento de Contraseña</h1>

      <p style={paragraphStyle}>
        Hemos recibido una solicitud para restablecer la contraseña de tu
        cuenta. Utiliza el siguiente código para completar el proceso:
      </p>

      <table
        cellPadding="0"
        cellSpacing="0"
        style={{
          border: "0",
          margin: "0 auto",
          maxWidth: "420px",
        }}
        width="100%"
      >
        <tbody>
          <tr>
            <td
              style={{
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  color: "#666666",
                  fontSize: "14px",
                  margin: "0 0 10px",
                }}
              >
                Tu código de restablecimiento:
              </p>
              <p
                style={{
                  color: "#212121",
                  fontSize: "20px",
                  fontWeight: "bold",
                  letterSpacing: "5px",
                  margin: "0",
                }}
              >
                {code}
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ ...paragraphStyle, marginTop: "20px" }}>
        Este código expirará en 15 minutos. Si no solicitaste este
        restablecimiento de contraseña, puedes ignorar este correo.
      </p>
    </EmailLayout>
  );
}
