# CMRJB Digital Union Card — migration package

Live site: **unioncardwu.com** (Netlify project `unioncard`)

Everything needed to run, edit, and deploy the card outside the design tool.

---

## What's in here

```
site/            <- deploy this folder to Netlify, as-is
  index.html         the card app (this IS the editable source)
  support.js         runtime the app needs
  assets/            fonts, logos, jsPDF library, self-hosted React/ReactDOM/Babel
  forms.html         declares the "signers" form to Netlify
  admin.html         password-protected Excel report page
  netlify.toml       Netlify config
  netlify/functions/
    send-copy.js     emails the signed PDF
    report.js        builds Nancy's Excel report
  favicon-*.png, icon-512.png, og-image.png

reference/       <- data, not deployed
  CMRJB_Locals_Reps_June26.csv    worksite -> rep email (222 rows)
  CMRJB_Locals_June26.csv
  worksite-map.json
  worksite-rep-map.js
  Rep Instructions.docx

scripts/
  check-deploy.js  run before every deploy — see "Before you deploy" below

backups/
  Union Card - Aug5 baseline.dc.html   known-good restore point
  Union Card - current live.dc.html    matches what is live now
```

---

## Deploying

This repo (`github.com/cginard/union_card`) is connected to Netlify for continuous
deployment: pushing to `main` triggers a deploy automatically. Netlify's project
config uses **Base directory: `site`** and **Publish directory: `site`** — no
build command, since these are plain static files.

Important: `index.html` must be at the site root, with `support.js` and `assets/`
beside it. Do **not** re-bundle `index.html` into a single self-contained file —
that was the cause of the blank "This page requires JavaScript to display" screens
on Aug 7, 2026.

React, ReactDOM, and Babel Standalone are self-hosted in `site/assets/` (as of
Aug 7, 2026) rather than loaded live from unpkg.com, so the page no longer depends
on a third-party CDN being reachable at load time.

### Before you deploy

Run the sanity checker — it catches the exact "files got merged" failure class
from Aug 7, plus a few related issues, before anything ships:

```
node scripts/check-deploy.js
```

Exit code 0 means safe to deploy. Any failure means stop and fix first.

---

## Environment variables (set in Netlify, never in the repo)

Site configuration -> Environment variables.

| Variable | Used by | Purpose |
|---|---|---|
| `RESEND_API_KEY` | send-copy.js | Resend API key for sending the signed PDF |
| `CARD_FROM_EMAIL` | send-copy.js | From address, e.g. `Workers United <members@cmrjb.org>` |
| `ORGANIZER_EMAIL` | send-copy.js | Compliance backstop, defaults to `members@cmrjb.org` |
| `REPORT_PASSWORD` | report.js | Password for the admin report page |
| `NETLIFY_API_TOKEN` | report.js | Personal access token, reads form submissions |
| `SITE_ID` | report.js | Netlify site ID |

---

## Who receives a signed card, and where the signed PDF lives

`send-copy.js` sends each signed PDF to:

1. `ncampos@cmrjb.org` (Nancy)
2. `members@cmrjb.org` (dues team / `ORGANIZER_EMAIL`)
3. The rep for that worksite, from the map inside `send-copy.js`
4. The member, at the address they entered

Submissions are also recorded in Netlify Forms under the form name **`signers`**,
independently of whether the email step succeeds. **Netlify Forms only stores the
text fields (name, contact info, worksite, etc.) — never the signature image or
the PDF.**

As of Aug 7 2026, every signed PDF is also archived to **Netlify Blobs** (store
name `signed-cards`), independent of whether any of the above emails succeed.
This is the one durable, backed-up copy of the actual signature — needed for
retention purposes (e.g. NLRB), since email inboxes alone aren't a reliable
long-term record. Browse and download archived PDFs from the Netlify dashboard:
**Project configuration → Blobs → `signed-cards`**. Each entry's key is a
timestamp + member name; metadata on each entry includes name, email, worksite,
and submission time.

To confirm the archiving is working without submitting a real card, open
`https://unioncardwu.com/.netlify/functions/send-copy` in a browser (a plain GET
request) — the JSON response includes a `blobsStatus` field that should say
`"working"`.

---

## Making changes

Edit `site/index.html` directly. Its structure:

- `<x-dc>` ... `</x-dc>` — the markup
- `<script data-dc-script>` — the logic class, including the `T` object that holds
  all four language translations (`en`, `es`, `ht`, `zh`)
- The PDF layout is built in the same script, in the download/PDF section

### Updating the worksite list

**As of Aug 7 2026, the card is intentionally pilot-launched at only 8
worksites**, with a full expansion to the ~223 real CMRJB worksites planned
after about a month of testing. Don't add the rest of the list to the live
dropdown until that expansion is actually approved.

The dropdown in `index.html` and the rep routing map in
`netlify/functions/send-copy.js` are both meant to be **generated** from
`reference/worksite-map.json` (already the full, correct list) rather than
hand-edited separately — that's what caused `index.html`'s dropdown and
`send-copy.js`'s rep map to drift out of sync in the first place. When the
real expansion is approved, update `reference/worksite-map.json` if needed
(or regenerate it from the CSV) and run:

```
node scripts/generate-worksites.js
node scripts/check-deploy.js
```

This replaces the *entire* dropdown, so only run it once the pilot period is
over and the full list is meant to go live. Until then, if a pilot-site rep
email needs fixing, edit `reference/worksite-map.json` for the record, and
hand-edit the same entry in both `index.html`'s 8 `<option>` tags and
`send-copy.js`'s map to match — `scripts/check-deploy.js` will warn you if
they drift apart.

**Before any edit, copy the file first.** That is what was missing today.
