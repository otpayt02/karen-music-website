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

    page.on("dialog", dialog => dialog.accept());
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

    await expect(page.locator("#songTitle")).toHaveValue("Imported Test Song");
    await expect(page.locator("#songTitleKaren")).toHaveValue("Imported Karen Title");
    await expect(page.locator("#songTempo")).toHaveValue("88");
    await expect(page.locator("#sections-container .section")).toHaveCount(1);
    await expect(page.locator("#sections-container .section-header")).toContainText("Chorus");
    await expect(page.locator("#sections-container .chord-root")).toHaveText(["G", "C"]);
    expect(await page.evaluate(() => state.id)).toBeNull();
  });
});
