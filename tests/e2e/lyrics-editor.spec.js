const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("lyrics editor", () => {
  test("adds independent lyric sections and opens the grouped Karen keyboard", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.locator(".paper-flap-lyrics").click();
    await page.locator("#lyrics-add-section-btn").click();

    await expect(page.locator("#lyrics-section-modal-overlay")).toHaveClass(/open/);
    await expect(page.locator("#lyrics-section-karen-toggle")).toBeChecked();
    await expect(page.locator("#lyrics-section-karen-toggle")).toBeDisabled();

    await page.locator("#lyrics-section-title-input").fill("Verse 1");
    await page.locator("#lyrics-section-translation-toggle").check();
    await page.locator(".lyrics-modal-add").click();

    await expect(page.locator(".lyrics-section-card")).toHaveCount(1);
    await expect(page.locator(".lyrics-section-title-input")).toHaveValue("Verse 1");
    await expect(page.locator(".lyrics-karen-input")).toBeVisible();
    await expect(page.locator(".lyrics-romanization-input")).toBeVisible();
    await expect(page.locator(".lyrics-translation-input")).toBeVisible();

    await page.locator(".lyrics-karen-input").fill("ကညီ");
    await expect(page.locator("#karen-flap")).toHaveClass(/open/);
    await expect(page.locator(".lyrics-karen-input")).toHaveAttribute("dir", "ltr");
    await expect(page.locator(".lyrics-karen-input")).toHaveAttribute("autocomplete", "off");
    await expect(page.locator(".lyrics-karen-input")).toHaveAttribute("spellcheck", "false");
    await expect(page.locator(".lyrics-karen-input")).toHaveAttribute("inputmode", "none");
    await expect(page.locator(".lyrics-karen-input")).toHaveCSS("direction", "ltr");
    await expect(page.locator(".karen-zone-consonants .k-key")).toHaveCount(25);
    await expect(page.locator(".karen-zone-vowels .k-key")).toHaveCount(10);
    await expect(page.locator(".karen-zone-tones .k-key")).toHaveCount(5);
    await expect(page.locator(".karen-zone-medials .k-key")).toHaveCount(5);

    await page.locator(".karen-zone-consonants .k-key").first().click({ force: true });
    await expect(page.locator(".lyrics-karen-input")).toHaveValue(/ကညီ./);

    await page.locator(".lyrics-karen-input").fill("");
    await page.locator(".karen-zone-consonants .k-key").nth(0).click({ force: true });
    await page.locator(".karen-zone-consonants .k-key").nth(1).click({ force: true });
    await expect(page.locator(".lyrics-karen-input")).toHaveValue("ကခ");

    const firstChar = await page.locator(".karen-zone-consonants .k-key").nth(0).textContent();
    const secondChar = await page.locator(".karen-zone-consonants .k-key").nth(1).textContent();
    await expect(page.locator("#karen-focus-preview")).toContainText(`${firstChar}${secondChar}`);

    await page.keyboard.press("Backspace");
    await expect(page.locator(".lyrics-karen-input")).toHaveValue(firstChar);

    await page.keyboard.press("Control+Y");
    await expect(page.locator(".lyrics-karen-input")).toHaveValue(`${firstChar}${secondChar}`);

    await page.locator(".lyrics-karen-input").fill("");
    await expect(page.locator("#karen-focus-preview")).toHaveText("");

    await page.keyboard.press("Escape");
    await expect(page.locator("#karen-flap")).not.toHaveClass(/open/);

    await page.evaluate(() => openKarenKeyboardForTarget(document.querySelector(".lyrics-karen-input")));
    await expect(page.locator("#karen-flap")).toHaveClass(/open/);
    await page.locator("#karen-flap-close").click();
    await expect(page.locator("#karen-flap")).not.toHaveClass(/open/);

    const lyrics = await page.evaluate(() => normalizeLyricsSections(state.lyricsSections));
    expect(lyrics).toMatchObject([
      {
        title: "Verse 1",
        romanization: "",
        translation: "",
        showRomanization: true,
        showTranslation: true
      }
    ]);
  });

  test("renders a singer timing map from lyric beat and measure marks", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      state.lyricsSections = [
        {
          id: "timed-verse",
          title: "Verse timing",
          karenText: "ကညီ / သး | ဝံ / တၢ်",
          romanization: "ka-nyaw / tha | wah / ta",
          translation: "",
          showRomanization: true,
          showTranslation: false
        }
      ];
      renderChart();
    });

    await page.locator(".paper-flap-lyrics").click();

    await expect(page.locator(".lyrics-timing-preview")).toBeVisible();
    await expect(page.locator(".lyrics-timing-title")).toContainText("Singer timing map");
    await expect(page.locator(".lyrics-measure-block")).toHaveCount(2);
    await expect(page.locator(".lyrics-measure-number")).toHaveText(["M1", "M2"]);
    await expect(page.locator(".lyrics-beat-cell[data-beat='1']").first()).toContainText("ကညီ");
    await expect(page.locator(".lyrics-beat-cell[data-beat='1']").first()).toContainText("ka-nyaw");
    await expect(page.locator(".lyrics-beat-cell[data-beat='2']").first()).toContainText("သး");
    await expect(page.locator(".lyrics-beat-cell[data-beat='1']").nth(1)).toContainText("ဝံ");
    await expect(page.locator(".lyrics-syllable-stack")).toHaveCount(4);

    const boundaryMetrics = await page.evaluate(() => {
      const measures = Array.from(document.querySelectorAll(".lyrics-measure-block"));
      const first = measures[0]?.getBoundingClientRect();
      const second = measures[1]?.getBoundingClientRect();
      const firstText = measures[0]?.querySelector(".lyrics-syllable-stack")?.getBoundingClientRect();
      return {
        hasSeparatedMeasures: !!first && !!second && second.left > first.right,
        textHeight: firstText?.height || 0
      };
    });

    expect(boundaryMetrics.hasSeparatedMeasures).toBe(true);
    expect(boundaryMetrics.textHeight).toBeGreaterThan(12);
  });
});
