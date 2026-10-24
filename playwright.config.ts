import { defineConfig, devices } from "@playwright/test";

// 公開URLで動かすときは BASE_URL=https://... を付ける。付けなければ、手元でビルドしたものを確かめる
const baseURL = process.env.BASE_URL ?? "http://127.0.0.1:4410";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"], ["json", { outputFile: "test-results/e2e.json" }]],
  use: { baseURL, channel: "chrome", locale: "ja-JP" },
  projects: [
    { name: "パソコン", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1366, height: 900 } } },
    { name: "スマートフォン", use: { ...devices["iPhone 13"], browserName: "chromium", channel: "chrome" } },
  ],
  webServer: process.env.BASE_URL ? undefined : { command: "npx next start -H 127.0.0.1 -p 4410", url: "http://127.0.0.1:4410", reuseExistingServer: true },
});
