/** ISO 3166-1 alpha-2 country codes. Names come from Intl.DisplayNames in the user's language. */
export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR " +
  "BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ " +
  "EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW " +
  "GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY " +
  "KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV " +
  "MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY " +
  "QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG " +
  "TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

const EURO_COUNTRIES = new Set(
  "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split(" ")
);

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  AE: "AED",
  AU: "AUD",
  BG: "BGN",
  BR: "BRL",
  CA: "CAD",
  CH: "CHF",
  CN: "CNY",
  CZ: "CZK",
  DK: "DKK",
  GB: "GBP",
  HK: "HKD",
  HU: "HUF",
  IL: "ILS",
  IN: "INR",
  JP: "JPY",
  KR: "KRW",
  MD: "MDL",
  MX: "MXN",
  NO: "NOK",
  NZ: "NZD",
  PL: "PLN",
  RO: "RON",
  RS: "RSD",
  SA: "SAR",
  SE: "SEK",
  SG: "SGD",
  TR: "TRY",
  UA: "UAH",
  US: "USD",
  ZA: "ZAR",
};

/** Countries whose fiscal year usually doesn't start in January. */
const FISCAL_YEAR_START_BY_COUNTRY: Record<string, number> = {
  AU: 7,
  GB: 4,
  HK: 4,
  IN: 4,
  JP: 4,
  NZ: 4,
  PK: 7,
  ZA: 3,
};

/** A starting suggestion only; every value stays editable. */
export function suggestedCurrency(country: string): string {
  return EURO_COUNTRIES.has(country) ? "EUR" : (CURRENCY_BY_COUNTRY[country] ?? "USD");
}

export function suggestedFiscalYearStart(country: string): number {
  return FISCAL_YEAR_START_BY_COUNTRY[country] ?? 1;
}

/** ISO weekday the week starts on (1 = Monday, 7 = Sunday), from the locale when known. */
export function suggestedWeekStart(locale: string): number {
  try {
    const intlLocale = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
    };
    return intlLocale.getWeekInfo?.().firstDay ?? 1;
  } catch {
    return 1;
  }
}

/** The region part of a locale such as "en-GB", if it is a known country. */
export function countryFromLocale(locale: string): string | undefined {
  const region = locale.split("-")[1]?.toUpperCase();
  return region && COUNTRY_CODES.includes(region) ? region : undefined;
}

/** Turns a workspace name into a web address: lower-case letters, digits and hyphens. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

/** Returns all time zones for a country using the Intl API. Falls back to empty array. */
export function timeZonesForCountry(country: string): string[] {
  try {
    const locale = new Intl.Locale(`und-${country}`) as Intl.Locale & {
      getTimeZones?: () => string[];
    };
    return locale.getTimeZones?.() ?? [];
  } catch {
    return [];
  }
}

/** Checks if a time zone belongs to a country. */
export function isTimeZoneInCountry(country: string, zone: string): boolean {
  const zones = timeZonesForCountry(country);
  return zones.length > 0 && zones.includes(zone);
}

