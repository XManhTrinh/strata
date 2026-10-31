import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import messages from "./en.json";

const MIGRATIONS = join(__dirname, "../../supabase/migrations");

/** Permission keys added by the migrations' `insert into public.permissions` statements. */
function permissionKeys(): string[] {
  const keys = new Set<string>();
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8");
    for (const statement of sql.split(/;\s*\n/)) {
      if (!/insert into public\.permissions\b/i.test(statement)) continue;
      for (const match of statement.matchAll(/\(\s*'([a-z_]+\.[a-z_]+)',\s*'[a-z_]+'/g)) {
        keys.add(match[1]!);
      }
    }
  }
  return [...keys];
}

describe("permission texts", () => {
  it("finds the permissions", () => {
    expect(permissionKeys().length).toBeGreaterThan(20);
  });

  it("has a name and description for every permission", () => {
    const texts = messages.permissions as Record<string, Record<string, unknown>>;
    const missing = permissionKeys().filter((key) => {
      const [feature, action] = key.split(".") as [string, string];
      const entry = texts[feature]?.[action] as { name?: string; description?: string } | undefined;
      return !entry?.name || !entry.description;
    });
    expect(missing).toEqual([]);
  });
});
