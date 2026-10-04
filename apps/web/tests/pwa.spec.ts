import { expect, type Page, test } from "@playwright/test";

async function controlledPage(page: Page) {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

test("production service worker controls the application", async ({ page }) => {
  await controlledPage(page);
  expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(
    "http://127.0.0.1:4173/sw.js"
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Web");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest"
  );
});

test("offline shell reload supports SPA documents, not resource requests", async ({
  page,
  context
}) => {
  await controlledPage(page);
  await context.setOffline(true);
  const response = await page.reload();
  expect(response?.fromServiceWorker()).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Web");
  const navigation = await page.goto("/arbitrary/nested/route?view=1");
  expect(navigation?.fromServiceWorker()).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Web");
  const fetchedHtml = await page.evaluate(() =>
    fetch("/unclaimed-route", { headers: { accept: "text/html" } }).then(
      () => true,
      () => false
    )
  );
  expect(fetchedHtml).toBe(false);
  for (const resource of [
    "/assets/missing.js",
    "/icons/missing.png",
    "/missing.webmanifest",
    "/another-worker.js",
    "/rpc/cache-probe",
    "/health/live",
    "/metrics"
  ]) {
    const tab = await context.newPage();
    await expect(tab.goto(resource)).rejects.toThrow();
    await tab.close();
  }
});

test("API responses are never runtime-cached", async ({ page, context }) => {
  await controlledPage(page);
  const first = await page.evaluate(() =>
    fetch("/rpc/cache-probe").then((response) => response.json())
  );
  const second = await page.evaluate(() =>
    fetch("/rpc/cache-probe").then((response) => response.json())
  );
  expect(second.sequence).toBeGreaterThan(first.sequence);
  await page.evaluate(() =>
    fetch("/rpc/v1/system-ping", {
      method: "POST",
      body: JSON.stringify({ platform: "web" }),
      headers: { "content-type": "application/json" }
    })
  );
  const cachedUrls = await page.evaluate(async () =>
    (
      await Promise.all(
        (
          await caches.keys()
        ).map(async (name) =>
          (await (await caches.open(name)).keys()).map((request) => request.url)
        )
      )
    ).flat()
  );
  expect(cachedUrls.some((url) => /\/(rpc|health|metrics)(\/|$)/.test(new URL(url).pathname))).toBe(
    false
  );
  await context.setOffline(true);
  for (const method of ["GET", "POST"]) {
    expect(
      await page.evaluate(
        (method) =>
          fetch(method === "GET" ? "/rpc/cache-probe" : "/rpc/v1/system-ping", { method }).then(
            () => true,
            () => false
          ),
        method
      )
    ).toBe(false);
  }
});
