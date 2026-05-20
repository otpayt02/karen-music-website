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
});
