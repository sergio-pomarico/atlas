import type { PropsWithChildren } from "react";

const pageStyle = {
  backgroundColor: "#f9f9f9",
  color: "#333333",
  fontFamily: "Arial, sans-serif",
  lineHeight: "1.6",
  margin: "0",
  padding: "0",
};

const containerStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
  margin: "0 auto",
  maxWidth: "600px",
  width: "100%",
};

const headerStyle = {
  backgroundColor: "#212121",
  borderRadius: "8px 8px 0 0",
  padding: "30px 30px 20px",
};

const footerStyle = {
  backgroundColor: "#f5f5f5",
  borderRadius: "0 0 8px 8px",
  color: "#666666",
  fontSize: "24px",
  lineHeight: "1.2",
  padding: "30px 30px 20px",
  textAlign: "center" as const,
};

export function EmailLayout({
  children,
  title,
}: PropsWithChildren<{ title: string }>) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>{title}</title>
      </head>
      <body style={pageStyle}>
        <table
          cellPadding="0"
          cellSpacing="0"
          style={{ backgroundColor: "#f9f9f9", border: "0" }}
          width="100%"
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "40px 0" }}>
                <table
                  cellPadding="0"
                  cellSpacing="0"
                  style={containerStyle}
                  width="600"
                >
                  <tbody>
                    <EmailHeader />
                    <tr>
                      <td style={{ padding: "40px 30px" }}>{children}</td>
                    </tr>
                    <tr>
                      <td style={footerStyle} />
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

function EmailHeader() {
  return (
    <tr>
      <td align="center" style={headerStyle} />
    </tr>
  );
}
