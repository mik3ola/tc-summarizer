import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    exclude: [
      "**/node_modules/**",
      "**/build/**",
      "**/backend/supabase/functions/**", // Deno tests - run with: deno test
    ],
  },
});
