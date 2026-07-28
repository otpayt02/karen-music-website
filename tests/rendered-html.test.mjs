import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the Karen Music Director application shell without starter artifacts", async () => {
  const [page, layout, editor, styles, hosting, songsRoute] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/music-director.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readFile(new URL("../app/api/songs/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<MusicDirector viewer=/);
  assert.match(layout, /title:\s*"Karen Music Director"/);
  assert.match(editor, /New song/);
  assert.match(editor, /Song details/);
  assert.match(editor, /\["chart", "lyrics", "database"\]/);
  assert.match(editor, /Ctrl\+1-6 inserts a measure/);
  assert.match(editor, /One physical page per copy/);
  assert.match(editor, /paginationItems/);
  assert.match(editor, /DEFAULT_MEASURES_PER_ROW = 8/);
  assert.match(editor, /songGroupOptions = \["Praise & Worship", "Kids", "Youth", "Choir", "Solo"\]/);
  assert.match(editor, /MIN_BPM = 55/);
  assert.match(editor, /MAX_BPM = 155/);
  assert.match(editor, /type="range"/);
  assert.match(editor, /rowsForSection/);
  assert.match(editor, /rowGridTemplate/);
  assert.match(editor, /ChordNotation/);
  assert.match(editor, /Karen title keyboard/);
  assert.match(editor, /target\.dataset\.karenField !== "titleKaren"/);
  assert.match(editor, /Choose centered footer instruments/);
  assert.match(editor, /instrumentOptions = \["Piano 1", "Piano 2", "Acoustic Guitar", "Electric Guitar", "Drums", "Electric Bass", "Keytar"\]/);
  assert.match(editor, /ending=\{measureIndex === section\.measures\.length - 1\}/);
  assert.match(editor, /Lead melody/);
  assert.match(editor, /Keyboard shortcuts/);
  assert.match(styles, /\.mobile-toolbar/);
  assert.match(styles, /karen-village-aerial\.png/);
  assert.match(styles, /--letter-width:\s*8\.5in/);
  assert.match(styles, /\.print-sheet/);
  assert.match(styles, /repeat\(var\(--measure-columns, 8\)/);
  assert.match(styles, /\.measure\.ending-bar/);
  assert.match(styles, /\.measure:hover/);
  assert.match(styles, /--font-mono:\s*"IBM Plex Mono"/);
  assert.match(styles, /\.section-tone-chorus/);
  assert.match(styles, /\.karen-keyboard-overlay/);
  assert.match(styles, /@keyframes karenKeyDrift/);
  assert.match(styles, /@media print/);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(songsRoute, /SONG_GROUPS = \["Praise & Worship", "Kids", "Youth", "Choir", "Solo"\]/);
  assert.match(songsRoute, /INSTRUMENTS = \["Piano 1", "Piano 2", "Acoustic Guitar", "Electric Guitar", "Drums", "Electric Bass", "Keytar"\]/);
  assert.match(songsRoute, /MIN_BPM = 55/);
  assert.match(songsRoute, /MAX_BPM = 155/);
  assert.match(songsRoute, /bpm: safePayload\.bpm/);

  const combined = `${page}\n${layout}\n${editor}\n${styles}`;
  assert.doesNotMatch(combined, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});
