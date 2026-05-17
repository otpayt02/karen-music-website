const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("slur and row geometry", () => {
  test("anchors slur tips to beat centers and keeps measure bars even per row", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const m1 = createMeasure();
      const m2 = createMeasure();
      const m3 = createMeasure();

      m1.beats[1].chordState = { root: "C", flat: false, minor: false, triangle: false, seven: false };
      m1.beats[1].bass = "G";
      m1.beats[1].xMarks = 4;
      m2.beats[2].chordState = { root: "F", flat: false, minor: true, triangle: false, seven: true };
      m3.beats[0].chordState = { root: "G", flat: false, minor: false, triangle: false, seven: false };

      state.sections = [{ type: "Verse", measuresPerRow: 3, measures: [m1, m2, m3] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 1;
      state.onlySpans = [];
      state.slurs = [{ startBeatIndex: 1, endBeatIndex: 6 }];
      renderChart();
    });

    await expect(page.locator("#chart-container .slur-span")).toHaveCount(1);

    const metrics = await page.evaluate(() => {
      const chart = document.getElementById("chart-container");
      const slur = chart?.querySelector(".slur-span");
      const startBeat = chart?.querySelector('[data-globalbeat="1"]');
      const endBeat = chart?.querySelector('[data-globalbeat="6"]');
      const firstLine = chart?.querySelector(".line");
      const rowMeasures = Array.from(firstLine?.querySelectorAll(":scope > .measure") || [])
        .filter(el => el.style.visibility !== "hidden");
      if (!chart || !slur || !startBeat || !endBeat || rowMeasures.length < 3) return null;

      const chartRect = chart.getBoundingClientRect();
      const slurRect = slur.getBoundingClientRect();
      const startRect = startBeat.getBoundingClientRect();
      const endRect = endBeat.getBoundingClientRect();
      const startCenter = startRect.left - chartRect.left + startRect.width / 2;
      const endCenter = endRect.left - chartRect.left + endRect.width / 2;
      const heights = rowMeasures.map(el => el.getBoundingClientRect().height);
      const bottoms = rowMeasures.map(el => el.getBoundingClientRect().bottom);

      return {
        startDelta: Math.abs(Number(slur.dataset.startX) - startCenter),
        endDelta: Math.abs(Number(slur.dataset.endX) - endCenter),
        startTipDelta: Math.abs((slurRect.left - chartRect.left) - startCenter),
        endTipDelta: Math.abs((slurRect.right - chartRect.left) - endCenter),
        endpointAboveBeat: slurRect.top + 12 <= Math.min(startRect.top, endRect.top),
        heightSpread: Math.max(...heights) - Math.min(...heights),
        bottomSpread: Math.max(...bottoms) - Math.min(...bottoms)
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics.startDelta).toBeLessThan(1);
    expect(metrics.endDelta).toBeLessThan(1);
    expect(metrics.startTipDelta).toBeLessThan(1.5);
    expect(metrics.endTipDelta).toBeLessThan(1.5);
    expect(metrics.endpointAboveBeat).toBe(true);
    expect(metrics.heightSpread).toBeLessThan(1);
    expect(metrics.bottomSpread).toBeLessThan(1);
  });
});
