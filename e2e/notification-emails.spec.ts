import { expect, test } from "@playwright/test";

test.skip(({ viewport }) => (viewport?.width ?? 0) < 1000, "one run is enough");

test("the notification email job runs only with the jobs secret", async ({ request }) => {
  const url = "/api/jobs/notification-emails";
  expect((await request.post(url)).status()).toBe(404);
  expect((await request.post(url, { headers: { Authorization: "Bearer wrong" } })).status()).toBe(
    404
  );

  const run = await request.post(url, {
    headers: { Authorization: `Bearer ${process.env.JOBS_SECRET ?? "local-jobs-secret"}` },
  });
  expect(run.status()).toBe(200);
  expect(await run.json()).toMatchObject({ failed: 0 });
});
