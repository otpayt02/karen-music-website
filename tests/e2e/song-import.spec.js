const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor, openSidebar } = require("./helpers");


test.describe("song import", () => {
  test("loads a portable song JSON into the editor for review", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    const payload = {
      title: "Imported Test Song",
      title_karen: "Imported Karen Title",
      category: "Choir",
      key: "G",
      current_key: "G",
      original_key: "G",
      style: "Ballad",
      tempo: "88",
      chart_json: {
        sections: [{
          type: "Chorus",
          measures: [{
            beats: [
              { bass: "", chordState: { root: "G", flat: false, minor: false, triangle: false, seven: false }, circle: true, dot: false, editStack: ["root"], lead: [], manualUnderline: false, roll: false, xMarks: 0 },
              { bass: "", chordState: { root: "", flat: false, minor: false, triangle: false, seven: false }, circle: false, dot: false, editStack: [], lead: [], manualUnderline: false, roll: false, xMarks: 0 },
              { bass: "", chordState: { root: "C", flat: false, minor: false, triangle: false, seven: false }, circle: false, dot: false, editStack: ["root"], lead: [], manualUnderline: false, roll: false, xMarks: 0 },
              { bass: "", chordState: { root: "", flat: false, minor: false, triangle: false, seven: false }, circle: false, dot: false, editStack: [], lead: [], manualUnderline: false, roll: false, xMarks: 0 }
            ]
          }]
        }],
        onlySpans: [],
        slurs: [],
        lyricsSections: [],
        beatsPerMeasure: 4,
        defaultMeasuresPerRow: 4,
        rowDefaultExplicit: false
      },
      row_lead_json: {}
    };

    await page.locator("#btn-import").click();
    await expect(page.locator("#song-import-overlay")).toBeVisible();
    await expect(page.locator("#song-import-metadata-criteria")).toContainText("English title");
    await expect(page.locator("#song-import-chart-criteria")).toContainText("beat positions");

    const importInput = page.locator("#song-import-file");
    await expect(importInput).toHaveAttribute("data-import-bound", "1");
    const importResponsePromise = page.waitForResponse(response => response.url().endsWith("/api/import/json"));
    await importInput.setInputFiles({
      name: "imported-song.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(payload), "utf8")
    });
    const importResponse = await importResponsePromise;
    expect(importResponse.ok(), await importResponse.text()).toBe(true);

    await expect(page.locator("#song-import-review")).toBeVisible();
    await expect(page.locator("#song-import-review-source")).toContainText("editor-json");
    await expect(page.locator("#song-import-review-sections")).toHaveText("1");
    await page.locator("#song-import-apply").click();
    await expect(page.locator("#song-import-overlay")).toBeHidden();

    await expect(page.locator("#songTitle")).toHaveValue("Imported Test Song");
    await expect(page.locator("#songTitleKaren")).toHaveValue("Imported Karen Title");
    await expect(page.locator("#songTempo")).toHaveValue("88");
    await expect(page.locator("#sections-container .section")).toHaveCount(1);
    await expect(page.locator("#sections-container .section-header")).toContainText("Chorus");
    await expect(page.locator("#sections-container .chord-root")).toHaveText(["G", "C"]);
    expect(await page.evaluate(() => state.id)).toBeNull();
  });

  test("shows criteria and fills a 6/8 text chart-code draft", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);
    await page.locator("#btn-import").click();

    const chartCode = `Title: ChordPro Test
Karen Title: တၢ်သးဝံၣ်
Category: Youth
Current Key: G
Original Key: Bb
Style: Worship
Tempo: 84
Time: 6/8
Instruments: Piano 1, Drums
Group: Youth Team
[Verse]
| (G) - C. - x - | D/F# - Em - G - |`;
    const responsePromise = page.waitForResponse(response => response.url().endsWith("/api/import/code"));
    await page.locator("#song-import-file").setInputFiles({
      name: "song.chordpro",
      mimeType: "text/plain",
      buffer: Buffer.from(chartCode, "utf8")
    });
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBe(true);

    await expect(page.locator("#song-import-review-source")).toContainText("text-chart");
    await expect(page.locator("#song-import-review-measures")).toHaveText("2");
    await page.locator("#song-import-apply").click();

    await expect(page.locator("#songTitle")).toHaveValue("ChordPro Test");
    await expect(page.locator("#songKey")).toHaveValue("G");
    await expect(page.locator("#songTempo")).toHaveValue("84");
    expect(await page.evaluate(() => state.beatsPerMeasure)).toBe(6);
    expect(await page.evaluate(() => state.songGroup)).toBe("Youth Team");
    await expect(page.locator("#sections-container .section")).toHaveCount(1);
    expect(await page.evaluate(() => [
      state.sections[0].measures[0].beats[0].chordState.root,
      state.sections[0].measures[1].beats[0].chordState.root,
      state.sections[0].measures[1].beats[0].bass
    ])).toEqual(["G", "D", "F#"]);
  });

  test("reviews a handwritten-image OCR payload before filling the editor", async ({ page }) => {
    await page.route("**/api/import/vision", async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Handwritten OCR Draft",
          title_karen: "",
          category: "Youth",
          key: "C",
          current_key: "C",
          original_key: "C",
          style: "Worship",
          tempo: "92",
          instruments: "Piano 1",
          notes: "Imported from image/PDF.",
          confidence: 0.78,
          warnings: ["Measure 2 beat 4 is faint"],
          chart_json: {
            sections: [{
              type: "Chorus",
              measures: [{ beats: [
                { bass: "", chordState: { root: "C", flat: false, minor: false, triangle: false, seven: false }, circle: false, dot: false, editStack: ["root"], lead: [], manualUnderline: false, roll: false, xMarks: 0 },
                { bass: "", chordState: { root: "", flat: false, minor: false, triangle: false, seven: false }, circle: false, dot: false, editStack: [], lead: [], manualUnderline: false, roll: false, xMarks: 0 },
                { bass: "", chordState: { root: "F", flat: false, minor: false, triangle: false, seven: false }, circle: false, dot: false, editStack: ["root"], lead: [], manualUnderline: false, roll: false, xMarks: 0 },
                { bass: "", chordState: { root: "", flat: false, minor: false, triangle: false, seven: false }, circle: false, dot: false, editStack: [], lead: [], manualUnderline: false, roll: false, xMarks: 0 }
              ] }]
            }],
            onlySpans: [], slurs: [], lyricsSections: [], beatsPerMeasure: 4, defaultMeasuresPerRow: 4, rowDefaultExplicit: false, songGroup: ""
          },
          row_lead_json: {},
          import_review: {
            source_kind: "vision",
            provider: "Gemini",
            recognized_fields: ["English title", "current key", "chart sections"],
            missing_fields: ["S'gaw Karen title"],
            section_count: 1,
            measure_count: 1
          }
        })
      });
    });

    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);
    await page.locator("#btn-import").click();
    await page.locator("#song-import-file").setInputFiles({
      name: "handwritten-chart.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image")
    });

    await expect(page.locator("#song-import-review-source")).toHaveText("vision / Gemini");
    await expect(page.locator("#song-import-review-confidence")).toHaveText("78%");
    await expect(page.locator("#song-import-warnings")).toContainText("Measure 2 beat 4 is faint");
    await page.locator("#song-import-apply").click();
    await expect(page.locator("#songTitle")).toHaveValue("Handwritten OCR Draft");
    await expect(page.locator("#sections-container .chord-root")).toHaveText(["C", "F"]);
  });
});
