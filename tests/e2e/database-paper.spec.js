const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("database paper", () => {
  test("shows metadata, adds a clickable file reference, and searches across file notes", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    const title = `Database Search ${Date.now()}`;
    await page.evaluate((songTitle) => {
      document.getElementById("songTitle").value = songTitle;
      document.getElementById("songTitleKaren").value = "တၢ်သးဝံၣ် Database";
      document.getElementById("songCategory").value = "Choir";
      document.getElementById("songKey").value = "Bb";
      document.getElementById("songStyle").value = "Processional";
      document.getElementById("songTempo").value = "88";
      document.getElementById("karenText").value = "Opening verse\nblue folder lyric token";
      state.createdDate = "2026-05-17";
      state.nextPerformanceDate = "2026-06-01";
      state.performedDates = ["2026-05-17"];
      renderChart();
    }, title);

    await page.locator(".paper-flap-database").click();
    await expect(page.locator("#paper-stack")).toHaveAttribute("data-active-paper", "database");
    await expect(page.locator("#database-active-title")).toHaveText(title);
    await expect(page.locator("#database-meta-grid")).toContainText("Bb");
    await expect(page.locator("#database-notes-preview")).toContainText("blue folder lyric token");

    await page.locator("#db-file-name").fill("Choir PDF");
    await page.locator("#db-file-kind").selectOption("PDF");
    await page.locator("#db-file-path").fill("https://example.com/choir-packet.pdf");
    await page.locator("#db-file-notes").fill("blue folder attachment token");
    await page.locator("#db-add-file").click();

    await expect(page.locator("#database-file-list")).toContainText("Choir PDF");
    await expect(page.locator("#database-file-list a")).toHaveAttribute("href", "https://example.com/choir-packet.pdf");

    await page.locator("#database-search").fill("blue folder attachment");
    await expect(page.locator("#database-results")).toContainText(title);

    const id = await page.evaluate(() => state.id);
    if (id) {
      await page.request.delete(`/api/songs/${id}`);
    }
  });

  test("exports a portable song library with chart formatting", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    const title = `Portable Library ${Date.now()}`;
    const result = await page.request.post("/api/songs", {
      data: {
        title,
        title_karen: "Portable Karen",
        category: "Choir",
        key: "G",
        current_key: "G",
        original_key: "G",
        instruments: "Piano 1",
        chart_json: {
          sections: [
            {
              name: "Verse",
              measures: [
                {
                  beats: [
                    { chord: { root: "G", flavor: "", bass: "" }, slash: "" }
                  ]
                }
              ]
            }
          ],
          rowDefaultExplicit: true,
          defaultMeasuresPerRow: 4
        }
      }
    });
    expect(result.ok()).toBeTruthy();
    const { id } = await result.json();

    const exportResponse = await page.request.get("/api/export-library");
    expect(exportResponse.ok()).toBeTruthy();
    const payload = await exportResponse.json();
    const exportedSong = payload.songs.find(song => song.id === id);

    expect(payload.schema).toBe("karen-music-song-library");
    expect(exportedSong.title).toBe(title);
    expect(exportedSong.chart_json.defaultMeasuresPerRow).toBe(4);
    expect(exportedSong.chart_json.sections[0].measures[0].beats[0].chord.root).toBe("G");

    await page.request.delete(`/api/songs/${id}`);
  });
});
