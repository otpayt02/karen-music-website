const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("Only/All In span layout", () => {
  test("keeps one-row labels and beat-anchored cue underlines without overlap", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      state.sections = [
        {
          type: "Verse",
          measures: [createMeasure(), createMeasure()]
        }
      ];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      state.onlySpans = [
        {
          startBeatIndex: 0,
          endBeatIndex: 1,
          label: "Piano 1 & Drums only",
          endLabel: "All In"
        }
      ];
      renderChart();
    });

    await expect(page.locator(".span-label")).toHaveCount(2);
    await expect(page.locator(".span-cue-line")).toHaveCount(2);

    const metrics = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll(".span-label"));
      const cues = Array.from(document.querySelectorAll(".span-cue-line"));
      if (labels.length !== 2 || cues.length !== 2) return null;

      const [a, b] = labels.map(n => n.getBoundingClientRect());
      const [c1, c2] = cues.map(n => n.getBoundingClientRect());

      return {
        labelsSameTop: Math.abs(a.top - b.top) < 0.5,
        nonOverlap: a.right + 1 <= b.left || b.right + 1 <= a.left,
        cuesSameTop: Math.abs(c1.top - c2.top) < 0.5,
        cue1Width: c1.width,
        cue2Width: c2.width
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics.labelsSameTop).toBe(true);
    expect(metrics.nonOverlap).toBe(true);
    expect(metrics.cuesSameTop).toBe(true);
    expect(metrics.cue1Width).toBeGreaterThan(5);
    expect(metrics.cue2Width).toBeGreaterThan(5);
  });
});
