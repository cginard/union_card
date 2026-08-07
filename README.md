# CMRJB Digital Union Card — migration package

Live site: **unioncardwu.com** (Netlify project `unioncard`)

Everything needed to run, edit, and deploy the card outside the design tool.

---

## What's in here

```
site/            <- deploy this folder to Netlify, as-is
  index.html         the card app (this IS the editable source)
  support.js         runtime the app needs
  assets/            fonts, logos, jsPDF library
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

backups/
  Union Card - Aug5 baseline.dc.html   known-good restore point
  Union Card - current live.dc.html    matches what is live now
```

---

## Deploying

Drag the **`site` folder** onto Netlify Drop, or connect it to a Git repo and
let Netlify build from it. There is no build step — these are plain static files.

Important: deploy the folder's *contents* as the site root. `index.html` must be
at the root, with `support.js` and `assets/` beside it.

Do **not** re-bundle `index.html` into a single self-contained file. That was the
cause of the blank "This page requires JavaScript to display" screens.

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

## Who receives a signed card

`send-copy.js` sends each signed PDF to:

1. `ncampos@cmrjb.org` (Nancy)
2. `members@cmrjb.org` (dues team / `ORGANIZER_EMAIL`)
3. The rep for that worksite, from the map inside `send-copy.js`
4. The member, at the address they entered

Submissions are also recorded in Netlify Forms under the form name **`signers`**,
independently of whether the email step succeeds.

---

## Making changes

Edit `site/index.html` directly. Its structure:

- `<x-dc>` ... `</x-dc>` — the markup
- `<script data-dc-script>` — the logic class, including the `T` object that holds
  all four language translations (`en`, `es`, `ht`, `zh`)
- The PDF layout is built in the same script, in the download/PDF section

The worksite list appears in two places: the dropdown in `index.html`, and the
rep routing map in `netlify/functions/send-copy.js`. Update both when adding a shop.

**Before any edit, copy the file first.** That is what was missing today.