/** Suggests a primary/representative time zone for a country. */
export function suggestedTimeZone(country: string): string {
  const zones = timeZonesForCountry(country);
  // Return first zone (usually the most populous/primary) or fallback
  if (zones.length > 0) return zones[0]!;
  // Fallback: use country code as region hint, prefer capital city zone
  const fallbackMap: Record<string, string> = {
    US: "America/New_York",
    GB: "Europe/London",
    DE: "Europe/Berlin",
    FR: "Europe/Paris",
    JP: "Asia/Tokyo",
    AU: "Australia/Sydney",
    CA: "America/Toronto",
    CN: "Asia/Shanghai",
    IN: "Asia/Kolkata",
    BR: "America/Sao_Paulo",
    MX: "America/Mexico_City",
    ES: "Europe/Madrid",
    IT: "Europe/Rome",
    NL: "Europe/Amsterdam",
    BE: "Europe/Brussels",
    CH: "Europe/Zurich",
    AT: "Europe/Vienna",
    PT: "Europe/Lisbon",
    PL: "Europe/Warsaw",
    SE: "Europe/Stockholm",
    NO: "Europe/Oslo",
    DK: "Europe/Copenhagen",
    FI: "Europe/Helsinki",
    IE: "Europe/Dublin",
    NZ: "Pacific/Auckland",
    SG: "Asia/Singapore",
    HK: "Asia/Hong_Kong",
    KR: "Asia/Seoul",
    TH: "Asia/Bangkok",
    MY: "Asia/Kuala_Lumpur",
    PH: "Asia/Manila",
    ID: "Asia/Jakarta",
    VN: "Asia/Ho_Chi_Minh",
    ZA: "Africa/Johannesburg",
    EG: "Africa/Cairo",
    NG: "Africa/Lagos",
    KE: "Africa/Nairobi",
    RU: "Europe/Moscow",
    TR: "Europe/Istanbul",
    SA: "Asia/Riyadh",
    AE: "Asia/Dubai",
    IL: "Asia/Jerusalem",
    AR: "America/Argentina/Buenos_Aires",
    CL: "America/Santiago",
    CO: "America/Bogota",
    PE: "America/Lima",
    RO: "Europe/Bucharest",
    HU: "Europe/Budapest",
    CZ: "Europe/Prague",
    GR: "Europe/Athens",
    SK: "Europe/Bratislava",
    LT: "Europe/Vilnius",
    LV: "Europe/Riga",
    EE: "Europe/Tallinn",
    SI: "Europe/Ljubljana",
    HR: "Europe/Zagreb",
    BG: "Europe/Sofia",
    UA: "Europe/Kyiv",
    RS: "Europe/Belgrade",
  };
  return fallbackMap[country] ?? "UTC";
}

/**
 * Maps an IANA time zone to its primary ISO 3166 alpha-2 country code.
 * Uses a curated map for common zones; returns undefined for unknown zones.
 * This is a best-effort suggestion, not a validation.
 */
