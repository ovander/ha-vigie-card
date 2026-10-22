import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      // U-CARD: pure modules, no DOM
      { test: { name: "unit", environment: "node", include: ["test/unit/**/*.test.ts"] } },
      // F-CARD: the card rendered in headless Chromium (TEST §4.7)
      {
        test: {
          name: "browser",
          include: ["test/browser/**/*.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
