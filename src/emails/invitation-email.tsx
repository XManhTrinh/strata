import { COLORS, EmailButton, EmailShell } from "./shell";

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
    <EmailShell preview={text.preview} heading={text.heading} footer={text.footer}>
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
          <EmailButton href={acceptUrl}>{text.button}</EmailButton>
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
          <a href={acceptUrl} style={{ color: COLORS.primary, wordBreak: "break-all" }}>
            {acceptUrl}
          </a>
        </td>
      </tr>
    </EmailShell>
  );
}
