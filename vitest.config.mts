import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@data": resolve(import.meta.dirname, "data"), "@": resolve(import.meta.dirname, "src") } },
  test: { include: ["src/**/*.test.ts"] },
});
