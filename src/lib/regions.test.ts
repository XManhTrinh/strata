import { describe, expect, it } from "vitest";
import {
  countryFromLocale,
  countryFromTimeZone,
  isTimeZoneInCountry,
  slugify,
  suggestedCurrency,
  suggestedFiscalYearStart,
  suggestedTimeZone,
  timeZonesForCountry,
} from "./regions";

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

describe("country from time zone", () => {
  it("derives GB from Europe/London", () => {
    expect(countryFromTimeZone("Europe/London")).toBe("GB");
  });

  it("derives US from America/New_York", () => {
    expect(countryFromTimeZone("America/New_York")).toBe("US");
  });

  it("derives US from other US zones like America/Los_Angeles", () => {
    expect(countryFromTimeZone("America/Los_Angeles")).toBe("US");
    expect(countryFromTimeZone("America/Chicago")).toBe("US");
  });

  it("derives country for less common zones by prefix", () => {
    expect(countryFromTimeZone("America/Indiana/Indianapolis")).toBe("US");
    expect(countryFromTimeZone("Australia/Queensland")).toBe("AU");
  });

  it("returns undefined for unknown zones", () => {
    expect(countryFromTimeZone("Unknown/Zone")).toBeUndefined();
    expect(countryFromTimeZone("UTC")).toBeUndefined();
  });

  it("handles multi-zone countries like Australia", () => {
    expect(countryFromTimeZone("Australia/Sydney")).toBe("AU");
    expect(countryFromTimeZone("Australia/Melbourne")).toBe("AU");
    expect(countryFromTimeZone("Australia/Perth")).toBe("AU");
  });
});

describe("time zone suggestions", () => {
  it("returns time zones for a country using Intl API", () => {
    const usZones = timeZonesForCountry("US");
    expect(usZones.length).toBeGreaterThan(0);
    expect(usZones).toContain("America/New_York");

    const gbZones = timeZonesForCountry("GB");
    expect(gbZones).toContain("Europe/London");
  });

  it("returns empty array for unknown country", () => {
    expect(timeZonesForCountry("XX")).toEqual([]);
  });

  it("checks if a time zone belongs to a country", () => {
    expect(isTimeZoneInCountry("US", "America/New_York")).toBe(true);
    expect(isTimeZoneInCountry("US", "Europe/London")).toBe(false);
    expect(isTimeZoneInCountry("GB", "Europe/London")).toBe(true);
    expect(isTimeZoneInCountry("GB", "America/New_York")).toBe(false);
    expect(isTimeZoneInCountry("XX", "UTC")).toBe(false);
  });

  it("suggests a primary time zone for a country", () => {
    // The Intl API returns the first zone alphabetically for the region
    expect(suggestedTimeZone("US")).toBe("America/Adak");
    expect(suggestedTimeZone("GB")).toBe("Europe/London");
    expect(suggestedTimeZone("JP")).toBe("Asia/Tokyo");
    expect(suggestedTimeZone("AU")).toBe("Antarctica/Macquarie");
  });

  it("falls back to UTC for unknown countries", () => {
    expect(suggestedTimeZone("XX")).toBe("UTC");
  });

  it("handles multi-zone countries (US has many zones)", () => {
    const usZones = timeZonesForCountry("US");
    expect(usZones.length).toBeGreaterThan(10);
    // The suggested zone should be one of the valid zones
    const suggested = suggestedTimeZone("US");
    expect(usZones).toContain(suggested);
  });
});

describe("slugify", () => {
  it("makes web-address-safe slugs", () => {
    expect(slugify("Ştefan & Co. Engineering")).toBe("stefan-co-engineering");
    expect(slugify("  --Acme--  ")).toBe("acme");
    expect(slugify("a".repeat(60))).toHaveLength(40);
  });
});