export function countryFromTimeZone(timeZone: string): string | undefined {
  // Curated IANA time zone → country map (primary/most populous zone for each country)
  const ZONE_TO_COUNTRY: Record<string, string | undefined> = {
    // Europe
    "Europe/London": "GB",
    "Europe/Paris": "FR",
    "Europe/Berlin": "DE",
    "Europe/Madrid": "ES",
    "Europe/Rome": "IT",
    "Europe/Amsterdam": "NL",
    "Europe/Brussels": "BE",
    "Europe/Vienna": "AT",
    "Europe/Zurich": "CH",
    "Europe/Lisbon": "PT",
    "Europe/Warsaw": "PL",
    "Europe/Stockholm": "SE",
    "Europe/Oslo": "NO",
    "Europe/Copenhagen": "DK",
    "Europe/Helsinki": "FI",
    "Europe/Dublin": "IE",
    "Europe/Athens": "GR",
    "Europe/Prague": "CZ",
    "Europe/Budapest": "HU",
    "Europe/Bucharest": "RO",
    "Europe/Moscow": "RU",
    "Europe/Istanbul": "TR",
    "Europe/Kyiv": "UA",
    "Europe/Belgrade": "RS",
    "Europe/Bratislava": "SK",
    "Europe/Ljubljana": "SI",
    "Europe/Zagreb": "HR",
    "Europe/Sofia": "BG",
    "Europe/Vilnius": "LT",
    "Europe/Riga": "LV",
    "Europe/Tallinn": "EE",
    "Europe/Minsk": "BY",
    "Europe/Sarajevo": "BA",
    "Europe/Podgorica": "ME",
    "Europe/Skopje": "MK",
    "Europe/Tirane": "AL",
    "Europe/Andorra": "AD",
    "Europe/Monaco": "MC",
    "Europe/San_Marino": "SM",
    "Europe/Vaduz": "LI",
    "Europe/Gibraltar": "GI",
    "Europe/Jersey": "JE",
    "Europe/Guernsey": "GG",
    "Europe/Isle_of_Man": "IM",

    // Americas - North
    "America/New_York": "US",
    "America/Los_Angeles": "US",
    "America/Chicago": "US",
    "America/Denver": "US",
    "America/Phoenix": "US",
    "America/Anchorage": "US",
    "America/Toronto": "CA",
    "America/Vancouver": "CA",
    "America/Montreal": "CA",
    "America/Mexico_City": "MX",
    "America/Guadalajara": "MX",
    "America/Tijuana": "MX",

    // Americas - South/Central
    "America/Sao_Paulo": "BR",
    "America/Buenos_Aires": "AR",
    "America/Santiago": "CL",
    "America/Bogota": "CO",
    "America/Lima": "PE",
    "America/Caracas": "VE",
    "America/Belem": "BR",
    "America/Recife": "BR",
    "America/Brasilia": "BR",

    // Asia
    "Asia/Tokyo": "JP",
    "Asia/Shanghai": "CN",
    "Asia/Hong_Kong": "HK",
    "Asia/Singapore": "SG",
    "Asia/Seoul": "KR",
    "Asia/Kolkata": "IN",
    "Asia/Bangkok": "TH",
    "Asia/Jakarta": "ID",
    "Asia/Manila": "PH",
    "Asia/Kuala_Lumpur": "MY",
    "Asia/Ho_Chi_Minh": "VN",
    "Asia/Dubai": "AE",
    "Asia/Riyadh": "SA",
    "Asia/Qatar": "QA",
    "Asia/Kuwait": "KW",
    "Asia/Bahrain": "BH",
    "Asia/Amman": "JO",
    "Asia/Beirut": "LB",
    "Asia/Damascus": "SY",
    "Asia/Jerusalem": "IL",
    "Asia/Ankara": "TR",
    "Asia/Tashkent": "UZ",
    "Asia/Almaty": "KZ",
    "Asia/Baku": "AZ",
    "Asia/Tbilisi": "GE",
    "Asia/Yerevan": "AM",
    "Asia/Karachi": "PK",
    "Asia/Dhaka": "BD",
    "Asia/Colombo": "LK",
    "Asia/Kathmandu": "NP",
    "Asia/Yangon": "MM",
    "Asia/Phnom_Penh": "KH",
    "Asia/Vientiane": "LA",

    // Oceania
    "Australia/Sydney": "AU",
    "Australia/Melbourne": "AU",
    "Australia/Brisbane": "AU",
    "Australia/Perth": "AU",
    "Australia/Adelaide": "AU",
    "Pacific/Auckland": "NZ",
    "Pacific/Honolulu": "US",
    "Pacific/Guam": "GU",

    // Africa
    "Africa/Johannesburg": "ZA",
    "Africa/Cairo": "EG",
    "Africa/Lagos": "NG",
    "Africa/Nairobi": "KE",
    "Africa/Casablanca": "MA",
    "Africa/Addis_Ababa": "ET",
    "Africa/Khartoum": "SD",
    "Africa/Dakar": "SN",
    "Africa/Accra": "GH",
    "Africa/Abidjan": "CI",
    "Africa/Tunis": "TN",
    "Africa/Algiers": "DZ",

    // Others - these return undefined (unknown)
    UTC: undefined,
    GMT: undefined,
    "Etc/UTC": undefined,
    "Etc/GMT": undefined,
  };

  // Direct lookup first
  if (timeZone in ZONE_TO_COUNTRY) {
    return ZONE_TO_COUNTRY[timeZone];
  }

  // Try to match by prefix: extract the main region (e.g., "America" from "America/Indiana/Indianapolis")
  // and check if we have a mapping for that region
  const parts = timeZone.split("/");
  if (parts.length >= 1) {
    const region = parts[0]!;
    // Known regions that map to countries (not all regions are countries)
    const REGION_TO_COUNTRY: Record<string, string | undefined> = {
      America: "US",
      Atlantic: undefined,
      Europe: undefined,
      Africa: undefined,
      Asia: undefined,
      Pacific: undefined,
      Antarctica: undefined,
      Arctic: undefined,
      Indian: undefined,
      Etc: undefined,
    };
    if (region in REGION_TO_COUNTRY) {
      return REGION_TO_COUNTRY[region];
    }
  }

  // Try prefix matching: check if timeZone starts with any known zone
  // This handles sub-zones like America/Indiana/* -> America/*
  for (const [zone, country] of Object.entries(ZONE_TO_COUNTRY)) {
    if (zone.includes("/") && timeZone.startsWith(zone.split("/")[0]! + "/")) {
      return country;
    }
  }

  return undefined;
}
