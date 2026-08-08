#!/usr/bin/env node
// Pre-deploy sanity check for the union card site.
//
// Run before every deploy:  node scripts/check-deploy.js
//
// This exists because of the Aug 7, 2026 incident: index.html and support.js
// got merged into a single file, which broke the dc-runtime structure and
// produced a blank "This page requires JavaScript to display" screen on the
// live site. These checks catch that exact failure class (and a few
// adjacent ones) before anything ships. See README.md for the full story.
//
// Exit code 0 = safe to deploy. Exit code 1 = do not deploy, fix first.

const fs = require('fs');
const path = require('path');

const SITE = path.join(__dirname, '..', 'site');
const failures = [];
const warnings = [];

function fail(msg) { failures.push(msg); }
function warn(msg) { warnings.push(msg); }

function readIfExists(relPath) {
  const p = path.join(SITE, relPath);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

// --- 1. Required files exist ---------------------------------------------

const REQUIRED_FILES = [
  'index.html',
  'support.js',
  'netlify.toml',
  'forms.html',
  'admin.html',
  'netlify/functions/send-copy.js',
  'netlify/functions/report.js',
  'netlify/functions/package.json',
];

for (const f of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(SITE, f))) fail(`Missing required file: site/${f}`);
}

const indexHtml = readIfExists('index.html');
const supportJs = readIfExists('support.js');

if (indexHtml == null || supportJs == null) {
  // Can't run the rest of the checks meaningfully without these.
  report();
  process.exit(1);
}

// --- 2. index.html and support.js must stay SEPARATE files ---------------
// This is the direct check for the Aug 7 incident: someone (or some tool)
// merging support.js's content into index.html, or vice versa.

const DC_RUNTIME_MARKER = 'GENERATED from dc-runtime';

if (indexHtml.includes(DC_RUNTIME_MARKER)) {
  fail(
    'index.html contains the support.js runtime header comment ' +
    `("${DC_RUNTIME_MARKER}") — support.js appears to have been merged ` +
    'into index.html. Deploy the two as separate files. See README.md ' +
    '"Do not re-bundle index.html into a single self-contained file."'
  );
}

if (!supportJs.includes(DC_RUNTIME_MARKER)) {
  fail(
    'support.js is missing its generated-file header comment — this is ' +
    'not the untouched dc-runtime bundle. If this is intentional, update ' +
    'this check; if not, restore support.js from backups/ or git history.'
  );
}

// support.js legitimately contains the literal pattern "<x-dc" as part of its
// own parser (it has to detect x-dc tags in raw text) — so we can't just grep
// for that. Instead look for content that only makes sense as this site's
// actual markup (an element ID from index.html), which would only appear in
// support.js if the two files got merged.
if (supportJs.includes('id="wuMain"') || supportJs.includes('cmrjb-seal.png')) {
  fail(
    'support.js contains index.html\'s page markup (e.g. "wuMain") — looks ' +
    'like the two files got merged. They must stay separate files.'
  );
}

// --- 3. index.html has the structure dc-runtime expects -------------------

if (!/<script\s+src=["']support\.js["']/.test(indexHtml)) {
  fail('index.html does not have <script src="support.js">. The runtime will never load.');
}

if (!/<x-dc[\s>]/.test(indexHtml) || !indexHtml.includes('</x-dc>')) {
  fail('index.html is missing a complete <x-dc>...</x-dc> block.');
}

if (!/<script[^>]*data-dc-script/.test(indexHtml)) {
  fail('index.html is missing the <script data-dc-script> logic block.');
}

// --- 4. Every local asset index.html references actually exists -----------

const assetRefRe = /(?:src|href)\s*=\s*"([^"]+)"/g;
let m;
const checked = new Set();
while ((m = assetRefRe.exec(indexHtml))) {
  const ref = m[1];
  if (/^https?:\/\//.test(ref) || ref.startsWith('data:') || ref.startsWith('#')) continue;
  if (checked.has(ref)) continue;
  checked.add(ref);
  const p = path.join(SITE, ref);
  if (!fs.existsSync(p)) fail(`index.html references "${ref}" but site/${ref} does not exist.`);
}

// --- 5. Self-hosted runtime deps present (post Aug-7 CDN fix) --------------

const SELF_HOSTED = [
  'assets/react.production.min.js',
  'assets/react-dom.production.min.js',
  'assets/babel.min.js',
];
for (const f of SELF_HOSTED) {
  if (!fs.existsSync(path.join(SITE, f))) {
    warn(`Expected self-hosted dependency site/${f} not found — check it wasn't accidentally removed.`);
  }
}
if (/unpkg\.com/.test(supportJs.replace(/\/\/.*$/gm, ''))) {
  // Ignore comment lines (we intentionally mention unpkg.com in a comment).
  fail('support.js still references unpkg.com outside a comment — CDN dependency may have crept back in.');
}

// --- 6. Worksite list stays in sync between index.html and send-copy.js ---

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const sendCopy = readIfExists('netlify/functions/send-copy.js');
if (sendCopy) {
  const dropdownSites = new Set(
    [...indexHtml.matchAll(/<option value="([^"]+)">/g)]
      .map((x) => decodeHtmlEntities(x[1]))
      .filter(Boolean)
  );
  const repMapSites = new Set(
    [...sendCopy.matchAll(/^\s*"([^"]+)":\s*"[\w.+-]+@[\w.-]+"/gm)].map((x) => x[1])
  );
  const missingFromRepMap = [...dropdownSites].filter((s) => !repMapSites.has(s));
  if (missingFromRepMap.length) {
    warn(
      `${missingFromRepMap.length} worksite(s) in index.html's dropdown have no entry in ` +
      'send-copy.js\'s WORKSITE_REP_MAP, so a signed card from that worksite won\'t reach a rep: ' +
      missingFromRepMap.slice(0, 5).join(', ') + (missingFromRepMap.length > 5 ? ', ...' : '')
    );
  }

  // Signed PDFs are only durably stored if send-copy.js actually archives them to Blobs —
  // if this require ever gets removed (e.g. during a future edit), submissions silently go
  // back to living only in scattered email inboxes, with nothing catching it.
  if (!sendCopy.includes("require('@netlify/blobs')") && !sendCopy.includes('require("@netlify/blobs")')) {
    fail(
      'send-copy.js no longer archives signed PDFs to Netlify Blobs (no require of ' +
      '"@netlify/blobs" found) — signed cards would only exist in email inboxes again.'
    );
  }
}

// --- 7. Basic size sanity (catches silent truncation) ----------------------

if (indexHtml.length < 20000) warn(`index.html looks small (${indexHtml.length} bytes) — verify it wasn't truncated.`);
if (supportJs.length < 20000) warn(`support.js looks small (${supportJs.length} bytes) — verify it wasn't truncated.`);

// --- Report -----------------------------------------------------------------

function report() {
  if (warnings.length) {
    console.log('WARNINGS:');
    for (const w of warnings) console.log('  - ' + w);
  }
  if (failures.length) {
    console.log('\nFAILURES (do not deploy):');
    for (const f of failures) console.log('  - ' + f);
    console.log(`\n${failures.length} failure(s), ${warnings.length} warning(s).`);
  } else {
    console.log(`\nAll checks passed (${warnings.length} warning(s)). Safe to deploy.`);
  }
}

report();
process.exit(failures.length ? 1 : 0);
