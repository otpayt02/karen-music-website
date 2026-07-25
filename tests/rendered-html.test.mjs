import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the Karen Music Director application shell without starter artifacts", async () => {
  const [page, layout, editor, styles, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/music-director.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<MusicDirector \/>/);
  assert.match(layout, /title:\s*"Karen Music Director"/);
  assert.match(editor, /New song/);
  assert.match(editor, /Song details/);
  assert.match(editor, /\["chart", "lyrics", "database"\]/);
  assert.match(editor, /Ctrl\+1–6 inserts a measure/);
  assert.match(styles, /\.mobile-toolbar/);
  assert.match(styles, /@media print/);
  assert.match(hosting, /"d1": "DB"/);

  const combined = `${page}\n${layout}\n${editor}\n${styles}`;
  assert.doesNotMatch(combined, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});
