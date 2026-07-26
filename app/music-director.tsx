"use client";

import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Chord = {
  root: string;
  minor?: boolean;
  flat?: boolean;
  seven?: boolean;
  quality?: "sus" | "aug" | "triangle7" | "";
};
type Beat = {
  chord: Chord | null;
  bass?: string;
  circle?: boolean;
  dot?: boolean;
  xMarks?: number;
  manualUnderline?: boolean;
};
type Measure = {
  beats: Beat[];
  roll?: boolean;
  leadEnabled?: boolean;
  leadBaseOctave?: number | null;
  leadSlotsByBeat?: number[];
  rowLeadView?: string[];
};
type Section = {
  id: string;
  name: string;
  preMeasure: Measure | null;
  measures: Measure[];
  measuresPerRow?: number | null;
  rowMeasureCounts?: number[];
};
type Song = {
  id?: number;
  titleKaren: string;
  titleEnglish: string;
  style: string;
  key: string;
  bpm: number;
  meter: string;
  group: string;
  instruments: string[];
  lyrics: string;
  sections: Section[];
  onlySpans?: Array<{ start: string; end: string }>;
  slurs?: Array<{ start: string; end: string }>;
  updatedAt?: string;
};

const instrumentOptions = ["Piano 1", "Piano 2", "Acoustic Guitar", "Bass", "Drums", "Strings"];
const sectionOptions = ["INTRO", "VERSE", "PRE-CHORUS", "CHORUS", "BRIDGE", "SOLO", "ENDING"];
const DEFAULT_MEASURES_PER_ROW = 8;
const MIN_MEASURES_PER_ROW = 4;
const MAX_MEASURES_PER_ROW = 16;
const createMeasure = (count = 4): Measure => ({ beats: Array.from({ length: count }, () => ({ chord: null })) });
const clampZoom = (value: number) => Math.min(175, Math.max(55, value));
const nextZoom = (current: number, direction: -1 | 1) =>
  clampZoom(Math.round(current * (direction > 0 ? 1.12 : 1 / 1.12)));

function paginationItems(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const visible = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const pages = [...visible].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) items.push("ellipsis");
    items.push(page);
  });
  return items;
}

function clampMeasuresPerRow(value: number) {
  return Math.max(MIN_MEASURES_PER_ROW, Math.min(MAX_MEASURES_PER_ROW, Math.round(value)));
}

function rowsForSection(section: Section) {
  const rows: Array<{ start: number; measures: Measure[]; cap: number; rowIndex: number }> = [];
  let start = 0;
  let rowIndex = 0;
  while (start < section.measures.length) {
    const configured = section.rowMeasureCounts?.[rowIndex] ?? section.measuresPerRow ?? DEFAULT_MEASURES_PER_ROW;
    const cap = clampMeasuresPerRow(configured);
    rows.push({ start, measures: section.measures.slice(start, start + cap), cap, rowIndex });
    start += cap;
    rowIndex += 1;
  }
  return rows;
}

function beatKey(section: number, measure: number, beat: number, pre = false) {
  return `${section}:${pre ? "pre" : measure}:${beat}`;
}

function beatIsEmpty(beat: Beat | undefined) {
  return !beat?.chord && !beat?.bass && !beat?.circle && !beat?.dot && !(beat?.xMarks) && !beat?.manualUnderline;
}

const demoSong = (): Song => ({
  titleKaren: "တၢ်သးဝံၣ်အဒိ",
  titleEnglish: "Practice Song",
  style: "Worship",
  key: "G",
  bpm: 76,
  meter: "4/4",
  group: "Sunday Team",
  instruments: ["Piano 1", "Acoustic Guitar"],
  lyrics: "Verse 1\nAdd approved S’gaw Karen and English lyrics here.\n\nChorus\nThis hosted chart uses demonstration content only.",
  sections: [
    {
      id: crypto.randomUUID(),
      name: "INTRO",
      preMeasure: null,
      measures: [createMeasure(), createMeasure(), createMeasure(), createMeasure()],
      measuresPerRow: DEFAULT_MEASURES_PER_ROW,
    },
    {
      id: crypto.randomUUID(),
      name: "VERSE",
      preMeasure: null,
      measures: [createMeasure(), createMeasure(), createMeasure(), createMeasure()],
      measuresPerRow: DEFAULT_MEASURES_PER_ROW,
    },
    {
      id: crypto.randomUUID(),
      name: "CHORUS",
      preMeasure: null,
      measures: [createMeasure(), createMeasure(), createMeasure(), createMeasure()],
      measuresPerRow: DEFAULT_MEASURES_PER_ROW,
    },
  ],
});

function chordLabel(chord: Chord | null) {
  if (!chord) return "";
  const quality = chord.quality === "triangle7" ? "Δ7" : chord.quality || "";
  return `${chord.root}${chord.flat ? "♭" : ""}${chord.minor ? "m" : ""}${chord.seven ? "₇" : ""}${quality}`;
}

