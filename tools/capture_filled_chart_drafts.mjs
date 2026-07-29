import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";


const baseUrl = process.env.FILLED_CHART_BASE_URL || "http://127.0.0.1:5038";
const outputDir = path.resolve(process.argv[2] || "output/playwright/filled-charts-2026-07-19");
const jobs = [
  {
    source: "codex-clipboard-1662b728-149f-4725-bfc4-6a17854ebc3d.jpg",
    draft: path.join(outputDir, "drafts", "01-go-go-review.chordpro"),
    screenshot: "01-go-go-filled-chart-reviewed.png",
  },
  {
    source: "codex-clipboard-ec2de781-ff91-4442-99f2-43ba7bb7f167.jpg",
    draft: path.join(outputDir, "drafts", "02-chart-24-slow-review.chordpro"),
    screenshot: "02-chart-24-slow-filled-chart-reviewed.png",
  },
  {
    source: "codex-clipboard-f739f704-5e53-4f51-a5e5-e234a801a5b9.jpg",
    draft: path.join(outputDir, "drafts", "03-move-your-boat-review.chordpro"),
    screenshot: "03-move-your-boat-filled-chart-reviewed.png",
  },
];

fs.mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];

try {
  for (const job of jobs) {
    const page = await browser.newPage({ viewport: { width: 1800, height: 1100 }, deviceScaleFactor: 1 });
    await page.goto(baseUrl, { waitUntil: "networkidle" });

    await page.locator("body.app-ready").waitFor({ state: "attached" });
    const languagePicker = page.locator("#lang-picker-overlay");
    await page.evaluate(() => setLanguage("english"));
    await languagePicker.waitFor({ state: "hidden" });
    await page.locator("#chart-container").waitFor({ state: "visible" });

    const sidebar = page.locator("#sidebar");
    if (await sidebar.evaluate((element) => element.classList.contains("collapsed"))) {
      await page.locator("#sidebar-toggle").click();
    }

    await page.locator("#btn-import").click();
    await page.locator("#song-import-file").setInputFiles(job.draft);
    await page.locator("#song-import-review").waitFor({ state: "visible", timeout: 30_000 });

    const review = {
      source: await page.locator("#song-import-review-source").innerText(),
      confidence: await page.locator("#song-import-review-confidence").innerText(),
      sections: Number(await page.locator("#song-import-review-sections").innerText()),
      measures: Number(await page.locator("#song-import-review-measures").innerText()),
      warnings: (await page.locator("#song-import-warnings").innerText()).trim(),
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
    if (editor.id !== null) throw new Error(`${editor.title} unexpectedly has a saved song id.`);

    await page.locator("#chart-container").screenshot({
      path: path.join(outputDir, job.screenshot),
      animations: "disabled",
    });

    results.push({
      source_image: job.source,
      reviewed_transcription: path.relative(outputDir, job.draft).replaceAll("\\", "/"),
      screenshot: job.screenshot,
      review,
      editor,
      save_clicked: false,
      status: "manual review draft; compare ambiguous source marks before Save",
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const manifest = {
  captured_at_utc: new Date().toISOString(),
      local_only: true,
      publication_approved: false,
  raw_provider_payloads_retained: false,
  songs_saved: false,
  correction_path: "Live Gemini OCR was reviewed; missing chord roots were replaced with source-grounded local chart-code drafts.",
  limitations: "Karen titles, rolls, melody numbers, phrase arcs, and ambiguous x/dot/figured-bass marks remain review items.",
  charts: results,
};
fs.writeFileSync(path.join(outputDir, "capture-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
