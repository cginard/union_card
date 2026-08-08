#!/usr/bin/env node
// Regenerates the worksite dropdown in site/index.html and the rep-routing
// map in site/netlify/functions/send-copy.js from a single source of truth:
// reference/worksite-map.json.
//
// IMPORTANT: as of Aug 7 2026, the card is intentionally pilot-launched at
// only 8 worksites (see the 8 <option> entries in site/index.html). The
// other ~215 worksites in reference/worksite-map.json are real and correctly
// routed in send-copy.js already, but are NOT meant to appear in the live
// dropdown yet — the plan is to expand after ~1 month of testing at the
// pilot sites. DO NOT run this script to add the full list until that
// expansion is actually approved — it will replace the entire dropdown.
//
// Until then, this script's job is just to keep the tooling ready: if you
// need to fix a rep email or add a worksite to the *pilot* set, edit
// reference/worksite-map.json and manually update the matching 8-ish
// dropdown entries — do not run this script against the full list.
//
// When the real expansion happens: edit reference/worksite-map.json (or
// regenerate it from the CSV) to reflect the full current worksite list,
// then run this script to update both index.html and send-copy.js together,
// instead of hand-editing them separately (which is what caused the Aug 7
// drift between the two files in the first place).
//
// Usage: node scripts/generate-worksites.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAP_PATH = path.join(ROOT, 'reference', 'worksite-map.json');
const INDEX_PATH = path.join(ROOT, 'site', 'index.html');
const SEND_COPY_PATH = path.join(ROOT, 'site', 'netlify', 'functions', 'send-copy.js');

const worksites = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
if (!Array.isArray(worksites) || !worksites.length) {
  console.error('reference/worksite-map.json is empty or malformed — aborting, no files changed.');
  process.exit(1);
}
for (const w of worksites) {
  if (!w.label || !w.email) {
    console.error('Entry missing label or email:', JSON.stringify(w), '— aborting, no files changed.');
    process.exit(1);
  }
}

function escapeHtmlAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- 1. Rebuild the <option> list in site/index.html -----------------------

let indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
const lines = indexHtml.split('\n');

const selectLineIdx = lines.findIndex((l) => l.includes('onChange="{{ on.worksite }}"'));
if (selectLineIdx === -1) {
  console.error('Could not find the worksite <select> in index.html — aborting, no files changed.');
  process.exit(1);
}
const placeholderLineIdx = selectLineIdx + 1;
if (!lines[placeholderLineIdx].includes('<option value="">')) {
  console.error('Expected the placeholder <option> right after <select> but did not find it — aborting.');
  process.exit(1);
}
const closeSelectLineIdx = lines.findIndex((l, i) => i > placeholderLineIdx && l.includes('</select>'));
if (closeSelectLineIdx === -1) {
  console.error('Could not find matching </select> in index.html — aborting, no files changed.');
  process.exit(1);
}

const indent = lines[placeholderLineIdx].match(/^\s*/)[0];
const optionLines = worksites.map((w) => {
  const label = escapeHtmlAttr(w.label);
  return `${indent}<option value="${label}">${label}</option>`;
});

const newLines = [
  ...lines.slice(0, placeholderLineIdx + 1), // up to and including the placeholder option
  ...optionLines,
  ...lines.slice(closeSelectLineIdx), // </select> onward
];
const newIndexHtml = newLines.join('\n');

// --- 2. Rebuild WORKSITE_REP_MAP in send-copy.js ---------------------------

let sendCopy = fs.readFileSync(SEND_COPY_PATH, 'utf8');
const startMarker = 'const WORKSITE_REP_MAP = {';
const startIdx = sendCopy.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find "const WORKSITE_REP_MAP = {" in send-copy.js — aborting, no files changed.');
  process.exit(1);
}
const endIdx = sendCopy.indexOf('\n};', startIdx);
if (endIdx === -1) {
  console.error('Could not find the closing "};" for WORKSITE_REP_MAP — aborting, no files changed.');
  process.exit(1);
}

const mapEntries = worksites
  .map((w) => `  "${w.label.replace(/"/g, '\\"')}": "${w.email}"`)
  .join(',\n');
const newBlock = `${startMarker}\n${mapEntries}\n}`;
const newSendCopy = sendCopy.slice(0, startIdx) + newBlock + sendCopy.slice(endIdx + 3 /* "\n};" minus the leading \n we kept via slice */);

// --- 3. Write both files together (all-or-nothing) --------------------------

fs.writeFileSync(INDEX_PATH, newIndexHtml);
fs.writeFileSync(SEND_COPY_PATH, newSendCopy);

console.log(`Wrote ${worksites.length} worksites into:`);
console.log(`  site/index.html (dropdown)`);
console.log(`  site/netlify/functions/send-copy.js (WORKSITE_REP_MAP)`);
