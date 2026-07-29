const { test, expect } = require("@playwright/test");
const path = require("path");

const syntheticImportPath = path.resolve(__dirname, "../fixtures/sites-synthetic-import.json");

async function openReady(page) {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
}

test.describe("Sites Karen Music Director replica", () => {
  test("preserves the desktop workspace layout and opens New Song only on request", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");

    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator(".command-bar")).toBeVisible();
    await expect(page.locator(".chart-paper")).toBeVisible();
    await expect(page.getByRole("tab", { name: "chart" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("complementary", { name: "Song library" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Time signature on paper" })).toHaveValue("4/4");
    await expect(page.getByRole("tab", { name: "database" })).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("combobox", { name: "Time signature on paper" }).selectOption("6/8");
    await page.getByRole("button", { name: "New song" }).click();
    await expect(page.getByRole("dialog", { name: "Start with song details" })).toBeVisible();
    await page.getByRole("button", { name: "Create chart" }).click();
    await expect(page.getByRole("combobox", { name: "Time signature on paper" })).toHaveValue("4/4");
  });

  test("Ctrl+6 inserts a six-beat measure immediately after the active measure", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
    await page.locator(".chart-paper").focus();
    const before = await page.locator(".measure").count();

    await page.keyboard.press("Control+6");

    await expect(page.locator(".measure")).toHaveCount(before + 1);
    const active = page.locator(".measure.active-measure");
    await expect(active.locator("button")).toHaveCount(6);
    await expect(active.locator("button").first()).toHaveClass(/active-beat/);
  });

  test("switches paper surfaces and opens the paginated Letter print room", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");
    await page.getByRole("tab", { name: "lyrics" }).click();
    await expect(page.locator(".lyrics-paper")).toBeVisible();
    await expect(page.getByRole("region", { name: "Library panel" })).toBeVisible();

    await page.getByRole("button", { name: "Print" }).first().click();
    await expect(page.getByRole("dialog", { name: "One physical page per copy" })).toBeVisible();
    await expect(page.locator(".print-page-numbers").getByRole("button")).toHaveCount(3);
    await expect(page.locator(".print-page-caption")).toContainText("Page 1 of 3: Piano 1");

    const ratio = await page.locator(".print-preview-screen .print-sheet").evaluate((sheet) => {
      const box = sheet.getBoundingClientRect();
      return box.width / box.height;
    });
    expect(ratio).toBeCloseTo(8.5 / 11, 2);

    await page.getByRole("button", { name: "Show printout page 2, Acoustic Guitar" }).click();
    await expect(page.locator(".print-page-caption")).toContainText("Page 2 of 3: Acoustic Guitar");
    await expect(page.locator(".print-preview-screen .print-sheet-footer strong")).toHaveText("Acoustic Guitar");

    await page.evaluate(() => {
      window.__printCalled = false;
      window.print = () => { window.__printCalled = true; };
    });
    await page.getByRole("button", { name: "Print all copies" }).click();
    expect(await page.evaluate(() => window.__printCalled)).toBe(true);
  });

  test("uses the Karen village and mountain reference behind the exact paper surface", async ({ page }) => {
    await page.goto("/");
    const background = await page.locator(".paper-area").evaluate((element) => getComputedStyle(element).backgroundImage);
    expect(background).toContain("karen-village-aerial.png");

    const ratio = await page.locator(".chart-paper").evaluate((paper) => {
      const box = paper.getBoundingClientRect();
      return box.width / box.height;
    });
    expect(ratio).toBeCloseTo(8.5 / 11, 2);
  });

  test("uses the thumb-reachable mobile toolbar without covering the work surface", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-app-ready", "true");

    await expect(page.locator(".mobile-toolbar")).toBeVisible();
    await expect(page.locator(".paper-tabs")).toBeVisible();
    await page.locator(".mobile-toolbar").getByRole("button", { name: "Sidebar" }).click();
    await expect(page.locator(".sidebar")).toBeVisible();

    const geometry = await page.evaluate(() => {
      const toolbar = document.querySelector(".mobile-toolbar").getBoundingClientRect();
      const tabs = document.querySelector(".paper-tabs").getBoundingClientRect();
      return { toolbarTop: toolbar.top, tabsBottom: tabs.bottom, viewportHeight: window.innerHeight };
    });
    expect(geometry.toolbarTop).toBeLessThanOrEqual(geometry.viewportHeight);
    expect(geometry.tabsBottom).toBeLessThan(geometry.toolbarTop);
  });

  test("runs every distinct shell control while preserving the fixed eight-column paper", async ({ page }) => {
    await openReady(page);

    const firstRow = page.locator(".measure-row").first();
    await expect(firstRow.locator(".measure")).toHaveCount(4);

    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.locator(".view-controls output")).not.toHaveText("100%");
    await page.getByRole("button", { name: "100%" }).click();
    await expect(page.locator(".view-controls output")).toHaveText("100%");
    await page.getByRole("button", { name: "Zoom out" }).click();
    await expect(page.locator(".view-controls output")).not.toHaveText("100%");
    await page.getByRole("button", { name: "100%" }).click();

    await page.getByRole("button", { name: "Close sidebar" }).click();
    await expect(page.locator(".workspace")).toHaveClass(/sidebar-collapsed/);
    await page.getByRole("button", { name: "Toggle settings and library" }).click();
    await expect(page.locator(".workspace")).not.toHaveClass(/sidebar-collapsed/);

    await page.getByRole("textbox", { name: "English title on paper" }).fill("Synthetic Controls");
    await page.getByRole("combobox", { name: "Song style on paper" }).selectOption("Hymn");
    const bpmSlider = page.getByRole("slider", { name: "BPM on paper" });
    await expect(bpmSlider).toHaveAttribute("min", "55");
    await expect(bpmSlider).toHaveAttribute("max", "155");
    await bpmSlider.fill("88");
    const meterSelect = page.getByRole("combobox", { name: "Time signature on paper" });
    await expect(meterSelect.locator("option")).toHaveText(["2/4", "3/4", "4/4", "6/8"]);
    await meterSelect.selectOption("6/8");
    const groupSelect = page.getByRole("combobox", { name: "Group on paper" });
    await expect(groupSelect.locator("option")).toHaveText(["Praise & Worship", "Kids", "Youth", "Choir", "Solo"]);
    await groupSelect.selectOption("Choir");
    await page.getByRole("combobox", { name: "Song key on paper" }).selectOption("D");
    await expect(page.getByRole("textbox", { name: "English title on paper" })).toHaveValue("Synthetic Controls");
    await expect(page.locator(".paper-footer")).toContainText("88 BPM");
    await expect(meterSelect).toHaveValue("6/8");
    await expect(page.getByRole("combobox", { name: "Group on paper" })).toHaveValue("Choir");
    await bpmSlider.fill("55");
    await expect(page.locator(".paper-footer")).toContainText("55 BPM");
    await bpmSlider.fill("155");
    await expect(page.locator(".paper-footer")).toContainText("155 BPM");
    await bpmSlider.fill("88");

    const paperInstrumentPicker = page.locator(".paper-instrument-picker");
    await paperInstrumentPicker.locator("summary").click();
    await expect(paperInstrumentPicker.locator(".paper-instrument-menu label")).toHaveText([
      "Piano 1",
      "Piano 2",
      "Acoustic Guitar",
      "Electric Guitar",
      "Drums",
      "Electric Bass",
      "Keytar",
    ]);
    await paperInstrumentPicker.getByLabel("Drums").check();
    await paperInstrumentPicker.getByLabel("Keytar").check();
    await expect(paperInstrumentPicker.locator("summary")).toContainText("Drums");
    await expect(paperInstrumentPicker.locator("summary")).toContainText("Keytar");
    await paperInstrumentPicker.locator("summary").click();

    await page.getByRole("button", { name: "Toggle one-beat pre-measure for INTRO" }).click();
    await expect(page.locator(".pre-measure")).toHaveCount(1);
    await page.getByRole("button", { name: "More measures in this row" }).first().click();
    await expect(page.locator(".row-density output").first()).toHaveText("9");
    await page.getByRole("button", { name: "Fewer measures in this row" }).first().click();
    await expect(page.locator(".row-density output").first()).toHaveText("8");
    const intro = page.locator('.chart-section[data-section-type="INTRO"]');
    const beforeAdd = await intro.locator(".measure:not(.pre-measure)").count();
    await intro.getByRole("button", { name: "Create measures through measure 7" }).click();
    await expect(intro.locator(".measure:not(.pre-measure)")).toHaveCount(beforeAdd + 3);
    await expect(intro.getByRole("button", { name: "Create measures through measure 8" })).toBeVisible();
    await expect(page.locator(".add-measure")).toHaveCount(0);

    await page.getByRole("button", { name: "Add section at end" }).click();
    await expect(page.getByRole("dialog", { name: "Add section" })).toBeVisible();
    await page.getByRole("button", { name: /ENDING/ }).click();
    await expect(page.getByRole("heading", { name: "ENDING" })).toBeVisible();
    await page.getByRole("button", { name: "Remove ENDING" }).click();
    await expect(page.getByRole("heading", { name: "ENDING" })).toHaveCount(0);

    await page.getByRole("button", { name: "New song" }).click();
    await expect(page.getByRole("dialog", { name: "Start with song details" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByRole("dialog", { name: "Confirm this chart is safe to save" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save to private library" })).toBeDisabled();
    await page.getByRole("button", { name: "Cancel" }).click();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export" }).click();
    expect((await download).suggestedFilename()).toContain("Synthetic Controls");

    await page.getByRole("tab", { name: "lyrics" }).click();
    await expect(page.locator(".lyrics-paper")).toBeVisible();
    await expect(page.getByRole("region", { name: "Library panel" }).locator(".empty-state")).toBeVisible();
    await expect(page.getByRole("tab", { name: "settings" })).toHaveCount(0);
    await page.locator(".settings-menu > summary").click();
    await expect(page.getByRole("checkbox", { name: /Karen title keyboard/ })).toBeVisible();
    await page.getByRole("textbox", { name: /Song styles/ }).fill("Worship, Hymn, Gospel");
    await page.getByRole("textbox", { name: "Categories" }).fill("Praise / Worship, Choir, Kids");
    await page.getByRole("combobox", { name: "Current song category" }).selectOption("Kids");
    await page.locator(".settings-menu > summary").click();
    await page.getByRole("tab", { name: "chart" }).click();
    await expect(page.getByRole("combobox", { name: "Song style on paper" }).locator("option")).toHaveText(["Worship", "Hymn", "Gospel"]);

    const geometry = await page.locator(".chart-paper").evaluate((paper) => {
      const header = paper.querySelector(".paper-header").getBoundingClientRect();
      const footer = paper.querySelector(".paper-footer").getBoundingClientRect();
      const box = paper.getBoundingClientRect();
      return {
        headerTop: Math.round(header.top - box.top),
        footerBottom: Math.round(box.bottom - footer.bottom),
        columns: getComputedStyle(paper.querySelector(".measure-row")).gridTemplateColumns.split(" ").length,
        overflowX: paper.scrollWidth - paper.clientWidth,
        overflowY: paper.scrollHeight - paper.clientHeight,
      };
    });
    expect(geometry.columns).toBe(8);
    expect(geometry.headerTop).toBeLessThanOrEqual(1);
    expect(geometry.footerBottom).toBeLessThanOrEqual(1);
    expect(geometry.overflowX).toBe(0);
    expect(geometry.overflowY).toBe(0);
  });

  test("keeps imports in an explicit review gate and applies only an unsaved synthetic draft", async ({ page }) => {
    await openReady(page);
    const originalTitle = await page.getByRole("textbox", { name: "English title on paper" }).inputValue();
    await page.locator("input[type=file]").setInputFiles(syntheticImportPath);

    const dialog = page.getByRole("dialog", { name: "Review before replacing the editor" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("sites-synthetic-import.json");
    await expect(dialog).toContainText("1");
    await expect(page.getByRole("textbox", { name: "English title on paper" })).toHaveValue(originalTitle);
    await expect(dialog.getByRole("button", { name: "Load unsaved draft" })).toBeDisabled();

    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Load unsaved draft" }).click();
    await expect(page.getByRole("textbox", { name: "English title on paper" })).toHaveValue("Synthetic Import Review");
    await expect(page.getByRole("combobox", { name: "Group on paper" })).toHaveValue("Praise & Worship");
    await expect(page.getByRole("slider", { name: "BPM on paper" })).toHaveValue("72");
    await expect(page.getByRole("combobox", { name: "Time signature on paper" })).toHaveValue("4/4");
    await expect(page.locator(".paper-instrument-picker summary")).toContainText("Electric Bass");
    await expect(page.locator(".paper-instrument-picker summary")).toContainText("Keytar");
    await expect(page.locator(".paper-instrument-picker summary")).not.toContainText("Strings");
    await expect(page.locator(".status")).toHaveText("Imported as an unsaved reviewed draft");

    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByRole("button", { name: "Save to private library" })).toBeDisabled();
  });

  test("renders the complete Karen keyboard and exercises every key plus physical mappings", async ({ page }) => {
    await openReady(page);
    await page.locator(".settings-menu > summary").click();
    await expect(page.getByRole("checkbox", { name: /Karen title keyboard/ })).toBeChecked();
    await page.locator(".settings-menu > summary").click();
    const target = page.getByRole("textbox", { name: "Karen title on paper" });
    await target.fill("");

    const keyboard = page.getByRole("dialog", { name: "Karen keyboard" });
    await expect(keyboard).toBeVisible();
    const characterKeys = keyboard.locator("button[lang=kar]");
    await expect(characterKeys).toHaveCount(55);
    for (let index = 0; index < 55; index += 1) {
      await characterKeys.nth(index).click();
    }
    const allCharacters = await target.inputValue();
    expect(Array.from(allCharacters).length).toBeGreaterThanOrEqual(55);

    await keyboard.getByRole("button", { name: "Karen keyboard backspace" }).click();
    await keyboard.getByRole("button", { name: "Undo" }).click();
    await keyboard.getByRole("button", { name: "Redo" }).click();

    await target.focus();
    const beforePhysical = await target.inputValue();
    await page.keyboard.press("a");
    await page.keyboard.press("Shift+A");
    expect(await target.inputValue()).not.toBe(beforePhysical);
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+y");
    await page.keyboard.press("Escape");
    await expect(keyboard).toBeHidden();
  });

  test("matches legacy typography, adaptive measure widths, muted sections, pre-measures, and paper controls", async ({ page }) => {
    await openReady(page);
    const paper = page.locator(".chart-paper");
    const firstRow = page.locator(".measure-row").first();
    const initialWidths = await firstRow.locator(".measure").evaluateAll((measures) =>
      measures.map((measure) => Math.round(measure.getBoundingClientRect().width * 10) / 10)
    );
    expect(new Set(initialWidths).size).toBe(1);

    await paper.focus();
    await page.keyboard.press("c");
    await page.keyboard.press("b");
    await page.keyboard.press("m");
    await page.keyboard.press("7");
    const weightedWidths = await firstRow.locator(".measure").evaluateAll((measures) =>
      measures.map((measure) => Math.round(measure.getBoundingClientRect().width * 10) / 10)
    );
    expect(weightedWidths[0]).toBeGreaterThan(weightedWidths[1]);
    expect(weightedWidths.slice(1).every((width) => width === weightedWidths[1])).toBe(true);

    const chordType = await page.locator(".active-beat .chord").evaluate((chord) => {
      const root = chord.querySelector(".chord-root");
      const minor = chord.querySelector(".chord-minor");
      return {
        family: getComputedStyle(chord).fontFamily,
        rootSize: parseFloat(getComputedStyle(root).fontSize),
        minorSize: parseFloat(getComputedStyle(minor).fontSize),
      };
    });
    expect(chordType.family).toContain("IBM Plex Mono");
    expect(chordType.rootSize).toBeGreaterThan(chordType.minorSize);

    const paperType = await paper.evaluate((element) => getComputedStyle(element).fontFamily);
    expect(paperType).toContain("Instrument Sans");

    const sectionColors = await page.locator(".chart-section").evaluateAll((sections) =>
      sections.map((section) => getComputedStyle(section).backgroundColor)
    );
    expect(new Set(sectionColors).size).toBeGreaterThanOrEqual(3);

    await page.getByRole("button", { name: "Toggle one-beat pre-measure for INTRO" }).click();
    await expect(page.locator(".pre-measure.active-measure")).toBeVisible();
    await page.keyboard.press("g");
    await expect(page.getByRole("button", { name: /Pre-measure beat 1, G/ })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(firstRow.locator(".measure").first()).toHaveClass(/active-measure/);

    const headerGeometry = await page.locator(".paper-header").evaluate((header) => {
      const style = header.querySelector('select[aria-label="Song style on paper"]').getBoundingClientRect();
      const key = header.querySelector('select[aria-label="Song key on paper"]').getBoundingClientRect();
      const box = header.getBoundingClientRect();
      const rowControl = document.querySelector(".row-density").getBoundingClientRect();
      const english = header.querySelector(".paper-english-title");
      return {
        styleCenterDelta: Math.abs((style.left + style.width / 2) - (box.left + box.width / 2)),
        rowKeyRightDelta: Math.abs(rowControl.right - key.right),
        englishText: english.textContent,
        englishColor: getComputedStyle(english).color,
      };
    });
    expect(headerGeometry.styleCenterDelta).toBeLessThan(3);
    expect(headerGeometry.rowKeyRightDelta).toBeLessThan(6);
    expect(headerGeometry.englishText).toContain("(");
    expect(headerGeometry.englishText).toContain(")");
    expect(headerGeometry.englishColor).toBe("rgb(17, 17, 17)");

    const rowControl = page.locator(".row-density").first();
    await expect(rowControl).toContainText("8");
    await rowControl.getByRole("button", { name: "More measures in this row" }).click();
    await expect(rowControl.locator("output")).toHaveText("9");
    await rowControl.getByRole("button", { name: "Fewer measures in this row" }).click();
    await expect(rowControl.locator("output")).toHaveText("8");

    const picker = page.locator(".paper-instrument-picker");
    await expect(picker).toBeVisible();
    await picker.locator("summary").click();
    await expect(picker.locator(".paper-instrument-menu label")).toHaveText([
      "Piano 1",
      "Piano 2",
      "Acoustic Guitar",
      "Electric Guitar",
      "Drums",
      "Electric Bass",
      "Keytar",
    ]);
    await picker.getByRole("checkbox", { name: "Drums" }).check();
    await expect(picker.locator("summary")).toContainText("Drums");
    const pickerDelta = await picker.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const footer = element.closest(".paper-footer").getBoundingClientRect();
      return Math.abs((box.left + box.width / 2) - (footer.left + footer.width / 2));
    });
    expect(pickerDelta).toBeLessThan(3);
  });

  test("opens the Karen modal only from Karen title fields and Enter applies and exits", async ({ page }) => {
    await openReady(page);
    const keyboard = page.getByRole("dialog", { name: "Karen keyboard" });
    const english = page.getByRole("textbox", { name: "English title on paper" });
    await english.focus();
    await expect(keyboard).toHaveCount(0);

    const style = page.getByRole("combobox", { name: "Song style on paper" });
    await style.focus();
    await expect(keyboard).toHaveCount(0);

    await page.getByRole("tab", { name: "lyrics" }).click();
    const lyrics = page.getByRole("textbox", { name: "Song lyrics" });
    await lyrics.focus();
    await expect(keyboard).toHaveCount(0);

    const search = page.getByRole("searchbox", { name: "Search song library" });
    await search.focus();
    await expect(keyboard).toHaveCount(0);

    await page.getByRole("tab", { name: "chart" }).click();
    const karenTitle = page.getByRole("textbox", { name: "Karen title on paper" });
    await karenTitle.focus();
    await expect(keyboard).toBeVisible();
    await expect(keyboard).toHaveAttribute("aria-modal", "true");

    const numberKey = keyboard.locator(".karen-numbers .floating-key").first();
    const normalFilter = await numberKey.evaluate((element) => getComputedStyle(element).filter);
    await numberKey.hover();
    await page.waitForTimeout(550);
    const hoverFilter = await numberKey.evaluate((element) => getComputedStyle(element).filter);
    const animationName = await numberKey.evaluate((element) => getComputedStyle(element).animationName);
    expect(normalFilter).not.toBe(hoverFilter);
    expect(animationName).toContain("karenKeyDrift");
    await page.keyboard.press("a");
    await page.keyboard.press("Enter");
    await expect(keyboard).toBeHidden();
    await expect(page.getByRole("textbox", { name: "Karen title on paper" })).toHaveValue(await karenTitle.inputValue());

    await page.getByRole("textbox", { name: "Karen title on paper" }).click();
    await expect(keyboard).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(keyboard).toBeHidden();
  });

  test("keeps the Karen modal and row steppers touch-reachable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openReady(page);
    await page.getByRole("textbox", { name: "Karen title on paper" }).focus();

    const keyboard = page.getByRole("dialog", { name: "Karen keyboard" });
    await expect(keyboard).toBeVisible();
    await page.waitForTimeout(450);
    const geometry = await keyboard.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        bottom: box.bottom,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
    await page.keyboard.press("Enter");
    await expect(keyboard).toBeHidden();

    const rowControl = page.locator(".row-density").first();
    await expect(rowControl).toBeVisible();
    await rowControl.getByRole("button", { name: "More measures in this row" }).click();
    await expect(rowControl.locator("output")).toHaveText("9");
  });

  test("supports per-beat lead spacing, advanced navigation, undo, and two instrument cue ranges", async ({ page }) => {
    await openReady(page);
    await page.locator(".chart-paper").focus();
    await page.keyboard.press("l");

    const dialog = page.getByRole("dialog", { name: "Lead melody" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox", { name: "Beat 1" }).selectOption("6");
    await expect(dialog.locator("input[data-lead-slot]")).toHaveCount(18);

    const firstSlot = dialog.getByRole("textbox", { name: "Lead note slot 1", exact: true });
    await firstSlot.fill("1");
    await firstSlot.focus();
    await page.keyboard.press("ArrowUp");
    await expect(firstSlot).toHaveValue("^1");
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByRole("textbox", { name: "Lead note slot 2", exact: true })).toBeFocused();
    await page.keyboard.press("Control+ArrowUp");
    await expect(dialog.getByRole("combobox", { name: "Base octave" })).toHaveValue("5");
    await page.keyboard.press("Control+z");
    await expect(dialog.getByRole("combobox", { name: "Base octave" })).toHaveValue("4");
    await page.keyboard.press("Control+y");
    await expect(dialog.getByRole("combobox", { name: "Base octave" })).toHaveValue("5");

    await dialog.getByRole("button", { name: "P1" }).click();
    await firstSlot.focus();
    await dialog.getByRole("button", { name: "Start here" }).click();
    await page.keyboard.press("Control+ArrowRight");
    await expect(dialog).toContainText("Measure 2");
    const lastSlot = dialog.locator("input[data-lead-slot]").last();
    await lastSlot.focus();
    await dialog.getByRole("button", { name: "End here" }).click();
    await expect(dialog.getByRole("button", { name: /P1: M1\.1–M2\.4/ })).toBeVisible();

    await dialog.getByRole("button", { name: "Range 2" }).click();
    await dialog.getByRole("button", { name: "EG" }).click();
    await dialog.getByRole("button", { name: "Start here" }).click();
    await dialog.getByRole("button", { name: "End here" }).click();
    await expect(dialog.getByRole("button", { name: /EG: M2\.4–M2\.4/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Done" }).click();

    await expect(page.locator(".lead-range-start")).toHaveCount(2);
    await expect(page.locator(".lead-range-end")).toHaveCount(1);
    await expect(page.locator(".lead-range-end")).toHaveAttribute("data-cue-end", "P1,EG");
    await expect(page.getByRole("button", { name: /P1 cue starts/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /P1,EG cue ends|P1, EG cue ends/ })).toBeVisible();
  });

  test("executes the complete locked editor shortcut contract", async ({ page }) => {
    await openReady(page);
    const paper = page.locator(".chart-paper");
    await paper.focus();

    await page.keyboard.press("c");
    await expect(page.locator(".active-beat .chord")).toHaveText("C");
    await page.keyboard.press("b");
    await expect(page.locator(".active-beat .chord")).toContainText("♭");
    await page.keyboard.press("m");
    await expect(page.locator(".active-beat .chord")).toContainText("m");
    await page.keyboard.press("7");
    await expect(page.locator(".active-beat .chord")).toContainText("₇");
    await page.keyboard.press("/");
    await page.keyboard.press("g");
    await expect(page.locator(".active-beat .bass-note")).toHaveText("G");
    await page.keyboard.press(".");
    await expect(page.locator(".active-beat .push-dot")).toBeVisible();
    await page.keyboard.press("x");
    await expect(page.locator(".active-beat .rhythm-marks")).toContainText("x");
    await page.keyboard.press("o");
    await expect(page.locator(".active-beat .chord")).toHaveClass(/circled/);
    await page.keyboard.press("r");
    await expect(page.locator(".active-measure")).toHaveClass(/has-roll/);

    await page.keyboard.press("s");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("s");
    await expect(page.locator(".status")).toHaveText("Slur added");
    await page.keyboard.press(",");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press(",");
    await expect(page.locator(".status")).toHaveText("Only / All In cue added");

    const beforeTab = await page.locator(".measure").count();
    await page.keyboard.press("Tab");
    await expect(page.locator(".measure")).toHaveCount(beforeTab + 1);
    const beforeCtrlSpace = await page.locator(".measure").count();
    await page.keyboard.press("Control+Space");
    await expect(page.locator(".measure")).toHaveCount(beforeCtrlSpace + 1);
    await expect(page.locator(".active-measure button")).toHaveCount(1);
    const beforeCtrlTab = await page.locator(".measure").count();
    await page.keyboard.press("Control+Tab");
    await expect(page.locator(".measure")).toHaveCount(beforeCtrlTab + 1);
    const beforeExact = await page.locator(".measure").count();
    for (let beats = 1; beats <= 6; beats += 1) {
      await page.keyboard.press(`Control+${beats}`);
      await expect(page.locator(".active-measure button")).toHaveCount(beats);
    }
    await expect(page.locator(".measure")).toHaveCount(beforeExact + 6);

    await page.keyboard.press("Control+z");
    await expect(page.locator(".measure")).toHaveCount(beforeExact + 5);
    await page.keyboard.press("Control+y");
    await expect(page.locator(".measure")).toHaveCount(beforeExact + 6);
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Delete");

    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Add section" })).toBeVisible();
    await page.keyboard.press("e");
    await expect(page.getByRole("heading", { name: "ENDING" })).toBeVisible();

    await paper.focus();
    await page.keyboard.press("Shift+/");
    await expect(page.locator(".shortcut-panel")).toBeVisible();
    await page.keyboard.press("Shift+/");
    await expect(page.locator(".shortcut-panel")).toBeHidden();

    await paper.focus();
    await page.keyboard.press("Control+p");
    await expect(page.getByRole("dialog", { name: "One physical page per copy" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "One physical page per copy" })).toBeHidden();
  });

  test("scopes the persistence UI to an authenticated user and sends approval metadata", async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ "oai-authenticated-user-email": "synthetic.qa@example.invalid" });
    let postBody = null;
    await page.route("**/api/songs", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ songs: [] }) });
        return;
      }
      postBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ song: { ...postBody, id: 1, saveApproval: undefined } }),
      });
    });
    await openReady(page);

    await page.getByRole("button", { name: "Save" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Confirm this chart is safe to save" });
    await expect(dialog).toContainText("private hosted library");
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Save to private library" }).click();
    await expect(page.locator(".status")).toHaveText("Saved to hosted library");
    expect(postBody.saveApproval).toEqual({ reviewed: true, syntheticOrApproved: true });
    expect(postBody.sourceKind).toBe("synthetic");
    expect(postBody.reviewState).toBe("reviewed");
  });
});
