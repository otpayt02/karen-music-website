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
    await expect(page.locator(".karen-zone-consonants .k-key")).toHaveCount(25);
    await expect(page.locator(".karen-zone-vowels .k-key")).toHaveCount(10);
    await expect(page.locator(".karen-zone-tones .k-key")).toHaveCount(5);
    await expect(page.locator(".karen-zone-medials .k-key")).toHaveCount(5);

    await page.locator(".karen-zone-consonants .k-key").first().click();
    await expect(page.locator(".lyrics-karen-input")).toHaveValue(/ကညီ./);

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
});
