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

  test("keeps vertical paper tabs clear of the sidebar in control-room design", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => setUiDesign("design-2"));
    await page.locator("#sidebar-toggle").click();
    await expect(page.locator("#sidebar")).not.toHaveClass(/collapsed/);

    const metrics = await page.evaluate(() => {
      const mainRect = document.getElementById("main-editor").getBoundingClientRect();
      const flapRects = Array.from(document.querySelectorAll(".paper-flap")).map(el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
      return { mainLeft: mainRect.left, flapRects };
    });

    expect(metrics.flapRects.length).toBe(3);
    for (const rect of metrics.flapRects) {
      expect(rect.left).toBeGreaterThanOrEqual(metrics.mainLeft + 2);
    }
  });
});
