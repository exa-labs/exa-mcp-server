import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts"],
    },
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The integration suite binds sockets and spawns processes; it runs
    // through vitest.integration.config.ts.
    exclude: ["tests/integration/**", "node_modules/**"],
    restoreMocks: true,
  },
});
