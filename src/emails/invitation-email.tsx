// Email clients don't support CSS variables or stylesheets, so templates use inline styles with
// the Material baseline colours. This is the one place literal colours are allowed.
const COLORS = {
  surface: "#fef7ff",
  onSurface: "#1d1b20",
  onSurfaceVariant: "#49454f",
  primary: "#6750a4",
  onPrimary: "#ffffff",
  outline: "#cac4d0",
} as const;

export type InvitationEmailText = {
  preview: string;
  heading: string;
  body: string;
  button: string;
  linkHint: string;
  footer: string;
};

/** Translated text is passed in, so the template stays language-neutral. */
export function InvitationEmail({
  text,
  acceptUrl,
}: {
  text: InvitationEmailText;
  acceptUrl: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{text.heading}</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: "32px 16px",
          backgroundColor: COLORS.surface,
          fontFamily: "Roboto, Helvetica, Arial, sans-serif",
          color: COLORS.onSurface,
        }}
      >
        <div style={{ display: "none", maxHeight: 0, overflow: "hidden" }}>{text.preview}</div>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td align="center">
                <table
                  role="presentation"
                  width="100%"
                  style={{ maxWidth: 520 }}
                  cellPadding={0}
                  cellSpacing={0}
                >
                  <tbody>
                    <tr>
                      <td style={{ fontSize: 24, lineHeight: "32px", paddingBottom: 16 }}>
                        {text.heading}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          fontSize: 16,
                          lineHeight: "24px",
                          color: COLORS.onSurfaceVariant,
                          paddingBottom: 24,
                        }}
                      >
                        {text.body}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ paddingBottom: 24 }}>
                        <a
                          href={acceptUrl}
                          style={{
                            display: "inline-block",
                            backgroundColor: COLORS.primary,
                            color: COLORS.onPrimary,
                            textDecoration: "none",
                            fontSize: 14,
                            fontWeight: 500,
                            lineHeight: "20px",
                            padding: "10px 24px",
                            borderRadius: 20,
                          }}
                        >
                          {text.button}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          fontSize: 14,
                          lineHeight: "20px",
                          color: COLORS.onSurfaceVariant,
                          paddingBottom: 24,
                        }}
                      >
                        {text.linkHint}
                        <br />
                        <a
                          href={acceptUrl}
                          style={{ color: COLORS.primary, wordBreak: "break-all" }}
                        >
                          {acceptUrl}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          fontSize: 12,
                          lineHeight: "16px",
                          color: COLORS.onSurfaceVariant,
                          borderTop: `1px solid ${COLORS.outline}`,
                          paddingTop: 16,
                        }}
                      >
                        {text.footer}
                      </td>
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
