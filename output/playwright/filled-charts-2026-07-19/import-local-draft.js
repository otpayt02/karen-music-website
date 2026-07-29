async (page) => {
  const chartFile = await page.evaluate(() => window.__chartFile || "");
  if (!chartFile) throw new Error("CHART_FILE is required.");

  await page.reload({ waitUntil: "networkidle" });
  const languagePicker = page.locator("#lang-picker-overlay");
  if (await languagePicker.isVisible()) {
    await page.locator("#lang-btn-english").click();
  }

  await page.locator("#chart-container").waitFor({ state: "visible" });
  await page.locator("#btn-import").click();
  await page.locator("#song-import-file").setInputFiles(chartFile);
  await page.locator("#song-import-review").waitFor({ state: "visible", timeout: 30_000 });

  const review = {
    source: await page.locator("#song-import-review-source").innerText(),
    confidence: await page.locator("#song-import-review-confidence").innerText(),
    sections: await page.locator("#song-import-review-sections").innerText(),
    measures: await page.locator("#song-import-review-measures").innerText(),
    warnings: await page.locator("#song-import-warnings").innerText(),
  };

  await page.locator("#song-import-apply").click();
  await page.locator("#song-import-overlay").waitFor({ state: "hidden" });
  await page.locator("#sections-container .section").first().waitFor({ state: "visible" });

  const editor = await page.evaluate(() => ({
    id: state.id,
    title: document.getElementById("songTitle").value,
    titleKaren: document.getElementById("songTitleKaren").value,
    key: document.getElementById("songKey").value,
    sections: state.sections.length,
    measures: state.sections.reduce((count, section) => count + section.measures.length, 0),
    beatsPerMeasure: state.beatsPerMeasure,
  }));
  if (editor.id !== null) throw new Error("Imported chart unexpectedly has a saved song id.");

  return { review, editor, saveClicked: false };
}
