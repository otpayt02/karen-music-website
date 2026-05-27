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

  test("repairs legacy chart data before rendering", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    const repaired = await page.evaluate(() => {
      state.beatsPerMeasure = 4;
      state.sections = [{
        type: "",
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
