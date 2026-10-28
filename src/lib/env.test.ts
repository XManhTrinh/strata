import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

describe("parsePublicEnv", () => {
  it("returns the variables when all are valid", () => {
    expect(parsePublicEnv(valid)).toEqual(valid);
  });

  it("names every missing or invalid variable", () => {
    expect(() =>
      parsePublicEnv({
        ...valid,
        NEXT_PUBLIC_SUPABASE_URL: "not a url",
        NEXT_PUBLIC_SITE_URL: undefined,
      })
    ).toThrow("NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SITE_URL");
  });
});
