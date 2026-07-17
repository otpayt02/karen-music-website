import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const sourcePath = resolve(projectRoot, "index.html");
const outputPath = resolve(projectRoot, "docs", "index-html-line-by-line-purpose.html");
const source = await readFile(sourcePath, "utf8");

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function describe(line) {
  const text = line.trim();
  if (!text) return "Blank line used to separate ideas and make the surrounding code easier to read.";
  if (text.startsWith("<!--") || text.startsWith("/*") || text.startsWith("//")) return "Comment that records context or intent for the code beside it.";
  if (/^<\/?[a-z!/]/i.test(text)) return "HTML markup that creates, configures, or closes part of the page structure.";
  if (text.startsWith("--")) return "CSS custom property that stores a reusable design value for later rules.";
  if (/^[\w-]+\s*:/.test(text)) return "CSS declaration that controls one visual or layout property of the selected element.";
  if (/^(function|async function)\s+/.test(text)) return "Function declaration that defines reusable behavior for the editor.";
  if (/^(const|let|var)\s+/.test(text)) return "JavaScript declaration that stores a value, configuration, or current interface state.";
  if (/^(if|else|for|while|switch|case|try|catch|return|throw)\b/.test(text)) return "JavaScript control-flow statement that decides, repeats, handles failure, or returns from behavior.";
  if (/=>/.test(text)) return "Arrow function used as a callback or compact unit of page behavior.";
  if (/addEventListener\(/.test(text)) return "Event hookup that makes the interface respond to a user or browser action.";
  if (/^[.#@][\w-]+/.test(text) || text.endsWith("{")) return "CSS selector or rule boundary that identifies the elements receiving the following styles.";
  if (text === "}" || text === ");" || text === "];" || text === "};") return "Closing punctuation that completes the surrounding CSS rule, object, array, call, or block.";
  return "Supporting JavaScript or CSS expression used to complete the surrounding page behavior or styling.";
}

const rows = source.split(/\r?\n/).map((line, index) => `
  <tr data-search="${escapeHtml(`${index + 1} ${line} ${describe(line)}`.toLowerCase())}">
    <td>${index + 1}</td><td><code>${escapeHtml(line) || "&nbsp;"}</code></td><td>${escapeHtml(describe(line))}</td>
  </tr>`).join("");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>index.html line-by-line purpose guide</title>
<style>body{font:15px/1.45 system-ui,sans-serif;margin:2rem;color:#172033;background:#f7f8fb}main{max-width:1600px;margin:auto}input{width:min(720px,100%);padding:.7rem;font:inherit}table{width:100%;border-collapse:collapse;background:#fff;margin-top:1rem}th,td{padding:.6rem;vertical-align:top;border-bottom:1px solid #dce1eb;text-align:left}th{position:sticky;top:0;background:#18233b;color:#fff}td:first-child{width:5rem;color:#52617b}td:nth-child(2){width:44%}code{white-space:pre-wrap;word-break:break-word;font:12px/1.4 ui-monospace,Consolas,monospace}.hidden{display:none}</style>
</head><body><main><h1>index.html: line-by-line purpose guide</h1><p>This document is generated from the current <code>index.html</code>. Every physical line appears below with its purpose statement. Use the filter to jump to a selector, function, ID, or line number.</p><input id="filter" type="search" placeholder="Filter lines and explanations" aria-label="Filter lines"><table><thead><tr><th>Line</th><th>Source</th><th>Purpose</th></tr></thead><tbody>${rows}</tbody></table></main><script>const f=document.querySelector('#filter');f.addEventListener('input',()=>document.querySelectorAll('tbody tr').forEach(r=>r.classList.toggle('hidden',!r.dataset.search.includes(f.value.toLowerCase()))));</script></body></html>`;

await writeFile(outputPath, html, "utf8");
console.log(`Wrote ${outputPath}`);
