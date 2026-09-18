import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/**/*.test.{ts,tsx}",
      "services/**/*.test.{ts,tsx}",
      "apps/**/*.test.{ts,tsx}",
    ],
    alias: {
      "@jobpilot/types": path.resolve(
        __dirname,
        "./packages/types/src/index.ts",
      ),
      "@jobpilot/validation": path.resolve(
        __dirname,
        "./packages/validation/src/index.ts",
      ),
      "@jobpilot/shared": path.resolve(
        __dirname,
        "./packages/shared/src/index.ts",
      ),
      "@jobpilot/database": path.resolve(
        __dirname,
        "./packages/database/src/index.ts",
      ),
      "@jobpilot/use-cases": path.resolve(
        __dirname,
        "./packages/use-cases/src/index.ts",
      ),
      "@jobpilot/portal-adapters": path.resolve(
        __dirname,
        "./packages/portal-adapters/src/index.ts",
      ),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "**/dist/**",
        "**/dist-electron/**",
        "**/node_modules/**",
        "**/*.test.ts",
      ],
    },
  },
});
