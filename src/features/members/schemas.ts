import { z } from "zod";

const MAX_INVITES = 50;

/** Emails separated by commas, semicolons, spaces or new lines; duplicates are removed. */
export const inviteSchema = z.object({
  emails: z
    .string()
    .transform((value) => [
      ...new Set(
        value
          .split(/[\s,;]+/)
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      ),
    ])
    .pipe(
      z
        .array(z.email({ error: "emailInvalid" }))
        .min(1, { error: "emailsRequired" })
        .max(MAX_INVITES, { error: "tooManyEmails" })
    ),
  roleId: z.uuid({ error: "roleRequired" }),
});
