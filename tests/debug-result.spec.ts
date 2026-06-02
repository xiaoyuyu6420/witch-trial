import { test, expect } from "@playwright/test";

test("debug result page transition", async ({ page }) => {
  page.on("console", (msg) => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    console.log(`[PAGE ERROR] ${err.message}\n${err.stack}`);
  });

  // 直接访问测试页面
  await page.goto("/test", { waitUntil: "networkidle" });

  // 等待第一个问题
  await expect(page.locator(".q-text")).toBeVisible({ timeout: 10000 });
  console.log("[TEST] First question loaded");

  // 只答最后3题来快速测试
  // 先快速答完前面的题
  for (let i = 0; i < 23; i++) {
    const optBlocks = page.locator(".opt-block");
    const count = await optBlocks.count();
    if (count > 0) {
      await optBlocks.first().click();
      await page.waitForTimeout(600);
    }
  }

  console.log("[TEST] Answered first 23 questions, now answering remaining...");

  // 答剩下的题，每题都打印详细信息
  for (let i = 0; i < 5; i++) {
    const optBlocks = page.locator(".opt-block");
    const count = await optBlocks.count();

    if (count === 0) {
      console.log(`[Q${24 + i}] No options found!`);

      // 检查结果页面
      const resultLayout = page.locator(".result-layout");
      if (await resultLayout.isVisible({ timeout: 100 }).catch(() => false)) {
        console.log("[TEST] Result page is visible!");
        const name = await page.locator(".r-name").textContent();
        console.log(`[RESULT] ${name}`);
        return;
      }

      // 检查加载状态
      const loading = page.locator("text=/加载|Loading/");
      if (await loading.isVisible({ timeout: 100 }).catch(() => false)) {
        console.log("[TEST] Loading indicator visible, waiting...");
        await page.waitForTimeout(5000);
      }

      // 截图
      await page.screenshot({ path: `test-results/debug-q${24 + i}.png` });
      break;
    }

    const qText = await page.locator(".q-text").textContent();
    console.log(`[Q${24 + i}] ${qText?.slice(0, 60)}... | Options: ${count}`);

    await optBlocks.first().click();
    await page.waitForTimeout(800);
  }

  // 最终检查
  await page.waitForTimeout(2000);
  const resultLayout = page.locator(".result-layout");
  const isVisible = await resultLayout.isVisible({ timeout: 5000 }).catch(() => false);

  if (isVisible) {
    const name = await page.locator(".r-name").textContent();
    console.log(`[SUCCESS] Result: ${name}`);
  } else {
    console.log("[FAILED] Result page not visible");
    await page.screenshot({ path: "test-results/debug-final.png" });

    // 打印页面内容
    const html = await page.content();
    console.log(`[DEBUG] Page contains result-layout: ${html.includes("result-layout")}`);
    console.log(`[DEBUG] Page contains opt-block: ${html.includes("opt-block")}`);
  }

  expect(isVisible).toBe(true);
});
