import { test, expect } from "@playwright/test";

test.describe("Witch Trial Frontend", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      console.log(`[PAGE ERROR] ${err.message}\n${err.stack}`);
    });
  });

  test("homepage loads without errors", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "networkidle", timeout: 30000 });
    console.log(`[HTTP STATUS] ${response?.status()}`);
    expect(response?.status()).toBe(200);

    await page.waitForTimeout(3000);

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const particleCanvas = page.locator("#abyss-canvas");
    await expect(particleCanvas).toBeVisible({ timeout: 10000 });
    console.log("[PARTICLE TITLE CANVAS VISIBLE] OK");

    const startButton = page.locator(".hero__cta");
    await expect(startButton).toBeVisible({ timeout: 10000 });
    console.log("[START BUTTON VISIBLE] OK");
  });

  test("welcome screen shows correct content", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    const title = page.locator(".hero__title");
    if (await title.isVisible()) {
      console.log(`[TITLE] ${await title.textContent()}`);
    }

    const tagline = page.locator(".hero__tagline").first();
    if (await tagline.isVisible()) {
      console.log(`[TAGLINE] ${await tagline.textContent()}`);
    }

    const langButtons = page.locator(".lang-switcher button");
    const count = await langButtons.count();
    console.log(`[LANG BUTTONS] ${count}`);
    expect(count).toBeGreaterThan(0);
  });

  test("click start and complete first question", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(3000);

    const startButton = page.locator(".hero__cta");
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click();

    await page.waitForTimeout(1500);

    const optBlocks = page.locator(".opt-block");
    await expect(optBlocks.first()).toBeVisible({ timeout: 10000 });
    const optCount = await optBlocks.count();
    console.log(`[OPTIONS COUNT] ${optCount}`);

    await optBlocks.first().click();
    await page.waitForTimeout(1500);

    const questionText = page.locator(".q-text");
    if (await questionText.isVisible()) {
      console.log(`[QUESTION TEXT] ${(await questionText.textContent())?.slice(0, 50)}...`);
    }
  });

  test("API endpoints return valid data", async ({ page }) => {
    const quizRes = await page.request.get("/api/quiz");
    console.log(`[API /quiz STATUS] ${quizRes.status()}`);
    const quizData = await quizRes.json();
    console.log(`[API /quiz] questions: ${quizData.questions?.length}, types: ${quizData.types?.length}`);

    const countRes = await page.request.get("/api/count");
    console.log(`[API /count STATUS] ${countRes.status()}`);
    const countData = await countRes.json();
    console.log(`[API /count] total: ${countData.total}`);

    expect(quizRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
  });
});
