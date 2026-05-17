const { expect } = require("@playwright/test");

async function chooseLanguageAndEnterEditor(page, lang = "english") {
  await page.goto("/");

  if (lang === "karen") {
    await page.locator("#lang-btn-karen").click();
  } else {
    await page.locator("#lang-btn-english").click();
  }

  const wizard = page.locator("#wizard-overlay");
  await expect(wizard).toBeVisible();

  const visibleSkip = page.locator("#wizard-overlay .wizard-btn-skip:visible").first();
  await visibleSkip.click();

  await expect(wizard).toBeHidden();
  await expect(page.locator("#sidebar")).toBeVisible();
}

async function stubWindowPrint(page) {
  await page.evaluate(() => {
    window.__printCalls = 0;
    window.print = () => {
      window.__printCalls += 1;
    };
  });
}

module.exports = {
  chooseLanguageAndEnterEditor,
  stubWindowPrint
};
