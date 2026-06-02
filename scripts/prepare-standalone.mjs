import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

async function copyIfExists(source, target) {
  if (!existsSync(source)) return;
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true });
}

await copyIfExists("public", ".next/standalone/public");
await copyIfExists(".next/static", ".next/standalone/.next/static");
