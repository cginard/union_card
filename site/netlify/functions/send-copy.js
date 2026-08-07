// Netlify Function: emails the SIGNED union card PDF to the organizer (official record)
// and, when provided, to the member as their own copy.
//
// Required environment variable:
//   RESEND_API_KEY     - from https://resend.com
// Optional environment variables:
//   CARD_FROM_EMAIL    - e.g. "Workers United <cards@cmrjb.org>" (must be on a domain you verified in Resend)
//   ORGANIZER_EMAIL    - overrides the organizer recipient (default: members@cmrjb.org)

const MEMBER_COPY = {
  en: {
    subject: 'Your signed Workers United membership card',
    html: (n) =>
      `<p>Hi ${n},</p>
       <p>Thank you for signing your Workers United membership card. A copy of your signed card is attached as a PDF for your records.</p>
       <p>A union representative or a shop steward will be in touch soon.</p>
       <p>In solidarity,<br>Workers United &mdash; Chicago &amp; Midwest Regional Joint Board</p>`,
  },
  es: {
    subject: 'Tu tarjeta sindical firmada de Workers United',
    html: (n) =>
      `<p>Hola ${n}:</p>
       <p>Gracias por firmar tu tarjeta sindical de Workers United. Adjuntamos una copia de tu tarjeta firmada en PDF para tus registros.</p>
       <p>Un representante sindical o delegado de taller se comunicar&aacute; contigo pronto.</p>
       <p>En solidaridad,<br>Workers United &mdash; Chicago &amp; Midwest Regional Joint Board</p>`,
  },
  ht: {
    subject: 'Kat manm Workers United ou siyen an',
    html: (n) =>
      `<p>Bonjou ${n},</p>
       <p>M&egrave;si paske ou siyen kat manm Workers United ou. Nou tache yon kopi kat ou siyen an k&ograve;m yon PDF pou dosye ou.</p>
       <p>Yon reprezantan sendika oswa delege atelye ap kontakte ou byento.</p>
       <p>Nan solidarite,<br>Workers United &mdash; Chicago &amp; Midwest Regional Joint Board</p>`,
  },
  zh: {
    subject: '您已签署的 Workers United 会员卡',
    html: (n) =>
      `<p>${n} 您好：</p>
       <p>感谢您签署 Workers United 会员卡。随附您已签署会员卡的 PDF 副本，供您留存。</p>
       <p>工会代表或车间代表会尽快与您联系。</p>
       <p>团结一致，<br>Workers United &mdash; Chicago &amp; Midwest Regional Joint Board</p>`,
  },
};

