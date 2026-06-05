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

  test("instrument picker scrolls only after it is clicked into", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");
    await openSidebar(page);

    await page.locator("#instr-sidebar").evaluate(el => {
      el.style.height = "82px";
      el.style.maxHeight = "82px";
    });

    await page.locator("#instr-sidebar").hover();
    const beforeInactive = await page.evaluate(() => ({
      sidebar: document.getElementById("sidebar").scrollTop,
      group: document.getElementById("instr-sidebar").scrollTop
    }));
    await page.mouse.wheel(0, 260);
    const afterInactive = await page.evaluate(() => ({
      sidebar: document.getElementById("sidebar").scrollTop,
      group: document.getElementById("instr-sidebar").scrollTop
    }));

    expect(afterInactive.sidebar).toBeGreaterThan(beforeInactive.sidebar);
    expect(afterInactive.group).toBe(beforeInactive.group);

    await page.locator("#instr-sidebar").click({ position: { x: 12, y: 12 } });
    await expect(page.locator("#instr-sidebar")).toHaveClass(/scroll-locked/);
    await expect(page.locator("#instr-sidebar .instr-choice.selected")).toHaveCount(0);

    await page.locator("#chart-container").hover();
    const beforeLocked = await page.evaluate(() => ({
      sidebar: document.getElementById("sidebar").scrollTop,
      group: document.getElementById("instr-sidebar").scrollTop
    }));
    await page.mouse.wheel(0, 260);
    const afterLocked = await page.evaluate(() => ({
      sidebar: document.getElementById("sidebar").scrollTop,
      group: document.getElementById("instr-sidebar").scrollTop
    }));

    expect(afterLocked.group).toBeGreaterThan(beforeLocked.group);
    expect(afterLocked.sidebar).toBe(beforeLocked.sidebar);

    await page.locator("#chart-container").click();
    await expect(page.locator("#instr-sidebar")).not.toHaveClass(/scroll-locked/);
  });
});
