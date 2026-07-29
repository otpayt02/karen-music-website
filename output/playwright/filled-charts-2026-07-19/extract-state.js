async (page) => page.evaluate(() => {
  const symbol = (beat) => {
    const chord = beat.chordState || {};
    let value = `${chord.root || ""}${chord.flat ? "b" : ""}${chord.minor ? "m" : ""}${chord.triangle ? "maj" : ""}${chord.seven ? "7" : ""}${chord.quality || ""}`;
    if (beat.bass) value += `/${beat.bass}`;
    if (beat.circle) value += "(circle)";
    if (beat.dot) value += "(dot)";
    if (beat.xMarks) value += `[x${beat.xMarks}]`;
    return value || "-";
  };

  return {
    id: state.id,
    title: document.getElementById("songTitle").value,
    titleKaren: document.getElementById("songTitleKaren").value,
    key: document.getElementById("songKey").value,
    beatsPerMeasure: state.beatsPerMeasure,
    sections: state.sections.map((section) => ({
      type: section.type,
      measures: section.measures.map((measure) => measure.beats.map(symbol)),
    })),
  };
})
