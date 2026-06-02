import { defineConfig } from "@playwright/test";
import path from "node:path";

const databaseUrl = `file:${path.resolve(process.cwd(), "dev.db").replaceAll("\\", "/")}`;
const webServerEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
);

process.env.DATABASE_URL ??= databaseUrl;
process.env.ADMIN_PASSWORD ??= "test123";

export default defineConfig({
  testDir: "./tests",
  timeout: 120000,
  retries: 0,
  webServer: {
    command: "npx prisma db push && npx prisma db seed && npm run build && node scripts/prepare-standalone.mjs && node .next/standalone/server.js",
    env: {
      ...webServerEnv,
      PORT: "3010",
      HOSTNAME: "0.0.0.0",
      DATABASE_URL: databaseUrl,
    },
    url: "http://127.0.0.1:3010",
    reuseExistingServer: true,
    timeout: 300000,
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