export function MusicDirector() {
  const [song, setSong] = useState<Song>(() => demoSong());
  const [tab, setTab] = useState<"chart" | "lyrics" | "database">("chart");
  const [selected, setSelected] = useState({ section: 0, measure: 0, beat: 0, pre: false });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newSongOpen, setNewSongOpen] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionInsertIndex, setSectionInsertIndex] = useState<number | null>(null);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [printRoomOpen, setPrintRoomOpen] = useState(false);
  const [printPage, setPrintPage] = useState(1);
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [status, setStatus] = useState("Demo chart, not yet saved");
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(100);
  const [pendingBass, setPendingBass] = useState(false);
  const [pendingSuperscript, setPendingSuperscript] = useState(false);
  const [pendingSlur, setPendingSlur] = useState<string | null>(null);
  const [pendingOnly, setPendingOnly] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const printButton = useRef<HTMLButtonElement>(null);
  const editorTarget = useRef<HTMLElement>(null);
  const undoHistory = useRef<Song[]>([]);
  const redoHistory = useRef<Song[]>([]);

  const activeMeasure = useMemo(() => {
    const section = song.sections[selected.section];
    return selected.pre ? section?.preMeasure : section?.measures[selected.measure];
  }, [song, selected]);

  const printCopies = useMemo(
    () => [...song.instruments, "Reference"],
    [song.instruments],
  );

  const commitSong = useCallback((mutator: (draft: Song) => void, message = "Unsaved changes") => {
    setSong((current) => {
      undoHistory.current.push(structuredClone(current));
      if (undoHistory.current.length > 80) undoHistory.current.shift();
      redoHistory.current = [];
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
    setStatus(message);
  }, []);

  const insertMeasure = useCallback((beatCount: number) => {
    if (selected.pre) return;
    commitSong((next) => {
      next.sections[selected.section].measures.splice(selected.measure + 1, 0, createMeasure(beatCount));
    }, `Inserted ${beatCount}-beat measure`);
    setSelected((current) => ({ ...current, measure: current.measure + 1, beat: 0, pre: false }));
  }, [commitSong, selected.measure, selected.pre, selected.section]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    const frame = window.requestAnimationFrame(() => setSidebarOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.appReady = "true";
    return () => {
      delete document.documentElement.dataset.appReady;
    };
  }, []);

  useEffect(() => {
    if (!printRoomOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setPrintRoomOpen(false);
        printButton.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [printRoomOpen]);

  useEffect(() => {
    const handleVariableMeasure = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.ctrlKey && !event.altKey && !event.metaKey && /^[1-6]$/.test(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        insertMeasure(Number(event.key));
      }
    };
    document.addEventListener("keydown", handleVariableMeasure, true);
    return () => document.removeEventListener("keydown", handleVariableMeasure, true);
  }, [insertMeasure]);

  useEffect(() => {
    fetch("/api/songs")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        setSongs(data.songs ?? []);
        if (data.warning) setStatus(data.warning);
      })
      .catch(() => setStatus("Hosted library is unavailable; this draft remains local"));
  }, []);

  function updateSong(patch: Partial<Song>) {
    setSong((current) => ({ ...current, ...patch }));
    setStatus("Unsaved changes");
  }

  function activeBeatFrom(target: Song, location = selected) {
    const section = target.sections[location.section];
    const measure = location.pre ? section?.preMeasure : section?.measures[location.measure];
    return measure?.beats[location.beat];
  }

  function mutateActiveBeat(mutator: (beat: Beat, measure: Measure) => void, message = "Unsaved changes") {
    commitSong((next) => {
      const section = next.sections[selected.section];
      const measure = selected.pre ? section?.preMeasure : section?.measures[selected.measure];
      const beat = measure?.beats[selected.beat];
      if (beat && measure) mutator(beat, measure);
    }, message);
  }

  function undo() {
    const previous = undoHistory.current.pop();
    if (!previous) return;
    redoHistory.current.push(structuredClone(song));
    setSong(previous);
    setStatus("Undid chart edit");
  }

  function redo() {
    const next = redoHistory.current.pop();
    if (!next) return;
    undoHistory.current.push(structuredClone(song));
    setSong(next);
    setStatus("Redid chart edit");
  }

  function addSection(name: string) {
    const index = sectionInsertIndex ?? song.sections.length;
    commitSong((next) => {
      next.sections.splice(index, 0, {
        id: crypto.randomUUID(),
        name,
        preMeasure: null,
        measures: [createMeasure(Number(next.meter.split("/")[0]) || 4)],
        measuresPerRow: DEFAULT_MEASURES_PER_ROW,
      });
    }, `Added ${name}`);
    setSelected({ section: index, measure: 0, beat: 0, pre: false });
    setSectionModalOpen(false);
    setSectionInsertIndex(null);
  }

  function removeSection(sectionIndex: number) {
    if (song.sections.length <= 1) return;
    commitSong((next) => {
      next.sections.splice(sectionIndex, 1);
    }, "Section removed");
    setSelected({ section: Math.max(0, sectionIndex - 1), measure: 0, beat: 0, pre: false });
  }

  function changeRowCap(sectionIndex: number, rowIndex: number, delta: number) {
    commitSong((next) => {
      const section = next.sections[sectionIndex];
      section.rowMeasureCounts ??= [];
      const current = section.rowMeasureCounts[rowIndex] ?? section.measuresPerRow ?? DEFAULT_MEASURES_PER_ROW;
      section.rowMeasureCounts[rowIndex] = clampMeasuresPerRow(current + delta);
    }, "Measures per row changed");
  }

  function moveRight(createAtEnd = false) {
    if (!activeMeasure) return;
    if (selected.pre) {
      setSelected({ ...selected, pre: false, measure: 0, beat: 0 });
      return;
    }
    if (selected.beat < activeMeasure.beats.length - 1) {
      setSelected({ ...selected, beat: selected.beat + 1 });
      return;
    }
    const section = song.sections[selected.section];
    if (selected.measure < section.measures.length - 1) {
      setSelected({ ...selected, measure: selected.measure + 1, beat: 0 });
      return;
    }
    if (createAtEnd) insertMeasure(Number(song.meter.split("/")[0]) || 4);
  }

  function moveLeft() {
    if (selected.beat > 0) {
      setSelected({ ...selected, beat: selected.beat - 1 });
      return;
    }
    if (selected.pre) return;
    if (selected.measure > 0) {
      const previous = song.sections[selected.section].measures[selected.measure - 1];
      setSelected({ ...selected, measure: selected.measure - 1, beat: previous.beats.length - 1 });
      return;
    }
    if (song.sections[selected.section].preMeasure) setSelected({ ...selected, pre: true, beat: 0 });
  }

  function moveVertical(direction: -1 | 1) {
    const section = song.sections[selected.section];
    if (!section || selected.pre) return;
    const rows = rowsForSection(section);
    const currentRow = rows.findIndex((row) => selected.measure >= row.start && selected.measure < row.start + row.measures.length);
    const target = rows[currentRow + direction];
    if (target) {
      const offset = selected.measure - rows[currentRow].start;
      const measure = target.start + Math.min(offset, target.measures.length - 1);
      setSelected({ ...selected, measure, beat: Math.min(selected.beat, section.measures[measure].beats.length - 1) });
      return;
    }
    const sectionIndex = selected.section + direction;
    const nextSection = song.sections[sectionIndex];
    if (!nextSection) return;
    const nextRows = rowsForSection(nextSection);
    const targetRow = direction > 0 ? nextRows[0] : nextRows[nextRows.length - 1];
    const measure = direction > 0 ? targetRow.start : targetRow.start + targetRow.measures.length - 1;
    setSelected({ section: sectionIndex, measure, beat: Math.min(selected.beat, nextSection.measures[measure].beats.length - 1), pre: false });
  }

  function splitMeasure() {
    if (!activeMeasure || selected.pre) return;
    const keep = Math.max(1, selected.beat + 1);
    commitSong((next) => {
      const section = next.sections[selected.section];
      section.measures[selected.measure].beats = section.measures[selected.measure].beats.slice(0, keep);
      section.measures.splice(selected.measure + 1, 0, createMeasure(Number(next.meter.split("/")[0]) || 4));
    }, "Measure split");
    setSelected({ ...selected, measure: selected.measure + 1, beat: 0 });
  }

  function deleteCurrentMeasure() {
    if (selected.pre) {
      commitSong((next) => { next.sections[selected.section].preMeasure = null; }, "Pre-measure removed");
      setSelected({ ...selected, pre: false, measure: 0, beat: 0 });
      return;
    }
    const section = song.sections[selected.section];
    if (section.measures.length === 1) {
      removeSection(selected.section);
      return;
    }
    commitSong((next) => {
      next.sections[selected.section].measures.splice(selected.measure, 1);
    }, "Measure removed");
    setSelected({ ...selected, measure: Math.max(0, selected.measure - 1), beat: 0 });
  }

  function smartBackspace() {
    const beat = activeBeatFrom(song);
    const section = song.sections[selected.section];
    if (selected.pre && beatIsEmpty(beat)) {
      deleteCurrentMeasure();
      return;
    }
    if (beat && !beatIsEmpty(beat)) {
      mutateActiveBeat((target) => {
        if (target.bass) target.bass = "";
        else if (target.xMarks) target.xMarks = Math.max(0, target.xMarks - 1);
        else if (target.dot) target.dot = false;
        else if (target.circle) target.circle = false;
        else if (target.manualUnderline) target.manualUnderline = false;
        else if (target.chord?.quality) target.chord.quality = "";
        else if (target.chord?.seven) target.chord.seven = false;
        else if (target.chord?.minor) target.chord.minor = false;
        else if (target.chord?.flat) target.chord.flat = false;
        else target.chord = null;
      });
      return;
    }
    if (!selected.pre && selected.beat === 0 && selected.measure === section.measures.length - 1 && section.measures.length > 1 && activeMeasure?.beats.every(beatIsEmpty)) {
      deleteCurrentMeasure();
      return;
    }
    moveLeft();
  }

  function handleEditorKey(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    const key = event.key;
    const lower = key.toLowerCase();
    if (sectionModalOpen) {
      if (key === "Escape") { event.preventDefault(); setSectionModalOpen(false); return; }
      const sectionKeyMap: Record<string, string> = {
        i: "INTRO", v: "VERSE", p: "PRE-CHORUS", c: "CHORUS", b: "BRIDGE", s: "SOLO", e: "ENDING",
      };
      if (sectionKeyMap[lower]) { event.preventDefault(); addSection(sectionKeyMap[lower]); }
      return;
    }
    if (target.matches("input, textarea, select, [contenteditable='true']")) return;

    if (key === "?" || (event.shiftKey && key === "/")) {
      event.preventDefault();
      setShortcutsOpen((open) => !open);
      return;
    }
    if (event.ctrlKey && lower === "p") {
      event.preventDefault();
      openPrintRoom();
      return;
    }
    if (event.ctrlKey && lower === "z") { event.preventDefault(); undo(); return; }
    if (event.ctrlKey && lower === "y") { event.preventDefault(); redo(); return; }
    if (event.ctrlKey && !event.altKey && !event.metaKey && /^[1-6]$/.test(key)) {
      event.preventDefault();
      insertMeasure(Number(key));
      return;
    }
    if (event.ctrlKey && !event.altKey && !event.metaKey && (lower === "s" || lower === "a")) {
      event.preventDefault();
      mutateActiveBeat((beat) => {
        if (beat.chord) beat.chord.quality = lower === "s" ? "sus" : "aug";
      });
      return;
    }
    if (key === "Enter") {
      event.preventDefault();
      setSectionInsertIndex(null);
      setSectionModalOpen(true);
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      setPendingBass(false);
      setPendingSuperscript(false);
      setPendingOnly(null);
      setPendingSlur(null);
      return;
    }
    if (key === "Delete") { event.preventDefault(); deleteCurrentMeasure(); return; }
    if (key === "Backspace") { event.preventDefault(); smartBackspace(); return; }
    if (key === "ArrowRight") { event.preventDefault(); moveRight(true); return; }
    if (key === "ArrowLeft") { event.preventDefault(); moveLeft(); return; }
    if (key === "ArrowDown") { event.preventDefault(); moveVertical(1); return; }
    if (key === "ArrowUp") { event.preventDefault(); moveVertical(-1); return; }
    if (event.ctrlKey && (event.code === "Space" || key === " ")) {
      event.preventDefault();
      insertMeasure(selected.beat + 1);
      return;
    }
    if (key === " ") { event.preventDefault(); moveRight(true); return; }
    if (key === "Tab") {
      event.preventDefault();
      if (event.ctrlKey) splitMeasure();
      else insertMeasure(Number(song.meter.split("/")[0]) || 4);
      return;
    }
    if (lower === "l") { event.preventDefault(); setLeadModalOpen(true); return; }
    if (lower === "r") {
      event.preventDefault();
      mutateActiveBeat((_beat, measure) => { measure.roll = !measure.roll; }, "Measure roll changed");
      return;
    }
    if (lower === "o") {
      event.preventDefault();
      mutateActiveBeat((beat) => {
        beat.circle = !beat.circle;
        if (beat.circle) { beat.dot = false; beat.xMarks = 0; }
      });
      return;
    }
    if (lower === "x") {
      event.preventDefault();
      mutateActiveBeat((beat) => { beat.xMarks = ((beat.xMarks || 0) + 1) % 5; });
      return;
    }
    if (key === ".") {
      event.preventDefault();
      mutateActiveBeat((beat) => { if (beat.chord) beat.dot = !beat.dot; });
      return;
    }
    if (lower === "s") {
      event.preventDefault();
      const current = beatKey(selected.section, selected.measure, selected.beat, selected.pre);
      if (!pendingSlur) setPendingSlur(current);
      else {
        commitSong((next) => { next.slurs = [...(next.slurs || []), { start: pendingSlur, end: current }]; }, "Slur added");
        setPendingSlur(null);
      }
      return;
    }
    if (key === ",") {
      event.preventDefault();
      const current = beatKey(selected.section, selected.measure, selected.beat, selected.pre);
      if (!pendingOnly) setPendingOnly(current);
      else {
        commitSong((next) => { next.onlySpans = [...(next.onlySpans || []), { start: pendingOnly, end: current }]; }, "Only / All In cue added");
        setPendingOnly(null);
      }
      return;
    }
    if (key === "/") {
      event.preventDefault();
      const beat = activeBeatFrom(song);
      if (!beat?.chord) return;
      if (beat.bass) mutateActiveBeat((targetBeat) => { targetBeat.bass = ""; });
      else setPendingBass(true);
      return;
    }
    if (pendingBass && /^[a-gA-G]$/.test(key)) {
      event.preventDefault();
      mutateActiveBeat((beat) => { beat.bass = key.toUpperCase(); }, "Bass note added");
      setPendingBass(false);
      return;
    }
    if (lower === "t") { event.preventDefault(); setPendingSuperscript(true); return; }
    if (key === "7") {
      event.preventDefault();
      mutateActiveBeat((beat) => {
        if (!beat.chord) return;
        if (pendingSuperscript) beat.chord.quality = "triangle7";
        else beat.chord.seven = !beat.chord.seven;
      });
      setPendingSuperscript(false);
      return;
    }
    if (pendingSuperscript && (key === "8" || key === "9")) {
      event.preventDefault();
      mutateActiveBeat((beat) => { if (beat.chord) beat.chord.quality = key === "8" ? "sus" : "aug"; });
      setPendingSuperscript(false);
      return;
    }
    if (lower === "m") {
      event.preventDefault();
      mutateActiveBeat((beat) => { if (beat.chord) beat.chord.minor = !beat.chord.minor; });
      return;
    }
    if (lower === "b") {
      event.preventDefault();
      mutateActiveBeat((beat) => {
        if (beat.chord) beat.chord.flat = !beat.chord.flat;
        else beat.chord = { root: "B" };
      });
      return;
    }
    if (/^[a-gA-G]$/.test(key)) {
      event.preventDefault();
      mutateActiveBeat((beat) => { beat.chord = { root: key.toUpperCase() }; });
    }
  }

  async function saveSong() {
    setStatus("Saving");
    try {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(song),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed");
      const saved = data.song as Song;
      setSong(saved);
      setSongs((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setStatus("Saved to hosted library");
    } catch {
      setStatus("Save failed; export this draft before leaving");
    }
  }

  function exportSong() {
    const blob = new Blob([JSON.stringify(song, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${song.titleEnglish || "song"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Song exported");
  }

  function importSong(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as Song;
        if (!Array.isArray(imported.sections)) throw new Error();
        setSong({ ...imported, id: undefined });
        setSelected({ section: 0, measure: 0, beat: 0, pre: false });
        setStatus("Imported for review; press Save after checking");
      } catch {
        setStatus("Import could not be read; choose a Karen Music JSON export");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function startNewSong() {
    setSong(demoSong());
    setNewSongOpen(false);
    setStatus("New unsaved song");
  }

  function openPrintRoom() {
    setPrintPage(1);
    setPrintRoomOpen(true);
  }

  const filteredSongs = songs.filter((item) =>
    `${item.titleKaren} ${item.titleEnglish} ${item.key} ${item.style}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="app-shell" onKeyDownCapture={handleEditorKey}>
      <header className="app-header">
        <div className="brand">
          <button className="icon-button" onClick={() => setSidebarOpen((value) => !value)} aria-label="Toggle song details">☰</button>
          <div>
            <strong>Karen Music Director</strong>
            <span>ကညီတၢ်သးဝံၣ်</span>
          </div>
        </div>
        <nav className="global-actions" aria-label="Song actions">
          <button onClick={() => setNewSongOpen(true)}>New song</button>
          <button onClick={saveSong} className="primary">Save</button>
          <button onClick={() => fileInput.current?.click()}>Import</button>
          <button onClick={exportSong}>Export</button>
          <button ref={printButton} onClick={openPrintRoom}>Print</button>
          <button onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} aria-label="Toggle color theme">{theme === "dark" ? "Light" : "Dark"}</button>
          <input ref={fileInput} type="file" accept=".json,application/json" onChange={importSong} hidden />
        </nav>
      </header>

      <div className={`workspace ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        <aside className="sidebar" aria-label="Song details">
          <div className="sidebar-heading">
            <span>Song details</span>
            <button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close song details">×</button>
          </div>
          <label>Karen title<input lang="kar" value={song.titleKaren} onChange={(event) => updateSong({ titleKaren: event.target.value })} /></label>
          <label>English title<input value={song.titleEnglish} onChange={(event) => updateSong({ titleEnglish: event.target.value })} /></label>
          <div className="field-pair">
            <label>Key<select value={song.key} onChange={(event) => updateSong({ key: event.target.value })}>{["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"].map((key) => <option key={key}>{key}</option>)}</select></label>
            <label>Style<input value={song.style} onChange={(event) => updateSong({ style: event.target.value })} /></label>
          </div>
          <div className="field-pair">
            <label>BPM<input type="number" value={song.bpm} onChange={(event) => updateSong({ bpm: Number(event.target.value) })} /></label>
            <label>Meter<select value={song.meter} onChange={(event) => updateSong({ meter: event.target.value })}>{["4/4", "3/4", "5/5", "6/8"].map((meter) => <option key={meter}>{meter}</option>)}</select></label>
          </div>
          <label>Group<input value={song.group} onChange={(event) => updateSong({ group: event.target.value })} /></label>
          <div className="instrument-field">
            <span>Print instruments</span>
            <button onClick={() => setInstrumentOpen((value) => !value)} aria-expanded={instrumentOpen}>
              {song.instruments.length ? song.instruments.join(", ") : "Reference only"}
            </button>
            {instrumentOpen && <div className="instrument-menu">
              {instrumentOptions.map((instrument) => <label key={instrument}>
                <input
                  type="checkbox"
                  checked={song.instruments.includes(instrument)}
                  onChange={() => updateSong({
                    instruments: song.instruments.includes(instrument)
                      ? song.instruments.filter((item) => item !== instrument)
                      : [...song.instruments, instrument],
                  })}
                />
                {instrument}
              </label>)}
            </div>}
          </div>
          <div className="shortcut-note">
            <strong>Keyboard</strong>
            <span>A-G enters chords</span>
            <span>Ctrl+1-6 inserts a measure</span>
            <span>Arrow keys move the cursor</span>
          </div>
        </aside>

        <section className="editor-stage" aria-label="Music editor">
          <div className="command-bar">
            <div className="song-position">
              <span className="eyebrow">Active chart</span>
              <strong>{song.key} / {song.style}</strong>
            </div>
            <div className="view-controls" aria-label="View controls">
              <button onClick={() => setZoom((value) => nextZoom(value, -1))} aria-label="Zoom out">−</button>
              <output>{zoom}%</output>
              <button onClick={() => setZoom((value) => nextZoom(value, 1))} aria-label="Zoom in">+</button>
              <button onClick={() => setZoom(100)}>100%</button>
            </div>
            <span className="status" aria-live="polite">{status}</span>
          </div>

          <div className="paper-area">
            <div className="paper-tabs" role="tablist" aria-label="Song work surfaces">
              {(["chart", "lyrics", "database"] as const).map((name) => (
                <button key={name} role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}</button>
              ))}
            </div>

            {tab === "chart" && <article
              className="paper chart-paper"
              tabIndex={0}
              ref={editorTarget}
              aria-label="Chord chart editor"
              style={{ "--paper-scale": zoom / 100 } as React.CSSProperties}
            >
              <header className="paper-header">
                <div><input aria-label="Karen title on paper" lang="kar" placeholder="Karen title" value={song.titleKaren} onChange={(event) => updateSong({ titleKaren: event.target.value })} /><input aria-label="English title on paper" placeholder="English title" value={song.titleEnglish} onChange={(event) => updateSong({ titleEnglish: event.target.value })} /></div>
                <input aria-label="Song style on paper" value={song.style} onChange={(event) => updateSong({ style: event.target.value })} />
                <select aria-label="Song key on paper" value={song.key} onChange={(event) => updateSong({ key: event.target.value })}>{["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"].map((key) => <option key={key}>{key}</option>)}</select>
              </header>
              <div className="chart-body">
                {song.sections.map((section, sectionIndex) => <div className="section-block" key={section.id}>
                  <button
                    className="section-insert"
                    onClick={() => { setSectionInsertIndex(sectionIndex); setSectionModalOpen(true); }}
                    aria-label={`Insert section before ${section.name}`}
                  >
                    +
                  </button>
                  <section className="chart-section">
                    <header className="section-title">
                      <button
                        className={`premeasure-toggle ${section.preMeasure ? "active" : ""}`}
                        onClick={() => {
                          commitSong((next) => {
                            const target = next.sections[sectionIndex];
                            target.preMeasure = target.preMeasure ? null : createMeasure(1);
                          }, section.preMeasure ? "Pre-measure removed" : "Pre-measure added");
                        }}
                        aria-label={`Toggle one-beat pre-measure for ${section.name}`}
                        aria-pressed={Boolean(section.preMeasure)}
                      />
                      <h3>{section.name}</h3>
                      <button className="section-delete" onClick={() => removeSection(sectionIndex)} aria-label={`Remove ${section.name}`}>×</button>
                    </header>
                    {rowsForSection(section).map((row) => <div className="chart-row-wrap" key={`${section.id}-row-${row.rowIndex}`}>
                      {row.rowIndex === 0 && section.preMeasure && <MeasureView
                        measure={section.preMeasure}
                        active={selected.section === sectionIndex && selected.pre}
                        activeBeat={selected.section === sectionIndex && selected.pre ? selected.beat : -1}
                        onBeat={(beat) => setSelected({ section: sectionIndex, measure: 0, beat, pre: true })}
                        pre
                      />}
                      <div className="measure-row" style={{ "--measure-columns": row.cap } as React.CSSProperties}>
                        {row.measures.map((measure, rowOffset) => {
                          const measureIndex = row.start + rowOffset;
                          return <MeasureView
                            key={`${section.id}-${measureIndex}`}
                            measure={measure}
                            active={selected.section === sectionIndex && selected.measure === measureIndex && !selected.pre}
                            activeBeat={selected.section === sectionIndex && selected.measure === measureIndex && !selected.pre ? selected.beat : -1}
                            onBeat={(beat) => setSelected({ section: sectionIndex, measure: measureIndex, beat, pre: false })}
                            ending={measureIndex === section.measures.length - 1}
                            slurPending={pendingSlur === beatKey(sectionIndex, measureIndex, selected.beat)}
                            onlyPending={pendingOnly === beatKey(sectionIndex, measureIndex, selected.beat)}
                          />;
                        })}
                      </div>
                      <div className="row-density" aria-label={`Measures in row: ${row.cap}`}>
                        <button onClick={() => changeRowCap(sectionIndex, row.rowIndex, 1)} aria-label="More measures in this row">+</button>
                        <output>{row.cap}</output>
                        <button onClick={() => changeRowCap(sectionIndex, row.rowIndex, -1)} aria-label="Fewer measures in this row">−</button>
                      </div>
                    </div>)}
                    <button className="add-measure" onClick={() => {
                      const measure = section.measures.length - 1;
                      const beatCount = Number(song.meter.split("/")[0]) || 4;
                      commitSong((next) => {
                        next.sections[sectionIndex].measures.push(createMeasure(beatCount));
                      }, `Inserted ${beatCount}-beat measure`);
                      setSelected({ section: sectionIndex, measure: measure + 1, beat: 0, pre: false });
                    }}>+ Measure</button>
                  </section>
                </div>)}
                <button
                  className="section-insert section-insert-last"
                  onClick={() => { setSectionInsertIndex(song.sections.length); setSectionModalOpen(true); }}
                >
                  + Add section
                </button>
              </div>
              <footer className="paper-footer">
                <span>{song.bpm} BPM, {song.meter}</span>
                <span>{song.instruments[0] || "Reference"}</span>
                <input aria-label="Group on paper" placeholder="Group" value={song.group} onChange={(event) => updateSong({ group: event.target.value })} />
              </footer>
            </article>}

            {tab === "lyrics" && <article className="paper lyrics-paper">
              <header><div><strong lang="kar">{song.titleKaren || "Karen title"}</strong><span>{song.titleEnglish || "English title"}</span></div><span>{song.key}</span></header>
              <textarea aria-label="Song lyrics" value={song.lyrics} onChange={(event) => updateSong({ lyrics: event.target.value })} placeholder="Lyrics" />
            </article>}

            {tab === "database" && <article className="paper database-paper">
              <header><div><strong>Song library</strong><span>Approved hosted charts</span></div><span>{songs.length} songs</span></header>
              <input className="library-search" type="search" placeholder="Search titles, key, or style" value={search} onChange={(event) => setSearch(event.target.value)} />
              <div className="song-list">
                {filteredSongs.length === 0 ? <div className="empty-state"><strong>No hosted songs yet</strong><span>Save a reviewed, sanitized chart to add it to this private library.</span></div> :
                  filteredSongs.map((item) => <button key={item.id} onClick={() => { setSong(item); setTab("chart"); setStatus("Loaded from hosted library"); }}>
                    <span lang="kar">{item.titleKaren}</span><strong>{item.titleEnglish}</strong><small>{item.key}, {item.style}, {item.meter}</small>
                  </button>)}
              </div>
            </article>}
          </div>
        </section>
      </div>

      <nav className="mobile-toolbar" aria-label="Mobile editor tools">
        <button onClick={() => setSidebarOpen(true)}>Details</button>
        <button onClick={() => setTab("chart")} aria-current={tab === "chart"}>Chart</button>
        <button onClick={() => insertMeasure(Number(song.meter.split("/")[0]) || 4)}>+ Measure</button>
        <button onClick={saveSong}>Save</button>
        <button onClick={openPrintRoom}>Print</button>
      </nav>

      {newSongOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setNewSongOpen(false)}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-song-title">
          <header><div><span className="eyebrow">New chart</span><h2 id="new-song-title">Start with song details</h2></div><button className="icon-button" onClick={() => setNewSongOpen(false)} aria-label="Close new song dialog">×</button></header>
          <p>This creates an unsaved demonstration chart. Add only approved, sanitized song content before saving it online.</p>
          <div className="modal-actions"><button onClick={() => setNewSongOpen(false)}>Cancel</button><button className="primary" onClick={startNewSong}>Create chart</button></div>
        </section>
      </div>}

      {sectionModalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSectionModalOpen(false)}>
        <section className="modal section-modal" role="dialog" aria-modal="true" aria-labelledby="section-modal-title">
          <header>
            <div><span className="eyebrow">Chart structure</span><h2 id="section-modal-title">Add section</h2></div>
            <button className="icon-button" onClick={() => setSectionModalOpen(false)} aria-label="Close section dialog">×</button>
          </header>
          <div className="section-choice-grid">
            {sectionOptions.map((name) => <button key={name} onClick={() => addSection(name)}>
              <kbd>{name === "PRE-CHORUS" ? "P" : name[0]}</kbd>{name}
            </button>)}
          </div>
        </section>
      </div>}

      {leadModalOpen && activeMeasure && <div className="modal-backdrop" role="presentation">
        <section className="modal lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title">
          <header>
            <div><span className="eyebrow">Current measure</span><h2 id="lead-modal-title">Lead melody</h2></div>
            <button className="icon-button" onClick={() => setLeadModalOpen(false)} aria-label="Close lead melody dialog">×</button>
          </header>
          <div className="lead-settings">
            <label>Base octave
              <select value={activeMeasure.leadBaseOctave ?? 4} onChange={(event) => commitSong((next) => {
                const section = next.sections[selected.section];
                const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
                if (measure) { measure.leadEnabled = true; measure.leadBaseOctave = Number(event.target.value); }
              }, "Lead octave changed")}>
                {Array.from({ length: 8 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}
              </select>
            </label>
            <label>Spaces per beat
              <select value={activeMeasure.leadSlotsByBeat?.[0] ?? 4} onChange={(event) => commitSong((next) => {
                const section = next.sections[selected.section];
                const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
                if (!measure) return;
                const slots = Number(event.target.value);
                measure.leadEnabled = true;
                measure.leadSlotsByBeat = measure.beats.map(() => slots);
                measure.rowLeadView = Array.from({ length: measure.beats.length * slots }, (_, index) => measure.rowLeadView?.[index] || "");
              }, "Lead spacing changed")}>
                {[3, 4, 6].map((count) => <option key={count}>{count}</option>)}
              </select>
            </label>
          </div>
          <div className="lead-note-grid" style={{ "--lead-columns": activeMeasure.beats.length * (activeMeasure.leadSlotsByBeat?.[0] ?? 4) } as React.CSSProperties}>
            {Array.from({ length: activeMeasure.beats.length * (activeMeasure.leadSlotsByBeat?.[0] ?? 4) }, (_, index) => <input
              key={index}
              aria-label={`Lead note slot ${index + 1}`}
              value={activeMeasure.rowLeadView?.[index] || ""}
              maxLength={3}
              onChange={(event) => commitSong((next) => {
                const section = next.sections[selected.section];
                const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
                if (!measure) return;
                measure.leadEnabled = true;
                measure.rowLeadView ??= [];
                measure.rowLeadView[index] = event.target.value;
              }, "Lead note changed")}
            />)}
          </div>
          <p className="modal-note">Use 1-7 for scale degrees, ^ or _ for octave direction, and clear a box to remove a note.</p>
          <div className="modal-actions"><button className="primary" onClick={() => { setLeadModalOpen(false); editorTarget.current?.focus(); }}>Done</button></div>
        </section>
      </div>}

      {shortcutsOpen && <aside className="shortcut-panel" aria-label="Keyboard shortcuts">
        <header><div><strong>Keyboard shortcuts</strong><span>Legacy chord-entry contract</span></div><button className="icon-button" onClick={() => setShortcutsOpen(false)} aria-label="Close shortcuts">×</button></header>
        <dl>
          <dt>Arrows / Space</dt><dd>Move by beat or row; moving past the final beat creates a measure.</dd>
          <dt>Tab</dt><dd>Insert a full measure after the current one.</dd>
          <dt>Ctrl+Space</dt><dd>Insert a measure using the current beat number.</dd>
          <dt>Ctrl+Tab</dt><dd>Split after the active beat.</dd>
          <dt>Ctrl+1-6</dt><dd>Insert an exact 1-6 beat measure.</dd>
          <dt>Backspace / Delete</dt><dd>Smart-delete the latest mark, or remove the measure.</dd>
          <dt>A-G / B / M</dt><dd>Root chord; B toggles flat after a root; M toggles minor.</dd>
          <dt>7 / T+7/8/9</dt><dd>Seventh, triangle seventh, sus, or aug.</dd>
          <dt>/ then A-G</dt><dd>Add a slash-bass note.</dd>
          <dt>. / X / O / R</dt><dd>Push, x marks, circle, or measure roll.</dd>
          <dt>S / comma</dt><dd>Start or finish a slur or Only / All In span.</dd>
          <dt>L</dt><dd>Open lead melody editing.</dd>
          <dt>Enter</dt><dd>Open Add Section; use I, V, P, C, B, S, or E.</dd>
          <dt>Ctrl+Z / Ctrl+Y</dt><dd>Undo or redo chart edits.</dd>
          <dt>Ctrl+P / ?</dt><dd>Open print room or this guide.</dd>
        </dl>
      </aside>}

      {printRoomOpen && <div className="print-room-overlay" role="presentation">
        <section className="print-room" role="dialog" aria-modal="true" aria-labelledby="print-room-title">
          <header className="print-room-toolbar">
            <div>
              <span className="print-room-kicker">Print room</span>
              <h2 id="print-room-title">One physical page per copy</h2>
              <p>{printCopies.length} Letter pages: one per instrument plus Reference.</p>
            </div>
            <div className="print-room-actions">
              <button onClick={() => setPrintRoomOpen(false)}>Back to editor</button>
              <button className="primary" onClick={() => window.print()}>Print all copies</button>
            </div>
          </header>

          <div className="print-preview-screen">
            <PrintSheet
              song={song}
              instrument={printCopies[printPage - 1]}
              editable
              onUpdate={updateSong}
            />
          </div>

          <nav className="print-pagination" aria-label="Printout pages">
            <button
              onClick={() => setPrintPage((page) => Math.max(1, page - 1))}
              disabled={printPage === 1}
              aria-label="Previous printout page"
            >
              Previous
            </button>
            <div className="print-page-numbers">
              {paginationItems(printPage, printCopies.length).map((item, index) =>
                item === "ellipsis"
                  ? <span key={`ellipsis-${index}`} aria-hidden="true">…</span>
                  : <button
                    key={item}
                    onClick={() => setPrintPage(item)}
                    aria-current={printPage === item ? "page" : undefined}
                    aria-label={`Show printout page ${item}, ${printCopies[item - 1]}`}
                  >
                    {item}
                  </button>
              )}
            </div>
            <button
              onClick={() => setPrintPage((page) => Math.min(printCopies.length, page + 1))}
              disabled={printPage === printCopies.length}
              aria-label="Next printout page"
            >
              Next
            </button>
          </nav>
          <p className="print-page-caption" aria-live="polite">
            Page {printPage} of {printCopies.length}: {printCopies[printPage - 1]}
          </p>

          <div className="print-stack" aria-hidden="true">
            {printCopies.map((instrument) => <PrintSheet key={instrument} song={song} instrument={instrument} />)}
          </div>
        </section>
      </div>}
    </main>
  );
}

function MeasureView({
  measure,
  active,
  activeBeat = -1,
  onBeat,
  pre = false,
  ending = false,
  slurPending = false,
  onlyPending = false,
}: {
  measure: Measure;
  active: boolean;
  activeBeat?: number;
  onBeat: (beat: number) => void;
  pre?: boolean;
  ending?: boolean;
  slurPending?: boolean;
  onlyPending?: boolean;
}) {
  const slots = measure.leadSlotsByBeat?.[0] ?? 4;
  return <div className={`measure ${active ? "active-measure" : ""} ${pre ? "pre-measure" : ""} ${ending ? "ending-bar" : ""} ${measure.roll ? "has-roll" : ""}`}>
    {measure.leadEnabled && <div className="lead-row" style={{ gridTemplateColumns: `repeat(${measure.beats.length * slots}, minmax(0, 1fr))` }}>
      {Array.from({ length: measure.beats.length * slots }, (_, index) => <span key={index}>{measure.rowLeadView?.[index] || ""}</span>)}
    </div>}
    <div className="beat-row" style={{ gridTemplateColumns: `repeat(${measure.beats.length}, minmax(0, 1fr))` }}>
      {measure.beats.map((beat, index) => <button
        key={index}
        className={`${activeBeat === index ? "active-beat" : ""} ${slurPending && activeBeat === index ? "slur-pending" : ""} ${onlyPending && activeBeat === index ? "only-pending" : ""}`}
        onClick={() => onBeat(index)}
        aria-label={`${pre ? "Pre-measure" : "Measure"} beat ${index + 1}${beat.chord ? `, ${chordLabel(beat.chord)}` : ""}`}
      >
        <span className={`chord ${beat.circle ? "circled" : ""}`}>{chordLabel(beat.chord)}</span>
        {(beat.dot || beat.xMarks || beat.manualUnderline || beat.bass) && <span className="rhythm-marks">
          {beat.dot && <span className="push-dot">•</span>}
          {Boolean(beat.xMarks) && <span>{"x".repeat(beat.xMarks || 0)}</span>}
          <span className="underline" />
        </span>}
        {beat.bass && <span className="bass-note">{beat.bass}</span>}
      </button>)}
    </div>
    {measure.roll && <span className="roll-label">Roll</span>}
  </div>;
}

function PrintSheet({
  song,
  instrument,
  editable = false,
  onUpdate,
}: {
  song: Song;
  instrument: string;
  editable?: boolean;
  onUpdate?: (patch: Partial<Song>) => void;
}) {
  return <article className="print-sheet" data-print-page={instrument}>
    <header className="print-sheet-header">
      <div>
        {editable
          ? <input aria-label="Karen title in print preview" lang="kar" value={song.titleKaren} onChange={(event) => onUpdate?.({ titleKaren: event.target.value })} />
          : <strong lang="kar">{song.titleKaren}</strong>}
        {editable
          ? <input aria-label="English title in print preview" value={song.titleEnglish} onChange={(event) => onUpdate?.({ titleEnglish: event.target.value })} />
          : <span>{song.titleEnglish}</span>}
      </div>
      {editable
        ? <input aria-label="Song style in print preview" value={song.style} onChange={(event) => onUpdate?.({ style: event.target.value })} />
        : <strong>{song.style}</strong>}
      <strong>{song.key}</strong>
    </header>

    <div className="print-sheet-body">
      {song.sections.map((section) => <section className="print-section" key={section.id}>
        <h3>{section.name}</h3>
        {rowsForSection(section).map((row) => <div className="print-row-wrap" key={`${section.id}-print-row-${row.rowIndex}`}>
          {row.rowIndex === 0 && section.preMeasure && <PrintMeasure measure={section.preMeasure} pre />}
          <div className="print-measure-row" style={{ "--measure-columns": row.cap } as React.CSSProperties}>
            {row.measures.map((measure, rowOffset) => {
              const measureIndex = row.start + rowOffset;
              return <PrintMeasure
                key={`${section.id}-print-${measureIndex}`}
                measure={measure}
                ending={measureIndex === section.measures.length - 1}
              />;
            })}
          </div>
        </div>)}
      </section>)}
    </div>

    <footer className="print-sheet-footer">
      <span>{song.bpm} BPM, {song.meter}</span>
      <strong>{instrument}</strong>
      {editable
        ? <input aria-label="Group in print preview" value={song.group} onChange={(event) => onUpdate?.({ group: event.target.value })} />
        : <span>{song.group}</span>}
    </footer>
  </article>;
}

function PrintMeasure({ measure, pre = false, ending = false }: { measure: Measure; pre?: boolean; ending?: boolean }) {
  return <div className={`print-measure ${pre ? "is-pre-measure" : ""} ${ending ? "ending-bar" : ""}`}>
    {measure.leadEnabled && <div className="print-lead-row" style={{ gridTemplateColumns: `repeat(${measure.rowLeadView?.length || 1}, minmax(0, 1fr))` }}>
      {(measure.rowLeadView || []).map((note, index) => <span key={index}>{note}</span>)}
    </div>}
    <div className="print-beat-row" style={{ gridTemplateColumns: `repeat(${measure.beats.length}, minmax(0, 1fr))` }}>
      {measure.beats.map((beat, index) => <span key={index}>
        <strong className={beat.circle ? "circled" : ""}>{chordLabel(beat.chord)}</strong>
        {(beat.dot || beat.xMarks || beat.manualUnderline || beat.bass) && <small>{beat.dot ? "•" : ""}{"x".repeat(beat.xMarks || 0)}</small>}
        {beat.bass && <em>{beat.bass}</em>}
      </span>)}
    </div>
    {measure.roll && <span className="print-roll-label">Roll</span>}
  </div>;
}
