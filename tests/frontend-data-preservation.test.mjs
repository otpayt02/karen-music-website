import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadServicesModule() {
  const sourcePath = path.join(repoRoot, "src", "services.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  });
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "karen-music-services-"));
  const modulePath = path.join(tempDir, "services.mjs");
  fs.writeFileSync(modulePath, outputText, "utf8");
  return import(pathToFileURL(modulePath).href);
}

const { normalizeSong, songToPayload, mergeSongsById, resolveSetlistSongs } = await loadServicesModule();

test("normalizeSong + songToPayload preserve reference media and legacy fields", () => {
  const rowLead = {
    "0:0": {
      baseOctave: 5,
      cells: { "base:0": "3", "base:4": "5" },
      enabled: true,
      instrumentAbbr: "P1",
    },
  };
  const fileMetadata = [
    { id: "file-1", name: "song_42.json", kind: "Editor JSON", notes: "Keep file metadata" },
    { id: "file-2", name: "song_42.png", kind: "Chart Image", size: 12345 },
  ];
  const referenceImages = [
    { id: "image-1", url: "https://example.org/reference.jpg", label: "Reference image" },
  ];

  const rawSong = {
    id: 42,
    title: "Fully Populated",
    title_karen: "Karen Title",
    category: "Choir",
    key: "G",
    current_key: "G",
    original_key: "G",
    style: "Praise",
    tempo: "96",
    notes: "Director notes",
    chart_json: { sections: [], raw: "G | C | D" },
    lyrics_json: [{ title: "Verse", karenText: "Lyrics survive separately" }],
    tags_json: ["legacy", "choir"],
    metadata_json: {
      created_date: "2024-01-02",
      next_performance_date: "2026-11-08",
      performed_dates: ["2026-10-04", "2026-10-11"],
      fileMetadata,
      instruments: "Piano, Guitar",
      rowLead,
      reference_media: {
        videos: [],
        images: referenceImages,
        info: "Metadata reference note",
      },
    },
    reference_media: {
      videos: [
        "https://www.youtube.com/watch?v=old-video",
        {
          url: "https://www.facebook.com/watch/?v=old-facebook",
          kind: "facebook",
          label: "Original Facebook reference",
        },
        {
          url: "https://example.org/rehearsal.mp4",
          kind: "rehearsal",
          label: "Keep this extra video",
        },
      ],
      images: referenceImages,
      info: "Reference notes survive",
      customMediaNote: "Keep arbitrary reference_media keys",
    },
    rowleadjson: rowLead,
    file_metadata: fileMetadata,
    instruments: "Piano, Guitar",
    created_date: "2024-01-02",
    next_performance_date: "2026-11-08",
    performed_dates: ["2026-10-04", "2026-10-11"],
    date_performed: "2026-10-11",
    youtubeUrl: "https://www.youtube.com/watch?v=new-video",
    performanceUrl: "https://example.org/performances/new-video",
  };

  const normalized = normalizeSong(rawSong);

  assert.deepEqual(normalized.reference_media.images, referenceImages);
  assert.equal(normalized.reference_media.info, "Reference notes survive");
  assert.equal(normalized.reference_media.customMediaNote, "Keep arbitrary reference_media keys");
  assert.deepEqual(normalized.rowleadjson, rowLead);
  assert.deepEqual(normalized.file_metadata, fileMetadata);
  assert.equal(normalized.instruments, "Piano, Guitar");
  assert.equal(normalized.created_date, "2024-01-02");
  assert.deepEqual(normalized.performed_dates, ["2026-10-04", "2026-10-11"]);
  assert.equal(normalized.next_performance_date, "2026-11-08");
  assert.equal(normalized.date_performed, "2026-10-11");
  assert.equal(normalized.facebookUrl, "https://www.facebook.com/watch/?v=old-facebook");

  const payload = songToPayload(normalized);
  const videosByKind = new Map(payload.reference_media.videos.map((video) => [video.kind, video]));

  assert.deepEqual(payload.reference_media.images, referenceImages);
  assert.equal(payload.reference_media.info, "Reference notes survive");
  assert.equal(payload.reference_media.customMediaNote, "Keep arbitrary reference_media keys");
  assert.equal(videosByKind.get("youtube").url, "https://www.youtube.com/watch?v=new-video");
  assert.equal(videosByKind.get("facebook").url, "https://www.facebook.com/watch/?v=old-facebook");
  assert.equal(videosByKind.get("facebook").label, "Original Facebook reference");
  assert.equal(videosByKind.get("performance").url, "https://example.org/performances/new-video");
  assert.equal(videosByKind.get("rehearsal").url, "https://example.org/rehearsal.mp4");
  assert.equal(videosByKind.get("rehearsal").label, "Keep this extra video");

  assert.deepEqual(payload.rowleadjson, rowLead);
  assert.deepEqual(payload.file_metadata, fileMetadata);
  assert.equal(payload.instruments, "Piano, Guitar");
  assert.equal(payload.created_date, "2024-01-02");
  assert.deepEqual(payload.performed_dates, ["2026-10-04", "2026-10-11"]);
  assert.equal(payload.next_performance_date, "2026-11-08");
  assert.equal(payload.date_performed, "2026-10-11");

  assert.deepEqual(payload.metadata_json.rowLead, rowLead);
  assert.deepEqual(payload.metadata_json.fileMetadata, fileMetadata);
  assert.equal(payload.metadata_json.instruments, "Piano, Guitar");
  assert.deepEqual(payload.metadata_json.reference_media.images, referenceImages);
  assert.equal(payload.metadata_json.reference_media.info, "Reference notes survive");
});

test("setlist resolution keeps every song after a filtered search merges into the cache", () => {
  const fullLibrary = [1, 2, 3].map((id) => normalizeSong({ id, title: `Song ${id}` }));
  const filteredSubset = [normalizeSong({ id: 2, title: "Song 2 (fresh copy)" })];

  // This mirrors App.refresh(): a search result updates the complete cache,
  // it does not replace it with the subset.
  const cache = mergeSongsById(fullLibrary, filteredSubset);
  assert.equal(cache.length, 3);
  assert.equal(cache.find((song) => song.id === 2).title, "Song 2 (fresh copy)");

  const setlistItems = [
    { songId: 3, title: "Song 3", group: "Choir" },
    { songId: 1, title: "Song 1", group: "Kids" },
    { songId: 2, title: "Song 2 (fresh copy)", group: "Youth" },
  ];
  const resolved = resolveSetlistSongs(setlistItems, cache);

  assert.deepEqual(resolved.map((song) => song.id), [3, 1, 2]);
  assert.deepEqual(resolved.map((song) => song.title), ["Song 3", "Song 1", "Song 2 (fresh copy)"]);
});
