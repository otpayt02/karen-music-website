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
  assert.match(editor, /const blankSong = \(\): Song =>/);
  assert.match(editor, /sections:\s*\[\]/);
  assert.match(editor, /<button onClick=\{startNewSong\}>New song<\/button>/);
  assert.match(editor, /Blank 4\/4 song ready/);
  assert.match(editor, /aria-label="Song library"/);
  assert.match(editor, />Song Library</);
  assert.match(editor, /\["chart", "lyrics"\]/);
  assert.doesNotMatch(editor, /tab === "database"/);
  assert.doesNotMatch(editor, /sidebarView/);
  assert.match(editor, /className="settings-menu"/);
  assert.match(editor, /defaultCategoryOptions = \["Praise \/ Worship", "Choir", "Youth", "Solo", "Kids"\]/);
  assert.match(editor, /Current song category/);
  assert.match(editor, /timeSignatureOptions = \["2\/4", "3\/4", "4\/4", "6\/8"\]/);
  assert.match(editor, /aria-label="Time signature on paper"/);
  assert.match(editor, /<dt>Ctrl\+1-6<\/dt>/);
  assert.match(editor, /One physical page per copy/);
  assert.match(editor, /paginationItems/);
  assert.match(editor, /DEFAULT_MEASURES_PER_ROW = 8/);
  assert.match(editor, /songGroupOptions = \["Praise & Worship", "Kids", "Youth", "Choir", "Solo"\]/);
  assert.match(editor, /MIN_BPM = 55/);
  assert.match(editor, /MAX_BPM = 155/);
  assert.match(editor, /type="range"/);
  assert.match(editor, /rowsForSection/);
  assert.match(editor, /editorRowsForSection/);
  assert.match(editor, /materializeMeasuresThrough/);
  assert.match(editor, /Create measures through measure/);
  assert.match(editor, /rowGridTemplate/);
  assert.match(editor, /ChordNotation/);
  assert.match(editor, /Karen title keyboard/);
  assert.match(editor, /target\.dataset\.karenField !== "titleKaren"/);
  assert.match(editor, /Choose centered footer instruments/);
  assert.match(editor, /className="paper-english-title"/);
  assert.match(editor, /list="paper-style-options"/);
  assert.match(editor, /<option value="">Key<\/option>/);
  assert.match(editor, /routeWheelToHoveredRegion/);
  assert.match(editor, /focus\(\{ preventScroll: true \}\)/);
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
  assert.match(styles, /\.ghost-measure/);
  assert.match(styles, /overscroll-behavior:\s*contain/);
  assert.match(styles, /\.paper-header \.paper-english-title/);
  assert.match(styles, /--font-mono:\s*"IBM Plex Mono"/);
  assert.match(styles, /\.section-tone-chorus/);
  assert.match(styles, /\.karen-keyboard-overlay/);
  assert.match(styles, /@keyframes karenKeyDrift/);
  assert.match(styles, /@media print/);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(songsRoute, /SONG_GROUPS = \["Praise & Worship", "Kids", "Youth", "Choir", "Solo"\]/);
  assert.match(songsRoute, /INSTRUMENTS = \["Piano 1", "Piano 2", "Acoustic Guitar", "Electric Guitar", "Drums", "Electric Bass", "Keytar"\]/);
  assert.match(songsRoute, /TIME_SIGNATURES = \["2\/4", "3\/4", "4\/4", "6\/8"\]/);
  assert.match(songsRoute, /MIN_BPM = 55/);
  assert.match(songsRoute, /MAX_BPM = 155/);
  assert.match(songsRoute, /bpm: safePayload\.bpm/);

  const combined = `${page}\n${layout}\n${editor}\n${styles}`;
  assert.doesNotMatch(combined, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});
