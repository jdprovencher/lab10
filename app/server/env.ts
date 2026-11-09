import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path to the `app/` directory. */
export const APP_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

// Support both `app/.env` and the lab's repo-level `openrouter.env`.
// process.loadEnvFile does not overwrite variables that are already set.
for (const file of [".env", "../openrouter.env"]) {
  const path = resolve(APP_ROOT, file);
  if (!existsSync(path)) continue;
  try {
    process.loadEnvFile?.(path);
  } catch (error) {
    console.warn(`Could not load environment file ${path}:`, error);
  }
}
