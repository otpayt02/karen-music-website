const fs = require("fs");
const { defineConfig, devices } = require("@playwright/test");

const chromeCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  `${process.env.LOCALAPPDATA || ""}\\Google\\Chrome\\Application\\chrome.exe`
];
const hasSystemChrome = chromeCandidates.some(p => p && fs.existsSync(p));
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5000";

module.exports = defineConfig({
  testDir: "./tests/e2e",
  // sites-replica.spec.js is the contract for the ChatGPT Sites replica UI
  // (ARIA-role shell, .chart-paper, data-app-ready). That app is not in this
  // repository and is not served by app.py, so those tests cannot run
  // against the legacy app this suite verifies. The spec file stays in the
  // tree untouched; re-enable it when the replica app is built and served.
  testIgnore: "**/sites-replica.spec.js",
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
    command: "python app.py",
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
