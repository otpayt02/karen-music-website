import type { ImportReview, ReferenceMedia, SetlistItem, Song } from "./types";

async function json<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function parseMaybeJson(value: any, fallback: any): any {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function isRecord(value: any): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function firstText(...values: any[]): string {
  for (const value of values) {
    if (value != null && String(value).trim()) return String(value);
  }
  return "";
}

function firstRecordWithData(...values: any[]): Record<string, any> {
  for (const value of values) {
    if (isRecord(value) && Object.keys(value).length) return value;
  }
  for (const value of values) {
    if (isRecord(value)) return value;
  }
  return {};
}

function firstArrayWithData(...values: any[]): any[] {
  for (const value of values) {
    if (Array.isArray(value) && value.length) return [...value];
  }
  for (const value of values) {
    if (Array.isArray(value)) return [...value];
  }
  return [];
}

function mergeReferenceMedia(primary: any, fallback: any): ReferenceMedia {
  const primaryMedia = isRecord(primary) ? primary : {};
  const fallbackMedia = isRecord(fallback) ? fallback : {};
  const videos = firstArrayWithData(primaryMedia.videos, fallbackMedia.videos);
  const images = firstArrayWithData(primaryMedia.images, fallbackMedia.images);
  return {
    ...fallbackMedia,
    ...primaryMedia,
    videos,
    images,
    info: firstText(primaryMedia.info, fallbackMedia.info),
  };
}

/** Index a song list by numeric id; later entries win, matching Map.set. */
export function buildSongById(songs: readonly Song[]): Map<number, Song> {
  const byId = new Map<number, Song>();
  for (const song of songs) {
    if (typeof song?.id === "number") byId.set(song.id, song);
  }
  return byId;
}

/** Merge updates into a complete song list without dropping cached songs. */
export function mergeSongsById(base: readonly Song[], updates: readonly Song[]): Song[] {
  const merged = [...base];
  const positionById = new Map<number, number>();
  merged.forEach((song, index) => {
    if (typeof song?.id === "number" && !positionById.has(song.id)) positionById.set(song.id, index);
  });
  for (const update of updates) {
    if (typeof update?.id !== "number") continue;
    const position = positionById.get(update.id);
    if (position == null) {
      positionById.set(update.id, merged.length);
      merged.push(update);
    } else {
      merged[position] = update;
    }
  }
  return merged;
}

/** Resolve every setlist item that exists in the supplied complete list. */
export function resolveSetlistSongs(items: readonly SetlistItem[], songs: readonly Song[]): Song[] {
  const byId = buildSongById(songs);
  return items.flatMap((item) => {
    const song = typeof item?.songId === "number" ? byId.get(item.songId) : undefined;
    return song ? [song] : [];
  });
}

function totalBeatsInSections(sections: any[]): number {
  return sections.reduce((sum, section) => {
    const measures = Array.isArray(section?.measures) ? section.measures : [];
    return sum + measures.reduce((inner: number, measure: any) => inner + (Array.isArray(measure?.beats) ? measure.beats.length : 0), 0);
  }, 0);
}

/**
 * Defensive normalization for any song record arriving from the API.
 *
 * The live-site crash this guards against: opening certain songs blanked the
 * whole app. Records in the wild can carry chart_json as a JSON string, an
 * array of sections, a nested chart_bundle, missing/renamed fields, or
 * beat-indexed spans (slurs / onlySpans) pointing past the end of the chart.
 * This function never throws: it coerces what it can, drops out-of-range
 * spans, and returns a record the UI can always render (possibly as an
 * error/empty card) so one bad song can never take the library down.
 */
export function normalizeSong(raw: any): Song {
  const source = raw && typeof raw === "object" ? raw : {};
  const str = (v: any) => (v == null ? "" : typeof v === "string" ? v : String(v));

  // chart_json may be a string, an array of sections, the chart object, or
  // nested under chart_bundle (the API's legacy shape).
  let chart = parseMaybeJson(source.chart_json ?? source.chartjson, null);
  if (Array.isArray(chart)) chart = { sections: chart };
  if (!chart || typeof chart !== "object") {
    const bundle = parseMaybeJson(source.chart_bundle, null);
    chart = bundle && typeof bundle === "object" ? bundle : {};
  }
  if (Array.isArray(chart.sections)) {
    chart = {
      ...chart,
      sections: chart.sections
        .filter((section: any) => section && typeof section === "object")
        .map((section: any) => ({
          ...section,
          type: str(section.type || section.title || "Section"),
          measures: (Array.isArray(section.measures) ? section.measures : [])
            .filter((measure: any) => measure && typeof measure === "object")
            .map((measure: any) => ({
              ...measure,
              beats: (Array.isArray(measure.beats) ? measure.beats : []).filter(
                (beat: any) => beat && typeof beat === "object",
              ),
            })),
        })),
    };
    // Drop beat-indexed spans that point outside the chart; a stale slur or
    // only-span index must never be trusted by a renderer.
    const total = totalBeatsInSections(chart.sections);
    for (const key of ["slurs", "onlySpans"] as const) {
      if (Array.isArray(chart[key])) {
        chart[key] = chart[key].filter((span: any) => {
          const start = Number(span?.startBeatIndex);
          const end = Number(span?.endBeatIndex);
          return Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end >= 0 && start < total && end < total;
        });
      }
    }
  } else {
    chart = { ...chart, sections: [] };
  }
  if (typeof chart.raw !== "string") chart.raw = chart.raw == null ? "" : String(chart.raw);

  const metadata = parseMaybeJson(source.metadata_json, {});
  const safeMetadata = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};

  const lyrics = parseMaybeJson(source.lyrics_json, []);
  const tags = parseMaybeJson(source.tags_json, []);

  // Reference media: derive the three URL fields from every shape the API
  // has used — top-level fields, metadata_json, or reference_media.videos
  // entries tagged by kind/host. Preserve the full media object as well:
  // reducing it to the three URLs is what wiped images and notes on save.
  const referenceMedia = mergeReferenceMedia(source.reference_media, safeMetadata.reference_media);
  const videos: any[] = Array.isArray(referenceMedia.videos) ? referenceMedia.videos : [];
  const urlOf = (entry: any) => (typeof entry === "string" ? entry : str(entry?.url || entry?.href || ""));
  const kindOf = (entry: any, url: string) => {
    const kind = str(entry?.kind || entry?.type || entry?.source || "").toLowerCase();
    if (kind) return kind;
    if (/youtu\.?be/.test(url)) return "youtube";
    if (/facebook\.com|fb\.watch/.test(url)) return "facebook";
    return "performance";
  };
  const pick = (kind: string) => {
    const hit = videos.map((v) => ({ url: urlOf(v), kind: kindOf(v, urlOf(v)) })).find((v) => v.kind === kind && v.url);
    return hit?.url || "";
  };

  // Legacy fields live at the top level in API rows and are consumed from
  // the top level by app.py::normalize_legacy_payload. They also appear
  // under canonical names inside metadata_json, so check both places and
  // prefer a populated value over an empty placeholder.
  const rowleadjson = firstRecordWithData(
    source.rowleadjson,
    source.row_lead_json,
    source.rowLead,
    safeMetadata.rowLead,
    safeMetadata.rowleadjson,
    safeMetadata.row_lead_json,
  );
  const file_metadata = firstArrayWithData(
    source.file_metadata,
    source.fileMetadata,
    safeMetadata.fileMetadata,
    safeMetadata.file_metadata,
  );
  const instruments = firstText(source.instruments, safeMetadata.instruments);
  const performed_dates = firstArrayWithData(source.performed_dates, safeMetadata.performed_dates)
    .map((date: any) => str(date))
    .filter(Boolean);
  const created_date = firstText(
    source.created_date,
    safeMetadata.created_date,
    source.created_at ? String(source.created_at).slice(0, 10) : "",
  );
  const next_performance_date = firstText(source.next_performance_date, safeMetadata.next_performance_date);
  const date_performed = firstText(
    source.date_performed,
    safeMetadata.date_performed,
    performed_dates[performed_dates.length - 1],
  );
  const preservedMetadata = {
    ...safeMetadata,
    created_date,
    next_performance_date,
    performed_dates,
    reference_media: referenceMedia,
    fileMetadata: file_metadata,
    instruments,
    rowLead: rowleadjson,
  };

  return {
    id: typeof source.id === "number" ? source.id : undefined,
    title: str(source.title),
    title_karen: str(source.title_karen),
    category: str(source.category),
    key: str(source.key),
    current_key: str(source.current_key || source.key),
    original_key: str(source.original_key || source.key),
    style: str(source.style),
    tempo: source.tempo == null ? "" : String(source.tempo),
    notes: str(source.notes),
    chart_json: chart,
    lyrics_json: Array.isArray(lyrics) ? lyrics : [],
    metadata_json: preservedMetadata,
    tags_json: Array.isArray(tags) ? tags.filter((t: any) => typeof t === "string") : [],
    reference_media: referenceMedia,
    youtubeUrl: str(source.youtubeUrl || safeMetadata.youtubeUrl) || pick("youtube"),
    facebookUrl: str(source.facebookUrl || safeMetadata.facebookUrl) || pick("facebook"),
    performanceUrl: str(source.performanceUrl || safeMetadata.performanceUrl) || pick("performance"),
    rowleadjson,
    file_metadata,
    instruments,
    created_date,
    performed_dates,
    next_performance_date,
    date_performed,
    created_at: source.created_at,
    updated_at: source.updated_at,
    version: source.version,
  };
}

