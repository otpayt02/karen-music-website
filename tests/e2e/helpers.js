const { expect } = require("@playwright/test");

async function chooseLanguageAndEnterEditor(page, lang = "english") {
  await page.goto("/");

  const langPicker = page.locator("#lang-picker-overlay");
  await expect(langPicker).toBeVisible();

  if (lang === "karen") {
    await page.locator("#lang-btn-karen").click();
  } else {
    await page.locator("#lang-btn-english").click();
  }

  await expect(langPicker).toBeHidden();

  const wizard = page.locator("#wizard-overlay");
  await expect(wizard).toBeVisible();

  const visibleSkip = page.locator("#wizard-overlay .wizard-btn-skip:visible").first();
  await visibleSkip.click();

  await expect(wizard).toBeHidden();
  await expect(page.locator("#chart-container")).toBeVisible();
  await expect(page.locator("#sidebar")).toHaveClass(/collapsed/);
  await expect(page.locator("#focus-trap")).toBeFocused();
}

async function openSidebar(page) {
  const sidebar = page.locator("#sidebar");
  const isCollapsed = await sidebar.evaluate(el => el.classList.contains("collapsed"));
  if (isCollapsed) {
    await page.locator("#sidebar-toggle").click();
  }
  await expect(sidebar).not.toHaveClass(/collapsed/);
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
  openSidebar,
  stubWindowPrint
};
