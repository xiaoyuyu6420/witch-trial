import { test, expect } from "@playwright/test";

test.describe("Homepage Screenshot Tests", () => {
  test("capture homepage at multiple viewports", async ({ page }) => {
    const viewports = [
      { name: "desktop", width: 1920, height: 1080 },
      { name: "laptop", width: 1280, height: 720 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "mobile", width: 375, height: 667 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      console.log(`[TEST] Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      const response = await page.goto("/", {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      expect(response?.status()).toBe(200);

      // Wait for welcome animation to complete
      await page.waitForTimeout(5000);

      // Check critical elements exist
      const hasCanvas = await page.locator("canvas").count() > 0;
      const hasTitle = await page.locator(".hero__title").isVisible().catch(() => false);
      const hasTagline = await page.locator(".hero__tagline").first().isVisible().catch(() => false);
      const hasStartButton = await page.locator(".hero__cta").isVisible().catch(() => false);

      console.log(`[${viewport.name}] Canvas: ${hasCanvas}, Title: ${hasTitle}, Tagline: ${hasTagline}, StartButton: ${hasStartButton}`);

      // Full page screenshot
      await page.screenshot({
        path: `test-results/homepage-${viewport.name}.png`,
        fullPage: false,
      });
      console.log(`[SCREENSHOT] Saved: test-results/homepage-${viewport.name}.png`);
    }
  });

  test("capture homepage elements detail", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    // Capture welcome canvas area
    const canvas = page.locator("canvas").first();
    if (await canvas.isVisible()) {
      await canvas.screenshot({ path: "test-results/welcome-canvas.png" });
      console.log("[SCREENSHOT] Saved: test-results/welcome-canvas.png");
    }

    // Capture hero title
    const title = page.locator(".hero__title");
    if (await title.isVisible()) {
      await title.screenshot({ path: "test-results/hero-title.png" });
      console.log("[SCREENSHOT] Saved: test-results/hero-title.png");
    }

    // Capture hero tagline
    const tagline = page.locator(".hero__taglines");
    if (await tagline.isVisible()) {
      await tagline.screenshot({ path: "test-results/hero-taglines.png" });
      console.log("[SCREENSHOT] Saved: test-results/hero-taglines.png");
    }

    // Capture lang selector
    const lang = page.locator(".lang-switcher");
    if (await lang.isVisible()) {
      await lang.screenshot({ path: "test-results/lang-switcher.png" });
      console.log("[SCREENSHOT] Saved: test-results/lang-switcher.png");
    }

    // Capture start button
    const startBtn = page.locator(".hero__cta");
    if (await startBtn.isVisible()) {
      await startBtn.screenshot({ path: "test-results/start-button.png" });
      console.log("[SCREENSHOT] Saved: test-results/start-button.png");
    }

    // Capture count text
    const count = page.locator(".hero__stats");
    if (await count.isVisible()) {
      await count.screenshot({ path: "test-results/hero-stats.png" });
      console.log("[SCREENSHOT] Saved: test-results/hero-stats.png");
    }

    // Capture particle canvas content
    const particleCanvas = page.locator("canvas");
    if (await particleCanvas.count() > 0) {
      await particleCanvas.first().screenshot({ path: "test-results/particle-canvas.png" });
      console.log("[SCREENSHOT] Saved: test-results/particle-canvas.png");
    }
  });

  test("check welcome screen layout issues", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    // Check element positions and styles
    const elements = [
      ".hero__overline",
      ".hero__title",
      ".hero__taglines",
      ".hero__stats",
      ".lang-switcher",
      ".hero__cta",
    ];

    const report: Record<string, unknown> = {};

    for (const selector of elements) {
      const el = page.locator(selector);
      if (await el.isVisible().catch(() => false)) {
        const box = await el.boundingBox();
        const computedStyle = await el.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            position: style.position,
            top: style.top,
            left: style.left,
            transform: style.transform,
            opacity: style.opacity,
            color: style.color,
            fontSize: style.fontSize,
            zIndex: style.zIndex,
          };
        });
        report[selector] = { box, computedStyle };
      } else {
        report[selector] = "NOT VISIBLE";
      }
    }

    console.log("[LAYOUT REPORT]", JSON.stringify(report, null, 2));

    // Check for overlapping elements
    const positions: Array<{ selector: string; box: { x: number; y: number; width: number; height: number } | null }> = [];
    for (const selector of elements) {
      const box = await page.locator(selector).boundingBox().catch(() => null);
      positions.push({ selector, box });
    }

    console.log("[POSITIONS]", JSON.stringify(positions, null, 2));

    // Save report to file
    await page.evaluate((data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "layout-report.json";
      a.click();
    }, { report, positions });
  });
});
