import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for plain TypeScript (no React Native): `pnpm test`. Database tests run against
 * real SQL through Node's built-in `node:sqlite` (`src/lib/db/test-db.ts`).
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
