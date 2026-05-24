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
    await expect(footerCenters.nth(0)).toContainText("Piano 1");
    await expect(footerCenters.nth(1)).toContainText("Drums");
    await expect(footerCenters.nth(2)).toContainText("Reference");

    const printCalls = await page.evaluate(() => window.__printCalls || 0);
    expect(printCalls).toBe(1);
  });

  test("prints bilingual sheet metadata and leaves untitled headers blank", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.evaluate(() => {
      document.getElementById("songTitle").value = "";
      document.getElementById("songTitleKaren").value = "";
      renderChart();
    });

    await expect(page.locator("#view-title")).toHaveText("");
    await expect(page.locator("#chart-container #ph-title-karen")).toHaveText("");
    await expect(page.locator("#chart-container #ph-title-english")).toHaveText("");

    await page.evaluate(() => {
      document.getElementById("songTitle").value = "Amazing Grace";
      document.getElementById("songTitleKaren").value = "Karen Title";
      document.getElementById("songKey").value = "G";
      document.getElementById("songStyle").value = "Go Go";
      document.getElementById("songTempo").value = "125";
      document.getElementById("songCategory").value = "Choir";
      TRANSLATIONS.karen.styleGoGo = "ဂိုဂို";
      TRANSLATIONS.karen.bpmLabel = "ဘီပီအမ်";
      TRANSLATIONS.karen["1"] = "၁";
      TRANSLATIONS.karen["2"] = "၂";
      TRANSLATIONS.karen["5"] = "၅";
      state.currentKey = "G";
      state.originalKey = "G";
      setInstrChecks("instr-sidebar", "Piano 1");
      renderChart();
    });

    await expect(page.locator("#chart-container #ph-title-karen")).toHaveText("Karen Title");
    await expect(page.locator("#chart-container #ph-title-english")).toHaveText("(Amazing Grace)");
    await expect(page.locator("#chart-container #ph-tempo-karen")).toHaveText("ဂိုဂို = ၁၂၅ ဘီပီအမ်");
    await expect(page.locator("#chart-container #ph-tempo-english")).toHaveText("(Go Go = 125 BPM)");
    await expect(page.locator("#chart-container #ph-keymeta-english")).toHaveText("(Key = G)");
    await expect(page.locator("#chart-container #ph-footer-center")).toContainText("Piano 1");
    await expect(page.locator("#chart-container #ph-footer-right")).toContainText("Choir");

    await stubWindowPrint(page);
    await page.locator("#btn-print").click();

    await expect(page.locator("#print-batch .chart-container")).toHaveCount(2);
    await expect(page.locator("#print-batch .chart-container").nth(0).locator("#ph-footer-center")).toContainText("Piano 1");
    await expect(page.locator("#print-batch .chart-container").nth(1).locator("#ph-footer-center")).toContainText("Reference");
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
        startsAtFirstBeatCenter: Math.abs((sr.left + Number(slur.dataset.pathStartOffset || 0)) - (fr.left + fr.width / 2)) <= 2,
        endsAtLastBeatCenter: Math.abs((sr.left + Number(slur.dataset.pathEndOffset || sr.width)) - (lr.left + lr.width / 2)) <= 2
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics.slurAboveBeat).toBe(true);
    expect(metrics.startsAtFirstBeatCenter).toBe(true);
    expect(metrics.endsAtLastBeatCenter).toBe(true);
  });

  test("matches print row measure proportions to the editor chart", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.evaluate(() => {
      const measures = [
        createMeasure(4),
        createMeasure(2),
        createMeasure(4),
        createMeasure(6)
      ];
      measures[0].beats[0].chordState = { root: "C", flat: false, minor: false, triangle: false, seven: false };
      measures[1].beats[0].chordState = { root: "D", flat: false, minor: true, triangle: false, seven: false };
      measures[2].beats[0].chordState = { root: "F", flat: false, minor: false, triangle: false, seven: true };
      measures[3].beats[0].chordState = { root: "G", flat: false, minor: false, triangle: false, seven: false };
      state.sections = [{ type: "Verse", measuresPerRow: 4, measures }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      setInstrChecks("instr-sidebar", "Piano 1");
      renderChart();
    });

    await stubWindowPrint(page);
    await page.locator("#btn-print").click();

    const metrics = await page.evaluate(() => {
      const host = document.getElementById("print-batch");
      host.style.display = "block";
      host.style.position = "absolute";
      host.style.left = "0";
      host.style.top = "0";
      host.style.width = "8.5in";
      host.style.visibility = "hidden";

      function rowMetrics(sheet) {
        const line = sheet?.querySelector(".line");
        const measures = Array.from(line?.querySelectorAll(":scope > .measure") || [])
          .filter(el => el.style.visibility !== "hidden");
        if (!line || measures.length !== 4) return null;
        const lineRect = line.getBoundingClientRect();
        const measureRects = measures.map(el => el.getBoundingClientRect());
        return {
          ratios: measureRects.map(rect => rect.width / lineRect.width),
          startDelta: Math.abs(measureRects[0].left - lineRect.left),
          endDelta: Math.abs(measureRects[measureRects.length - 1].right - lineRect.right)
        };
      }

      return {
        editor: rowMetrics(document.getElementById("chart-container")),
        print: rowMetrics(host.querySelector(".chart-container"))
      };
    });

    expect(metrics.editor).not.toBeNull();
    expect(metrics.print).not.toBeNull();
    expect(metrics.print.startDelta).toBeLessThan(1);
    expect(metrics.print.endDelta).toBeLessThan(1);
    metrics.editor.ratios.forEach((ratio, index) => {
      expect(Math.abs(metrics.print.ratios[index] - ratio)).toBeLessThan(0.01);
    });
  });

  test("keeps printed slurs anchored to their own measure row", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.evaluate(() => {
      const measures = Array.from({ length: 10 }, (_, idx) => {
        const measure = createMeasure();
        measure.beats[0].chordState = {
          root: ["C", "D", "E", "F", "G", "A", "B"][idx % 7],
          flat: false,
          minor: false,
          triangle: false,
          seven: false
        };
        return measure;
      });

      state.sections = [{ type: "Verse", measuresPerRow: 4, measures }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 4;
      state.currentBeatIdx = 2;
      state.slurs = [{ startBeatIndex: 18, endBeatIndex: 21 }];
      setInstrChecks("instr-sidebar", "Piano 1");
      renderChart();
    });

    await stubWindowPrint(page);
    await page.locator("#btn-print").click();
    await page.emulateMedia({ media: "print" });

    const metrics = await page.evaluate(() => {
      const host = document.getElementById("print-batch");
      host.style.display = "block";
      host.style.position = "absolute";
      host.style.left = "0";
      host.style.top = "0";
      host.style.visibility = "hidden";

      const sheet = host.querySelector(".chart-container");
      const slur = sheet?.querySelector('.slur-span[data-start-beat="18"][data-end-beat="21"]');
      const startBeat = sheet?.querySelector('[data-globalbeat="18"]');
      const endBeat = sheet?.querySelector('[data-globalbeat="21"]');
      if (!sheet || !slur || !startBeat || !endBeat) return null;

      const lines = Array.from(sheet.querySelectorAll(".line"));
      const line = startBeat.closest(".line");
      const previousLine = lines[lines.indexOf(line) - 1] || null;
      const sr = slur.getBoundingClientRect();
      const lr = line.getBoundingClientRect();
      const pr = previousLine?.getBoundingClientRect();
      const startRect = startBeat.getBoundingClientRect();
      const endRect = endBeat.getBoundingClientRect();
      const beatTop = Math.min(startRect.top, endRect.top);

      return {
        slurInsideOwnRow: sr.top >= lr.top - 1 && sr.bottom <= lr.bottom + 1,
        slurNotInPreviousRow: !pr || sr.top >= pr.bottom - 1,
        endpointAboveMeasure: Math.abs((sr.top + 12) - beatTop) <= 3,
        startsAtStartBeatCenter: Math.abs((sr.left + Number(slur.dataset.pathStartOffset || 0)) - (startRect.left + startRect.width / 2)) <= 2,
        endsAtEndBeatCenter: Math.abs((sr.left + Number(slur.dataset.pathEndOffset || sr.width)) - (endRect.left + endRect.width / 2)) <= 2
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics.slurInsideOwnRow).toBe(true);
    expect(metrics.slurNotInPreviousRow).toBe(true);
    expect(metrics.endpointAboveMeasure).toBe(true);
    expect(metrics.startsAtStartBeatCenter).toBe(true);
    expect(metrics.endsAtEndBeatCenter).toBe(true);
  });

  test("leaves performed date blank until a performed date is added", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.evaluate(() => {
      state.performedDates = [];
      state.nextPerformanceDate = "";
      renderChart();
    });

    await expect(page.locator("#chart-container #ph-footer-next")).toContainText("Date Performed: __/__/____");

    await stubWindowPrint(page);
    await page.evaluate(() => printInstrumentPackets());

    const blankPrintState = await page.evaluate(() => {
      const footer = document.querySelector("#print-batch .chart-container #ph-footer-next");
      return {
        footerText: footer?.textContent || "",
        nextPerformanceDate: state.nextPerformanceDate || ""
      };
    });

    expect(blankPrintState.footerText).toContain("Date Performed: __/__/____");
    expect(blankPrintState.nextPerformanceDate).toBe("");

    await page.evaluate(() => {
      addPerformedDate("2026-06-07");
      renderChart();
    });

    await expect(page.locator("#chart-container #ph-footer-next")).toContainText("Date Performed: 2026-06-07");
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
