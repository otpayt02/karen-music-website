const { test, expect } = require("@playwright/test");

test.describe("WYSIWYG print paper", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("karenMusicLang", "english");
      localStorage.setItem("karenMusicLanguageSelected", "1");
      localStorage.setItem("karenMusicTheme", "light");
    });
    await page.goto("/");
    const languageButton = page.locator("#lang-btn-english");
    if (await languageButton.isVisible()) await languageButton.click();
    await expect(page.locator("body")).toHaveClass(/app-ready/);
    await page.evaluate(() => {
      setLanguage("english");
      hideLangPicker();
      closeWizard();
      setPaperView("chart", { focus: false });
    });
    await expect(page.locator("#chart-container")).toHaveClass(/is-active/);
  });

  test("uses the editable paper as the only metadata layout", async ({ page }) => {
    await expect(page.locator(".editor-heading")).toHaveCount(0);
    await expect(page.locator("#print-preview-overlay, #btn-print-preview")).toHaveCount(0);

    await page.locator("#ph-title-karen").fill("တၢ်သးဝံၣ်");
    await page.locator("#ph-title-english").fill("Living Hope");
    await page.locator("#ph-style-value").fill("Worship Ballad");
    await page.locator("#ph-key-value").selectOption("Db");
    await page.locator("#ph-footer-right").fill("Youth Worship");

    await expect(page.locator("#songTitleKaren")).toHaveValue("တၢ်သးဝံၣ်");
    await expect(page.locator("#songTitle")).toHaveValue("Living Hope");
    await expect(page.locator("#songStyle")).toHaveValue("Worship Ballad");
    await expect(page.locator("#songKey")).toHaveValue("Db");
    await expect(page.locator("#ph-key-value option:checked")).toHaveText("Dᵇ");
    await expect(page.locator("#ph-title-english")).not.toHaveValue(/\(.+\)/);
  });

  test("renders BPM then meter and reveals checkbox instruments on demand", async ({ page }) => {
    await page.locator("#songTempo").fill("96");
    await page.locator("#songTempo").dispatchEvent("input");
    await expect(page.locator("#ph-footer-left")).toHaveText("96 BPM, 4/4");
    await expect(page.locator("#ph-footer-center")).toHaveText("Reference");

    await page.evaluate(() => { hideLangPicker(); closeWizard(); });
    await page.locator("#paper-instrument-picker summary").click();
    const piano = page.locator("#paper-instrument-wheel .paper-instrument-option", { hasText: "Piano 1" });
    await piano.locator("input").check();
    await expect(page.locator("#ph-footer-center")).toContainText("Piano 1");
    await expect(page.locator("#instr-sidebar .instr-choice[data-value='Piano 1']")).toHaveClass(/selected/);
  });

  test("builds print copies from the same paper for instruments and Reference", async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector("#instr-sidebar .instr-choice[data-value='Piano 1']").classList.add("selected");
      syncAllInstrFields();
      buildPrintBatch();
    });
    await expect(page.locator("#print-batch .chart-container")).toHaveCount(2);
    await expect(page.locator("#print-batch .paper-header")).toHaveCount(2);
    await expect(page.locator("#print-batch .paper-instrument-print-value").nth(0)).toHaveText("Piano 1");
    await expect(page.locator("#print-batch .paper-instrument-print-value").nth(1)).toHaveText("Reference");
    await expect(page.locator("#print-batch input, #print-batch select, #print-batch details")).toHaveCount(0);
  });

  test("paper header becomes sticky naturally at the viewport edge", async ({ page }) => {
    await expect(page.locator("#paper-header")).toHaveCSS("position", "sticky");
    await expect(page.locator("#paper-header")).toHaveCSS("top", "0px");
  });
});
