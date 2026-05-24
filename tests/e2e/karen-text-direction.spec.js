const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor, openSidebar } = require("./helpers");

test.describe("Karen text direction", () => {
  test("keeps Karen text fields left-to-right on first entry", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    const titleKaren = page.locator("#songTitleKaren");
    await titleKaren.fill("");
    await titleKaren.type("ကခဂ");

    await expect(titleKaren).toHaveValue("ကခဂ");
    await expect(titleKaren).toHaveAttribute("dir", "ltr");
    await expect(titleKaren).toHaveCSS("direction", "ltr");

    const notes = page.locator("#karenText");
    await notes.fill("");
    await notes.type("ကခဂ");

    await expect(notes).toHaveValue("ကခဂ");
    await expect(notes).toHaveAttribute("dir", "ltr");
    await expect(notes).toHaveCSS("direction", "ltr");
  });

  test("opens the Karen keyboard for text boxes in Karen mode except English title", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "karen");
    await openSidebar(page);

    await page.locator("#songTitle").click();
    await expect(page.locator("#karen-flap")).not.toHaveClass(/open/);

    await page.locator("#songKey").click();
    await expect(page.locator("#karen-flap")).toHaveClass(/open/);
    await expect(page.locator("#songKey")).toHaveAttribute("inputmode", "none");

    await page.locator("#karen-flap-close").click();
    await expect(page.locator("#karen-flap")).not.toHaveClass(/open/);
    await page.locator("#songStyle").click();
    await expect(page.locator("#karen-flap")).toHaveClass(/open/);
  });
});
