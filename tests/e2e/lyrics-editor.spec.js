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
});
