import { test, expect } from "@playwright/test";

test("clear storage and test fresh", async ({ page }) => {
  page.on("console", (msg) => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    console.log(`[PAGE ERROR] ${err.message}`);
  });

  // 先访问页面
  await page.goto("http://localhost:3010/test", { waitUntil: "networkidle" });

  // 清除 localStorage
  await page.evaluate(() => {
    localStorage.removeItem("witch-trial-progress");
    console.log("Cleared witch-trial-progress from localStorage");
  });

  // 刷新页面
  await page.reload({ waitUntil: "networkidle" });

  // 等待第一个问题
  await expect(page.locator(".q-text")).toBeVisible({ timeout: 10000 });
  console.log("[TEST] First question loaded after clearing storage");

  // 快速答题
  let questionCount = 0;
  while (questionCount < 30) {
    const resultLayout = page.locator(".result-layout");
    if (await resultLayout.isVisible({ timeout: 100 }).catch(() => false)) {
      console.log(`[SUCCESS] Result page visible after ${questionCount} questions`);
      const name = await page.locator(".r-name").textContent();
      console.log(`[RESULT] ${name}`);
      expect(name).toBeTruthy();
      return;
    }

    const optBlocks = page.locator(".opt-block");
    const count = await optBlocks.count();

    if (count === 0) {
      await page.waitForTimeout(1000);
      if (await resultLayout.isVisible({ timeout: 100 }).catch(() => false)) {
        console.log(`[SUCCESS] Result page visible after ${questionCount} questions`);
        const name = await page.locator(".r-name").textContent();
        console.log(`[RESULT] ${name}`);
        expect(name).toBeTruthy();
        return;
      }
      console.log(`[STUCK] No options at question ${questionCount}`);
      break;
    }

    await optBlocks.first().click();
    await page.waitForTimeout(700);
    questionCount++;
  }

  const resultLayout = page.locator(".result-layout");
  const isVisible = await resultLayout.isVisible({ timeout: 5000 }).catch(() => false);
  expect(isVisible).toBe(true);
});
