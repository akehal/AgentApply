import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@/": `${root}/`,
      // `server-only` throws outside a React Server environment; it is a no-op in tests.
      "server-only": `${root}/tests/stubs/server-only.ts`,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
