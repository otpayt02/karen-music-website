// Chord spelling, normalization, and transposition helpers.
//
// Normalization rule (from the in-app Guide's "Legacy chord-entry contract"):
// prefer sharp spellings (#) over flat spellings (b) when re-spelling a chord,
// EXCEPT a chord whose name is itself a flat chord in the exception set
// (Gb — e.g. Gbm keeps its flat name instead of becoming F#m).

export const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Flat roots that keep their flat spelling during normalization.
export const FLAT_KEEP_ROOTS = new Set(["Gb"]);

const PITCH_CLASS: Record<string, number> = {
  C: 0, "B#": 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, Fb: 4, "E#": 5, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11,
};

export function pitchClassOf(note: string): number | null {
  if (!note) return null;
  const cleaned = note.replace("♭", "b").replace("♯", "#").trim();
  return cleaned in PITCH_CLASS ? PITCH_CLASS[cleaned] : null;
}

/** Re-spell one root/bass note per the normalize rule. */
export function normalizeNoteName(note: string): string {
  if (!note) return note;
  const cleaned = note.replace("♭", "b").replace("♯", "#").trim();
  const pc = pitchClassOf(cleaned);
  if (pc === null) return note;
  if (FLAT_KEEP_ROOTS.has(cleaned)) return cleaned;
  return SHARP_NAMES[pc];
}

/** Re-spell a note for a target key: flat spellings for flat keys, sharps otherwise. */
export function spellNoteForKey(pc: number, preferFlats: boolean): string {
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[((pc % 12) + 12) % 12];
}

export const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]);

export const MAJOR_KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const MINOR_KEYS = ["Am", "Bbm", "Bm", "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m"];
export const ALL_KEYS = [...MAJOR_KEYS, ...MINOR_KEYS];

/** Root pitch class of a key name, ignoring a trailing minor marker. */
export function keyPitchClass(key: string): number | null {
  if (!key) return null;
  const trimmed = key.trim();
  const withoutSuffix = trimmed.replace(/(maj|min|m)$/i, "");
  if (withoutSuffix !== trimmed && pitchClassOf(withoutSuffix) !== null) return pitchClassOf(withoutSuffix);
  return pitchClassOf(trimmed);
}

export function isMinorKey(key: string): boolean {
  return /[^a-z]m$/i.test(key || "") || /min$/i.test(key || "");
}

type ChordState = {
  root?: string;
  flat?: boolean;
  sharp?: boolean;
  minor?: boolean;
  quality?: string;
  seven?: boolean;
  triangle?: boolean;
  [key: string]: any;
};

/** Display name for a structured chordState beat, e.g. {root:"E",flat:true,minor:true} -> "Ebm". */
export function chordStateName(cs: ChordState | null | undefined): string {
  if (!cs || !cs.root) return "";
  const accidental = cs.flat ? "b" : cs.sharp ? "#" : "";
  return `${cs.root}${accidental}${cs.minor ? "m" : ""}${cs.quality || ""}${cs.seven ? "7" : ""}`;
}

