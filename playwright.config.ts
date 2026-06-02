import { defineConfig } from "@playwright/test";

process.env.DATABASE_URL ??= "file:./dev.db";
process.env.ADMIN_PASSWORD ??= "test123";

export default defineConfig({
  testDir: "./tests",
  timeout: 120000,
  retries: 0,
  webServer: {
    command: "npx prisma db push && npx prisma db seed && npm run dev",
    url: "http://127.0.0.1:3010",
    reuseExistingServer: true,
    timeout: 120000,
  },
  use: {
    baseURL: "http://127.0.0.1:3010",
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://127.0.0.1:3010",
          localStorage: [
            { name: "witch-trial-fs-prompted", value: "true" },
          ],
        },
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
