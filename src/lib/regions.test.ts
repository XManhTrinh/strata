import { describe, expect, it } from "vitest";
import { countryFromLocale, slugify, suggestedCurrency, suggestedFiscalYearStart } from "./regions";

describe("regional suggestions", () => {
  it("suggests currencies by country, euro for the eurozone", () => {
    expect(suggestedCurrency("GB")).toBe("GBP");
    expect(suggestedCurrency("RO")).toBe("RON");
    expect(suggestedCurrency("DE")).toBe("EUR");
    expect(suggestedCurrency("KE")).toBe("USD");
  });

  it("suggests April for the UK fiscal year and January elsewhere", () => {
    expect(suggestedFiscalYearStart("GB")).toBe(4);
    expect(suggestedFiscalYearStart("RO")).toBe(1);
  });

  it("reads the country from a locale", () => {
    expect(countryFromLocale("en-GB")).toBe("GB");
    expect(countryFromLocale("ro")).toBeUndefined();
  });
});

describe("slugify", () => {
  it("makes web-address-safe slugs", () => {
    expect(slugify("Ştefan & Co. Engineering")).toBe("stefan-co-engineering");
    expect(slugify("  --Acme--  ")).toBe("acme");
    expect(slugify("a".repeat(60))).toHaveLength(40);
  });
});
