import { describe, expect, it } from "vitest";
import {
  DEFAULT_DIRECTORY_PARAMS,
  directorySearch,
  parseDirectoryParams,
} from "./directory-params";

const UNIT = "0b0f8f3e-2c4b-4a7e-9d61-3f1c2a9b8e70";

describe("directory params", () => {
  it("falls back to the defaults for missing or malformed values", () => {
    expect(parseDirectoryParams({})).toEqual(DEFAULT_DIRECTORY_PARAMS);
    expect(
      parseDirectoryParams({ unit: "x", status: "gone", sort: "salary", page: "-3", size: "7" })
    ).toEqual(DEFAULT_DIRECTORY_PARAMS);
  });

  it("round-trips through the URL, writing only what differs", () => {
    const params = {
      ...DEFAULT_DIRECTORY_PARAMS,
      search: "ana",
      unitId: UNIT,
      status: "leavers" as const,
      sort: "start_date" as const,
      descending: true,
      page: 2,
      size: 100,
    };
    const search = directorySearch(params);
    expect(search).toBe(
      `?q=ana&unit=${UNIT}&status=leavers&sort=start_date&desc=1&page=3&size=100`
    );
    expect(parseDirectoryParams(Object.fromEntries(new URLSearchParams(search)))).toEqual(params);
    expect(directorySearch(DEFAULT_DIRECTORY_PARAMS)).toBe("");
  });
});
