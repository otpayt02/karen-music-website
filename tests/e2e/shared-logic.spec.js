const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("shared editor logic", () => {
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
      setKarenKeyboardImmersive(false);
    });

    await expect(page.locator("html")).toHaveAttribute("data-design", "design-3");
    await expect(page.locator("html")).toHaveAttribute("data-karen-keyboard-immersive", "off");
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
      concept: '"Manuscript Desk"',
      sidebarWidth: "320px",
      mainAlign: "center"
    });
    expect(snapshots.design2).toMatchObject({
      concept: '"Control Room"',
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
