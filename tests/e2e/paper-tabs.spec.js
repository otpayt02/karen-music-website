const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("stacked paper views", () => {
  test("starts with the sidebar closed and switches between chart and lyrics papers", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      document.getElementById("songTitle").value = "Morning Song";
      document.getElementById("karenText").value = "Private arrangement notes";
      state.lyricsSections = [
        {
          id: "test-verse",
          title: "Verse",
          karenText: "Verse one line\nVerse one answer",
          romanization: "Verse romanization",
          translation: "",
          showRomanization: true,
          showTranslation: false
        },
        {
          id: "test-chorus",
          title: "Chorus",
          karenText: "Chorus line",
          romanization: "",
          translation: "",
          showRomanization: false,
          showTranslation: false
        }
      ];
      renderChart();
    });

    await expect(page.locator("#paper-stack")).toHaveAttribute("data-active-paper", "chart");
    await expect(page.locator("#chart-container")).toHaveClass(/is-active/);
    await expect(page.locator("#lyrics-container")).toHaveClass(/is-behind/);

    await page.locator(".paper-flap-lyrics").click();
    await expect(page.locator("#paper-stack")).toHaveAttribute("data-active-paper", "lyrics");
    await expect(page.locator("#lyrics-container")).toHaveClass(/is-active/);
    await expect(page.locator(".lyrics-karen-input")).toHaveCount(2);
    await expect(page.locator(".lyrics-karen-input").nth(0)).toHaveValue(/Verse one line/);
    await expect(page.locator(".lyrics-karen-input").nth(1)).toHaveValue("Chorus line");
    await expect(page.locator("#lyrics-body")).not.toContainText("Private arrangement notes");

    await page.locator(".paper-flap-chart").click();
    await expect(page.locator("#paper-stack")).toHaveAttribute("data-active-paper", "chart");
    await expect(page.locator("#focus-trap")).toBeFocused();
  });
});
