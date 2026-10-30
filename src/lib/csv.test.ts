import { describe, expect, it } from "vitest";
import { csvCell, csvRow } from "./csv";

describe("csv", () => {
  it("quotes only when needed", () => {
    expect(csvCell("Ana Pop")).toBe("Ana Pop");
    expect(csvCell('Say "hi", Ana')).toBe('"Say ""hi"", Ana"');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(42)).toBe("42");
  });

  it("keeps formulas from running", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });

  it("ends rows with CRLF", () => {
    expect(csvRow(["a", "b,c"])).toBe('a,"b,c"\r\n');
  });
});
