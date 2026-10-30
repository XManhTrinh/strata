import { describe, expect, it } from "vitest";
import { guessMapping, parseAmount, parseDate, toImportRow } from "./mapping";

describe("import mapping", () => {
  it("guesses columns from common header names", () => {
    const mapping = guessMapping(
      ["Employee ID", "Full Name", "Work Email", "Line Manager ID", "Job Title", "Grade", "Site"],
      [{ key: "site", label: "Site" }]
    );
    expect(mapping.keyField).toBe("person_key");
    expect(mapping.columns).toEqual({
      person_key: "Employee ID",
      full_name: "Full Name",
      email: "Work Email",
      manager_key: "Line Manager ID",
      position: "Job Title",
      career_level: "Grade",
    });
    expect(mapping.custom).toEqual({ site: "Site" });
  });

  it("matches on email when there is no person key", () => {
    expect(guessMapping(["Name", "Email"], []).keyField).toBe("email");
  });

  it("reads dates in the chosen format, refusing impossible ones", () => {
    expect(parseDate("2026-3-1", "iso")).toBe("2026-03-01");
    expect(parseDate("01/03/2026", "dmy")).toBe("2026-03-01");
    expect(parseDate("01/03/2026", "mdy")).toBe("2026-01-03");
    expect(parseDate("31/02/2026", "dmy")).toBeUndefined();
    expect(parseDate("01/03/2026", "iso")).toBeUndefined();
    expect(parseDate(new Date(Date.UTC(2026, 2, 1)), "iso")).toBe("2026-03-01");
  });

  it("reads amounts with either decimal mark", () => {
    expect(parseAmount("52,000.50")).toBe(52000.5);
    expect(parseAmount("52.000,50")).toBe(52000.5);
    expect(parseAmount("52 000")).toBe(52000);
    expect(parseAmount(41000)).toBe(41000);
    expect(parseAmount("n/a")).toBeUndefined();
  });

  it("builds rows, leaving empty cells out and keeping unreadable values for the preview", () => {
    const row = toImportRow(
      {
        ID: "E-1",
        Name: " Ana Pop ",
        Division: "Tech",
        Squad: "",
        Start: "13/45/2026",
        Pay: "50,000",
        Site: "Leeds",
      },
      {
        keyField: "person_key",
        columns: { person_key: "ID", full_name: "Name", start_date: "Start", annual_salary: "Pay" },
        units: [
          { column: "Division", levelId: "l1" },
          { column: "Squad", levelId: "l2" },
        ],
        custom: { site: "Site" },
        dateFormat: "dmy",
      }
    );
    expect(row).toEqual({
      person_key: "E-1",
      full_name: "Ana Pop",
      start_date: "13/45/2026",
      annual_salary: 50000,
      unit_path: ["Tech"],
      custom: { site: "Leeds" },
    });
  });
});
