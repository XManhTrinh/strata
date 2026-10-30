import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { completeSignUp, createWorkspace, uniqueId } from "./helpers";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 600, "export is on larger screens");

test("the directory exports what it shows, as CSV", async ({ page }, testInfo) => {
  const id = uniqueId(testInfo.project.name);
  await page.goto("/sign-up");
  await completeSignUp(page, "Ana Pop", `ana-x-${id}@example.test`);
  await createWorkspace(page, "Company", `Acme ${id}`);
  await page.getByRole("link", { name: "People" }).first().click();
  await expect(
    page.getByRole("grid", { name: "People" }).getByRole("row", { name: /Ana Pop/ })
  ).toBeVisible();

  // Hide Email, then export: the file follows the visible columns.
  await page.getByRole("button", { name: "Columns" }).click();
  await page
    .getByRole("dialog", { name: "Columns" })
    .getByRole("row", { name: /Email/ })
    .press("Space");
  await page.getByRole("dialog", { name: "Columns" }).getByRole("button", { name: "Done" }).click();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^people-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = await readFile((await file.path())!, "utf8");
  const [header, first] = text.replace(/^﻿/, "").split("\r\n");
  expect(header).toBe("Name,Unit,Position,Level,Employment type,Manager,Start date");
  expect(first).toMatch(/^Ana Pop,Acme /);
});
