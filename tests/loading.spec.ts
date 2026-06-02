import { test, expect } from "@playwright/test";

test.describe("Witch Trial Loading Test", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      console.log(`[PAGE ERROR] ${err.message}`);
    });
  });

  test("loading screen should complete and show main content", async ({ page }) => {
    console.log("[TEST] Navigating to homepage...");

    const response = await page.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    console.log(`[HTTP STATUS] ${response?.status()}`);
    expect(response?.status()).toBe(200);

    const loader = page.locator("#loader");
    await expect(loader).toBeVisible({ timeout: 5000 });
    console.log("[LOADER] Loading screen visible");

    // 等待加载完成（loader 应该滑出屏幕）
    console.log("[TEST] Waiting for loader to complete...");
    // 检查 transform 是否包含大的负值（表示已滑出）
    await expect(loader).toHaveCSS("transform", /matrix\(1, 0, 0, 1, 0, -[0-9]{2,}/, { timeout: 20000 });
    console.log("[LOADER] Loading complete, loader hidden");

    // 检查主内容是否可见
    const hero = page.locator(".hero");
    await expect(hero).toBeVisible({ timeout: 5000 });
    console.log("[CONTENT] Main content visible");

    // 检查按钮
    const startBtn = page.locator(".hero__cta");
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    const btnText = await startBtn.textContent();
    console.log(`[BUTTON] Text: "${btnText?.trim()}"`);

    // 检查 Canvas 背景
    const canvas = page.locator("#abyss-canvas");
    await expect(canvas).toBeVisible({ timeout: 5000 });
    console.log("[CANVAS] Abyss canvas visible");

    // 截图
    await page.screenshot({ path: "test-results/homepage-loaded.png", fullPage: false });
    console.log("[SCREENSHOT] Saved to test-results/homepage-loaded.png");
  });

  test("click start button should navigate to /test", async ({ page }) => {
    console.log("[TEST] Navigating to homepage...");

    await page.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    // 等待加载完成
    const loader = page.locator("#loader");
    await expect(loader).toHaveCSS("transform", /matrix\(1, 0, 0, 1, 0, -[0-9]{2,}/, { timeout: 20000 });
    console.log("[LOADER] Loading complete");

    // 等待 scramble 动画完成
    await page.waitForTimeout(3000);

    // 点击开始按钮
    const startBtn = page.locator(".hero__cta");
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    console.log("[TEST] Clicking start button...");

    await startBtn.click();

    await page.waitForURL("**/test", { timeout: 15000 });
    console.log(`[NAVIGATION] Current URL: ${page.url()}`);

    expect(page.url()).toContain("/test");
    console.log("[TEST] Successfully navigated to /test page");

    // 截图
    await page.screenshot({ path: "test-results/test-page.png", fullPage: false });
  });

  test("language switcher should work", async ({ page }) => {
    console.log("[TEST] Testing language switcher...");

    await page.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    // 等待加载完成
    const loader = page.locator("#loader");
    await expect(loader).toHaveCSS("transform", /matrix\(1, 0, 0, 1, 0, -[0-9]{2,}/, { timeout: 20000 });

    // 等待 scramble 动画完成
    await page.waitForTimeout(3000);

    // 点击英文按钮
    const enBtn = page.locator(".lang-btn[data-lang='en']");
    await expect(enBtn).toBeVisible({ timeout: 5000 });
    await enBtn.click();
    console.log("[LANG] Clicked EN button");

    // 等待文字变化
    await page.waitForTimeout(1500);

    // 检查按钮文字是否变成英文
    const startBtn = page.locator(".hero__cta");
    const btnText = await startBtn.textContent();
    console.log(`[BUTTON] Text after EN switch: "${btnText?.trim()}"`);
    expect(btnText?.trim()).toBe("Enter the Trial");

    // 点击日文按钮
    const jpBtn = page.locator(".lang-btn[data-lang='jp']");
    await jpBtn.click();
    await page.waitForTimeout(1500);

    const btnTextJp = await startBtn.textContent();
    console.log(`[BUTTON] Text after JP switch: "${btnTextJp?.trim()}"`);
    expect(btnTextJp?.trim()).toBe("審判を受ける");

    console.log("[LANG] Language switcher works correctly");
  });
});
