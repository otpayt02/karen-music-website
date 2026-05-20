const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("beat entry shortcuts", () => {
  test("adds x marks to an empty beat without requiring a chord", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      state.sections = [{ type: "Verse", measures: [createMeasure()] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      renderChart();
      document.getElementById("focus-trap")?.focus();
    });

    await page.keyboard.press("x");

    await expect(page.locator('#chart-container [data-globalbeat="0"] .x-mark')).toHaveCount(1);
    await expect(page.locator('#chart-container [data-globalbeat="0"]')).toHaveClass(/underlined/);

    const beatState = await page.evaluate(() => {
      const beat = state.sections[0].measures[0].beats[0];
      return {
        root: beat.chordState?.root || "",
        xMarks: beat.xMarks
      };
    });

    expect(beatState).toEqual({ root: "", xMarks: 1 });
  });
});
