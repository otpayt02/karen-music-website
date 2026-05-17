const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("stacked paper views", () => {
  test("starts with the sidebar closed and switches between chart and lyrics papers", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      document.getElementById("songTitle").value = "Morning Song";
      document.getElementById("karenText").value = "Verse one line\nVerse one answer\n\nChorus line";
      renderChart();
    });

    await expect(page.locator("#paper-stack")).toHaveAttribute("data-active-paper", "chart");
    await expect(page.locator("#chart-container")).toHaveClass(/is-active/);
    await expect(page.locator("#lyrics-container")).toHaveClass(/is-behind/);

    await page.locator(".paper-flap-lyrics").click();
    await expect(page.locator("#paper-stack")).toHaveAttribute("data-active-paper", "lyrics");
    await expect(page.locator("#lyrics-container")).toHaveClass(/is-active/);
    await expect(page.locator("#lyrics-body")).toContainText("Verse one line");
    await expect(page.locator("#lyrics-body")).toContainText("Chorus line");

    await page.locator(".paper-flap-chart").click();
    await expect(page.locator("#paper-stack")).toHaveAttribute("data-active-paper", "chart");
    await expect(page.locator("#focus-trap")).toBeFocused();
  });
});
