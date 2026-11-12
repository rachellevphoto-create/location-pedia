import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Tests run against a separate database, "locatepedia_test", on the same
 * server as the dev DB (create/reset it with `npm run test:db`). The URL is
 * derived from DATABASE_URL in .env so the real data is never touched.
 */
function testDatabaseUrl(): string {
  const fromEnv = process.env.TEST_DATABASE_URL;
  if (fromEnv) return fromEnv;
  const env = readFileSync(path.resolve(__dirname, ".env"), "utf8");
  const match = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
  if (!match) throw new Error("DATABASE_URL not found in .env");
  const url = match[1].replace(/(:\d+)\/[^?]+/, "$1/locatepedia_test");
  if (!url.includes("/locatepedia_test")) {
    throw new Error("Could not derive the test database URL");
  }
  return url;
}

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: { DATABASE_URL: testDatabaseUrl() },
    // All test files share one database.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
