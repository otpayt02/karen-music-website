const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor, openSidebar, stubWindowPrint } = require("./helpers");

test.describe("print preview packets", () => {
  test("creates one copy per instrument plus one Reference copy", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.locator('#instr-sidebar .instr-choice[data-value="Piano 1"]').click();
    await page.locator('#instr-sidebar .instr-choice[data-value="Drums"]').click();

    await stubWindowPrint(page);
    await page.locator("#btn-print").click();

    const pages = page.locator("#print-batch .chart-container");
    await expect(pages).toHaveCount(3);

    const footerCenters = page.locator("#print-batch .chart-container #ph-footer-center");
    await expect(footerCenters.nth(0)).toHaveText("Piano 1");
    await expect(footerCenters.nth(1)).toHaveText("Drums");
    await expect(footerCenters.nth(2)).toHaveText("Reference");

    const printCalls = await page.evaluate(() => window.__printCalls || 0);
    expect(printCalls).toBe(1);
  });

  test("keeps print packets to clean one-page sheets with beat-spanning slurs", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.evaluate(() => {
      const measure = createMeasure();
      measure.beats[0].chordState = { root: "D", flat: false, minor: false, triangle: false, seven: false };
      measure.beats[1].circle = true;
      measure.beats[2].circle = true;
      measure.beats[3].circle = true;
      state.sections = [{ type: "Ending", measures: [measure] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      state.slurs = [{ startBeatIndex: 0, endBeatIndex: 3 }];
      setInstrChecks("instr-sidebar", "Piano 1, Electric Guitar, Electric Bass, Drums");
      renderChart();
    });

    await stubWindowPrint(page);
    await page.locator("#btn-print").click();

    const pages = page.locator("#print-batch .chart-container");
    await expect(pages).toHaveCount(5);
    await expect(page.locator("#print-batch .section-delete-btn")).toHaveCount(0);
    await expect(page.locator("#print-batch .slur-span")).toHaveCount(5);

    const metrics = await page.evaluate(() => {
      const host = document.getElementById("print-batch");
      host.style.display = "block";
      host.style.position = "absolute";
      host.style.left = "0";
      host.style.top = "0";
      host.style.visibility = "hidden";

      const sheet = host.querySelector(".chart-container");
      const slur = sheet?.querySelector(".slur-span");
      const measure = sheet?.querySelector(".measure");
      const firstBeat = sheet?.querySelector('[data-globalbeat="0"]');
      const lastBeat = sheet?.querySelector('[data-globalbeat="3"]');
      if (!sheet || !slur || !measure || !firstBeat || !lastBeat) return null;

      const sr = slur.getBoundingClientRect();
      const mr = measure.getBoundingClientRect();
      const fr = firstBeat.getBoundingClientRect();
      const lr = lastBeat.getBoundingClientRect();
      return {
        slurAboveBeat: sr.bottom <= fr.top + 2,
        startsAtFirstBeatCenter: Math.abs(sr.left - (fr.left + fr.width / 2)) <= 2,
        endsAtLastBeatCenter: Math.abs(sr.right - (lr.left + lr.width / 2)) <= 2
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics.slurAboveBeat).toBe(true);
    expect(metrics.startsAtFirstBeatCenter).toBe(true);
    expect(metrics.endsAtLastBeatCenter).toBe(true);
  });
  test("leaves performed date blank until a performed date is added", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.evaluate(() => {
      state.performedDates = [];
      state.nextPerformanceDate = "";
      renderChart();
    });

    await expect(page.locator("#chart-container #ph-footer-next")).toHaveText("Date Performed: __/__/____");

    await stubWindowPrint(page);
    await page.evaluate(() => printInstrumentPackets());

    const blankPrintState = await page.evaluate(() => {
      const footer = document.querySelector("#print-batch .chart-container #ph-footer-next");
      return {
        footerText: footer?.textContent || "",
        nextPerformanceDate: state.nextPerformanceDate || ""
      };
    });

    expect(blankPrintState.footerText).toBe("Date Performed: __/__/____");
    expect(blankPrintState.nextPerformanceDate).toBe("");

    await page.evaluate(() => {
      addPerformedDate("2026-06-07");
      renderChart();
    });

    await expect(page.locator("#chart-container #ph-footer-next")).toHaveText("Date Performed: 2026-06-07");
  });

  test("keeps measure bars the same height across a row", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const tall = createMeasure();
      tall.beats[0].chordState = { root: "F", flat: false, minor: false, triangle: false, seven: false };
      tall.beats[0].bass = "C";
      tall.beats[0].xMarks = 4;
      tall.beats[0].dot = true;

      const plainA = createMeasure();
      plainA.beats[0].chordState = { root: "G", flat: false, minor: false, triangle: false, seven: false };

      const plainB = createMeasure();
      plainB.beats[0].chordState = { root: "A", flat: false, minor: true, triangle: false, seven: false };

      state.sections = [{ type: "Verse", measures: [tall, plainA, plainB] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      renderChart();
    });

    const metrics = await page.evaluate(() => {
      const line = document.querySelector(".line");
      const measures = Array.from(line?.querySelectorAll(":scope > .measure:not([style*='hidden'])") || []);
      const heights = measures.map(el => el.getBoundingClientRect().height);
      return {
        count: heights.length,
        spread: Math.max(...heights) - Math.min(...heights)
      };
    });

    expect(metrics.count).toBe(3);
    expect(metrics.spread).toBeLessThanOrEqual(1);
  });
});
