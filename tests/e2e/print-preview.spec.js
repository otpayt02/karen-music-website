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
        slurAboveMeasure: sr.bottom <= mr.top + 1,
        startsAtFirstBeat: sr.left <= fr.left + 4,
        endsAtLastBeat: sr.right >= lr.right - 4
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics.slurAboveMeasure).toBe(true);
    expect(metrics.startsAtFirstBeat).toBe(true);
    expect(metrics.endsAtLastBeat).toBe(true);
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
});
