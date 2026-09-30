import { defineConfig } from "vitest/config";

// Integration suite (tests/integration): drives the runtime HTTP server against
// a local Exa API double. Coverage spans the api/ handlers the server hosts.
export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts", "api/**/*.ts"],
      exclude: ["src/**/*.d.ts"],
    },
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    // Each file boots its own server in its own process.
    pool: "forks",
    restoreMocks: true,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
