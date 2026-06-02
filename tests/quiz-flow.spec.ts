import { test, expect } from "@playwright/test";

test.describe("Quiz Flow Test", () => {
  test("complete all questions and reach result page", async ({ page }) => {
    // 监听控制台
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`[BROWSER ERROR] ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      console.log(`[PAGE ERROR] ${err.message}`);
    });

    console.log("[TEST] Navigating to /test directly...");
    await page.goto("/test", {
      waitUntil: "networkidle",
      timeout: 30000
    });

    // 等待问题加载
    const questionText = page.locator(".q-text");
    await expect(questionText).toBeVisible({ timeout: 10000 });
    console.log("[TEST] First question loaded");

    // 获取总题数
    const metaText = await page.locator(".q-meta span").first().textContent();
    console.log(`[TEST] Meta text: ${metaText}`);

    // 循环答题
    let questionCount = 0;
    const maxQuestions = 30; // 安全上限

    while (questionCount < maxQuestions) {
      // 检查是否在结果页面 (使用正确的类名)
      const resultLayout = page.locator(".result-layout");
      if (await resultLayout.isVisible({ timeout: 100 }).catch(() => false)) {
        console.log(`[TEST] Reached result page after ${questionCount} questions!`);
        break;
      }

      // 检查是否有问题
      const optBlocks = page.locator(".opt-block");
      const optCount = await optBlocks.count();

      if (optCount === 0) {
        console.log(`[TEST] No options found at question ${questionCount}, waiting...`);
        await page.waitForTimeout(1000);

        // 再次检查结果页面
        if (await resultLayout.isVisible({ timeout: 100 }).catch(() => false)) {
          console.log(`[TEST] Reached result page after ${questionCount} questions!`);
          break;
        }

        // 截图当前状态
        await page.screenshot({ path: `test-results/quiz-stuck-q${questionCount}.png` });
        console.log(`[TEST] Stuck at question ${questionCount}, screenshot saved`);
        break;
      }

      // 获取当前问题文本
      const qText = await questionText.textContent();
      const qMeta = await page.locator(".q-meta span").first().textContent();
      console.log(`[Q${questionCount + 1}] ${qMeta} | ${qText?.slice(0, 50)}... | Options: ${optCount}`);

      // 点击第一个选项
      await optBlocks.first().click();

      // 等待动画
      await page.waitForTimeout(800);

      questionCount++;
    }

    // 最终检查
    const resultLayout = page.locator(".result-layout");
    const isResultVisible = await resultLayout.isVisible({ timeout: 5000 }).catch(() => false);

    if (isResultVisible) {
      console.log(`[TEST] SUCCESS: Result page visible after ${questionCount} questions`);

      // 获取结果名称
      const resultName = await page.locator(".r-name").textContent();
      console.log(`[TEST] Result: ${resultName}`);

      await page.screenshot({ path: "test-results/quiz-result-success.png" });
    } else {
      console.log(`[TEST] FAILED: Did not reach result page after ${questionCount} questions`);
      await page.screenshot({ path: "test-results/quiz-result-failed.png" });
    }

    expect(isResultVisible).toBe(true);
  });
});
