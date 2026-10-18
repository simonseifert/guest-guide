#!/usr/bin/env node
/**
 * Printable guide: one A4 book per language, for the owners to print and bind.
 *
 *   npm run print                -> dist-print/guide-{lang}.html
 *   then print each HTML to PDF in Chrome/Chromium (A4, margins default,
 *   "Background graphics" on). Wait for the page to finish loading first: a
 *   small script shrinks photos where that saves a mostly empty last page.
 *
 * Same markdown as the website, so the paper copy never drifts from the site.
 * Website type and palette on a white page (no ink wasted), photos kept, every
 * section on a new page, wider left margin for binding, running footer, a Wi-Fi
 * QR on the cover and a contacts page at the back. Names, Wi-Fi, hosts and
 * links all come from src/config/property.ts.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import yaml from 'js-yaml';
import QRCode from 'qrcode';
import { PROPERTY } from '../src/config/property.ts';

const root = resolve(import.meta.dirname, '..');
const pub = join(root, 'public');
const out = join(root, 'dist-print');
mkdirSync(out, { recursive: true });

const copy = {
  en: { title: 'Guest guide', emergencyShort: 'Emergency', contents: 'Contents', wifi: 'Wi-Fi', network: 'Network', password: 'Password', scanWifi: 'Scan to connect', hosts: 'Hosts', online: 'This guide on your phone', onlineText: 'Always the latest version, works offline too.', important: 'Important: please read the safety rules carefully before use.', backTitle: 'Contacts and useful info', emergency: 'Emergencies', emergencyText: 'European emergency number: <b>112</b><br>Free, from any phone, in any EU country.', address: 'Address', web: 'Website and bookings', review: 'Enjoyed your stay?', reviewText: 'Leave us a Google review, it means a lot to us.', stamp: 'Last updated' },
  de: { title: 'Gästehandbuch', emergencyShort: 'Notruf', contents: 'Inhalt', wifi: 'WLAN', network: 'Netzwerk', password: 'Passwort', scanWifi: 'Zum Verbinden scannen', hosts: 'Gastgeber', online: 'Dieses Handbuch auf dem Handy', onlineText: 'Immer die aktuelle Version, funktioniert auch offline.', important: 'Wichtig: Bitte lesen Sie die Sicherheitsregeln vor der Nutzung sorgfältig.', backTitle: 'Kontakte und Nützliches', emergency: 'Notfälle', emergencyText: 'Europäischer Notruf: <b>112</b><br>Kostenlos, von jedem Telefon, in jedem EU-Land.', address: 'Adresse', web: 'Website und Buchungen', review: 'Hat es Ihnen gefallen?', reviewText: 'Hinterlassen Sie uns eine Google-Bewertung, das bedeutet uns viel.', stamp: 'Stand' },
  hr: { title: 'Vodič za goste', emergencyShort: 'Hitno', contents: 'Sadržaj', wifi: 'Wi-Fi', network: 'Mreža', password: 'Lozinka', scanWifi: 'Skenirajte za spajanje', hosts: 'Domaćini', online: 'Vodič na mobitelu', onlineText: 'Uvijek najnovija verzija, radi i bez signala.', important: 'Važno: pažljivo pročitajte sigurnosna pravila prije korištenja.', backTitle: 'Kontakti i korisno', emergency: 'Hitni slučajevi', emergencyText: 'Jedinstveni broj za hitne slučajeve: <b>112</b><br>Besplatan, s bilo kojeg telefona, u cijeloj EU.', address: 'Adresa', web: 'Web i rezervacije', review: 'Bili ste zadovoljni?', reviewText: 'Ostavite nam recenziju na Googleu, puno nam znači.', stamp: 'Stanje' },
  it: { title: 'Guida per gli ospiti', emergencyShort: 'Emergenza', contents: 'Indice', wifi: 'Wi-Fi', network: 'Rete', password: 'Password', scanWifi: 'Inquadra per collegarti', hosts: 'Host', online: 'Questa guida sul telefono', onlineText: 'Sempre aggiornata, funziona anche offline.', important: "Importante: leggete attentamente le regole di sicurezza prima dell'uso.", backTitle: 'Contatti e info utili', emergency: 'Emergenze', emergencyText: 'Numero unico di emergenza europeo: <b>112</b><br>Gratuito, da qualsiasi telefono, in tutta la UE.', address: 'Indirizzo', web: 'Sito e prenotazioni', review: 'Vi è piaciuto il soggiorno?', reviewText: 'Lasciateci una recensione su Google, per noi conta molto.', stamp: 'Aggiornato' },
};

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const name = esc(PROPERTY.brand.name);
const { line1, postcode, city, country } = PROPERTY.address;
const addressLine = esc(`${line1}, ${postcode} ${city}`);
const host = PROPERTY.hosts[0];
const siteUrl = PROPERTY.siteUrl.replace(/\/+$/, '');
const siteLabel = esc(siteUrl.replace(/^https?:\/\//, ''));
const reviewUrl = PROPERTY.reviews?.googleReviewUrl;
const { ssid, password, encryption } = PROPERTY.wifi;
const wifiEscape = (v) => v.replace(/([\\;,:"])/g, '\\$1');
const wifiUri = `WIFI:T:${encryption === 'nopass' ? 'nopass' : encryption};S:${wifiEscape(ssid)};P:${wifiEscape(password)};;`;
const photo = PROPERTY.hero.photoSrc.startsWith('/') ? `file://${join(pub, PROPERTY.hero.photoSrc.slice(1))}` : PROPERTY.hero.photoSrc;

// Reading order on paper: arrival and safety first, then rules, then the fun, then appliances.
const first = ['welcome', 'emergency', 'top10', 'rules', 'checkout'];
const catOrder = { stay: 0, rules: 1, indulge: 2, tech: 3 };

const md = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify);

function loadSections(lang) {
  const dir = join(root, 'src/content/sections', lang);
  return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const raw = readFileSync(join(dir, f), 'utf8');
    const [, fm, body] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    return { slug: f.replace(/\.md$/, ''), data: yaml.load(fm), body };
  }).sort((a, b) => {
    const ia = first.indexOf(a.slug), ib = first.indexOf(b.slug);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    const ca = catOrder[a.data.category] ?? 9, cb = catOrder[b.data.category] ?? 9;
    return ca - cb || a.data.order - b.data.order;
  });
}

function render(body) {
  let html = String(md.processSync(body));
  // Site-relative images -> local files; site-relative links have no meaning on paper.
  html = html.replace(/src="\/([^"]+)"/g, (_, p) => `src="file://${join(pub, p)}"`);
  html = html.replace(/<a href="[^"]*"[^>]*>([\s\S]*?)<\/a>/g, '<span class="link">$1</span>');
  return html;
}

const FONT_BODY = "'Raleway', system-ui, sans-serif";
const FONT_DISPLAY = "'Raleway', system-ui, sans-serif";
const ACCENT = '#2F5D43';
const ACCENT_TEXT = '#2F5D43';

const css = `
/* Same type and palette as the website (global.css :root tokens). If you
   re-theme the site, change FONT_*, ACCENT and ACCENT_TEXT at the top of the
   CSS below and the fonts link further down. */
