"use client";

import { ChangeEvent, FocusEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
type BeatLocation = {
  section: number;
  measure: number;
  beat: number;
};
type InstrumentCueRange = {
  id: string;
  rowKey: string;
  abbr: string;
  start: BeatLocation;
  end: BeatLocation;
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
  instrumentCueRanges?: InstrumentCueRange[];
  sourceKind?: "synthetic" | "approved-sanitized" | "imported-json";
  reviewState?: "draft" | "reviewed";
  updatedAt?: string;
};

const instrumentOptions = ["Piano 1", "Piano 2", "Acoustic Guitar", "Bass", "Drums", "Strings"];
const cueAbbreviationOptions = ["P1", "P2", "AG", "EG", "B", "D", "STR"];
const sectionOptions = ["INTRO", "VERSE", "PRE-CHORUS", "CHORUS", "BRIDGE", "SOLO", "ENDING"];
const KAREN_LAYOUT = [
  "က", "ခ", "ဂ", "ဃ", "င",
  "စ", "ဆ", "ၡ", "ည", "ယ",
  "ရ", "လ", "ဝ", "သ", "မ",
  "ဘ", "ဖ", "ပ", "န", "ဒ",
  "ထ", "တ", "ဟ", "အ", "ဧ",
  "ါ", "ံ", "ိ", "ီ", "ု",
  "ူ", "ဲ", "ၢ", "့", "်",
  "း", "ၢ်", "ာ်", "ၣ်", "ၤ",
  "ှ", "ၠ", "ြ", "ျ", "ွ",
  "ဝ", "၁", "၂", "၃", "၄",
  "၅", "၆", "၇", "၈", "၉",
];
const KAREN_GROUPS = [
  { label: "Numbers", keys: KAREN_LAYOUT.slice(45) },
  { label: "Tones", keys: KAREN_LAYOUT.slice(35, 40) },
  { label: "Consonants", keys: KAREN_LAYOUT.slice(0, 25) },
  { label: "Vowels", keys: KAREN_LAYOUT.slice(25, 35) },
  { label: "Medials", keys: KAREN_LAYOUT.slice(40, 45) },
];
const KAREN_HOTKEYS = "abcdefghijklmnopqrstuvwxyz".split("").reduce<Record<string, { base: string; shift: string }>>((map, key, index) => {
  map[key] = { base: KAREN_LAYOUT[index] || "", shift: KAREN_LAYOUT[index + 26] || "" };
  return map;
}, {});
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

function sectionTone(name: string) {
  return `section-tone-${name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}`;
}

function measureWidthWeight(measure: Measure) {
  const longestChord = measure.beats.reduce((longest, beat) => {
    const value = `${chordLabel(beat.chord)}${beat.bass ? `/${beat.bass}` : ""}`;
    return Math.max(longest, Array.from(value).length);
  }, 0);
  const chordDensity = measure.beats.reduce((total, beat) => total + (beat.chord ? 1 : 0), 0);
  const complexity = Math.max(0, longestChord - 2) * 0.16
    + Math.max(0, measure.beats.length - 4) * 0.08
    + Math.max(0, chordDensity - 2) * 0.035;
  return Math.min(1.72, 1 + complexity);
}

function rowGridTemplate(measures: Measure[], capacity: number) {
  const used = measures.map((measure) => `minmax(0, ${measureWidthWeight(measure).toFixed(2)}fr)`);
  const empty = Array.from({ length: Math.max(0, capacity - measures.length) }, () => "minmax(0, 1fr)");
  return [...used, ...empty].join(" ");
}

function totalLeadSlots(measure: Measure) {
  return measure.beats.reduce((total, _beat, index) => total + (measure.leadSlotsByBeat?.[index] ?? 4), 0);
}

function normalizeLeadSlots(measure: Measure) {
  return measure.beats.map((_beat, index) => measure.leadSlotsByBeat?.[index] ?? 4);
}

function leadBeatForSlot(measure: Measure, slotIndex: number) {
  let cursor = 0;
  const counts = normalizeLeadSlots(measure);
  for (let beatIndex = 0; beatIndex < counts.length; beatIndex += 1) {
    cursor += counts[beatIndex];
    if (slotIndex < cursor) return beatIndex;
  }
  return Math.max(0, counts.length - 1);
}

function resizeLeadBeat(measure: Measure, beatIndex: number, nextCount: number) {
  const previousCounts = normalizeLeadSlots(measure);
  const previousCells = measure.rowLeadView ?? [];
  const groups: string[][] = [];
  let cursor = 0;
  previousCounts.forEach((count) => {
    groups.push(previousCells.slice(cursor, cursor + count));
    cursor += count;
  });
  previousCounts[beatIndex] = nextCount;
  groups[beatIndex] = Array.from({ length: nextCount }, (_, index) => groups[beatIndex]?.[index] || "");
  measure.leadSlotsByBeat = previousCounts;
  measure.rowLeadView = groups.flat();
}

function cueRowKey(song: Song, location: BeatLocation) {
  const section = song.sections[location.section];
  const row = rowsForSection(section).find((candidate) =>
    location.measure >= candidate.start && location.measure < candidate.start + candidate.measures.length
  );
  return `${section.id}:${row?.rowIndex ?? 0}`;
}

function orderedRange(range: InstrumentCueRange): InstrumentCueRange {
  const startValue = range.start.measure * 100 + range.start.beat;
  const endValue = range.end.measure * 100 + range.end.beat;
  return startValue <= endValue ? range : { ...range, start: range.end, end: range.start };
}

type ImportReview = {
  filename: string;
  source: string;
  sectionCount: number;
  measureCount: number;
  warnings: string[];
  candidate: Song;
};

type Viewer = {
  authenticated: boolean;
  displayName?: string;
};

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
  sourceKind: "synthetic",
  reviewState: "reviewed",
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

function ChordNotation({ chord }: { chord: Chord | null }) {
  if (!chord) return null;
  return <>
    <span className="chord-root">{chord.root}</span>
    {chord.flat && <span className="chord-flat">♭</span>}
    {chord.minor && <span className="chord-minor">m</span>}
    {chord.seven && <span className="chord-seven">₇</span>}
    {chord.quality && <span className="chord-quality">{chord.quality === "triangle7" ? "Δ7" : chord.quality}</span>}
  </>;
}

export function MusicDirector({ viewer = { authenticated: false } }: { viewer?: Viewer }) {
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
  const [karenTitleKeyboardEnabled, setKarenTitleKeyboardEnabled] = useState(true);
  const [status, setStatus] = useState(
    viewer.authenticated ? "Demo chart, not yet saved" : "Local synthetic demo; sign in to use the private library"
  );
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(100);
  const [pendingBass, setPendingBass] = useState(false);
  const [pendingSuperscript, setPendingSuperscript] = useState(false);
  const [pendingSlur, setPendingSlur] = useState<string | null>(null);
  const [pendingOnly, setPendingOnly] = useState<string | null>(null);
  const [activeCueSlot, setActiveCueSlot] = useState(0);
  const [importReview, setImportReview] = useState<ImportReview | null>(null);
  const [importReviewConfirmed, setImportReviewConfirmed] = useState(false);
  const [saveReviewOpen, setSaveReviewOpen] = useState(false);
  const [saveReviewConfirmed, setSaveReviewConfirmed] = useState(false);
  const [karenKeyboardOpen, setKarenKeyboardOpen] = useState(false);
  const [karenTargetLabel, setKarenTargetLabel] = useState("Karen text");
  const [karenPreview, setKarenPreview] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const printButton = useRef<HTMLButtonElement>(null);
  const editorTarget = useRef<HTMLElement>(null);
  const undoHistory = useRef<Song[]>([]);
  const redoHistory = useRef<Song[]>([]);
  const leadInputs = useRef<Array<HTMLInputElement | null>>([]);
  const karenTarget = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const karenSuppressOpen = useRef(false);
  const karenUndoHistory = useRef<Array<{ element: HTMLInputElement | HTMLTextAreaElement; value: string; caret: number }>>([]);
  const karenRedoHistory = useRef<Array<{ element: HTMLInputElement | HTMLTextAreaElement; value: string; caret: number }>>([]);

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
    if (!viewer.authenticated) return;
    fetch("/api/songs")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        setSongs(data.songs ?? []);
        if (data.warning) setStatus(data.warning);
      })
      .catch(() => setStatus("Hosted library is unavailable; this draft remains local"));
  }, [viewer.authenticated]);

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

  function leadLocation(delta: -1 | 1): { section: number; measure: number; beat: number; pre: boolean } | null {
    if (selected.pre) {
      return delta > 0 ? { section: selected.section, measure: 0, beat: 0, pre: false } : null;
    }
    const section = song.sections[selected.section];
    if (delta < 0 && selected.measure > 0) {
      return { section: selected.section, measure: selected.measure - 1, beat: 0, pre: false };
    }
    if (delta < 0 && selected.measure === 0 && section.preMeasure) {
      return { section: selected.section, measure: 0, beat: 0, pre: true };
    }
    if (delta > 0 && selected.measure < section.measures.length - 1) {
      return { section: selected.section, measure: selected.measure + 1, beat: 0, pre: false };
    }
    const nextSectionIndex = selected.section + delta;
    const nextSection = song.sections[nextSectionIndex];
    if (!nextSection) return null;
    if (delta > 0 && nextSection.preMeasure) {
      return { section: nextSectionIndex, measure: 0, beat: 0, pre: true };
    }
    return {
      section: nextSectionIndex,
      measure: delta > 0 ? 0 : nextSection.measures.length - 1,
      beat: 0,
      pre: false,
    };
  }

  function shiftLeadMeasure(delta: -1 | 1) {
    const location = leadLocation(delta);
    if (!location) return;
    setSelected(location);
    setStatus(`Lead editor moved to ${song.sections[location.section].name} ${location.pre ? "pre-section" : `measure ${location.measure + 1}`}`);
    requestAnimationFrame(() => leadInputs.current[0]?.focus());
  }

  function adjustLeadBaseOctave(delta: -1 | 1) {
    commitSong((next) => {
      const section = next.sections[selected.section];
      const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
      if (!measure) return;
      measure.leadEnabled = true;
      measure.leadBaseOctave = Math.max(1, Math.min(8, (measure.leadBaseOctave ?? 4) + delta));
    }, "Lead base octave changed");
  }

  function adjustLeadNote(index: number, delta: -1 | 1) {
    commitSong((next) => {
      const section = next.sections[selected.section];
      const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
      if (!measure) return;
      measure.leadEnabled = true;
      measure.rowLeadView ??= Array.from({ length: totalLeadSlots(measure) }, () => "");
      const current = measure.rowLeadView[index] || "";
      if (!current) return;
      const bare = current.replace(/^[\^_]+/, "");
      const prefix = current.slice(0, current.length - bare.length);
      const level = prefix.split("").reduce((value, marker) => value + (marker === "^" ? 1 : -1), 0);
      const nextLevel = Math.max(-2, Math.min(2, level + delta));
      measure.rowLeadView[index] = `${nextLevel > 0 ? "^".repeat(nextLevel) : "_".repeat(Math.abs(nextLevel))}${bare}`;
    }, "Lead note octave changed");
  }

  function handleLeadModalKey(event: KeyboardEvent<HTMLElement>) {
    const key = event.key;
    const inputIndex = leadInputs.current.findIndex((input) => input === event.target);
    if (key === "Escape") {
      event.preventDefault();
      setLeadModalOpen(false);
      editorTarget.current?.focus();
      return;
    }
    if (event.ctrlKey && key.toLowerCase() === "z") { event.preventDefault(); undo(); return; }
    if (event.ctrlKey && key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
    if (event.ctrlKey && key === "ArrowLeft") { event.preventDefault(); shiftLeadMeasure(-1); return; }
    if (event.ctrlKey && key === "ArrowRight") { event.preventDefault(); shiftLeadMeasure(1); return; }
    if (event.ctrlKey && key === "ArrowUp") { event.preventDefault(); adjustLeadBaseOctave(1); return; }
    if (event.ctrlKey && key === "ArrowDown") { event.preventDefault(); adjustLeadBaseOctave(-1); return; }
    if (inputIndex < 0) return;
    if (key === "ArrowLeft") {
      event.preventDefault();
      leadInputs.current[Math.max(0, inputIndex - 1)]?.focus();
    } else if (key === "ArrowRight" || key === "Enter") {
      event.preventDefault();
      leadInputs.current[Math.min(leadInputs.current.length - 1, inputIndex + 1)]?.focus();
    } else if (key === "ArrowUp") {
      event.preventDefault();
      adjustLeadNote(inputIndex, 1);
    } else if (key === "ArrowDown") {
      event.preventDefault();
      adjustLeadNote(inputIndex, -1);
    }
  }

  function setCueRangeEndpoint(endpoint: "start" | "end") {
    if (selected.pre) return;
    const currentLocation = { section: selected.section, measure: selected.measure, beat: selected.beat };
    const rowKey = cueRowKey(song, currentLocation);
    commitSong((next) => {
      next.instrumentCueRanges ??= [];
      const rowRanges = next.instrumentCueRanges.filter((range) => range.rowKey === rowKey);
      let range = rowRanges[activeCueSlot];
      if (!range) {
        range = {
          id: crypto.randomUUID(),
          rowKey,
          abbr: cueAbbreviationOptions[0],
          start: currentLocation,
          end: currentLocation,
        };
        next.instrumentCueRanges.push(range);
      }
      range[endpoint] = currentLocation;
      Object.assign(range, orderedRange(range));
    }, `Instrument cue ${endpoint} set`);
  }

  function setCueRangeAbbreviation(abbr: string) {
    if (selected.pre) return;
    const currentLocation = { section: selected.section, measure: selected.measure, beat: selected.beat };
    const rowKey = cueRowKey(song, currentLocation);
    commitSong((next) => {
      next.instrumentCueRanges ??= [];
      const rowRanges = next.instrumentCueRanges.filter((range) => range.rowKey === rowKey);
      let range = rowRanges[activeCueSlot];
      if (!range) {
        range = { id: crypto.randomUUID(), rowKey, abbr, start: currentLocation, end: currentLocation };
        next.instrumentCueRanges.push(range);
      } else {
        range.abbr = abbr;
      }
    }, "Instrument cue label changed");
  }

  function clearCueRange() {
    if (selected.pre) return;
    const rowKey = cueRowKey(song, selected);
    commitSong((next) => {
      const rowRanges = (next.instrumentCueRanges ?? []).filter((range) => range.rowKey === rowKey);
      const target = rowRanges[activeCueSlot];
      if (target) next.instrumentCueRanges = (next.instrumentCueRanges ?? []).filter((range) => range.id !== target.id);
    }, "Instrument cue range cleared");
  }

  function openKarenKeyboard(target: HTMLInputElement | HTMLTextAreaElement) {
    if (karenSuppressOpen.current) return;
    karenTarget.current = target;
    setKarenTargetLabel(target.getAttribute("aria-label") || target.labels?.[0]?.textContent?.trim() || target.placeholder || "Karen text");
    setKarenPreview(target.value);
    setKarenKeyboardOpen(true);
  }

  function closeKarenKeyboard() {
    const target = karenTarget.current;
    setKarenKeyboardOpen(false);
    karenSuppressOpen.current = true;
    requestAnimationFrame(() => {
      target?.focus({ preventScroll: true });
      karenSuppressOpen.current = false;
    });
  }

  function setKarenTargetValue(target: HTMLInputElement | HTMLTextAreaElement, value: string, caret: number) {
    setKarenPreview(value);
    const field = target.dataset.karenField;
    if (field === "titleKaren") updateSong({ titleKaren: value });
    const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    if (!field && setter) {
      setter.call(target, value);
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
    requestAnimationFrame(() => {
      target.focus();
      target.setSelectionRange(caret, caret);
    });
  }

  function insertKarenCharacter(character: string) {
    const target = karenTarget.current;
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    karenUndoHistory.current.push({ element: target, value: target.value, caret: start });
    karenRedoHistory.current = [];
    const value = `${target.value.slice(0, start)}${character}${target.value.slice(end)}`;
    setKarenTargetValue(target, value, start + character.length);
  }

  function karenBackspace() {
    const target = karenTarget.current;
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    if (start === 0 && end === 0) return;
    karenUndoHistory.current.push({ element: target, value: target.value, caret: start });
    karenRedoHistory.current = [];
    const deleteStart = start === end ? Array.from(target.value.slice(0, start)).slice(0, -1).join("").length : start;
    setKarenTargetValue(target, `${target.value.slice(0, deleteStart)}${target.value.slice(end)}`, deleteStart);
  }

  function restoreKarenHistory(source: typeof karenUndoHistory, destination: typeof karenRedoHistory) {
    const snapshot = source.current.pop();
    const target = karenTarget.current;
    if (!snapshot || !target) return;
    destination.current.push({ element: target, value: target.value, caret: target.selectionStart ?? target.value.length });
    karenTarget.current = snapshot.element;
    setKarenTargetValue(snapshot.element, snapshot.value, snapshot.caret);
  }

  function handleKarenKeyboardKey(event: KeyboardEvent<HTMLElement>) {
    const lower = event.key.toLowerCase();
    if (event.key === "Enter") {
      event.preventDefault();
      setStatus(`${karenTargetLabel} updated`);
      closeKarenKeyboard();
      return;
    }
    if (event.key === "Escape") { event.preventDefault(); closeKarenKeyboard(); return; }
    if (event.key === "Backspace") { event.preventDefault(); karenBackspace(); return; }
    if (event.ctrlKey && lower === "z") { event.preventDefault(); restoreKarenHistory(karenUndoHistory, karenRedoHistory); return; }
    if (event.ctrlKey && lower === "y") { event.preventDefault(); restoreKarenHistory(karenRedoHistory, karenUndoHistory); return; }
    if (!event.ctrlKey && !event.altKey && !event.metaKey && /^[a-z]$/.test(lower)) {
      const character = KAREN_HOTKEYS[lower]?.[event.shiftKey ? "shift" : "base"];
      if (character) {
        event.preventDefault();
        insertKarenCharacter(character);
      }
    }
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

  function togglePreMeasure(sectionIndex: number) {
    const hadPreMeasure = Boolean(song.sections[sectionIndex]?.preMeasure);
    commitSong((next) => {
      const section = next.sections[sectionIndex];
      section.preMeasure = section.preMeasure ? null : createMeasure(1);
      if (section.preMeasure) {
        section.preMeasure.leadSlotsByBeat = [6];
      }
    }, hadPreMeasure ? "Pre-measure removed" : "Pre-measure added");
    setSelected(hadPreMeasure
      ? { section: sectionIndex, measure: 0, beat: 0, pre: false }
      : { section: sectionIndex, measure: 0, beat: 0, pre: true });
    requestAnimationFrame(() => editorTarget.current?.focus());
  }

  function handleTextFocus(event: FocusEvent<HTMLElement>) {
    if (!karenTitleKeyboardEnabled) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (target.dataset.karenField !== "titleKaren") return;
    openKarenKeyboard(target);
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
    if (karenKeyboardOpen) {
      handleKarenKeyboardKey(event);
      return;
    }
    if (leadModalOpen || importReview || saveReviewOpen || newSongOpen || printRoomOpen) return;
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
    if (lower === "l") { event.preventDefault(); setKarenKeyboardOpen(false); setLeadModalOpen(true); return; }
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
        body: JSON.stringify({
          ...song,
          saveApproval: {
            reviewed: true,
            syntheticOrApproved: true,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed");
      const saved = data.song as Song;
      setSong(saved);
      setSongs((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setStatus("Saved to hosted library");
      setSaveReviewOpen(false);
      setSaveReviewConfirmed(false);
    } catch {
      setStatus("Save failed; export this draft before leaving");
    }
  }

  function requestSaveSong() {
    setKarenKeyboardOpen(false);
    setSaveReviewConfirmed(false);
    setSaveReviewOpen(true);
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
        const fallback = demoSong();
        const candidate: Song = {
          ...fallback,
          ...imported,
          id: undefined,
          sourceKind: "imported-json",
          reviewState: "draft",
          instruments: Array.isArray(imported.instruments)
            ? imported.instruments.filter((instrument): instrument is string => typeof instrument === "string").slice(0, 12)
            : fallback.instruments,
          sections: imported.sections.filter((section): section is Section =>
            Boolean(section && typeof section === "object" && Array.isArray((section as Section).measures))
          ),
        };
        if (!candidate.sections.length) throw new Error();
        const warnings = [
          !candidate.titleEnglish?.trim() ? "English title is missing." : "",
          candidate.sections.some((section) => section.measures.some((measure) => !Array.isArray(measure.beats))) ? "One or more measures need beat review." : "",
        ].filter(Boolean);
        setImportReview({
          filename: file.name,
          source: "Karen Music JSON",
          sectionCount: candidate.sections.length,
          measureCount: candidate.sections.reduce((total, section) => total + section.measures.length, 0),
          warnings,
          candidate,
        });
        setImportReviewConfirmed(false);
        setStatus("Import ready for review; the editor has not changed");
      } catch {
        setStatus("Import could not be read; choose a Karen Music JSON export");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function applyImportReview() {
    if (!importReview || !importReviewConfirmed) return;
    setKarenKeyboardOpen(false);
    setSong({ ...importReview.candidate, id: undefined, reviewState: "reviewed" });
    setSelected({ section: 0, measure: 0, beat: 0, pre: false });
    setImportReview(null);
    setImportReviewConfirmed(false);
    setStatus("Imported as an unsaved reviewed draft");
    requestAnimationFrame(() => editorTarget.current?.focus());
  }

  function startNewSong() {
    setSong(demoSong());
    setNewSongOpen(false);
    setStatus("New unsaved song");
  }

  function openPrintRoom() {
    setKarenKeyboardOpen(false);
    setPrintPage(1);
    setPrintRoomOpen(true);
  }

  const filteredSongs = songs.filter((item) =>
    `${item.titleKaren} ${item.titleEnglish} ${item.key} ${item.style}`.toLowerCase().includes(search.toLowerCase())
  );
  const activeCueRowKey = selected.pre ? "" : cueRowKey(song, selected);
  const activeCueRanges = (song.instrumentCueRanges ?? []).filter((range) => range.rowKey === activeCueRowKey).slice(0, 2);
  const activeCueRange = activeCueRanges[activeCueSlot];

  return (
    <main className="app-shell" onKeyDownCapture={handleEditorKey} onFocusCapture={handleTextFocus}>
      <header className="app-header">
        <div className="brand">
          <button className="icon-button" onClick={() => setSidebarOpen((value) => !value)} aria-label="Toggle song details">☰</button>
          <div>
            <strong>Karen Music Director</strong>
            <span>ကညီတၢ်သးဝံၣ်</span>
          </div>
        </div>
        <nav className="global-actions" aria-label="Song actions">
          <button onClick={() => { setKarenKeyboardOpen(false); setNewSongOpen(true); }}>New song</button>
          <button onClick={requestSaveSong} className="primary">Save</button>
          <button onClick={() => { setKarenKeyboardOpen(false); fileInput.current?.click(); }}>Import</button>
          <button onClick={exportSong}>Export</button>
          <button ref={printButton} onClick={openPrintRoom}>Print</button>
          <details className="settings-menu">
            <summary>Settings</summary>
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={karenTitleKeyboardEnabled}
                  onChange={(event) => {
                    setKarenTitleKeyboardEnabled(event.target.checked);
                    if (!event.target.checked) setKarenKeyboardOpen(false);
                  }}
                />
                Karen title keyboard
              </label>
              <button onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} aria-label="Toggle color theme">{theme === "dark" ? "Light theme" : "Dark theme"}</button>
            </div>
          </details>
          <input ref={fileInput} type="file" accept=".json,application/json" onChange={importSong} hidden />
        </nav>
      </header>

      <div className={`workspace ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
        <aside className="sidebar" aria-label="Song details">
          <div className="sidebar-heading">
            <span>Song details</span>
            <button className="icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close song details">×</button>
          </div>
          <label>Karen title<input aria-label="Karen title" lang="kar" dir="ltr" data-karen-field="titleKaren" value={song.titleKaren} onChange={(event) => updateSong({ titleKaren: event.target.value })} /></label>
          <label>English title<span className="parenthesized-field"><span aria-hidden="true">(</span><input data-karen-exempt="true" value={song.titleEnglish} onChange={(event) => updateSong({ titleEnglish: event.target.value })} /><span aria-hidden="true">)</span></span></label>
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
                <div><input aria-label="Karen title on paper" lang="kar" dir="ltr" data-karen-field="titleKaren" placeholder="Karen title" value={song.titleKaren} onChange={(event) => updateSong({ titleKaren: event.target.value })} /><span className="parenthesized-field paper-english-title"><span aria-hidden="true">(</span><input data-karen-exempt="true" aria-label="English title on paper" placeholder="English title" value={song.titleEnglish} onChange={(event) => updateSong({ titleEnglish: event.target.value })} /><span aria-hidden="true">)</span></span></div>
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
                  <section className={`chart-section ${sectionTone(section.name)}`} data-section-type={section.name}>
                    <header className="section-title">
                      <button
                        className={`premeasure-toggle ${section.preMeasure ? "active" : ""}`}
                        onClick={() => togglePreMeasure(sectionIndex)}
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
                      <div className="measure-row" style={{ gridTemplateColumns: rowGridTemplate(row.measures, row.cap) }}>
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
                            cueStarts={measure.beats.map((_beat, beatIndex) => (song.instrumentCueRanges ?? [])
                              .filter((range) => range.start.section === sectionIndex && range.start.measure === measureIndex && range.start.beat === beatIndex)
                              .map((range) => range.abbr))}
                            cueEnds={measure.beats.map((_beat, beatIndex) => (song.instrumentCueRanges ?? [])
                              .filter((range) => range.end.section === sectionIndex && range.end.measure === measureIndex && range.end.beat === beatIndex)
                              .map((range) => range.abbr))}
                          />;
                        })}
                      </div>
                      <div className="row-density" aria-label={`Measures in row: ${row.cap}`}>
                        <button onClick={() => changeRowCap(sectionIndex, row.rowIndex, 1)} aria-label="More measures in this row">▲</button>
                        <output>{row.cap}</output>
                        <button onClick={() => changeRowCap(sectionIndex, row.rowIndex, -1)} aria-label="Fewer measures in this row">▼</button>
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
                <details className="paper-instrument-picker">
                  <summary aria-label="Choose centered footer instruments">{song.instruments.length ? song.instruments.join(" / ") : "Reference"}</summary>
                  <div className="paper-instrument-menu">
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
                  </div>
                </details>
                <input aria-label="Group on paper" placeholder="Group" value={song.group} onChange={(event) => updateSong({ group: event.target.value })} />
              </footer>
            </article>}

            {tab === "lyrics" && <article className="paper lyrics-paper">
              <header><div><strong lang="kar">{song.titleKaren || "Karen title"}</strong><span>{song.titleEnglish || "English title"}</span></div><span>{song.key}</span></header>
              <textarea aria-label="Song lyrics" lang="kar" dir="ltr" value={song.lyrics} onChange={(event) => updateSong({ lyrics: event.target.value })} placeholder="Lyrics" />
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
        <button onClick={requestSaveSong}>Save</button>
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
        <section className="modal lead-modal" role="dialog" aria-modal="true" aria-labelledby="lead-modal-title" onKeyDownCapture={handleLeadModalKey}>
          <header className="lead-modal-header">
            <button className="lead-measure-nav" onClick={() => shiftLeadMeasure(-1)} disabled={!leadLocation(-1)} aria-label="Previous lead measure">‹</button>
            <div>
              <span className="eyebrow">{song.sections[selected.section].name}</span>
              <h2 id="lead-modal-title">Lead melody</h2>
              <span className="lead-measure-label">{selected.pre ? "Pre-section" : `Measure ${selected.measure + 1}`}</span>
            </div>
            <button className="lead-measure-nav" onClick={() => shiftLeadMeasure(1)} disabled={!leadLocation(1)} aria-label="Next lead measure">›</button>
            <button className="icon-button" onClick={() => { setLeadModalOpen(false); editorTarget.current?.focus(); }} aria-label="Close lead melody dialog">×</button>
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
            <div className="lead-beat-settings" aria-label="Spaces per beat">
              {activeMeasure.beats.map((_beat, beatIndex) => <label key={beatIndex}>Beat {beatIndex + 1}
                <select value={activeMeasure.leadSlotsByBeat?.[beatIndex] ?? 4} onChange={(event) => commitSong((next) => {
                  const section = next.sections[selected.section];
                  const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
                  if (!measure) return;
                  measure.leadEnabled = true;
                  resizeLeadBeat(measure, beatIndex, Number(event.target.value));
                }, `Beat ${beatIndex + 1} spacing changed`)}>
                  {(selected.pre ? [1, 2, 3, 4, 5, 6] : [3, 4, 6]).map((count) => <option key={count}>{count}</option>)}
                </select>
              </label>)}
            </div>
          </div>
          <div className="lead-note-grid" style={{ "--lead-columns": totalLeadSlots(activeMeasure) } as React.CSSProperties}>
            {Array.from({ length: totalLeadSlots(activeMeasure) }, (_, index) => <input
              key={index}
              ref={(element) => { leadInputs.current[index] = element; }}
              data-lead-slot={index}
              aria-label={`Lead note slot ${index + 1}`}
              value={activeMeasure.rowLeadView?.[index] || ""}
              maxLength={4}
              onFocus={() => setSelected((current) => ({ ...current, beat: leadBeatForSlot(activeMeasure, index) }))}
              onChange={(event) => commitSong((next) => {
                const section = next.sections[selected.section];
                const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
                if (!measure) return;
                measure.leadEnabled = true;
                measure.leadSlotsByBeat ??= measure.beats.map(() => 4);
                measure.rowLeadView ??= Array.from({ length: totalLeadSlots(measure) }, () => "");
                measure.rowLeadView[index] = event.target.value;
              }, "Lead note changed")}
            />)}
          </div>
          <div className="lead-grid-actions">
            <button onClick={() => {
              const focused = leadInputs.current.findIndex((input) => input === document.activeElement);
              if (focused >= 0) commitSong((next) => {
                const section = next.sections[selected.section];
                const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
                if (measure?.rowLeadView) measure.rowLeadView[focused] = "";
              }, "Lead note cleared");
            }}>Clear note</button>
            <button onClick={() => commitSong((next) => {
              const section = next.sections[selected.section];
              const measure = selected.pre ? section.preMeasure : section.measures[selected.measure];
              if (measure) measure.rowLeadView = Array.from({ length: totalLeadSlots(measure) }, () => "");
            }, "Lead measure cleared")}>Clear measure</button>
            <button onClick={undo}>Undo</button>
            <button onClick={redo}>Redo</button>
          </div>

          {!selected.pre && <section className="cue-range-editor" aria-labelledby="cue-range-title">
            <div>
              <span className="eyebrow">Instrument cues</span>
              <strong id="cue-range-title">Two ranges per visual row</strong>
            </div>
            <div className="cue-range-slots">
              {[0, 1].map((slot) => {
                const range = activeCueRanges[slot];
                return <button key={slot} className={activeCueSlot === slot ? "selected" : ""} onClick={() => setActiveCueSlot(slot)}>
                  {range ? `${range.abbr}: M${range.start.measure + 1}.${range.start.beat + 1}–M${range.end.measure + 1}.${range.end.beat + 1}` : `Range ${slot + 1}`}
                </button>;
              })}
            </div>
            <div className="cue-abbreviations" aria-label="Cue abbreviations">
              {cueAbbreviationOptions.map((abbr) => <button key={abbr} className={activeCueRange?.abbr === abbr ? "selected" : ""} onClick={() => setCueRangeAbbreviation(abbr)}>{abbr}</button>)}
            </div>
            <div className="cue-range-actions">
              <button onClick={() => setCueRangeEndpoint("start")}>Start here</button>
              <button onClick={() => setCueRangeEndpoint("end")}>End here</button>
              <button onClick={clearCueRange}>Clear range</button>
            </div>
          </section>}

          <p className="modal-note">Left/Right moves lead slots. Ctrl+Left/Right changes measure. Up/Down changes a note octave. Ctrl+Up/Down changes base octave. Ctrl+Z/Y undo or redo.</p>
          <div className="modal-actions"><button className="primary" onClick={() => { setLeadModalOpen(false); editorTarget.current?.focus(); }}>Done</button></div>
        </section>
      </div>}

      {importReview && <div className="modal-backdrop" role="presentation">
        <section className="modal import-review-modal" role="dialog" aria-modal="true" aria-labelledby="import-review-title">
          <header>
            <div><span className="eyebrow">Unsaved import review</span><h2 id="import-review-title">Review before replacing the editor</h2></div>
            <button className="icon-button" onClick={() => { setImportReview(null); setImportReviewConfirmed(false); setStatus("Import canceled; editor unchanged"); }} aria-label="Close import review">×</button>
          </header>
          <dl className="review-facts">
            <div><dt>File</dt><dd>{importReview.filename}</dd></div>
            <div><dt>Source</dt><dd>{importReview.source}</dd></div>
            <div><dt>Sections</dt><dd>{importReview.sectionCount}</dd></div>
            <div><dt>Measures</dt><dd>{importReview.measureCount}</dd></div>
          </dl>
          <div className={`review-warning ${importReview.warnings.length ? "attention" : "clear"}`}>
            <strong>{importReview.warnings.length ? "Review needed" : "Structure check passed"}</strong>
            {importReview.warnings.length
              ? <ul>{importReview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
              : <span>No structural warnings were detected. Musical accuracy still needs human review.</span>}
          </div>
          <label className="review-check">
            <input type="checkbox" checked={importReviewConfirmed} onChange={(event) => setImportReviewConfirmed(event.target.checked)} />
            Replace the current editor with this unsaved draft. I will verify the chart before Save.
          </label>
          <p>Import never writes to the hosted library. Save has a separate identity and approval gate.</p>
          <div className="modal-actions">
            <button onClick={() => { setImportReview(null); setImportReviewConfirmed(false); setStatus("Import canceled; editor unchanged"); }}>Cancel</button>
            <button className="primary" disabled={!importReviewConfirmed} onClick={applyImportReview}>Load unsaved draft</button>
          </div>
        </section>
      </div>}

      {saveReviewOpen && <div className="modal-backdrop" role="presentation">
        <section className="modal save-review-modal" role="dialog" aria-modal="true" aria-labelledby="save-review-title">
          <header>
            <div><span className="eyebrow">Private hosted persistence</span><h2 id="save-review-title">Confirm this chart is safe to save</h2></div>
            <button className="icon-button" onClick={() => setSaveReviewOpen(false)} aria-label="Close save review">×</button>
          </header>
          <p>{viewer.authenticated
            ? `This chart will be stored in ${viewer.displayName || "your"} private hosted library and separated from other users.`
            : "Sign in through the hosted site before saving. Local preview edits and exports still work."}</p>
          <label className="review-check">
            <input type="checkbox" checked={saveReviewConfirmed} disabled={!viewer.authenticated} onChange={(event) => setSaveReviewConfirmed(event.target.checked)} />
            This chart contains synthetic content only, or every song element was explicitly approved and sanitized for hosting.
          </label>
          <div className="persistence-boundary">
            <strong>Never included automatically</strong>
            <span>`songs.db`, desktop charts, images, provider payloads, credentials, and unsaved imports.</span>
          </div>
          <div className="modal-actions">
            <button onClick={() => setSaveReviewOpen(false)}>Cancel</button>
            <button className="primary" disabled={!viewer.authenticated || !saveReviewConfirmed} onClick={saveSong}>Save to private library</button>
          </div>
        </section>
      </div>}

      {karenKeyboardOpen && <div className="karen-keyboard-overlay" role="presentation"><aside className="karen-keyboard-tray" role="dialog" aria-modal="true" aria-label="Karen keyboard">
        <header>
          <div><span className="eyebrow">Typing into</span><strong>{karenTargetLabel}</strong></div>
          <span className="karen-hotkey-note">Enter applies · Esc closes · A–Z maps</span>
          <button className="icon-button" onClick={closeKarenKeyboard} aria-label="Close Karen keyboard">×</button>
        </header>
        <div className="karen-focus-preview" lang="kar">{karenPreview || "…"}</div>
        <div className="karen-keyboard-groups">
          {KAREN_GROUPS.map((group) => <section key={group.label} className={`karen-keyboard-group karen-${group.label.toLowerCase()}`}>
            <span>{group.label}</span>
            <div>
              {group.keys.map((character, index) => <button
                key={`${group.label}-${index}`}
                className="floating-key"
                style={{ "--key-index": index } as React.CSSProperties}
                lang="kar"
                aria-label={`Karen key ${character}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertKarenCharacter(character)}
              >{character}</button>)}
            </div>
          </section>)}
          <section className="karen-keyboard-group karen-commands">
            <span>Commands</span>
            <div>
              <button onClick={() => restoreKarenHistory(karenUndoHistory, karenRedoHistory)}>Undo</button>
              <button onClick={() => restoreKarenHistory(karenRedoHistory, karenUndoHistory)}>Redo</button>
              <button onClick={karenBackspace} aria-label="Karen keyboard backspace">⌫</button>
              <button onClick={() => { setStatus(`${karenTargetLabel} updated`); closeKarenKeyboard(); }}>Enter</button>
            </div>
          </section>
        </div>
      </aside></div>}

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
          <dt>Lead arrows</dt><dd>Left/Right moves slots; Ctrl+Left/Right changes measure; Up/Down changes note octave; Ctrl+Up/Down changes base octave.</dd>
          <dt>Karen A-Z</dt><dd>While the Karen keyboard is open, type A-Z or Shift+A-Z; Escape closes, Backspace deletes, and Ctrl+Z/Y undo or redo.</dd>
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
  cueStarts = [],
  cueEnds = [],
}: {
  measure: Measure;
  active: boolean;
  activeBeat?: number;
  onBeat: (beat: number) => void;
  pre?: boolean;
  ending?: boolean;
  slurPending?: boolean;
  onlyPending?: boolean;
  cueStarts?: string[][];
  cueEnds?: string[][];
}) {
  return <div className={`measure ${active ? "active-measure" : ""} ${pre ? "pre-measure" : ""} ${ending ? "ending-bar" : ""} ${measure.roll ? "has-roll" : ""}`}>
    {measure.leadEnabled && <div className="lead-row" style={{ gridTemplateColumns: `repeat(${totalLeadSlots(measure)}, minmax(0, 1fr))` }}>
      {Array.from({ length: totalLeadSlots(measure) }, (_, index) => <span key={index}>{measure.rowLeadView?.[index] || ""}</span>)}
    </div>}
    <div className="beat-row" style={{ gridTemplateColumns: `repeat(${measure.beats.length}, minmax(0, 1fr))` }}>
      {measure.beats.map((beat, index) => <button
        key={index}
        className={`${activeBeat === index ? "active-beat" : ""} ${slurPending && activeBeat === index ? "slur-pending" : ""} ${onlyPending && activeBeat === index ? "only-pending" : ""} ${cueStarts[index]?.length ? "lead-range-start" : ""} ${cueEnds[index]?.length ? "lead-range-end" : ""}`}
        onClick={() => onBeat(index)}
        aria-label={`${pre ? "Pre-measure" : "Measure"} beat ${index + 1}${beat.chord ? `, ${chordLabel(beat.chord)}` : ""}${cueStarts[index]?.length ? `, ${cueStarts[index].join(", ")} cue starts` : ""}${cueEnds[index]?.length ? `, ${cueEnds[index].join(", ")} cue ends` : ""}`}
        data-cue-start={cueStarts[index]?.join(",") || undefined}
        data-cue-end={cueEnds[index]?.join(",") || undefined}
      >
        <span className={`chord ${beat.circle ? "circled" : ""}`}><ChordNotation chord={beat.chord} /></span>
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
          ? <span className="parenthesized-field"><span aria-hidden="true">(</span><input data-karen-exempt="true" aria-label="English title in print preview" value={song.titleEnglish} onChange={(event) => onUpdate?.({ titleEnglish: event.target.value })} /><span aria-hidden="true">)</span></span>
          : <span>({song.titleEnglish})</span>}
      </div>
      {editable
        ? <input aria-label="Song style in print preview" value={song.style} onChange={(event) => onUpdate?.({ style: event.target.value })} />
        : <strong>{song.style}</strong>}
      <strong>{song.key}</strong>
    </header>

    <div className="print-sheet-body">
      {song.sections.map((section, sectionIndex) => <section className={`print-section ${sectionTone(section.name)}`} data-section-type={section.name} key={section.id}>
        <h3>{section.name}</h3>
        {rowsForSection(section).map((row) => <div className="print-row-wrap" key={`${section.id}-print-row-${row.rowIndex}`}>
          {row.rowIndex === 0 && section.preMeasure && <PrintMeasure measure={section.preMeasure} pre />}
          <div className="print-measure-row" style={{ gridTemplateColumns: rowGridTemplate(row.measures, row.cap) }}>
            {row.measures.map((measure, rowOffset) => {
              const measureIndex = row.start + rowOffset;
              return <PrintMeasure
                key={`${section.id}-print-${measureIndex}`}
                measure={measure}
                ending={measureIndex === section.measures.length - 1}
                cueStarts={measure.beats.map((_beat, beatIndex) => (song.instrumentCueRanges ?? [])
                  .filter((range) => range.start.section === sectionIndex && range.start.measure === measureIndex && range.start.beat === beatIndex)
                  .map((range) => range.abbr))}
                cueEnds={measure.beats.map((_beat, beatIndex) => (song.instrumentCueRanges ?? [])
                  .filter((range) => range.end.section === sectionIndex && range.end.measure === measureIndex && range.end.beat === beatIndex)
                  .map((range) => range.abbr))}
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

function PrintMeasure({
  measure,
  pre = false,
  ending = false,
  cueStarts = [],
  cueEnds = [],
}: {
  measure: Measure;
  pre?: boolean;
  ending?: boolean;
  cueStarts?: string[][];
  cueEnds?: string[][];
}) {
  return <div className={`print-measure ${pre ? "is-pre-measure" : ""} ${ending ? "ending-bar" : ""}`}>
    {measure.leadEnabled && <div className="print-lead-row" style={{ gridTemplateColumns: `repeat(${measure.rowLeadView?.length || 1}, minmax(0, 1fr))` }}>
      {(measure.rowLeadView || []).map((note, index) => <span key={index}>{note}</span>)}
    </div>}
    <div className="print-beat-row" style={{ gridTemplateColumns: `repeat(${measure.beats.length}, minmax(0, 1fr))` }}>
      {measure.beats.map((beat, index) => <span
        key={index}
        className={`${cueStarts[index]?.length ? "lead-range-start" : ""} ${cueEnds[index]?.length ? "lead-range-end" : ""}`}
        data-cue-start={cueStarts[index]?.join(",") || undefined}
        data-cue-end={cueEnds[index]?.join(",") || undefined}
      >
        <strong className={beat.circle ? "circled" : ""}><ChordNotation chord={beat.chord} /></strong>
        {(beat.dot || beat.xMarks || beat.manualUnderline || beat.bass) && <small>{beat.dot ? "•" : ""}{"x".repeat(beat.xMarks || 0)}</small>}
        {beat.bass && <em>{beat.bass}</em>}
      </span>)}
    </div>
    {measure.roll && <span className="print-roll-label">Roll</span>}
  </div>;
}
