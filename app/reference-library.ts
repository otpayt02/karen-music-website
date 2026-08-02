import type { Song } from "./music-director";
import song1 from "./reference-songs/song_1.json";
import song2 from "./reference-songs/song_2.json";
import song5 from "./reference-songs/song_5.json";
import song6 from "./reference-songs/song_6.json";
import song7 from "./reference-songs/song_7.json";
import song8 from "./reference-songs/song_8.json";
import song9 from "./reference-songs/song_9.json";
import song10 from "./reference-songs/song_10.json";
import song11 from "./reference-songs/song_11.json";
import song12 from "./reference-songs/song_12.json";
import song13 from "./reference-songs/song_13.json";
import song14 from "./reference-songs/song_14.json";
import song15 from "./reference-songs/song_15.json";
import song16 from "./reference-songs/song_16.json";
import song17 from "./reference-songs/song_17.json";
import song18 from "./reference-songs/song_18.json";
import song19 from "./reference-songs/song_19.json";
import song20 from "./reference-songs/song_20.json";
import song21 from "./reference-songs/song_21.json";

type LegacyBeat = {
  chordState?: {
    root?: string;
    flat?: boolean;
    minor?: boolean;
    triangle?: boolean;
    seven?: boolean;
    quality?: "sus" | "aug" | "triangle7" | "";
  };
  bass?: string;
  circle?: boolean;
  dot?: boolean;
  xMarks?: number;
  manualUnderline?: boolean;
  lead?: string[];
};

type LegacyMeasure = {
  beats?: LegacyBeat[];
  roll?: boolean;
  isPreMeasure?: boolean;
  leadEnabled?: boolean;
  leadBaseOctave?: number;
  leadSlotsByBeat?: number[];
  rowLeadView?: string[];
};

type LegacySection = {
  type?: string;
  measures?: LegacyMeasure[];
  preMeasure?: LegacyMeasure | null;
  measuresPerRow?: number | null;
  rowMeasureCounts?: number[];
};

type LegacyExport = {
  id?: number;
  title?: string;
  title_karen?: string;
  category?: string;
  key?: string;
  current_key?: string;
  original_key?: string;
  style?: string;
  tempo?: number;
  instruments?: string;
  chart_json?: {
    sections?: LegacySection[];
    onlySpans?: Array<{ start: string; end: string }>;
    slurs?: Array<{ start: string; end: string }>;
    beatsPerMeasure?: number;
    defaultMeasuresPerRow?: number;
  };
};

const referenceExports = [
  song1, song2, song5, song6, song7, song8, song9, song10, song11, song12,
  song13, song14, song15, song16, song17, song18, song19, song20, song21,
] as LegacyExport[];

export const referencePdfNames = [
  "1_gig_3_taylor.pdf",
  "1_saw_moo_gay.pdf",
  "127.0.0.1.pdf",
  "127.0.0.2.pdf",
  "alex_sucks_print.pdf",
  "bad.pdf",
  "bless_you_fathers.pdf",
  "count_your_blessings_print.pdf",
  "creator_of_light.pdf",
  "firist_official_file_rough_draft.pdf",
  "first_flawless_printout.pdf",
  "good_song.pdf",
  "hallelujah_p_w.pdf",
  "karen_childrens_father_song.pdf",
  "love_story_bridal.pdf",
  "may_god_bless_you.pdf",
  "may_god_bless_you_all.pdf",
  "may_god_bless_you_dad.pdf",
  "Poe_Tha_Country.pdf",
  "pu_ko_tha_byu_print.pdf",
  "thanksgiving.pdf",
  "thanksgiving_print.pdf",
  "tomorrow_is_definite_print.pdf",
  "tomorrow_is_not_for_sure_print.pdf",
  "tomorrow_not_for_sure_print.pdf",
  "we_look_upon_thee_for_victory_print.pdf",
  "We_Praise_God_Always_clean_print.pdf",
  "we_praise_you_print.pdf",
  "who_will_preach.pdf",
  "who_will_speak_out.pdf",
  "youth_7_25.pdf",
  "youth_Move_Your_Boat_print.pdf",
] as const;

