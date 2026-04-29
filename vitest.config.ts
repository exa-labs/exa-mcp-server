import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "tests/**/*.test.ts",
      "api/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.ts", "api/**/*.ts"],
      exclude: ["**/*.test.ts", "tests/**", "src/index.ts"],
    },
  },
});
