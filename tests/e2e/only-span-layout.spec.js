const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("Only/All In span layout", () => {
  test("shows clean abbreviated instrument choices in the Only modal", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      state.sections = [
        {
          type: "Verse",
          measures: [createMeasure()]
        }
      ];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      setInstrChecks("instr-sidebar", "Piano 1, Electric Guitar, Drums");
      renderChart();
      document.getElementById("focus-trap")?.focus();
    });

    await page.keyboard.press(",");

    await expect(page.locator(".only-instrument-modal")).toBeVisible();
    await expect(page.locator(".only-instrument-text")).toHaveText(["KB1", "EGT", "DR"]);

    const metrics = await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll(".only-instrument-option"));
      const texts = Array.from(document.querySelectorAll(".only-instrument-text"));
      return {
        optionCount: options.length,
        noWrappedText: texts.every(el => {
          const rect = el.getBoundingClientRect();
          const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
          return el.scrollWidth <= el.clientWidth + 1 && rect.height <= lineHeight + 2;
        }),
        optionWidths: options.map(el => Math.round(el.getBoundingClientRect().width))
      };
    });

    expect(metrics.optionCount).toBe(3);
    expect(metrics.noWrappedText).toBe(true);
    expect(Math.min(...metrics.optionWidths)).toBeGreaterThanOrEqual(72);
  });

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
