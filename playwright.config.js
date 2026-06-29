const fs = require("fs");
const { defineConfig, devices } = require("@playwright/test");

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  `${process.env.LOCALAPPDATA || ""}\\Google\\Chrome\\Application\\chrome.exe`
];
const hasSystemChrome = chromeCandidates.some(p => p && fs.existsSync(p));
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5000";
const serverPort = new URL(baseURL).port || "5000";

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: `python -m flask --app app run --host 127.0.0.1 --port ${serverPort} --no-debugger --no-reload`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: true
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(hasSystemChrome ? { channel: "chrome" } : {})
      }
    }
  ]
});
