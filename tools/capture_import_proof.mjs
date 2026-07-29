import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";


const baseUrl = process.env.IMPORT_PROOF_BASE_URL || "http://127.0.0.1:5036";
const sourcePath = path.resolve(process.argv[2] || "private/import_accuracy_corpus/sources/round-pen-4-4.png");
const outputDir = path.resolve(process.argv[3] || "private/chord-chart-import-case-study/proof");

fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator("#lang-btn-english").click();
  await page.locator("#chart-container").waitFor({ state: "visible" });

  const sidebar = page.locator("#sidebar");
  if (await sidebar.evaluate((element) => element.classList.contains("collapsed"))) {
    await page.locator("#sidebar-toggle").click();
  }

  await page.locator("#btn-import").click();
  await page.locator("#song-import-overlay").waitFor({ state: "visible" });
  await page.screenshot({
    path: path.join(outputDir, "01-import-criteria.png"),
    animations: "disabled",
  });

  const importResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/import/vision"),
    { timeout: 120_000 },
  );
  await page.locator("#song-import-file").setInputFiles(sourcePath);
  const importResponse = await importResponsePromise;
  if (!importResponse.ok()) {
    throw new Error(`Vision import failed with HTTP ${importResponse.status()}.`);
  }

  await page.locator("#song-import-review").waitFor({ state: "visible", timeout: 120_000 });
  const review = {
    source: await page.locator("#song-import-review-source").innerText(),
    confidence: await page.locator("#song-import-review-confidence").innerText(),
    sections: await page.locator("#song-import-review-sections").innerText(),
    measures: await page.locator("#song-import-review-measures").innerText(),
  };
  await page.locator("#song-import-review").screenshot({
    path: path.join(outputDir, "02-ocr-review-gate.png"),
    animations: "disabled",
  });

  await page.locator("#song-import-apply").click();
  await page.locator("#song-import-overlay").waitFor({ state: "hidden" });
  await page.locator("#sections-container .section").first().waitFor({ state: "visible" });

  const editorState = await page.evaluate(() => ({
    id: state.id,
    title: document.getElementById("songTitle")?.value || "",
    sectionCount: state.sections.length,
    measureCount: state.sections.reduce((count, section) => count + section.measures.length, 0),
    beatsPerMeasure: state.beatsPerMeasure,
  }));
  if (editorState.id !== null) {
    throw new Error("Imported chart unexpectedly has a saved song id.");
  }

  await page.screenshot({
    path: path.join(outputDir, "03-filled-unsaved-editor.png"),
    animations: "disabled",
  });

  const manifest = {
    captured_at_utc: new Date().toISOString(),
    private: true,
    source: path.basename(sourcePath),
    synthetic_source: true,
    raw_provider_payloads_retained: false,
    save_clicked: false,
    song_id_after_fill: editorState.id,
    review,
    editor: editorState,
    screenshots: [
      "01-import-criteria.png",
      "02-ocr-review-gate.png",
      "03-filled-unsaved-editor.png",
    ],
  };
  fs.writeFileSync(path.join(outputDir, "capture-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  await browser.close();
}
