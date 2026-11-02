import type { ReactNode } from "react";

// Email clients don't support CSS variables or stylesheets, so templates use inline styles with
// the Material baseline colours. This is the one place literal colours are allowed.
export const COLORS = {
  surface: "#fef7ff",
  onSurface: "#1d1b20",
  onSurfaceVariant: "#49454f",
  primary: "#6750a4",
  onPrimary: "#ffffff",
  outline: "#cac4d0",
} as const;

/** A filled button, as a link. */
export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
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
      {children}
    </a>
  );
}

/** The page every email shares: hidden preview text, a heading, the content and a footer. */
export function EmailShell({
  preview,
  heading,
  footer,
  children,
}: {
  preview: string;
  heading: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{heading}</title>
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
        <div style={{ display: "none", maxHeight: 0, overflow: "hidden" }}>{preview}</div>
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
                        {heading}
                      </td>
                    </tr>
                    {children}
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
                        {footer}
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
