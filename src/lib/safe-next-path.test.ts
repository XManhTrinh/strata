import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("keeps paths inside the app", () => {
    expect(safeNextPath("/w/acme/settings?tab=roles")).toBe("/w/acme/settings?tab=roles");
  });

  it.each([null, undefined, "", "https://evil.test", "//evil.test", "/\\evil.test", "w/acme"])(
    "falls back for %s",
    (next) => {
      expect(safeNextPath(next, "/home")).toBe("/home");
    }
  );
});
