import type { ImportReview, Song } from "./types";

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
  // entries tagged by kind/host.
  const referenceMedia =
    (source.reference_media && typeof source.reference_media === "object" ? source.reference_media : null) ||
    (safeMetadata.reference_media && typeof safeMetadata.reference_media === "object" ? safeMetadata.reference_media : {}) ||
    {};
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
    metadata_json: safeMetadata,
    tags_json: Array.isArray(tags) ? tags.filter((t: any) => typeof t === "string") : [],
    youtubeUrl: str(source.youtubeUrl || safeMetadata.youtubeUrl) || pick("youtube"),
    facebookUrl: str(source.facebookUrl || safeMetadata.facebookUrl) || pick("facebook"),
    performanceUrl: str(source.performanceUrl || safeMetadata.performanceUrl) || pick("performance"),
    updated_at: source.updated_at,
    version: source.version,
  };
}

/** Build the API payload for a save, folding reference URLs into reference_media. */
function songToPayload(song: Song): Record<string, any> {
  const videos = [
    song.youtubeUrl ? { url: song.youtubeUrl, kind: "youtube" } : null,
    song.facebookUrl ? { url: song.facebookUrl, kind: "facebook" } : null,
    song.performanceUrl ? { url: song.performanceUrl, kind: "performance" } : null,
  ].filter(Boolean);
  return {
    ...song,
    reference_media: { videos, images: [], info: "" },
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
