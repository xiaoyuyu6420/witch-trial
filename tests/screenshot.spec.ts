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

      const response = await page.goto("http://localhost:3001", {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      expect(response?.status()).toBe(200);

      // Wait for welcome animation to complete
      await page.waitForTimeout(5000);

      // Check critical elements exist
      const hasCanvas = await page.locator("canvas").count() > 0;
      const hasBadge = await page.locator(".hero-badge").isVisible().catch(() => false);
      const hasSubtitle = await page.locator(".hero-subtitle").isVisible().catch(() => false);
      const hasStartButton = await page.locator(".art-btn-enter").isVisible().catch(() => false);

      console.log(`[${viewport.name}] Canvas: ${hasCanvas}, Badge: ${hasBadge}, Subtitle: ${hasSubtitle}, StartButton: ${hasStartButton}`);

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
    await page.goto("http://localhost:3001", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    // Capture welcome canvas area
    const canvas = page.locator("canvas").first();
    if (await canvas.isVisible()) {
      await canvas.screenshot({ path: "test-results/welcome-canvas.png" });
      console.log("[SCREENSHOT] Saved: test-results/welcome-canvas.png");
    }

    // Capture hero badge
    const badge = page.locator(".hero-badge");
    if (await badge.isVisible()) {
      await badge.screenshot({ path: "test-results/hero-badge.png" });
      console.log("[SCREENSHOT] Saved: test-results/hero-badge.png");
    }

    // Capture hero subtitle
    const subtitle = page.locator(".hero-subtitle");
    if (await subtitle.isVisible()) {
      await subtitle.screenshot({ path: "test-results/hero-subtitle.png" });
      console.log("[SCREENSHOT] Saved: test-results/hero-subtitle.png");
    }

    // Capture lang selector
    const lang = page.locator(".hero-lang");
    if (await lang.isVisible()) {
      await lang.screenshot({ path: "test-results/hero-lang.png" });
      console.log("[SCREENSHOT] Saved: test-results/hero-lang.png");
    }

    // Capture start button
    const startBtn = page.locator(".art-btn-enter");
    if (await startBtn.isVisible()) {
      await startBtn.screenshot({ path: "test-results/start-button.png" });
      console.log("[SCREENSHOT] Saved: test-results/start-button.png");
    }

    // Capture hint text
    const hint = page.locator(".art-btn-hint");
    if (await hint.isVisible()) {
      await hint.screenshot({ path: "test-results/start-hint.png" });
      console.log("[SCREENSHOT] Saved: test-results/start-hint.png");
    }

    // Capture hero desc block
    const desc = page.locator(".hero-desc-block");
    if (await desc.isVisible()) {
      await desc.screenshot({ path: "test-results/hero-desc.png" });
      console.log("[SCREENSHOT] Saved: test-results/hero-desc.png");
    }

    // Capture count text
    const count = page.locator(".hero-count");
    if (await count.isVisible()) {
      await count.screenshot({ path: "test-results/hero-count.png" });
      console.log("[SCREENSHOT] Saved: test-results/hero-count.png");
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
    await page.goto("http://localhost:3001", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);

    // Check element positions and styles
    const elements = [
      ".hero-badge",
      ".hero-subtitle",
      ".hero-desc-block",
      ".hero-count",
      ".hero-lang",
      ".art-btn-enter",
      ".art-btn-hint",
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
