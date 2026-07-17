const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("configurable Karen typing hotkeys", () => {
  test("maps base and Shift keys only while Karen typing mode is enabled", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.locator("#settings-toggle").click();
    await page.locator("#settings-karen-hotkeys-toggle").check();
    await page.locator('[data-hotkey="a"][data-layer="base"]').fill("က");
    await page.locator('[data-hotkey="a"][data-layer="shift"]').fill("ခ");

    const karenTitle = page.locator("#songTitleKaren");
    await karenTitle.fill("");
    await karenTitle.press("a");
    await karenTitle.press("Shift+a");
    await expect(karenTitle).toHaveValue("ကခ");

    await page.locator("#settings-karen-hotkeys-toggle").uncheck();
    await karenTitle.press("a");
    await expect(karenTitle).toHaveValue("ကခa");

    const englishTitle = page.locator("#songTitle");
    await englishTitle.fill("");
    await page.locator("#settings-karen-hotkeys-toggle").check();
    await englishTitle.press("a");
    await expect(englishTitle).toHaveValue("a");
  });
});
