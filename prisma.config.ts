import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const defaultDatabaseUrl = `file:${path.resolve(projectRoot, "dev.db").replaceAll("\\", "/")}`;

process.env["DATABASE_URL"] ??= defaultDatabaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? defaultDatabaseUrl,
  },
});
