const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor, openSidebar } = require("./helpers");

test.describe("sidebar text inputs", () => {
  test("keep focus and accept spaces while the chart live-updates", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.locator("#songTitle").click();
    await page.keyboard.type("Hello");
    await expect(page.locator("#songTitle")).toBeFocused();

    const scrollBefore = await page.locator("#main-editor").evaluate(el => el.scrollTop);
    await page.keyboard.press("Space");
    await page.keyboard.type("World");

    await expect(page.locator("#songTitle")).toBeFocused();
    await expect(page.locator("#songTitle")).toHaveValue("Hello World");
    await expect.poll(() => page.locator("#main-editor").evaluate(el => el.scrollTop)).toBe(scrollBefore);
  });
});
