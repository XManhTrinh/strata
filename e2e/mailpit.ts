const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/** Waits for the newest email to an address in the local Mailpit inbox and returns its first link. */
export async function latestLinkFor(email: string, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await fetch(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`
    );
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`);
      const { HTML, Text } = (await message.json()) as { HTML: string; Text: string };
      const link = /href="([^"]+)"/.exec(HTML)?.[1] ?? /(https?:\/\/\S+)/.exec(Text)?.[1];
      if (link) return link.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No email for ${email} within ${timeoutMs}ms`);
}