function normalizeChordState(cs: ChordState): { cs: ChordState; changed: boolean } {
  if (!cs || typeof cs !== "object" || !cs.root) return { cs, changed: false };
  const spelled = `${cs.root}${cs.flat ? "b" : cs.sharp ? "#" : ""}`;
  const normalized = normalizeNoteName(spelled);
  if (normalized === spelled) return { cs, changed: false };
  const root = normalized.replace(/[#b]$/, "");
  const accidental = normalized.endsWith("#") ? "#" : normalized.endsWith("b") ? "b" : "";
  return {
    cs: { ...cs, root, flat: accidental === "b", sharp: accidental === "#" },
    changed: true,
  };
}

const CHORD_TOKEN = /^([A-G])([#b♭♯])?((?:m(?!aj)|maj|min|dim|aug|sus|add)?\d{0,2}(?:[#b]\d{1,2})?)?(?:\/([A-G])([#b♭♯])?)?$/;

function normalizeChordToken(token: string): string {
  const match = CHORD_TOKEN.exec(token);
  if (!match) return token;
  const [, root, acc, suffix, bassRoot, bassAcc] = match;
  const spelled = normalizeNoteName(`${root}${acc || ""}`);
  const bass = bassRoot ? `/${normalizeNoteName(`${bassRoot}${bassAcc || ""}`)}` : "";
  return `${spelled}${suffix || ""}${bass}`;
}

/** Normalize every chord-like token in a raw text chart. Non-chord words are untouched. */
export function normalizeRawChart(raw: string): string {
  if (!raw) return raw;
  return raw.replace(/[^\s|]+/g, (token) => normalizeChordToken(token));
}

function transposeChordState(cs: ChordState, semitones: number, preferFlats: boolean): ChordState {
  if (!cs || typeof cs !== "object" || !cs.root) return cs;
  const spelled = `${cs.root}${cs.flat ? "b" : cs.sharp ? "#" : ""}`;
  const pc = pitchClassOf(spelled);
  if (pc === null) return cs;
  const next = spellNoteForKey(pc + semitones, preferFlats);
  const root = next.replace(/[#b]$/, "");
  const accidental = next.endsWith("#") ? "#" : next.endsWith("b") ? "b" : "";
  return { ...cs, root, flat: accidental === "b", sharp: accidental === "#" };
}

function transposeRawChart(raw: string, semitones: number, preferFlats: boolean): string {
  if (!raw || !semitones) return raw;
  return raw.replace(/[^\s|]+/g, (token) => {
    const match = CHORD_TOKEN.exec(token);
    if (!match) return token;
    const [, root, acc, suffix, bassRoot, bassAcc] = match;
    const pc = pitchClassOf(`${root}${acc || ""}`);
    if (pc === null) return token;
    let bass = "";
    if (bassRoot) {
      const bassPc = pitchClassOf(`${bassRoot}${bassAcc || ""}`);
      if (bassPc !== null) bass = `/${spellNoteForKey(bassPc + semitones, preferFlats)}`;
    }
    return `${spellNoteForKey(pc + semitones, preferFlats)}${suffix || ""}${bass}`;
  });
}

function mapChart(
  chart: any,
  fn: (cs: ChordState) => ChordState,
  bassFn: (bass: string) => string,
  chordStringFn: (chord: string) => string,
): { chart: any; changed: boolean } {
  if (!chart || typeof chart !== "object") return { chart, changed: false };
  let changed = false;
  const next = { ...chart };
  if (Array.isArray(chart.sections)) {
    next.sections = chart.sections.map((section: any) => {
      if (!section || typeof section !== "object" || !Array.isArray(section.measures)) return section;
      return {
        ...section,
        measures: section.measures.map((measure: any) => {
          if (!measure || typeof measure !== "object" || !Array.isArray(measure.beats)) return measure;
          return {
            ...measure,
            beats: measure.beats.map((beat: any) => {
              if (!beat || typeof beat !== "object") return beat;
              const out = { ...beat };
              if (beat.chordState && typeof beat.chordState === "object") {
                const updated = fn(beat.chordState);
                if (updated !== beat.chordState) { out.chordState = updated; changed = true; }
              }
              if (typeof beat.chord === "string" && beat.chord) {
                const updated = chordStringFn(beat.chord);
                if (updated !== beat.chord) { out.chord = updated; changed = true; }
              }
              if (typeof beat.bass === "string" && beat.bass) {
                const updated = bassFn(beat.bass);
                if (updated !== beat.bass) { out.bass = updated; changed = true; }
              }
              return out;
            }),
          };
        }),
      };
    });
  }
  return { chart: next, changed };
}

/**
 * Normalize all chords in a chart_json (structured chordState beats, beat.chord
 * strings, bass notes, and the raw text form) per the Guide rule.
 * Returns the new chart and whether anything changed.
 */
export function normalizeChart(chart: any): { chart: any; changed: boolean } {
  let changed = false;
  const result = mapChart(
    chart,
    (cs) => {
      const r = normalizeChordState(cs);
      if (r.changed) changed = true;
      return r.cs;
    },
    (bass) => normalizeNoteName(bass),
    (chord) => normalizeChordToken(chord),
  );
  const next = result.chart;
  if (next && typeof next.raw === "string" && next.raw) {
    const raw = normalizeRawChart(next.raw);
    if (raw !== next.raw) { next.raw = raw; changed = true; }
  }
  return { chart: next, changed: changed || result.changed };
}

/** Transpose all chords in a chart_json by semitones, spelled for the target key. */
export function transposeChart(chart: any, semitones: number, targetKey: string): { chart: any; changed: boolean } {
  if (!semitones) return { chart, changed: false };
  const preferFlats = FLAT_KEYS.has(targetKey);
  let changed = false;
  const result = mapChart(
    chart,
    (cs) => { changed = true; return transposeChordState(cs, semitones, preferFlats); },
    (bass) => {
      const pc = pitchClassOf(bass);
      return pc === null ? bass : spellNoteForKey(pc + semitones, preferFlats);
    },
    (chord) => {
      const match = CHORD_TOKEN.exec(chord);
      if (!match) return chord;
      const [, root, acc, suffix, bassRoot, bassAcc] = match;
      const pc = pitchClassOf(`${root}${acc || ""}`);
      if (pc === null) return chord;
      let bass = "";
      if (bassRoot) {
        const bassPc = pitchClassOf(`${bassRoot}${bassAcc || ""}`);
        if (bassPc !== null) bass = `/${spellNoteForKey(bassPc + semitones, preferFlats)}`;
      }
      return `${spellNoteForKey(pc + semitones, preferFlats)}${suffix || ""}${bass}`;
    },
  );
  const next = result.chart;
  if (next && typeof next.raw === "string" && next.raw) {
    next.raw = transposeRawChart(next.raw, semitones, preferFlats);
  }
  return { chart: next, changed: true };
}

/** Semitone distance from one key to another (root pitch classes, minor ignored). */
export function semitonesBetween(fromKey: string, toKey: string): number | null {
  const from = keyPitchClass(fromKey);
  const to = keyPitchClass(toKey);
  if (from === null || to === null) return null;
  return ((to - from) % 12 + 12) % 12;
}