const REFERENCE_FIELDS = [
  ["youtubeUrl", "youtube"],
  ["facebookUrl", "facebook"],
  ["performanceUrl", "performance"],
] as const;

type ReferenceKind = (typeof REFERENCE_FIELDS)[number][1];

function referenceVideoUrl(entry: any): string {
  return typeof entry === "string" ? entry : entry?.url || entry?.href || "";
}

function referenceVideoKind(entry: any, url: string): string {
  const kind = String(entry?.kind || entry?.type || entry?.source || "").trim().toLowerCase();
  if (kind) return kind;
  if (/youtu\.?be/.test(url)) return "youtube";
  if (/facebook\.com|fb\.watch/.test(url)) return "facebook";
  return "performance";
}

function toReferenceVideo(entry: any): Record<string, any> | null {
  const url = String(referenceVideoUrl(entry) || "").trim();
  if (!url) return null;
  const kind = referenceVideoKind(entry, url);
  return typeof entry === "string" ? { url, kind } : { ...entry, url, kind };
}

/**
 * Build the API payload for a save.
 *
 * Reference media is merged, never rebuilt from scratch: start with the
 * song's existing reference_media (images, info/notes, extra videos, and
 * any other keys included) and update only the first video entry for each
 * kind represented by the three editable URL fields. Legacy fields are
 * likewise sent at the top level, where the backend consumes them, instead
 * of being left to disappear when metadata_json is rebuilt.
 */
