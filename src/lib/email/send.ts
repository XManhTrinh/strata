import "server-only";
import type { ReactElement } from "react";
import { render, toPlainText } from "@react-email/render";
import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv } from "@/lib/env.server";

let transport: Transporter | undefined;

/** Whether an email provider is set up; without one, people share links themselves. */
export function emailConfigured(): boolean {
  return Boolean(process.env.SMTP_URL);
}

/** Sends one email with HTML and plain-text bodies rendered from a React Email template. */
export async function sendEmail({
  to,
  subject,
  template,
}: {
  to: string;
  subject: string;
  template: ReactElement;
}): Promise<void> {
  const env = getServerEnv();
  transport ??= nodemailer.createTransport(env.SMTP_URL);
  const html = await render(template);
  await transport.sendMail({ from: env.EMAIL_FROM, to, subject, html, text: toPlainText(html) });
}