@page { size: A4; margin: 1.8cm 1.6cm 2cm 2.4cm;
  @bottom-left { content: var(--footer, ''); font: 8pt ${FONT_BODY}; color: #6F6458; }
  @bottom-right { content: counter(page); font: 600 8.5pt ${FONT_BODY}; color: ${ACCENT_TEXT}; } }
@page :first { @bottom-left { content: none; } @bottom-right { content: none; } }
* { box-sizing: border-box; }
body { margin: 0; font: 10.5pt/1.55 ${FONT_BODY}; color: #1F1A14; background: #fff; }
h1, h2, h3 { font-family: ${FONT_DISPLAY}; font-weight: 600; color: #1F1A14; line-height: 1.2; break-after: avoid; }
h1 { font-size: 24pt; margin: 0 0 4pt; }
h2 { font-size: 14pt; margin: 15pt 0 4pt; }
h3 { font-size: 12pt; margin: 11pt 0 3pt; }
strong { font-weight: 600; }
p, li { orphans: 3; widows: 3; }
p { margin: 4pt 0 7pt; }
ul, ol { padding-left: 1.2em; margin: 4pt 0 8pt; }
li { margin: 2pt 0; }
li::marker { color: ${ACCENT}; }
img { display: block; max-width: 100%; max-height: var(--img-max, 7cm); margin: 8pt auto; border-radius: 14px; border: 1px solid rgba(31,26,20,0.10); break-inside: avoid; }
code { font-family: 'JetBrains Mono', Menlo, Consolas, monospace; font-size: 9.5pt; background: #F1ECE2; padding: 0 3pt; border-radius: 4px; }
blockquote { margin: 8pt 0; padding: 6pt 11pt; border-left: 3pt solid ${ACCENT}; background: #F8F4EB; border-radius: 0 8px 8px 0; break-inside: avoid; }
blockquote p { margin: 2pt 0; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 9.5pt; }
th, td { border-bottom: 0.5pt solid rgba(31,26,20,0.18); padding: 3pt 6pt; text-align: left; vertical-align: top; }
hr { border: 0; border-top: 0.5pt solid rgba(31,26,20,0.18); margin: 12pt 0; }
.link { text-decoration: none; }
/* Screen layout = print layout, so the fit script below measures what will be printed. */
@media screen { body { width: 170mm; } }
section { break-before: page; }
section > h1 { padding-bottom: 6pt; border-bottom: 1.5pt solid ${ACCENT}; margin-bottom: 6pt; }
section.tight h2 { margin-top: 10pt; } section.tight p, section.tight ul { margin-top: 3pt; margin-bottom: 5pt; }
section.tighter { font-size: 10pt; line-height: 1.45; }
.summary { color: #5C534A; margin: 0 0 10pt; }
.important { border: 1pt solid #B85B3C; background: #FBF1EC; color: #9E4A2E; padding: 6pt 10pt; margin: 6pt 0 10pt; font-weight: 600; border-radius: 8px; break-inside: avoid; }
.eyebrow { font: 600 8pt ${FONT_BODY}; letter-spacing: 0.14em; text-transform: uppercase; color: ${ACCENT_TEXT}; }
.cover { height: 25.5cm; display: flex; flex-direction: column; align-items: center; text-align: center; }
.cover .logo { width: 5.5cm; max-height: none; margin: 0.8cm auto 0.5cm; border-radius: 0; border: 0; }
.cover h1 { font-size: 32pt; margin: 6pt 0 2pt; }
.cover .sub { font-size: 11pt; color: #5C534A; margin: 0 0 14pt; }
.cover .photo { width: 100%; height: 9.5cm; max-height: none; object-fit: cover; margin: 0; }
.cards { margin-top: auto; width: 100%; display: flex; gap: 10pt; text-align: left; font-size: 9.5pt; }
.cards > div { flex: 1; background: #F8F4EB; padding: 9pt 11pt; border-radius: 14px; display: flex; gap: 9pt; align-items: center; }
.cards b { display: block; font: 600 12pt ${FONT_DISPLAY}; margin-bottom: 2pt; }
.qr { width: 2.3cm; height: 2.3cm; flex: none; border: 0; margin: 0; border-radius: 0; }
.toc { break-before: page; }
.toc h1 { padding-bottom: 6pt; border-bottom: 1.5pt solid ${ACCENT}; }
.toc ol { font-size: 11.5pt; line-height: 2; padding-left: 1.6em; }
.back { break-before: page; display: flex; flex-direction: column; min-height: 24cm; }
.back h1 { padding-bottom: 6pt; border-bottom: 1.5pt solid ${ACCENT}; }
.back .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; margin-top: 8pt; }
.back .grid > div { background: #F8F4EB; border-radius: 14px; padding: 10pt 12pt; }
.back .grid b { display: block; font: 600 12.5pt ${FONT_DISPLAY}; margin-bottom: 3pt; }
.back .stamp { margin-top: auto; font-size: 8.5pt; color: #6F6458; text-align: center; }
`;


// Fit pass: a section whose last page would be less than half full gets smaller photos,
// then slightly tighter spacing, until it ends one page earlier. If even the
// tightest step doesn't get there, the section is left exactly as it was.
const FIT = `<script>
addEventListener('load', () => document.fonts.ready.then(() => {
  // Measure with real fragmentation: lay the section out in one-page-tall columns,
  // so photos that refuse to split jump to the next "page" exactly as in print.
  const page = 257 * 96 / 25.4; // A4 height minus top + bottom margins, in CSS px
  const st = document.createElement('style');
  st.textContent = 'section.measure{height:' + page + 'px;columns:170mm;column-gap:40px;column-fill:auto;break-before:auto}';
  document.head.append(st);
  const measure = (s) => {
    s.classList.add('measure');
    const m = s.querySelector('.end'), sr = s.getBoundingClientRect(), r = m.getBoundingClientRect();
    const col = Math.round((r.left - sr.left) / (sr.width + 40));
    const fill = (r.top - sr.top) / page;
    s.classList.remove('measure');
    return { pages: col + 1, fill };
  };
  for (const s of document.querySelectorAll('section')) {
    s.insertAdjacentHTML('beforeend', '<i class="end"></i>');
    const start = measure(s);
    if (start.pages < 2 || start.fill > 0.45) continue;
    const steps = [];
    for (let cm = 6.5; cm >= 3.5; cm -= 0.5) steps.push({ img: cm + 'cm' });
    steps.push({ img: '3.5cm', cls: 'tight' }, { img: '3.5cm', cls: 'tight tighter' });
    let fitted = false;
    for (const step of steps) {
      s.style.setProperty('--img-max', step.img);
      s.className = step.cls || '';
      if (measure(s).pages < start.pages) { fitted = true; break; }
    }
    if (!fitted) { s.style.removeProperty('--img-max'); s.className = ''; }
    s.dataset.fit = fitted ? ((s.className ? s.className + ' ' : '') + s.style.getPropertyValue('--img-max')) : 'none';
  }
  document.body.dataset.fitted = '1';
}));
</` + 'script>';

const qr = (text) => QRCode.toString(text, { type: 'svg', margin: 0, color: { dark: '#1F1A14', light: '#0000' } })
  .then((svg) => `<img class="qr" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" alt="">`);
const wifiQr = await qr(wifiUri);
const reviewQr = reviewUrl ? await qr(reviewUrl) : '';
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=block" rel="stylesheet">';
const langs = PROPERTY.languages.filter((l) => copy[l]);

for (const lang of langs) {
  const c = copy[lang];
  const sections = loadSections(lang);
  const guideQr = await qr(`${siteUrl}/${lang}`);
  const stamp = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(new Date());
  const footer = `${PROPERTY.brand.name} · ${c.emergencyShort}: 112${host ? ` · ${host.name.split(' ')[0]} ${host.phone}` : ''}`;
  const wifiCode = `<code>${esc(ssid)}</code>`;
  const passCode = encryption === 'nopass' ? '' : `<code>${esc(password)}</code>`;
  const cover = `
<div class="cover">
  <p class="eyebrow" style="margin-top:1cm">${c.title}</p>
  <h1>${name}</h1>
  <p class="sub">${addressLine}</p>
  <img class="photo" src="${photo}" alt="">
  <div class="cards" style="margin-top:14pt">
    <div>${wifiQr}<span><b>${c.wifi}</b>${c.network}: ${wifiCode}${passCode ? `<br>${c.password}: ${passCode}` : ''}<br><span class="eyebrow">${c.scanWifi}</span></span></div>
    <div>${guideQr}<span><b>${c.online}</b>${c.onlineText}<br>${siteLabel}</span></div>
  </div>
</div>`;
  const toc = `
<div class="toc"><h1>${c.contents}</h1><ol>${sections.map((s) => `<li>${s.data.icon ?? ''} ${s.data.title}</li>`).join('')}</ol></div>`;
  const body = sections.map((s) => `
<section id="${s.slug}">
  <h1>${s.data.icon ?? ''} ${s.data.title}</h1>
  ${s.data.summary ? `<p class="summary">${s.data.summary}</p>` : ''}
  ${s.data.safetyCritical ? `<p class="important">${c.important}</p>` : ''}
  ${render(s.body)}
</section>`).join('\n');
  const back = `
<div class="back">
  <h1>${c.backTitle}</h1>
  <div class="grid">
    <div><b>${c.hosts}</b>${PROPERTY.hosts.map((h) => `${esc(h.name)}: ${esc(h.phone)}`).join('<br>')}</div>
    <div><b>${c.emergency}</b>${c.emergencyText}</div>
    <div><b>${c.address}</b>${name}<br>${addressLine}, ${esc(country)}</div>
    ${PROPERTY.website ? `<div><b>${c.web}</b>${esc(PROPERTY.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</div>` : ''}
  </div>
  <div class="cards" style="margin-top:12pt">
    ${reviewQr ? `<div>${reviewQr}<span><b>${c.review}</b>${c.reviewText}</span></div>` : ''}
    <div>${wifiQr}<span><b>${c.wifi}</b>${wifiCode}${passCode ? ` · ${passCode}` : ''}</span></div>
  </div>
  <p class="stamp">${c.stamp}: ${stamp} · ${siteLabel}</p>
</div>`;
  const html = `<!doctype html><html lang="${lang}" style="--footer: '${footer.replace(/'/g, "\\'")}'"><head><meta charset="utf-8"><title>${name} · ${c.title}</title>${fonts}<style>${css}</style></head><body>${cover}${toc}${body}${back}${FIT}</body></html>`;
  writeFileSync(join(out, `guide-${lang}.html`), html);
  console.log(`dist-print/guide-${lang}.html (${sections.length} sections)`);
}
