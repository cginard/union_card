// Netlify Function: returns an .xlsx report of signed union cards in a date range.
// Reads submissions from a Netlify Form named "signers" via the Netlify API (no npm
// dependencies — Netlify Drop deploys don't run `npm install`, so third-party packages
// can't be required unless their node_modules are physically included in the deploy).
//
// Required env vars (set in Netlify site settings > Environment variables):
//   REPORT_PASSWORD   - password Nancy enters on /admin.html
//   NETLIFY_API_TOKEN - a Netlify Personal Access Token (User settings > Applications >
//                        New access token). Needed to read form submissions via the API.
// SITE_ID is provided automatically by Netlify at runtime.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, body: 'Bad JSON' }; }

  const pass = (process.env.REPORT_PASSWORD || '').trim();
  if (!pass || (body.password || '').trim() !== pass) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Incorrect password' }) };
  }

  const apiToken = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  if (!apiToken || !siteId) {
    return { statusCode: 500, body: JSON.stringify({ error: 'NETLIFY_API_TOKEN (and/or SITE_ID) not configured' }) };
  }
  const authHeaders = { Authorization: 'Bearer ' + apiToken };

  let submissions;
  try {
    const formsRes = await fetch('https://api.netlify.com/api/v1/sites/' + siteId + '/forms', { headers: authHeaders });
    if (!formsRes.ok) throw new Error('forms list ' + formsRes.status);
    const forms = await formsRes.json();
    const form = forms.find((f) => f.name === 'signers');
    if (!form) {
      return { statusCode: 200, headers: cors(), body: JSON.stringify({ error: 'No "signers" form found yet — submit one card first, then it will appear.' }) };
    }
    submissions = [];
    let page = 1;
    while (page < 30) {
      const res = await fetch('https://api.netlify.com/api/v1/forms/' + form.id + '/submissions?per_page=100&page=' + page, { headers: authHeaders });
      if (!res.ok) throw new Error('submissions ' + res.status);
      const batch = await res.json();
      submissions = submissions.concat(batch);
      if (batch.length < 100) break;
      page += 1;
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not read submissions: ' + e.message }) };
  }

  const from = body.from ? new Date(body.from + 'T00:00:00') : null;
  const to = body.to ? new Date(body.to + 'T23:59:59') : null;
  const rows = submissions.filter((s) => {
    const d = new Date(s.created_at);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const data = rows.map((s) => {
    const d = s.data || {};
    return [
      new Date(s.created_at).toLocaleString('en-US'),
      d.name || '', d.email || '', d.cell_phone || '', d.address || '',
      d.worksite || '', d.job_title || '', d.pref_language || '',
      d.card_type === 'wupp_only' ? 'WUPP only' : 'Membership',
      d.wupp_optin || '', d.wupp_amount || '',
    ];
  });

  const headerRow = ['Date signed', 'Name', 'Email', 'Cell phone', 'Address', 'Worksite', 'Job title', 'Preferred language', 'Card type', 'WUPP opt-in', 'WUPP amount'];
  const xlsxBuf = buildXlsx(headerRow, data);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="union-card-signers.xlsx"',
    },
    body: xlsxBuf.toString('base64'),
    isBase64Encoded: true,
  };
};

function cors() { return { 'content-type': 'application/json' }; }

// ---- Minimal, dependency-free .xlsx writer (single sheet, inline strings, stored/uncompressed zip) ----

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function colLetter(n) {
  let s = '';
  n += 1;
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function sheetXml(header, rows) {
  const all = [header].concat(rows);
  let out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
  all.forEach((row, rIdx) => {
    out += '<row r="' + (rIdx + 1) + '">';
    row.forEach((cell, cIdx) => {
      const ref = colLetter(cIdx) + (rIdx + 1);
      out += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEscape(cell == null ? '' : cell) + '</t></is></c>';
    });
    out += '</row>';
  });
  out += '</sheetData></worksheet>';
  return out;
}

const CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
const ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
const WORKBOOK_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Signers" sheetId="1" r:id="rId1"/></sheets></workbook>';
const WORKBOOK_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';

function buildXlsx(header, rows) {
  const files = [
    { name: '[Content_Types].xml', data: Buffer.from(CONTENT_TYPES, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(ROOT_RELS, 'utf8') },
    { name: 'xl/workbook.xml', data: Buffer.from(WORKBOOK_XML, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(WORKBOOK_RELS, 'utf8') },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(sheetXml(header, rows), 'utf8') },
  ];
  return zipStore(files);
}

// CRC32 (table-based)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// Minimal ZIP writer, method 0 (stored, no compression) — valid & universally readable.
function zipStore(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const dosTime = 0, dosDate = 0x21; // arbitrary fixed timestamp

  files.forEach((f) => {
    const nameBuf = Buffer.from(f.name, 'utf8');
    const crc = crc32(f.data);
    const size = f.data.length;
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    chunks.push(localHeader, nameBuf, f.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    central.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + f.data.length;
  });

  const centralStart = offset;
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat(chunks.concat([centralBuf, end]));
}
