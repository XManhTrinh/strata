"use client";

/** A spreadsheet as header names and one record per row, parsed in the browser (never uploaded). */
export type ParsedFile = {
  name: string;
  headers: string[];
  records: Record<string, unknown>[];
};

class UnreadableFileError extends Error {}

const MAX_ROWS = 200_000;

function fromGrid(name: string, grid: unknown[][]): ParsedFile {
  const [head = [], ...body] = grid;
  // Blank or repeated headers get a position-based name, so every column can be mapped.
  const seen = new Set<string>();
  const headers = head.map((cell, index) => {
    let header = String(cell ?? "").trim() || `Column ${index + 1}`;
    if (seen.has(header)) header = `${header} (${index + 1})`;
    seen.add(header);
    return header;
  });
  const records = body
    .filter((row) =>
      row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "")
    )
    .slice(0, MAX_ROWS)
    .map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? null])));
  if (headers.length === 0) throw new UnreadableFileError("No header row.");
  return { name, headers, records };
}

/** Reads CSV (any delimiter, UTF-8) or Excel (.xlsx, first sheet). */
export async function parseFile(file: File): Promise<ParsedFile> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    try {
      return fromGrid(file.name, (await readSheet(file)) as unknown[][]);
    } catch (error) {
      throw new UnreadableFileError(String(error));
    }
  }
  const Papa = (await import("papaparse")).default;
  const text = await file.text();
  const result = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: true });
  if (result.data.length === 0) throw new UnreadableFileError("Empty file.");
  return fromGrid(file.name, result.data);
}