export function songToPayload(song: Song): Record<string, any> {
  const metadata = isRecord(song.metadata_json) ? song.metadata_json : {};
  const existingMedia = mergeReferenceMedia(song.reference_media, metadata.reference_media);
  const fieldUrls: Record<ReferenceKind, string> = {
    youtube: String(song.youtubeUrl || "").trim(),
    facebook: String(song.facebookUrl || "").trim(),
    performance: String(song.performanceUrl || "").trim(),
  };
  const fieldNames: Record<ReferenceKind, (typeof REFERENCE_FIELDS)[number][0]> = {
    youtube: "youtubeUrl",
    facebook: "facebookUrl",
    performance: "performanceUrl",
  };
  const represented = new Set<ReferenceKind>();
  const videos: Record<string, any>[] = [];

  for (const rawEntry of Array.isArray(existingMedia.videos) ? existingMedia.videos : []) {
    const entry = toReferenceVideo(rawEntry);
    if (!entry) continue;
    const kind = entry.kind as ReferenceKind;
    if (!REFERENCE_FIELDS.some(([, fieldKind]) => fieldKind === kind)) {
      videos.push(entry);
      continue;
    }
    if (represented.has(kind)) {
      // Only the first entry for a kind is represented by the singular
      // editor field; preserve any additional entries untouched.
      videos.push(entry);
      continue;
    }
    represented.add(kind);
    const url = fieldUrls[kind];
    if (url) {
      videos.push({ ...entry, url, kind });
    } else if (!Object.prototype.hasOwnProperty.call(song, fieldNames[kind])) {
      // A record that never carried the editable field has not asked us to
      // clear its stored video. Normalized/editor records always carry the
      // field, so an explicit empty value above still clears the entry.
      videos.push(entry);
    }
  }
  for (const [, kind] of REFERENCE_FIELDS) {
    if (fieldUrls[kind] && !represented.has(kind)) videos.push({ url: fieldUrls[kind], kind });
  }

  const reference_media: ReferenceMedia = {
    ...existingMedia,
    videos,
    images: Array.isArray(existingMedia.images) ? [...existingMedia.images] : [],
    info: typeof existingMedia.info === "string" ? existingMedia.info : "",
  };
  const rowleadjson = firstRecordWithData(song.rowleadjson, metadata.rowLead, metadata.rowleadjson);
  const file_metadata = firstArrayWithData(song.file_metadata, metadata.fileMetadata, metadata.file_metadata);
  const instruments = firstText(song.instruments, metadata.instruments);
  const performed_dates = firstArrayWithData(song.performed_dates, metadata.performed_dates)
    .map((date: any) => String(date))
    .filter(Boolean);
  const created_date = firstText(song.created_date, metadata.created_date, song.created_at ? String(song.created_at).slice(0, 10) : "");
  const next_performance_date = firstText(song.next_performance_date, metadata.next_performance_date);
  const date_performed = firstText(song.date_performed, metadata.date_performed, performed_dates[performed_dates.length - 1]);
  const metadata_json = {
    ...metadata,
    created_date,
    next_performance_date,
    performed_dates,
    reference_media,
    fileMetadata: file_metadata,
    instruments,
    rowLead: rowleadjson,
  };

  return {
    ...song,
    metadata_json,
    reference_media,
    rowleadjson,
    file_metadata,
    instruments,
    created_date,
    performed_dates,
    next_performance_date,
    date_performed,
  };
}

