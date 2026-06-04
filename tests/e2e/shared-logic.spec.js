const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("shared editor logic", () => {
  test("waits for a language choice on app launch even when a language was saved", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("karenMusicLang", "english"));
    await page.reload();

    await expect(page.locator("#lang-picker-overlay")).toBeVisible();
    await expect(page.locator("#wizard-overlay")).toBeHidden();

    await page.locator("#lang-btn-english").click();
    await expect(page.locator("#lang-picker-overlay")).toBeHidden();
    await expect(page.locator("#wizard-overlay")).toBeVisible();
  });

  test("transpose dropdown applies target keys and Original immediately", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await page.locator("#sidebar-toggle").click();

    await page.locator("#songKey").fill("C");
    await page.locator("#songKey").blur();

    await page.evaluate(() => {
      const measure = createMeasure();
      measure.beats[0].chordState = { root: "C", flat: false, minor: false, triangle: false, seven: false };
      measure.beats[1].chordState = { root: "F", flat: false, minor: false, triangle: false, seven: false };
      state.sections = [{ type: "Verse", measures: [measure] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      renderChart();
    });

    await page.locator("#songTransposeTarget").selectOption("D");
    await expect.poll(() => page.evaluate(() => state.sections[0].measures[0].beats[0].chordState.root)).toBe("D");
    await expect(page.locator("#songKey")).toHaveValue("D");

    await page.locator("#songTransposeTarget").selectOption("__ORIGINAL__");
    await expect.poll(() => page.evaluate(() => state.sections[0].measures[0].beats[0].chordState.root)).toBe("C");
    await expect(page.locator("#songKey")).toHaveValue("C");
  });

  test("3/4 global setting preserves existing 4-beat measures", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const measure = createMeasure(4);
      measure.beats[3].chordState = { root: "G", flat: false, minor: false, triangle: false, seven: false };
      state.sections = [{ type: "Verse", measures: [measure] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      renderChart();
      setBeatsPerMeasure(3);
    });

    const data = await page.evaluate(() => ({
      beatsPerMeasure: state.beatsPerMeasure,
      length: state.sections[0].measures[0].beats.length,
      fourthRoot: state.sections[0].measures[0].beats[3].chordState?.root || ""
    }));

    expect(data).toEqual({ beatsPerMeasure: 3, length: 4, fourthRoot: "G" });
  });

  test("waits for bass-note flat before applying root flat", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const measure = createMeasure(4);
      measure.beats[0].chordState = { root: "C", flat: false, minor: false, triangle: false, seven: false };
      state.sections = [{ type: "Verse", measures: [measure] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      renderChart();
      document.getElementById("focus-trap")?.focus();
    });

    await page.keyboard.press("/");
    await page.keyboard.press("A");
    await page.keyboard.press("b");

    const beat = await page.evaluate(() => {
      const active = state.sections[0].measures[0].beats[0];
      return {
        bass: active.bass,
        root: active.chordState.root,
        rootFlat: active.chordState.flat
      };
    });

    expect(beat).toEqual({ bass: "Ab", root: "C", rootFlat: false });
  });

  test("uses only the immediate post-slash flat window for bass flats", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const measure = createMeasure(4);
      measure.beats[0].chordState = { root: "F", flat: false, minor: false, triangle: false, seven: false };
      state.sections = [{ type: "Verse", measures: [measure] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      renderChart();
      document.getElementById("focus-trap")?.focus();
    });

    await page.keyboard.press("/");
    await page.keyboard.press("A");
    await page.keyboard.press("C");

    const afterSwallowedRoot = await page.evaluate(() => {
      const active = state.sections[0].measures[0].beats[0];
      return {
        bass: active.bass,
        root: active.chordState.root,
        rootFlat: active.chordState.flat
      };
    });

    expect(afterSwallowedRoot).toEqual({ bass: "A", root: "F", rootFlat: false });

    await page.keyboard.press("D");
    await page.keyboard.press("b");

    const afterRootFlat = await page.evaluate(() => {
      const active = state.sections[0].measures[0].beats[0];
      return {
        bass: active.bass,
        root: active.chordState.root,
        rootFlat: active.chordState.flat
      };
    });

    expect(afterRootFlat).toEqual({ bass: "A", root: "D", rootFlat: true });
  });

  test("roll labels remain English-only when Karen sheet text is enabled", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    const labelText = await page.evaluate(() => {
      localStorage.setItem(THEME_STORAGE_KEYS.printKaren, "on");
      TRANSLATIONS.karen.rollLabel = "ကညီ Roll";
      const measure = createMeasure(4);
      measure.roll = true;
      state.sections = [{ type: "Verse", measures: [measure] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      renderChart();
      return document.querySelector(".measure-roll-label")?.textContent?.trim() || "";
    });

    expect(labelText).toBe("Roll");
  });

  test("beat click and arrow navigation keep the active row at the editor top", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const measures = Array.from({ length: 18 }, (_, idx) => {
        const measure = createMeasure(4);
        measure.beats[0].chordState = {
          root: ["C", "D", "E", "F", "G", "A"][idx % 6],
          flat: false,
          minor: false,
          triangle: false,
          seven: false
        };
        return measure;
      });
      state.sections = [{ type: "Verse", measuresPerRow: 3, measures }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      renderChart();
      const editor = document.getElementById("main-editor");
      if (editor) editor.scrollTop = 0;
    });

    await page.evaluate(() => {
      const target = document.querySelector('.beat[data-measureidx="12"][data-beatidx="0"]');
      target?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    });

    await expect.poll(() => page.evaluate(() => {
      const editor = document.getElementById("main-editor");
      const line = document.querySelector("#chart-container .beat.active")?.closest(".line");
      if (!editor || !line) return 9999;
      return Math.abs(line.getBoundingClientRect().top - editor.getBoundingClientRect().top);
    })).toBeLessThan(8);

    await page.keyboard.press("ArrowRight");

    await expect.poll(() => page.evaluate(() => {
      const editor = document.getElementById("main-editor");
      const line = document.querySelector("#chart-container .beat.active")?.closest(".line");
      if (!editor || !line) return 9999;
      return Math.abs(line.getBoundingClientRect().top - editor.getBoundingClientRect().top);
    })).toBeLessThan(8);
  });

  test("ctrl shortcuts add sus and aug as chord exponents", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const measure = createMeasure(4);
      measure.beats[0].chordState = { root: "C", flat: false, minor: false, triangle: false, seven: false, quality: "" };
      state.sections = [{ type: "Verse", measures: [measure] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      renderChart();
      document.getElementById("focus-trap")?.focus();
    });

    await page.keyboard.press(process.platform === "darwin" ? "Meta+S" : "Control+S");
    await expect.poll(() => page.evaluate(() => state.sections[0].measures[0].beats[0].chordState.quality)).toBe("sus");
    await expect(page.locator(".beat.active .chord-sup")).toContainText("sus");

    await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    await expect.poll(() => page.evaluate(() => state.sections[0].measures[0].beats[0].chordState.quality)).toBe("aug");
    await expect(page.locator(".beat.active .chord-sup")).toContainText("aug");
  });

  test("lead instrument assignment propagates across the current measure row", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    const result = await page.evaluate(() => {
      state.sections = [{
        type: "Verse",
        measures: [createMeasure(), createMeasure(), createMeasure()]
      }];
      state.rowLead = {};
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 1;
      state.currentBeatIdx = 0;
      const rowKey = getRowKey(0, 1);
      syncRowLeadInstrumentForMeasureKey(rowKey, "P1");
      applyRowLeadToRow(rowKey);
      renderChart();
      const line = document.querySelector(".line");
      return {
        rowLeadValues: [0, 1, 2].map(i => state.rowLead[getRowKey(0, i)]?.instrumentAbbr || ""),
        measureValues: state.sections[0].measures.map(measure => measure.leadInstrumentAbbr || ""),
        lineValue: getLeadInstrumentAbbrForLine(line)
      };
    });

    expect(result).toEqual({
      rowLeadValues: ["P1", "P1", "P1"],
      measureValues: ["P1", "P1", "P1"],
      lineValue: "P1"
    });
  });

  test("lead instrument ranges render corner markers without row labels", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    const result = await page.evaluate(() => {
      state.sections = [{
        type: "Solo",
        measures: [createMeasure(), createMeasure(), createMeasure(), createMeasure()]
      }];
      state.rowLead = {};
      const rowKey = getRowKey(0, 0);
      const cfg = ensureRowLead(rowKey);
      cfg.baseOctave = 4;
      cfg.slots = 4;
      cfg.instrumentAbbr = "EG";
      cfg.instrumentRanges = [
        { abbr: "EG", startMeasureIdx: 0, startBeatIdx: 0, endMeasureIdx: 1, endBeatIdx: 3 },
        { abbr: "KB1", startMeasureIdx: 2, startBeatIdx: 0, endMeasureIdx: 3, endBeatIdx: 3 }
      ];
      cfg.cells = { "base:0": "1", "base:4": "2", "base:8": "3", "base:12": "4" };
      syncRowBaseOctaveForMeasureKey(rowKey, cfg.baseOctave);
      syncRowLeadInstrumentForMeasureKey(rowKey, cfg.instrumentAbbr);
      syncRowLeadInstrumentRangesForMeasureKey(rowKey, cfg.instrumentRanges);
      applyRowLeadToRow(rowKey);
      renderChart();
      renderLeadInstrumentLabels();

      const labels = Array.from(document.querySelectorAll(".lead-instrument-label")).map(el => el.textContent.trim());
      const starts = Array.from(document.querySelectorAll(".lead-beat.lead-range-start")).map(el => Number(el.dataset.globalbeat));
      const ends = Array.from(document.querySelectorAll(".lead-beat.lead-range-end")).map(el => Number(el.dataset.globalbeat));
      return { labels, starts, ends };
    });

    expect(result.labels).toEqual([]);
    expect(result.starts).toEqual([0, 8]);
    expect(result.ends).toEqual([7, 15]);
  });

  test("repairs legacy chart data before rendering", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    const repaired = await page.evaluate(() => {
      state.beatsPerMeasure = 4;
      state.sections = [{
        type: "",
        measuresPerRow: 1,
        rowMeasureCounts: ["8", "bad"],
        measures: [
          { beats: [{ chordState: { root: "C" }, xMarks: 99 }, null], stray: true },
          { beats: [] }
        ]
      }, null];
      state.onlySpans = [{ startBeatIndex: 0, endBeatIndex: 1 }, { startBeatIndex: 0, endBeatIndex: 99 }];
      state.slurs = [{ startBeatIndex: 0, endBeatIndex: 1 }, { startBeatIndex: -1, endBeatIndex: 1 }];
      const changed = window.__normalizeLoadedChartStateForTest();
      renderChart();
      return {
        changed,
        sections: state.sections.length,
        type: state.sections[0].type,
        xMarks: state.sections[0].measures[0].beats[0].xMarks,
        secondBeatRoot: state.sections[0].measures[0].beats[1].chordState.root,
        generatedMeasureBeats: state.sections[0].measures[1].beats.length,
        measuresPerRow: state.sections[0].measuresPerRow,
        firstRowCap: getSectionRowLayout(0)[0]?.cap,
        onlySpans: state.onlySpans.length,
        slurs: state.slurs.length,
        endingBar: state.sections[0].measures[1].isEndingBar
      };
    });

    expect(repaired).toEqual({
      changed: true,
      sections: 1,
      type: "Verse",
      xMarks: 4,
      secondBeatRoot: "",
      generatedMeasureBeats: 4,
      measuresPerRow: null,
      firstRowCap: 8,
      onlySpans: 1,
      slurs: 1,
      endingBar: true
    });
  });

  test("lead modal highlights base octave before Enter advances", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      state.sections = [{ type: "Verse", measures: [createMeasure()] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 0;
      renderChart();
      document.getElementById("focus-trap")?.focus();
    });

    await page.keyboard.press("l");
    await expect(page.locator("#lead-modal-overlay")).toHaveClass(/open/);
    await page.keyboard.press("5");

    await expect(page.locator("#lead-tab-1")).toBeVisible();
    await expect(page.locator("#lead-tab-2")).toBeHidden();
    await expect(page.locator("#lead-tab-1 .wizard-btn-primary.is-selected")).toHaveText("5");

    await page.keyboard.press("Enter");
    await expect(page.locator("#lead-tab-2")).toBeVisible();
  });

  test("UI design and immersive keyboard settings update document state", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      setUiDesign("design-3");
      setThemePalette("kawthoolei");
      setKarenKeyboardImmersive(false);
    });

    await expect(page.locator("html")).toHaveAttribute("data-design", "design-3");
    await expect(page.locator("html")).toHaveAttribute("data-palette", "kawthoolei");
    await expect(page.locator("html")).toHaveAttribute("data-karen-keyboard-immersive", "off");
    await expect(page.locator("#lang-toggle")).toHaveText("ကညီ");
    await expect(page.locator("#lang-toggle .karen-music-mark")).toHaveCount(0);
  });

  test("UI design options apply distinct layout systems", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    const snapshots = await page.evaluate(() => {
      const readDesign = (design) => {
        setUiDesign(design);
        const rootStyle = getComputedStyle(document.documentElement);
        const mainStyle = getComputedStyle(document.getElementById("main-editor"));
        const flapStyle = getComputedStyle(document.querySelector(".paper-flap-chart"));
        const chartStyle = getComputedStyle(document.getElementById("chart-container"));

        return {
          concept: rootStyle.getPropertyValue("--design-concept").trim(),
          sidebarWidth: rootStyle.getPropertyValue("--sidebar-width").trim(),
          controlRadius: rootStyle.getPropertyValue("--control-radius").trim(),
          mainAlign: mainStyle.alignItems,
          paperFlapWritingMode: flapStyle.writingMode,
          chartRadius: chartStyle.borderTopLeftRadius
        };
      };

      return {
        design1: readDesign("design-1"),
        design2: readDesign("design-2"),
        design3: readDesign("design-3")
      };
    });

    expect(snapshots.design1).toMatchObject({
      concept: '"Karen Countryside"',
      sidebarWidth: "304px",
      mainAlign: "center"
    });
    expect(snapshots.design2).toMatchObject({
      concept: '"Control Console"',
      sidebarWidth: "276px",
      mainAlign: "stretch",
      paperFlapWritingMode: "vertical-rl"
    });
    expect(snapshots.design3).toMatchObject({
      concept: '"Stage"',
      sidebarWidth: "360px",
      mainAlign: "center"
    });

    expect(snapshots.design1.controlRadius).not.toBe(snapshots.design2.controlRadius);
    expect(snapshots.design2.chartRadius).not.toBe(snapshots.design3.chartRadius);
  });
});
