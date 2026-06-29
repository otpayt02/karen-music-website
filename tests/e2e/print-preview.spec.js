const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor, openSidebar, stubWindowPrint } = require("./helpers");

test.describe("print preview packets", () => {
  test("opens the PDF-spec preview with performance-only metadata", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.evaluate(() => {
      document.getElementById("songTitle").value = "Performance Ready";
      document.getElementById("songTitleKaren").value = "Karen Performance Title";
      document.getElementById("songStyle").value = "Worship Ballad";
      document.getElementById("songTempo").value = "96";
      document.getElementById("songDateCreated").value = "2026-06-28";
      document.getElementById("songNextPerformance").value = "2026-07-05";
      renderChart();
    });

    await page.locator("#print-preview-btn").click();

    const overlay = page.locator("#print-preview-overlay");
    await expect(overlay).toHaveClass(/open/);
    await expect(overlay.locator(".pp-title-karen")).toHaveText("Karen Performance Title");
    await expect(overlay.locator(".pp-title-english")).toHaveText("(Performance Ready)");
    await expect(overlay.locator(".pp-style")).toHaveText("Worship Ballad");
    await expect(overlay.locator(".pp-footer-left")).toHaveText("96 BPM");
    await expect(overlay).not.toContainText("2026-06-28");
    await expect(overlay).not.toContainText("2026-07-05");
  });

  test("creates one copy per instrument plus one Reference copy", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.locator("#instr-sidebar").click({ position: { x: 12, y: 12 } });
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

    await expect.poll(() => page.evaluate(() => window.__printCalls || 0)).toBe(1);
  });

  test("prints subtle section tones with alternating row bands", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const makeMeasures = (count) => Array.from({ length: count }, (_, idx) => {
        const measure = createMeasure();
        measure.beats[0].chordState = { root: idx % 2 === 0 ? "G" : "C" };
        return measure;
      });

      state.sections = [
        { type: "Verse", measures: makeMeasures(8), rowMeasureCounts: [4, 4] },
        { type: "Chorus", measures: makeMeasures(8), rowMeasureCounts: [4, 4] }
      ];
      renderChart();
      buildPrintBatch();
    });
    await page.emulateMedia({ media: "print" });

    const printBands = await page.evaluate(() => {
      const sheet = document.querySelector("#print-batch .chart-container");
      const sections = Array.from(sheet.querySelectorAll(".section"));
      const rows = Array.from(sheet.querySelectorAll(".line"));
      return {
        tones: sections.map(section => section.dataset.printtone),
        rowClasses: rows.map(row => ({
          even: row.classList.contains("print-row-even"),
          odd: row.classList.contains("print-row-odd")
        })),
        sectionColors: sections.map(section => getComputedStyle(section).backgroundColor),
        rowColors: rows.slice(0, 2).map(row => getComputedStyle(row).backgroundColor)
      };
    });

    expect(printBands.tones).toEqual(["0", "1"]);
    expect(printBands.rowClasses).toEqual([
      { even: true, odd: false },
      { even: false, odd: true },
      { even: true, odd: false },
      { even: false, odd: true }
    ]);
    expect(printBands.sectionColors.every(color => color !== "rgba(0, 0, 0, 0)" && color !== "transparent")).toBe(true);
    expect(printBands.rowColors[0]).not.toBe(printBands.rowColors[1]);
  });

  test("prints lead melody notes only on their assigned instrument copy", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    const result = await page.evaluate(() => {
      const measures = [createMeasure(), createMeasure(), createMeasure(), createMeasure()];
      const ranges = [
        { abbr: "EGT", startMeasureIdx: 0, startBeatIdx: 0, endMeasureIdx: 1, endBeatIdx: 3 },
        { abbr: "KB1", startMeasureIdx: 2, startBeatIdx: 0, endMeasureIdx: 3, endBeatIdx: 3 }
      ];

      measures.forEach((measure, idx) => {
        measure.leadEnabled = true;
        measure.leadBaseOctave = 4;
        measure.leadSlotsPerBeat = 4;
        measure.leadSlots = 16;
        measure.leadInstrumentRanges = ranges;
        measure.rowLeadView = Array.from({ length: 16 }, () => "");
        measure.rowLeadView[0] = String(idx + 1);
      });

      state.sections = [{ type: "Solo", measures }];
      state.rowLead = {};
      document.getElementById("songInstruments").value = "Piano 1, Electric Guitar";
      buildPrintBatch();

      return Array.from(document.querySelectorAll("#print-batch .chart-container")).map(sheet => ({
        footer: sheet.querySelector("#ph-footer-center")?.textContent || "",
        notes: Array.from(sheet.querySelectorAll(".lead-note")).map(note => note.textContent.trim()),
        labels: Array.from(sheet.querySelectorAll(".lead-instrument-label")).map(label => label.textContent.trim())
      }));
    });

    expect(result).toHaveLength(3);
    expect(result[0].footer).toContain("Piano 1");
    expect(result[0].notes).toEqual(["3", "4"]);
    expect(result[0].labels).toEqual([]);
    expect(result[1].footer).toContain("Electric Guitar");
    expect(result[1].notes).toEqual(["1", "2"]);
    expect(result[1].labels).toEqual([]);
    expect(result[2].footer).toContain("Reference");
    expect(result[2].notes).toEqual(["1", "2", "3", "4"]);
    expect(result[2].labels).toEqual([]);
  });

  test("keeps each printed footer anchored inside its own sheet copy", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.locator("#instr-sidebar").click({ position: { x: 12, y: 12 } });
    await page.locator('#instr-sidebar .instr-choice[data-value="Piano 1"]').click();
    await page.locator('#instr-sidebar .instr-choice[data-value="Piano 2"]').click();
    await page.locator('#instr-sidebar .instr-choice[data-value="Electric Guitar"]').click();
    await page.locator('#instr-sidebar .instr-choice[data-value="Drums"]').click();

    await stubWindowPrint(page);
    await page.locator("#btn-print").click();
    await page.emulateMedia({ media: "print" });

    const footerMetrics = await page.evaluate(() => {
      const sheets = Array.from(document.querySelectorAll("#print-batch > .chart-container"));
      return sheets.map((sheet) => {
        const footer = sheet.querySelector(".paper-footer");
        const sheetRect = sheet.getBoundingClientRect();
        const footerRect = footer?.getBoundingClientRect();
        const style = getComputedStyle(sheet);
        return {
          sheetTop: sheetRect.top,
          sheetBottom: sheetRect.bottom,
          footerTop: footerRect?.top ?? 0,
          footerBottom: footerRect?.bottom ?? 0,
          footerHeight: footerRect?.height ?? 0,
          position: style.position,
          bodyBackground: getComputedStyle(document.body).backgroundColor,
          mainPaddingTop: getComputedStyle(document.getElementById("main-editor")).paddingTop,
          footerText: footer?.textContent || ""
        };
      });
    });

    expect(footerMetrics).toHaveLength(5);
    expect(Math.abs(footerMetrics[0].sheetTop)).toBeLessThan(1);
    expect(Math.abs(footerMetrics[0].sheetBottom - 1036.8)).toBeLessThan(1);
    for (const [index, metrics] of footerMetrics.entries()) {
      expect(metrics.position).toBe("relative");
      expect(metrics.bodyBackground).toBe("rgb(255, 255, 255)");
      expect(metrics.mainPaddingTop).toBe("0px");
      expect(metrics.footerHeight).toBeGreaterThan(20);
      expect(metrics.footerTop).toBeGreaterThanOrEqual(metrics.sheetTop);
      expect(metrics.footerBottom).toBeLessThanOrEqual(metrics.sheetBottom);
      expect(metrics.sheetBottom - metrics.footerBottom).toBeGreaterThanOrEqual(16);
      if (index > 0) {
        expect(metrics.footerTop).toBeGreaterThan(footerMetrics[index - 1].footerBottom + 100);
      }
    }
    expect(footerMetrics[4].footerText).toContain("Reference");
  });

  test("prints bilingual sheet metadata and leaves untitled headers blank", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);
    await page.evaluate(() => setPrintKarenVisible(true));

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

    await expect(page.locator("#chart-container #ph-title-english")).toHaveText("Amazing Grace");
    await expect(page.locator("#chart-container #ph-title-karen")).toHaveText("(Karen Title)");
    await expect(page.locator("#chart-container #ph-style-value")).toContainText("(");
    await expect(page.locator("#chart-container #ph-style-english")).toHaveText("Go Go");
    await expect(page.locator("#chart-container #ph-tempo-karen")).toContainText("(");
    await expect(page.locator("#chart-container #ph-tempo-english")).toHaveText("125 BPM");
    await expect(page.locator("#chart-container #ph-keymeta-english")).toHaveText("");
    await expect(page.locator("#chart-container #ph-key-value")).toHaveText("G");
    await expect(page.locator("#chart-container .paper-head-tempo #ph-tempo-english")).toBeVisible();
    const headerSizing = await page.evaluate(() => {
      const styleSize = parseFloat(getComputedStyle(document.getElementById("ph-style-english")).fontSize);
      const tempoSize = parseFloat(getComputedStyle(document.getElementById("ph-tempo-english")).fontSize);
      const tempoRect = document.getElementById("ph-tempo-english").getBoundingClientRect();
      const headerRect = document.getElementById("paper-header").getBoundingClientRect();
      const titleKarenWeight = getComputedStyle(document.getElementById("ph-title-karen")).fontWeight;
      return {
        styleSize,
        tempoSize,
        titleKarenWeight,
        tempoNearRight: headerRect.right - tempoRect.right < 12
      };
    });
    expect(headerSizing.tempoSize).toBeLessThan(headerSizing.styleSize);
    expect(headerSizing.tempoNearRight).toBe(true);
    expect(Number(headerSizing.titleKarenWeight)).toBeLessThan(700);
    await expect(page.locator("#chart-container #ph-footer-center")).toContainText("Piano 1");
    await expect(page.locator("#chart-container #ph-footer-right")).toContainText("Choir");

    await page.evaluate(() => setPrintKarenVisible(false));
    await expect(page.locator("#chart-container #ph-title-karen")).toBeVisible();
    await expect(page.locator("#chart-container #ph-title-karen")).toHaveText("(Karen Title)");
    await expect(page.locator("#chart-container #ph-style-value")).toBeHidden();
    await page.evaluate(() => setPrintKarenVisible(true));

    await stubWindowPrint(page);
    await page.locator("#btn-print").click();

    await expect(page.locator("#print-batch .chart-container")).toHaveCount(2);
    await expect(page.locator("#print-batch .chart-container").nth(0).locator("#ph-footer-center")).toContainText("Piano 1");
    await expect(page.locator("#print-batch .chart-container").nth(1).locator("#ph-footer-center")).toContainText("Reference");
  });

  test("resolves typed Karen style values back to bilingual style labels", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await page.evaluate(() => setPrintKarenVisible(true));

    await page.evaluate(() => {
      TRANSLATIONS.karen.styleGoGo = "ကိကိ";
      document.getElementById("songStyle").value = "ကိကိ";
      document.getElementById("songTempo").value = "125";
      renderChart();
    });

    await expect(page.locator("#chart-container #ph-style-value")).toContainText("(");
    await expect(page.locator("#chart-container #ph-style-english")).toHaveText("Go Go");
    await expect(page.locator("#chart-container #ph-style-english")).toHaveCSS("font-weight", "900");
  });

  test("scales crowded printed rows so they stay above the footer", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.evaluate(() => {
      const measures = Array.from({ length: 28 }, (_, index) => {
        const measure = createMeasure();
        measure.beats[0].chordState = {
          root: ["C", "D", "E", "F", "G", "A", "B"][index % 7],
          flat: false,
          minor: index % 3 === 0,
          triangle: false,
          seven: index % 4 === 0
        };
        return measure;
      });
      state.sections = [{ type: "Verse", measuresPerRow: 1, measures }];
      state.slurs = [{ startBeatIndex: 81, endBeatIndex: 83 }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      setInstrChecks("instr-sidebar", "Piano 1");
      renderChart();
    });

    const editorMetrics = await page.evaluate(() => {
      const chart = document.getElementById("chart-container");
      const sections = chart.querySelector("#sections-container");
      const lines = Array.from(chart.querySelectorAll(".line"));
      const lastLine = lines[lines.length - 1];
      const footer = chart.querySelector(".paper-footer");
      const lastRect = lastLine.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      return {
        scale: new DOMMatrixReadOnly(getComputedStyle(sections).transform).a || 1,
        lastLineBottom: lastRect.bottom,
        footerTop: footerRect.top
      };
    });

    expect(editorMetrics.scale).toBeLessThan(1);
    expect(editorMetrics.lastLineBottom).toBeLessThanOrEqual(editorMetrics.footerTop);

    await stubWindowPrint(page);
    await page.locator("#btn-print").click();
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(100);

    const printMetrics = await page.evaluate(() => {
      const sheet = document.querySelector("#print-batch .chart-container");
      const sections = sheet.querySelector("#sections-container");
      const lines = Array.from(sheet.querySelectorAll(".line"));
      const lastLine = lines[lines.length - 1];
      const footer = sheet.querySelector(".paper-footer");
      const slur = sheet.querySelector('.slur-span[data-start-beat="81"][data-end-beat="83"]');
      const startBeat = sheet.querySelector('.beat[data-globalbeat="81"]');
      const endBeat = sheet.querySelector('.beat[data-globalbeat="83"]');
      const lastRect = lastLine.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const slurRect = slur?.getBoundingClientRect();
      const startRect = startBeat?.getBoundingClientRect();
      const endRect = endBeat?.getBoundingClientRect();
      return {
        scale: new DOMMatrixReadOnly(getComputedStyle(sections).transform).a || 1,
        lastLineBottom: lastRect.bottom,
        footerTop: footerRect.top,
        startsAtBeatCenter: !!slurRect && !!startRect && Math.abs((slurRect.left + Number(slur.dataset.pathStartOffset || 0)) - (startRect.left + startRect.width / 2)) <= 2,
        endsAtBeatCenter: !!slurRect && !!endRect && Math.abs((slurRect.left + Number(slur.dataset.pathEndOffset || slurRect.width)) - (endRect.left + endRect.width / 2)) <= 2
      };
    });

    expect(printMetrics.scale).toBeLessThan(1);
    expect(printMetrics.lastLineBottom).toBeLessThanOrEqual(printMetrics.footerTop);
    expect(printMetrics.startsAtBeatCenter).toBe(true);
    expect(printMetrics.endsAtBeatCenter).toBe(true);
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

    await expect(page.locator("#chart-container #ph-footer-next")).toContainText("Date Performed: 06/07/2026");
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