export const api = {
  listSongs: async (q = "") => {
    const rows = await json<any[]>(`/api/songs${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    return (Array.isArray(rows) ? rows : []).map(normalizeSong);
  },
  saveSong: async (song: Song) => {
    const saved = await json<any>(song.id ? `/api/songs/${song.id}` : "/api/songs", {
      method: song.id ? "PUT" : "POST",
      body: JSON.stringify(songToPayload(song)),
    });
    // The save endpoint returns the legacy shape; keep the editor's own
    // reference fields if the round-trip shape lost them.
    return { ...normalizeSong(saved), youtubeUrl: saved?.youtubeUrl || song.youtubeUrl || "", facebookUrl: saved?.facebookUrl || song.facebookUrl || "", performanceUrl: saved?.performanceUrl || song.performanceUrl || "" };
  },
  deleteSong: (id: number) => json(`/api/songs/${id}`, { method: "DELETE" }),
  importPng: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/import/png", { method: "POST", body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<ImportReview>;
  },
  exportJson: async () => {
    const rows = await json<any[]>("/api/export/json");
    return (Array.isArray(rows) ? rows : []).map(normalizeSong);
  },
  getSettings: () => json<Record<string, string>>("/api/settings"),
  saveSettings: (payload: Record<string, string>) => json("/api/settings", { method: "PUT", body: JSON.stringify(payload) }),
};