function normalizeInstrumentList(value: string | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase() === "bass" ? "Electric Bass" : item);
}

function meterFor(source: LegacyExport) {
  const style = source.style?.trim();
  if (style === "2/4" || style === "3/4" || style === "4/4" || style === "6/8") return style;
  const beatsPerMeasure = Number(source.chart_json?.beatsPerMeasure || 4);
  return beatsPerMeasure === 2 || beatsPerMeasure === 3 ? `${beatsPerMeasure}/4` : "4/4";
}

function sectionName(value: string | undefined) {
  const name = value?.trim() || "Section";
  return name.toUpperCase().replace("PRECHORUS", "PRE-CHORUS");
}

function convertBeat(beat: LegacyBeat = {}) {
  const state = beat.chordState ?? {};
  const root = state.root?.trim() || "";
  return {
    chord: root ? {
      root,
      flat: Boolean(state.flat),
      minor: Boolean(state.minor),
      seven: Boolean(state.seven),
      quality: state.triangle ? "triangle7" : state.quality || "",
    } : null,
    bass: beat.bass || "",
    circle: Boolean(beat.circle),
    dot: Boolean(beat.dot),
    xMarks: Number(beat.xMarks || 0),
    manualUnderline: Boolean(beat.manualUnderline),
  };
}

function convertMeasure(measure: LegacyMeasure = {}) {
  const beats = Array.isArray(measure.beats) && measure.beats.length
    ? measure.beats.map(convertBeat)
    : Array.from({ length: 4 }, () => convertBeat());
  const rowLeadView = Array.isArray(measure.rowLeadView) && measure.rowLeadView.length
    ? measure.rowLeadView
    : measure.beats?.flatMap((beat) => Array.isArray(beat.lead) ? beat.lead : []) ?? [];
  return {
    beats,
    roll: Boolean(measure.roll),
    leadEnabled: Boolean(measure.leadEnabled || rowLeadView.length),
    leadBaseOctave: Number(measure.leadBaseOctave || 0),
    leadSlotsByBeat: Array.isArray(measure.leadSlotsByBeat) ? measure.leadSlotsByBeat : beats.map(() => 4),
    rowLeadView,
  };
}

function convertSection(section: LegacySection, sourceId: number, index: number) {
  return {
    id: `approved-${sourceId}-${index}`,
    name: sectionName(section.type),
    preMeasure: section.preMeasure ? convertMeasure(section.preMeasure) : null,
    measures: (section.measures ?? []).map(convertMeasure),
    measuresPerRow: section.measuresPerRow ?? null,
    rowMeasureCounts: section.rowMeasureCounts ?? [],
  };
}

function convertLegacyExport(source: LegacyExport): Song {
  const sourceId = Number(source.id || 0);
  return {
    id: sourceId ? -sourceId : undefined,
    titleKaren: source.title_karen?.trim() || source.title?.trim() || "Untitled",
    titleEnglish: source.title?.trim() || source.title_karen?.trim() || "Untitled",
    style: source.style?.trim() || "Worship",
    category: source.category?.trim() || "Praise / Worship",
    key: source.current_key?.trim() || source.key?.trim() || "",
    originalKey: source.original_key?.trim() || source.current_key?.trim() || source.key?.trim() || "",
    bpm: Number(source.tempo || 76),
    meter: meterFor(source),
    group: source.category?.trim() || "Praise & Worship",
    instruments: normalizeInstrumentList(source.instruments),
    lyrics: "",
    sections: (source.chart_json?.sections ?? []).map((section, index) => convertSection(section, sourceId, index)),
    onlySpans: source.chart_json?.onlySpans ?? [],
    slurs: source.chart_json?.slurs ?? [],
    sourceKind: "approved-sanitized",
    reviewState: "reviewed",
  };
}

export const approvedReferenceSongs = referenceExports.map(convertLegacyExport);