const WORKSITE_REP_MAP = {
  "37th Street Bakery formerly GOLD STANDARD — Chicago, IL": "msalgado@cmrjb.org",
  "5 Star Hotel Laundry - PureStar Group - Loews Hotel — Rosemont, IL": "dnava@cmrjb.org",
  "5 Star Hotel Laundry - PureStar Group — Chicago, IL": "dnava@cmrjb.org",
  "A. G. Simpson (USA), Inc. — Sterling Heights, MI": "cmartin@cmrjb.org",
  "Accurate Felt & Gasket — Cicero, IL": "msalgado@cmrjb.org",
  "Aladdin @ Purdue Northwest University — Hammond, IN": "jortiz@cmrjb.org",
  "Aladdin Food Services @ Shawnee State University — Portsmouth, OH": "jtyler@cmrjb.org",
  "Alpha & Omega Building Serv. (U. Dayton) — Dayton, OH": "jtyler@cmrjb.org",
  "ALSCO  Inc. — Wauwatosa, WI": "jolson@cmrjb.org",
  "ALSCO - Denver Linen — Denver, CO": "msalgado@cmrjb.org",
  "Alsco American Linen — Salt Lake City, UT": "msalgado@cmrjb.org",
  "ALSCO Inc. — Grand Junction, CO": "msalgado@cmrjb.org",
  "ALSCO Linen — Chicago, IL": "dnava@cmrjb.org",
  "Alsco Uniforms — St. Louis, MO": "emoore@cmrjb.org",
  "Amalgamated Bank of Chicago — Chicago, IL": "adiaz@cmrjb.org",
  "AMCOR — Terre Haute, IN": "cmartin@cmrjb.org",
  "American Family Field dba Miller Park (1) Concessions — Milwaukee, WI": "ptorres@cmrjb.org",
  "American Water Co. (Illinois) Peoria Dist. — Peoria, IL": "mbaeza@cmrjb.org",
  "Aramark @ Bradley University — Peoria, IL": "mbaeza@cmrjb.org",
  "Aramark @ Capian — Caspian, MI": "echavez@cmrjb.org",
  "Aramark @ Cleveland State — Cleveland, OH": "kgillis@cmrjb.org",
  "Aramark @ Ford Ohio Truck Plant Avon — Avon Lake, OH": "rwilson@cmrjb.org",
  "Aramark @ Ford Sharonville Cafeteria, Unit # 0419 — Sharonsville, OH": "jtyler@cmrjb.org",
  "Aramark @ Heritage Bank Center — Cincinnati, OH": "jtyler@cmrjb.org",
  "Aramark @ Huntington Fields (Non-Premium) — Cleveland, OH": "rwilson@cmrjb.org",
  "Aramark @ Huntington Fields (Premium) — Cleveland, OH": "rwilson@cmrjb.org",
  "Aramark @ Lucas County Jail — Toledo, OH": "doug.warren@cmrjb.org",
  "Aramark @ Rocket Mortgage Field House — Cleveland, OH": "rwilson@cmrjb.org",
  "Aramark @ Rockwell Collins Manufacturing — Cedar Rapids, IA": "aszoke@cmrjb.org",
  "Aramark @ University of  Cincinnati (CenterCourt) — Cincinnati, OH": "jtyler@cmrjb.org",
  "Aramark @ University of  Cincinnati (Retail Operations) — Cincinnati, OH": "jtyler@cmrjb.org",
  "Aramark Tri-C — Cleveland, OH": "rwilson@cmrjb.org",
  "Aramark Uniform, Wixom Plant - MC 574 — Wixom, MI": "rburks@cmrjb.org",
  "ASM  - Global (SeaGate Convention Centre) — Toledo, OH": "cmartin@cmrjb.org",
  "Auria — Fremont, OH": "cmartin@cmrjb.org",
  "Aurora Textile Finishing Co. — Yorkville, IL": "mbaeza@cmrjb.org",
  "AVI @ BP Husky Refining — Oregon, OH": "doug.warren@cmrjb.org",
  "AVI @ Huntington Center — Toledo, OH": "cmartin@cmrjb.org",
  "AVI @ Kenyon College — Warren, OH": "kgillis@cmrjb.org",
  "AVI Foodsystems Inc. dba Huntington and Glass City Center — Toledo, OH": "cmartin@cmrjb.org",
  "AVI Foodsystems Inc., Toledo Branch [Warehouse] — Maumee, OH": "doug.warren@cmrjb.org",
  "Avia of Kenosha — Kenosha, WI": "jolson@cmrjb.org",
  "Biofit Engineered Products — Bowling Green, OH": "doug.warren@cmrjb.org",
  "Brooks Brothers — Chicago, IL": "mbaeza@cmrjb.org",
  "BYP100 Education Fund — Springfield, IL": "mfrost@cmrjb.org",
  "C-Line Products, Inc. — Mt. Prospect, IL": "msalgado@cmrjb.org",
  "Cards Against Humanity — Chicago, IL": "mfrost@cmrjb.org",
  "Cedar Rapids School District — Cedar Rapids, IA": "aszoke@cmrjb.org",
  "Chartwell @ UW Superior — Superior, WI": "echavez@cmrjb.org",
  "Chartwell @ Xavier University — Cincinnati, OH": "jtyler@cmrjb.org",
  "Chartwells @ Cudahy School District — Cudahy, WI": "jolson@cmrjb.org",
  "Chartwells @ UW La Crosse, WI — La Crosse, WI": "cbiami@cmrjb.org",
  "Chartwells @ UW River Falls — River Falls, WI": "cbiami@cmrjb.org",
  "Chartwells @ Whitewater, WI — Whitewater, WI": "jolson@cmrjb.org",
  "Chicago Family Medical Center — Chicago, IL": "adiaz@cmrjb.org",
  "Cincinnati Sportservice Inc. d/b/a GABP (Vendors) — Cincinnati, OH": "jtyler@cmrjb.org",
  "Cincinnati Sportservice, Inc d/b/a GABP (Concesions) — Cincinnati, OH": "jtyler@cmrjb.org",
  "Cindus Corp. — Cincinnati, OH": "jtyler@cmrjb.org",
  "City of Duluth — Duluth, MN": "echavez@cmrjb.org",
  "Cleveland Sportservice, Inc. (Delaware North at Progressive Fields) — Cleveland, OH": "rwilson@cmrjb.org",
  "Compass @ Detroit Edison Nuclear (Newport + Monroe, M I) — Monroe, MI": "rburks@cmrjb.org",
  "Compass @ Trine University - Bon Appetit — Angola, IN": "dclark@cmrjb.org",
  "Coplas Inc. — Sterling Heights, MI": "cmartin@cmrjb.org",
  "Creative Foam Corporation — Fenton, MI": "rburks@cmrjb.org",
  "Creative Foam Corporation/Composite Systems and Automotive — Fenton, MI": "rburks@cmrjb.org",
  "Curto Ligonier Foundries Company — Melrose Park, IL": "msalgado@cmrjb.org",
  "Custom Plastics — Elk Grove Village, IL": "adiaz@cmrjb.org",
  "DB Rediheat, Inc. dba National Bias Fabric Co. — Cleveland, OH": "rwilson@cmrjb.org",
  "DELAWARE  SPORTS  - MILLER PARK - Vendors — Milwaukee, WI": "ptorres@cmrjb.org",
  "DeMoulin Bros. — Greenville, IL": "emoore@cmrjb.org",
  "Detroit Medical Group - VHS of Michigan — Detroit, MI": "rburks@cmrjb.org",
  "Domestic Linen — Youngstown, OH": "kgillis@cmrjb.org",
  "Domestic Linen Supply & Laundry Co. [Detroit] — Detroit, MI": "dnava@cmrjb.org",
  "Domestic Linen Supply Co. — Chicago, IL": "msalgado@cmrjb.org",
  "Domestic Uniform Rental — Kalamazoo, MI": "dnava@cmrjb.org",
  "Drake Hotel — Chicago, IL": "dnava@cmrjb.org",
  "Economy Linen and Towel Service, Inc. — Dayton, OH": "jtyler@cmrjb.org",
  "ELDorado Cap Company c/o American Needle — Eldorado, IL": "aszoke@cmrjb.org",
  "Elior Collegiate Dining @ UW Oshkosh — Oshkosh, WI": "jolson@cmrjb.org",
  "Elite Airline Linen of Chicago — Franklin Park, IL": "dnava@cmrjb.org",
  "Equality Ohio Education — Columbus, OH": "mfrost@cmrjb.org",
  "Estee Bedding Company — Chicago, IL": "jortiz@cmrjb.org",
  "Eurest @ GE Appliance Park, Unit # 6798 — Louisville, KY": "kleblanc@cmrjb.org",
  "Eurest @ John Deere Engineering — Waterloo, IA": "emoore@cmrjb.org",
  "Eurest @ John Deere Engineering (Waterloo) — Waterloo, IA": "emoore@cmrjb.org",
  "Eurest @ Molson Coors — Milwaukee, WI": "cbiami@cmrjb.org",
  "Eurest @ Thrivent Financial Services — Minneapolis, MN": "echavez@cmrjb.org",
  "Eurest Dining @ British Petroleum - Braidwood — Normal, IL": "msalgado@cmrjb.org",
  "Eurest Dining @ Caterpillar Decatur — Decatur, IL": "emoore@cmrjb.org",
  "Eurest Dining @ Caterpillar General Admin Bldg. — Peoria, IL": "mbaeza@cmrjb.org",
  "Eurest Dining @ Caterpillar Pontiac — Pontiac, IL": "mbaeza@cmrjb.org",
  "Eurest Dining @ Caterpillar Tractor - Main Facility — Peoria, IL": "mbaeza@cmrjb.org",
  "Eurest Dining @ Tate & Lyle Co. — Decatur, IL": "emoore@cmrjb.org",
  "Excelled Sheepskin & Leather Coat — Kewanee, IL": "mbaeza@cmrjb.org",
  "Frontline Group (The)  - USAF — Hebron, CT": "msalgado@cmrjb.org",
  "FullBeauty — Indianapolis, IN": "dclark@cmrjb.org",
  "General Linen Supply — Detroit, MI": "rburks@cmrjb.org",
  "Grecian Delight Foods — Elk Grove Village, IL": "msalgado@cmrjb.org",
  "Grecian Delight Foods, Bakery Div — Elk Grove Village, IL": "msalgado@cmrjb.org",
  "GVS — Findlay, OH": "cmartin@cmrjb.org",
  "Hanover Direct Manufacturing, LLC — La Crosse, WI": "cbiami@cmrjb.org",
  "Health Systems Co-Op (H.S.C.L.) — St. Paul, MN": "echavez@cmrjb.org",
  "Hilton Akron/Fairlawn — Akron, OH": "doug.warren@cmrjb.org",
  "Hilton Chicago — Chicago, IL": "jortiz@cmrjb.org",
  "Hilton Milwaukee — Milwaukee, WI": "cbiami@cmrjb.org",
  "HMS - Host - Cincinnati KY Airport — Hebron, OH": "jtyler@cmrjb.org",
  "Holiday Inn Duluth — Duluth, MN": "echavez@cmrjb.org",
  "Holiday Inn North Canton-Radius Hospitality Management, LLC — North Canton, OH": "kgillis@cmrjb.org",
  "Home Goods Company/HG Merchants — Brownsburg, IN": "jortiz@cmrjb.org",
  "HomeGoods - Lordstown DC — Warren, OH": "kgillis@cmrjb.org",
  "Hoosier Park — Anderson, IN": "dclark@cmrjb.org",
  "Hospital Co-Operative Laundry (HCL Denver) — Denver, CO": "msalgado@cmrjb.org",
  "Host Intl. @ Mitchell Intl. Airport — Milwaukee, WI": "ptorres@cmrjb.org",
  "Hotel Indigo — Cleveland, OH": "rwilson@cmrjb.org",
  "HUBCO INC. — Hutchinson, KS": "aszoke@cmrjb.org",
  "Hyatt Regency Chicago — Chicago, IL": "jortiz@cmrjb.org",
  "Hyatt Regency Cleveland at the Arcade — Cleveland, OH": "mfrost@cmrjb.org",
  "Hyatt Regency Milwaukee, Nobel Investment Group, LLC — Milwaukee, WI": "ptorres@cmrjb.org",
  "Hyatt Regency O'Hare — Rosemont, IL": "dnava@cmrjb.org",
  "Inter-Continental Conference — Cleveland, OH": "mfrost@cmrjb.org",
  "Inter-Continental Suites — Cleveland, OH": "mfrost@cmrjb.org",
  "JACK Thisedown Racino LLC — North Randall, OH": "kgillis@cmrjb.org",
  "Kelley's Warehouse (Evergreen CBA) — Cleveland, OH": "rwilson@cmrjb.org",
  "Kentuckians For The Commonwealth — Lexington, KY": "mfrost@cmrjb.org",
  "Lariat Club — Peoria, IL": "mbaeza@cmrjb.org",
  "Lear Corporation (IMA) — Louisville, KY": "kleblanc@cmrjb.org",
  "Levi Strauss Co. — Hebron, KY": "rwilson@cmrjb.org",
  "Levy Premium Foodservice @ Churchill Downs & Trackside OTB — Louisville, KY": "kleblanc@cmrjb.org",
  "Levy Restaurant @ Great Lakes Science Center — Cleveland, OH": "rwilson@cmrjb.org",
  "Levy Restaurant @ Wisconsin Center District — Milwaukee, WI": "cbiami@cmrjb.org",
  "Macy's Inc. - State Street — Chicago, IL": "msalgado@cmrjb.org",
  "Macy's Logistics and Operations — Minooka, IL": "msalgado@cmrjb.org",
  "Madison Labor Temple — Madison, WI": "jolson@cmrjb.org",
  "Mahoning Valley Scrappers - HWS Baseball VI LLC — Niles, OH": "bforrest@cmrjb.org",
  "Marberry The Cleaning Family — North Aurora, IL": "dnava@cmrjb.org",
  "Mazz Scrap LLC dba City Scrap & Salvage — Akron, OH": "doug.warren@cmrjb.org",
  "Mednik Riverbend LLC — St. Louis, MO": "aszoke@cmrjb.org",
  "Meramec Group Inc. — Sullivan, MO": "kleblanc@cmrjb.org",
  "Metalico Akron, Inc. — Akron, OH": "doug.warren@cmrjb.org",
  "Metropolitan Detroit Area Hospital Services, Inc. — Detroit, MI": "rburks@cmrjb.org",
  "Mickey's Cleanroom — Chicago, IL": "adiaz@cmrjb.org",
  "Mickey's Linen & Towel Chicago — Chicago, IL": "adiaz@cmrjb.org",
  "Mickey's Linen & Towel Villa Pk — Villa Park, IL": "adiaz@cmrjb.org",
  "Mickey's Linen Hammond IN — Hammond, IN": "jortiz@cmrjb.org",
  "Midway Cap Co. — Chicago, IL": "dnava@cmrjb.org",
  "Miss Elaine — St. Louis, MO": "kleblanc@cmrjb.org",
  "MN350 — Minneapolis, MN": "mfrost@cmrjb.org",
  "Monona Catering LLC — Madison, WI": "jolson@cmrjb.org",
  "Monterey Mills, Inc. — Janesville, WI": "jolson@cmrjb.org",
  "NEO LLC (Lake County Captains) — Eastlake, OH": "rwilson@cmrjb.org",
  "NOVO Health Services — Madison, WI": "ptorres@cmrjb.org",
  "NuCentury Textile Services — Toledo, OH": "doug.warren@cmrjb.org",
  "Oak View Group - Ovations Spectra — Cincinnati, OH": "jtyler@cmrjb.org",
  "Ohio Enviromental Council (OEC) — Columbus, OH": "mfrost@cmrjb.org",
  "Ohio Organizing Collabrotive — Youngstown, OH": "mfrost@cmrjb.org",
  "Open Kitchens — Chicago, IL": "adiaz@cmrjb.org",
  "Owens Corning - Summit, IL Roofing Plant - OC Roofing — Summit, IL": "adiaz@cmrjb.org",
  "Oxxford Clothing — Chicago, IL": "msalgado@cmrjb.org",
  "P. J. McIntyres — Cleveland, OH": "rwilson@cmrjb.org",
  "Palmer House Hilton — Chicago, IL": "jortiz@cmrjb.org",
  "Pendleton Woolen Mills — Bellevue, NE": "aszoke@cmrjb.org",
  "Peoples Action Institute — Chicago, IL": "mfrost@cmrjb.org",
  "Pfister Hotel — Milwaukee, WI": "cbiami@cmrjb.org",
  "Policy Matters Ohio — Cleveland, OH": "mfrost@cmrjb.org",
  "Premier Catering, Inc. — Toledo, OH": "doug.warren@cmrjb.org",
  "ProAmpac (Gateway Packaging) — Kansas City, MO": "kleblanc@cmrjb.org",
  "Radisson Hotel/Associated Hotels Duluth, Inc. — Duluth, MN": "echavez@cmrjb.org",
  "Ranier Liquor Store — Ranier, MN": "echavez@cmrjb.org",
  "Reeds Sportwear (Evergreen) — Detroit, MI": "rburks@cmrjb.org",
  "Reef Bar — Duluth, MN": "echavez@cmrjb.org",
  "Ridge Global — West Chester, OH": "jtyler@cmrjb.org",
  "Ritz Carlton Hotel — Chicago, IL": "jortiz@cmrjb.org",
  "Roman Decorating Products — Calumet City, IL": "dnava@cmrjb.org",
  "Roscoe Company — Chicago, IL": "jortiz@cmrjb.org",
  "Royal Lace Div - Mafcote Industries — Louisville, KY": "kleblanc@cmrjb.org",
  "Sage Dining / FLIX Culver Academy — Culver, IN": "dclark@cmrjb.org",
  "Savor - Peoria Civic Center — Peoria, IL": "mbaeza@cmrjb.org",
  "Serta Restokraft — Romulus, MI": "rwilson@cmrjb.org",
  "Six Flags Entertainment - Sawmill Creek Resort — Huron, OH": "doug.warren@cmrjb.org",
  "Skokie Valley Laundry & Cleaners — Highwood, IL": "dnava@cmrjb.org",
  "Sodexo @ GE Electric Evendale — Cincinnati, OH": "jtyler@cmrjb.org",
  "Sodexo @ Ohio Northern University (ONU) Food — Ada, OH": "doug.warren@cmrjb.org",
  "Sodexo @ Ohio Northern University (ONU) Maintenance and Grounds — Ada, OH": "doug.warren@cmrjb.org",
  "Sodexo @ UW Eau Claire — Eau Claire, WI": "cbiami@cmrjb.org",
  "Sparks Hotel Beachwood — Beachwood, OH": "mfrost@cmrjb.org",
  "St. Louis Embroidery — Wentzville, MO": "emoore@cmrjb.org",
  "Stanbury Uniforms — Brookfield, MO": "kleblanc@cmrjb.org",
  "Suncast Corp. — Batavia, IL": "msalgado@cmrjb.org",
  "Superior Trim, Inc. - (September Ends) — Springfield, OH": "cmartin@cmrjb.org",
  "Superior Trim, Inc. - Pieco LLC — Findlay, OH": "cmartin@cmrjb.org",
  "T.J. Maxx — Evansville, IN": "emoore@cmrjb.org",
  "The Great Put On — Flint, MI": "rburks@cmrjb.org",
  "The Madison Concourse Hotel and Governor’s wClub — Madison, WI": "cbiami@cmrjb.org",
  "The Toledo Club — Toledo, OH": "rburks@cmrjb.org",
  "TJX Digital Dayton — Dayton, OH": "bforrest@cmrjb.org",
  "TOPPAN Flexible Packaging (Sonoco) — Edinburgh, IN": "dclark@cmrjb.org",
  "Trustage @ Cuna Mutual — Madison, WI": "jolson@cmrjb.org",
  "Twin City Tanning — South St. Paul, MN": "echavez@cmrjb.org",
  "Union Prescription Center — Mt. Morris, MI": "rburks@cmrjb.org",
  "United Hospital Services — Indianapolis, IN": "mbaeza@cmrjb.org",
  "Vestis @ Chicago - MC 701 — Chicago, IL": "adiaz@cmrjb.org",
  "Vestis @ Cincinnati - MC 543 — Cincinnati, OH": "jtyler@cmrjb.org",
  "Vestis @ Dayton  MC 322 — Dayton, OH": "jtyler@cmrjb.org",
  "Vestis @ Des Moines - MC 637 — Des Moines, IA": "emoore@cmrjb.org",
  "Vestis @ Fulton, MO — Fulton, MO": "aszoke@cmrjb.org",
  "Vestis @ Madison - MC 614 — Madison, WI": "ptorres@cmrjb.org",
  "Vestis @ MC 544 ( Production) — Toledo, OH": "doug.warren@cmrjb.org",
  "Vestis @ Sikeston, MO — Sikeston, MO": "kleblanc@cmrjb.org",
  "Vestis @ Springfield, MO — Springfield, MO": "kleblanc@cmrjb.org",
  "Vestis @ St. Louis, MO - MC 617 — St. Louis, MO": "emoore@cmrjb.org",
  "Vestis Cleanroom @ AmeriPride Linen & Apparel Services — Minneapolis, MN": "echavez@cmrjb.org",
  "Vestis Services, LLC @ MC 544  (Drivers) — Toledo, OH": "doug.warren@cmrjb.org",
  "Volume Service @  Centerplate Indianapolis Convention Center — Indianapolis, IN": "dclark@cmrjb.org",
  "West Michigan Shared Hospital Laundry — Grand Rapids, MI": "dnava@cmrjb.org",
  "Westin Cleveland Downtown — Cleveland, OH": "mfrost@cmrjb.org",
  "Westin Hotel Cincinnati — Cincinnati, OH": "jtyler@cmrjb.org",
  "Westminster Village, Inc. — Bloomington, IL": "mbaeza@cmrjb.org",
  "Whitsons — Berkeley, IL": "adiaz@cmrjb.org",
  "Wilson Sporting Goods Company — Ada, OH": "doug.warren@cmrjb.org",
  "Wiman Corporation — Sauk Rapids, MN": "echavez@cmrjb.org",
  "Xerox Corp - Middletown OH — Middletown, OH": "doug.warren@cmrjb.org",
  "Beloit College — Beloit, WI": "ptorres@cmrjb.org",
  "Six Flags — Sawmill Creek Resort": "doug.warren@cmrjb.org"
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

exports.handler = async (event) => {
  // GET = status check. Open the function URL in a browser to see if it's
  // deployed and whether it can see your Resend key. Never exposes the key.
  if (event.httpMethod === 'GET') {
    const hasKey = !!process.env.RESEND_API_KEY;
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        functionDeployed: true,
        resendKeyVisible: hasKey,
        fromAddress: process.env.CARD_FROM_EMAIL || 'onboarding@resend.dev (Resend test sender)',
        organizer: process.env.ORGANIZER_EMAIL || 'members@cmrjb.org (default)',
        note: hasKey
          ? 'Key is visible. If members@cmrjb.org still gets no PDF, Resend is rejecting the send — verify a domain in Resend and set CARD_FROM_EMAIL to an address on it (or, before verifying, set ORGANIZER_EMAIL to the exact email you signed up to Resend with).'
          : 'RESEND_API_KEY is NOT visible to this function. In Netlify add it with the Functions scope, then trigger a new deploy.',
      }, null, 2),
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY not set' }) };
  }
  let data;
  try { data = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, body: 'Bad JSON' }; }

  const pdfBase64 = data.pdfBase64;
  if (!pdfBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing pdfBase64' }) };
  }
  // Note: the submission record for Nancy's Excel report is saved client-side to a Netlify
  // Form (see index.html) rather than here, so it doesn't depend on this email step succeeding.

  const from = process.env.CARD_FROM_EMAIL || 'Workers United <onboarding@resend.dev>';
  const backstop = (process.env.ORGANIZER_EMAIL || 'members@cmrjb.org').trim();
  const repEmail = (WORKSITE_REP_MAP[data.worksite] || '').trim();
  const organizer = (data.organizer || ('ncampos@cmrjb.org, ' + backstop + (repEmail ? (', ' + repEmail) : ''))).trim();
  const lang = MEMBER_COPY[data.lang] ? data.lang : 'en';
  const name = (data.name || '').toString().slice(0, 80) || 'Member';
  const attachments = [{ filename: 'Workers United Card.pdf', content: pdfBase64 }];

  async function send(to, subject, html) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, html, attachments }),
      });
      return res.ok;
    } catch (e) { return false; }
  }

  // 1) Organizer copy — the official signed record (always). ORGANIZER_EMAIL / data.organizer
  // may be a single address or a comma-separated list (e.g. "members@cmrjb.org, dues@cmrjb.org").
  const organizerList = organizer.split(',').map((s) => s.trim()).filter(Boolean);
  const orgSubject = data.subject || ('New signed union card — ' + name);
  const orgHtml =
    '<p>A new union card was signed. The signed PDF is attached as the official record.</p>' +
    '<p><strong>Reps/stewards:</strong> federal law requires the employer to receive a copy of this signed card right away — please forward this email (with the attached PDF) to the employer today.</p>' +
    '<pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;white-space:pre-wrap">' +
    escapeHtml(data.summary || '') + '</pre>';
  const orgOk = await send(organizerList, orgSubject, orgHtml);

  // 2) Member copy — optional.
  let memberOk = false;
  const to = (data.to || '').trim();
  if (to) {
    const c = MEMBER_COPY[lang];
    memberOk = await send([to], c.subject, c.html(name));
  }

  return {
    statusCode: orgOk ? 200 : 502,
    body: JSON.stringify({ ok: orgOk, memberOk }),
  };
};
