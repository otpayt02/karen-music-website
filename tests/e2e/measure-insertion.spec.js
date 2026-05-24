const { test, expect } = require("@playwright/test");
const { chooseLanguageAndEnterEditor } = require("./helpers");

test.describe("measure and beat insertion shortcuts", () => {
  test("Tab inserts a full measure after the current measure and shifts later measures", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const measureWithRoots = (roots) => {
        const measure = createMeasure(roots.length);
        roots.forEach((root, idx) => {
          if (!root) return;
          measure.beats[idx].chordState = { root, flat: false, minor: false, triangle: false, seven: false };
        });
        return measure;
      };
      state.sections = [{ type: "Verse", measures: [
        measureWithRoots(["C", "D", "E", "F"]),
        measureWithRoots(["G", "A", "B", "C"]),
        measureWithRoots(["D", "E", "F", "G"])
      ] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 2;
      renderChart();
      document.getElementById("focus-trap")?.focus();
    });

    await page.keyboard.press("Tab");

    const data = await page.evaluate(() => ({
      currentMeasureIdx: state.currentMeasureIdx,
      currentBeatIdx: state.currentBeatIdx,
      lengths: state.sections[0].measures.map(m => m.beats.length),
      roots: state.sections[0].measures.map(m => m.beats.map(b => b.chordState?.root || ""))
    }));

    expect(data.currentMeasureIdx).toBe(1);
    expect(data.currentBeatIdx).toBe(0);
    expect(data.lengths).toEqual([4, 4, 4, 4]);
    expect(data.roots[1]).toEqual(["", "", "", ""]);
    expect(data.roots[2][0]).toBe("G");
  });

  test("Ctrl+Space inserts a short measure based on the active beat number", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const measureWithRoots = (roots) => {
        const measure = createMeasure(roots.length);
        roots.forEach((root, idx) => {
          if (!root) return;
          measure.beats[idx].chordState = { root, flat: false, minor: false, triangle: false, seven: false };
        });
        return measure;
      };
      state.sections = [{ type: "Verse", measures: [
        measureWithRoots(["C", "D", "E", "F"]),
        measureWithRoots(["G", "A", "B", "C"])
      ] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 1;
      renderChart();
      document.getElementById("focus-trap")?.focus();
    });

    await page.keyboard.press("Control+Space");

    const data = await page.evaluate(() => ({
      currentMeasureIdx: state.currentMeasureIdx,
      currentBeatIdx: state.currentBeatIdx,
      lengths: state.sections[0].measures.map(m => m.beats.length),
      nextRoots: state.sections[0].measures[2].beats.map(b => b.chordState?.root || "")
    }));

    expect(data.currentMeasureIdx).toBe(1);
    expect(data.currentBeatIdx).toBe(0);
    expect(data.lengths).toEqual([4, 2, 4]);
    expect(data.nextRoots[0]).toBe("G");
  });

  test("Space moves forward without changing measure contents", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const measureWithRoots = (roots) => {
        const measure = createMeasure(roots.length);
        roots.forEach((root, idx) => {
          if (!root) return;
          measure.beats[idx].chordState = { root, flat: false, minor: false, triangle: false, seven: false };
        });
        return measure;
      };
      state.sections = [{ type: "Verse", measures: [
        measureWithRoots(["C", "D", "E", "F"]),
        measureWithRoots(["G", "A", "B", "C"])
      ] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 1;
      renderChart();
      document.getElementById("focus-trap")?.focus();
    });

    await page.keyboard.press("Space");

    const data = await page.evaluate(() => ({
      currentMeasureIdx: state.currentMeasureIdx,
      currentBeatIdx: state.currentBeatIdx,
      lengths: state.sections[0].measures.map(m => m.beats.length),
      roots: state.sections[0].measures.map(m => m.beats.map(b => b.chordState?.root || ""))
    }));

    expect(data.currentMeasureIdx).toBe(0);
    expect(data.currentBeatIdx).toBe(2);
    expect(data.lengths).toEqual([4, 4]);
    expect(data.roots[0]).toEqual(["C", "D", "E", "F"]);
    expect(data.roots[1]).toEqual(["G", "A", "B", "C"]);
  });

  test("Space creates a new measure only after the final beat of the section", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const measureWithRoots = (roots) => {
        const measure = createMeasure(roots.length);
        roots.forEach((root, idx) => {
          if (!root) return;
          measure.beats[idx].chordState = { root, flat: false, minor: false, triangle: false, seven: false };
        });
        return measure;
      };
      state.sections = [{ type: "Verse", measures: [measureWithRoots(["C", "D", "E", "F"])] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 3;
      renderChart();
      document.getElementById("focus-trap")?.focus();
    });

    await page.keyboard.press("Space");

    const data = await page.evaluate(() => ({
      currentMeasureIdx: state.currentMeasureIdx,
      currentBeatIdx: state.currentBeatIdx,
      lengths: state.sections[0].measures.map(m => m.beats.length),
      roots: state.sections[0].measures.map(m => m.beats.map(b => b.chordState?.root || ""))
    }));

    expect(data.currentMeasureIdx).toBe(1);
    expect(data.currentBeatIdx).toBe(0);
    expect(data.lengths).toEqual([4, 4]);
    expect(data.roots[0]).toEqual(["C", "D", "E", "F"]);
    expect(data.roots[1]).toEqual(["", "", "", ""]);
  });

  test("Right Arrow creates a new measure when moving past the final beat", async ({ page }) => {
    await chooseLanguageAndEnterEditor(page, "english");

    await page.evaluate(() => {
      const measureWithRoots = (roots) => {
        const measure = createMeasure(roots.length);
        roots.forEach((root, idx) => {
          if (!root) return;
          measure.beats[idx].chordState = { root, flat: false, minor: false, triangle: false, seven: false };
        });
        return measure;
      };
      state.sections = [{ type: "Verse", measures: [measureWithRoots(["C", "D", "E", "F"])] }];
      state.currentSectionIdx = 0;
      state.currentMeasureIdx = 0;
      state.currentBeatIdx = 3;
      renderChart();
      document.getElementById("focus-trap")?.focus();
    });

    await page.keyboard.press("ArrowRight");

    const data = await page.evaluate(() => ({
      currentMeasureIdx: state.currentMeasureIdx,
      currentBeatIdx: state.currentBeatIdx,
      lengths: state.sections[0].measures.map(m => m.beats.length)
    }));

    expect(data.currentMeasureIdx).toBe(1);
    expect(data.currentBeatIdx).toBe(0);
    expect(data.lengths).toEqual([4, 4]);
  });
});
