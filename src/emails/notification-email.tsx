import { COLORS, EmailButton, EmailShell } from "./shell";

export type NotificationEmailItem = { text: string; context: string; href: string };

export type NotificationEmailText = {
  preview: string;
  heading: string;
  button: string;
  footer: string;
  manage: string;
};

/** One or more notifications (instant, or the daily summary), each linking to its workspace. */
export function NotificationEmail({
  text,
  items,
  openUrl,
  manageUrl,
}: {
  text: NotificationEmailText;
  items: NotificationEmailItem[];
  openUrl: string;
  manageUrl: string;
}) {
  return (
    <EmailShell
      preview={text.preview}
      heading={text.heading}
      footer={
        <>
          {text.footer}{" "}
          <a href={manageUrl} style={{ color: COLORS.primary }}>
            {text.manage}
          </a>
        </>
      }
    >
      {items.map((item, index) => (
        <tr key={index}>
          <td style={{ paddingBottom: 16 }}>
            <div style={{ fontSize: 12, lineHeight: "16px", color: COLORS.onSurfaceVariant }}>
              {item.context}
            </div>
            <a
              href={item.href}
              style={{ fontSize: 16, lineHeight: "24px", color: COLORS.onSurface }}
            >
              {item.text}
            </a>
          </td>
        </tr>
      ))}
      <tr>
        <td style={{ paddingTop: 8, paddingBottom: 24 }}>
          <EmailButton href={openUrl}>{text.button}</EmailButton>
        </td>
      </tr>
    </EmailShell>
  );
}
