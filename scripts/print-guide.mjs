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
 * QR on the cover and a contacts page at the back. A welcome letter from the hosts,
 * a photo opener per chapter and unnumbered guestbook pages at the very end (so
 * more blank pages can be bound in later) make it a book rather than a printout.
 * Names, Wi-Fi, hosts, links and photos all come from src/config/property.ts.
 *
 * Markdown marked with <!-- web --> stays on the website only: on a ## heading
 * it drops that whole subsection (arrival steps nobody reads once inside), on
 * any other line just that line. `printSummary` in frontmatter replaces
 * `summary` in print.
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
  en: { title: 'Guest guide', emergencyShort: 'Emergency', contents: 'Contents', wifi: 'Wi-Fi', network: 'Network', password: 'Password', scanWifi: 'Scan to connect', hosts: 'Hosts', online: 'This guide on your phone', onlineText: 'Always the latest version, works offline too.', important: 'Important: please read the safety rules carefully before use.', backTitle: 'Contacts and useful info', emergency: 'Emergencies', emergencyText: 'European emergency number: <b>112</b><br>Free, from any phone, in any EU country.', address: 'Address', web: 'Website and bookings', review: 'Enjoyed your stay?', reviewText: 'Leave us a Google review, it means a lot to us.', stamp: 'Last updated', chapters: ['Welcome', 'Enjoy', 'House and appliances'], chapterSubs: ['Arrival, house rules, check-out and contacts.', 'Relaxing, the outdoors and day trips nearby.', 'Appliances and how-tos.'], letterEyebrow: 'A warm welcome', letter: ['Dear guests,', 'we are so glad you chose to stay with us. We hope you feel at home from the very first evening: rest, get together and take your time.', 'This guide has everything you need, from the Wi-Fi and the house rules to every appliance in the house, along with our favourite places nearby. If anything goes wrong or you need something, just call or message us. We are here for you.', 'At the end of the guide we left a few blank pages. We would love to read about your stay.', 'Enjoy!'], and: 'and', guestbook: 'Your memories', guestbookSub: 'Leave a message for us or for the next guests. Thank you for staying with us!', gbDate: 'Date', gbNames: 'Names' },
  de: { title: 'Gästehandbuch', emergencyShort: 'Notruf', contents: 'Inhalt', wifi: 'WLAN', network: 'Netzwerk', password: 'Passwort', scanWifi: 'Zum Verbinden scannen', hosts: 'Gastgeber', online: 'Dieses Handbuch auf dem Handy', onlineText: 'Immer die aktuelle Version, funktioniert auch offline.', important: 'Wichtig: Bitte lesen Sie die Sicherheitsregeln vor der Nutzung sorgfältig.', backTitle: 'Kontakte und Nützliches', emergency: 'Notfälle', emergencyText: 'Europäischer Notruf: <b>112</b><br>Kostenlos, von jedem Telefon, in jedem EU-Land.', address: 'Adresse', web: 'Website und Buchungen', review: 'Hat es Ihnen gefallen?', reviewText: 'Hinterlassen Sie uns eine Google-Bewertung, das bedeutet uns viel.', stamp: 'Stand', chapters: ['Willkommen', 'Genießen', 'Haus und Geräte'], chapterSubs: ['Ankunft, Hausordnung, Abreise und Kontakte.', 'Entspannung, Natur und Ausflüge in der Umgebung.', 'Geräte und Anleitungen.'], letterEyebrow: 'Herzlich willkommen', letter: ['Liebe Gäste,', 'wir freuen uns sehr, dass Sie bei uns zu Gast sind. Wir hoffen, Sie fühlen sich vom ersten Abend an wie zu Hause: Erholen Sie sich, kommen Sie zusammen und lassen Sie sich Zeit.', 'In diesem Handbuch finden Sie alles, was Sie brauchen: vom WLAN und der Hausordnung bis zu jedem Gerät im Haus, dazu unsere Lieblingsorte in der Umgebung. Wenn etwas nicht klappt oder Sie etwas brauchen, rufen Sie uns einfach an oder schreiben Sie uns. Wir sind für Sie da.', 'Am Ende des Handbuchs haben wir ein paar leere Seiten gelassen. Wir freuen uns, von Ihrem Aufenthalt zu lesen.', 'Viel Freude!'], and: 'und', guestbook: 'Ihre Eindrücke', guestbookSub: 'Hinterlassen Sie eine Nachricht für uns oder die nächsten Gäste. Danke, dass Sie bei uns waren!', gbDate: 'Datum', gbNames: 'Namen' },
  hr: { title: 'Vodič za goste', emergencyShort: 'Hitno', contents: 'Sadržaj', wifi: 'Wi-Fi', network: 'Mreža', password: 'Lozinka', scanWifi: 'Skenirajte za spajanje', hosts: 'Domaćini', online: 'Vodič na mobitelu', onlineText: 'Uvijek najnovija verzija, radi i bez signala.', important: 'Važno: pažljivo pročitajte sigurnosna pravila prije korištenja.', backTitle: 'Kontakti i korisno', emergency: 'Hitni slučajevi', emergencyText: 'Jedinstveni broj za hitne slučajeve: <b>112</b><br>Besplatan, s bilo kojeg telefona, u cijeloj EU.', address: 'Adresa', web: 'Web i rezervacije', review: 'Bili ste zadovoljni?', reviewText: 'Ostavite nam recenziju na Googleu, puno nam znači.', stamp: 'Stanje', chapters: ['Dobrodošli', 'Uživajte', 'Kuća i uređaji'], chapterSubs: ['Dolazak, kućni red, odjava i kontakti.', 'Opuštanje, priroda i izleti u okolici.', 'Uređaji i upute.'], letterEyebrow: 'Dobrodošlica', letter: ['Dragi gosti,', 'drago nam je što ste odabrali baš nas. Nadamo se da ćete se od prve večeri osjećati kao kod kuće: odmorite se, družite se i ne žurite.', 'U ovom vodiču naći ćete sve što vam treba: od Wi-Fija i kućnog reda do svakog uređaja u kući, uz naša omiljena mjesta u okolici. Ako nešto zapne ili vam nešto zatreba, slobodno nas nazovite ili nam pošaljite poruku. Tu smo za vas.', 'Na kraju vodiča ostavili smo nekoliko praznih stranica. Bit će nam drago pročitati vaše dojmove.', 'Uživajte!'], and: 'i', guestbook: 'Vaši dojmovi', guestbookSub: 'Ostavite poruku nama ili sljedećim gostima. Hvala što ste bili s nama!', gbDate: 'Datum', gbNames: 'Imena' },
  it: { title: 'Guida per gli ospiti', emergencyShort: 'Emergenza', contents: 'Indice', wifi: 'Wi-Fi', network: 'Rete', password: 'Password', scanWifi: 'Inquadra per collegarti', hosts: 'Host', online: 'Questa guida sul telefono', onlineText: 'Sempre aggiornata, funziona anche offline.', important: "Importante: leggete attentamente le regole di sicurezza prima dell'uso.", backTitle: 'Contatti e info utili', emergency: 'Emergenze', emergencyText: 'Numero unico di emergenza europeo: <b>112</b><br>Gratuito, da qualsiasi telefono, in tutta la UE.', address: 'Indirizzo', web: 'Sito e prenotazioni', review: 'Vi è piaciuto il soggiorno?', reviewText: 'Lasciateci una recensione su Google, per noi conta molto.', stamp: 'Aggiornato', chapters: ['Benvenuti', 'Godetevi il soggiorno', 'Casa ed elettrodomestici'], chapterSubs: ['Arrivo, regole della casa, partenza e contatti.', 'Relax, natura e gite nei dintorni.', 'Elettrodomestici e istruzioni.'], letterEyebrow: 'Benvenuti', letter: ['Cari ospiti,', 'siamo felici che abbiate scelto di stare da noi. Speriamo che vi sentiate a casa fin dalla prima sera: riposatevi, state insieme e prendetevi il vostro tempo.', 'In questa guida trovate tutto ciò che vi serve, dal Wi-Fi e dalle regole della casa a ogni elettrodomestico, insieme ai nostri posti preferiti nei dintorni. Se qualcosa non va o vi serve qualcosa, chiamateci o scriveteci. Siamo qui per voi.', 'In fondo alla guida abbiamo lasciato alcune pagine bianche. Ci farà piacere leggere del vostro soggiorno.', 'Buon soggiorno!'], and: 'e', guestbook: 'I vostri ricordi', guestbookSub: 'Lasciate un messaggio per noi o per i prossimi ospiti. Grazie di essere stati da noi!', gbDate: 'Data', gbNames: 'Nomi' },
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
const fileSrc = (src) => src.startsWith('/') ? `file://${join(pub, src.slice(1))}` : src;
const photo = fileSrc(PROPERTY.hero.photoSrc);

// Reading order on paper: arrival and safety first, then rules, then the fun, then appliances.
const first = ['welcome', 'emergency', 'top10', 'rules', 'checkout'];
const catOrder = { stay: 0, rules: 1, indulge: 2, tech: 3 };
// Three chapters, each opened by a photo page. Day trips close chapter 2; the legal
// notices ('important') close the book, after the chapters.
const chapterOf = (s) => s.slug === 'important' ? null
  : s.slug === 'explore' || s.data.category === 'indulge' ? 1
  : s.data.category === 'tech' ? 2 : 0;

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
    const ka = chapterOf(a) ?? 9, kb = chapterOf(b) ?? 9;
    if (ka === kb && (a.slug === 'explore') !== (b.slug === 'explore')) return a.slug === 'explore' ? 1 : -1;
    const ca = catOrder[a.data.category] ?? 9, cb = catOrder[b.data.category] ?? 9;
    return ka - kb || ca - cb || a.data.order - b.data.order;
  });
}

function render(body) {
  body = body.replace(/^## .*<!-- web -->\s*\n[\s\S]*?(?=^## |(?![\s\S]))/gm, '');
  let html = String(md.processSync(body.replace(/^.*<!-- web -->\s*$/gm, '')));
  // A list item that is nothing but a link (map searches, downloads) has nothing to say on paper.
  html = html.replace(/<li><a href="https?:[^"]*">[^<]*<\/a><\/li>\n?/g, '');
  // Other web links keep their address, so the reader can still type it in.
  html = html.replace(/<a href="https?:\/\/(?:www\.)?([^"/]+)\/?"[^>]*>([^<]*)<\/a>/g,
    (m, host, text) => text.includes(host) ? m : `${m} (${host})`);
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
/* Welcome letter */
.letter { break-before: page; min-height: 24cm; display: flex; flex-direction: column; }
.letter .photo { width: 100%; height: 7.5cm; max-height: none; object-fit: cover; margin: 0 0 22pt; }
.letter h1 { font-size: 26pt; margin: 4pt 0 14pt; }
.letter p { font-size: 11.5pt; line-height: 1.7; margin: 0 0 9pt; max-width: 15cm; }
.letter .sign { font: 500 28pt 'Caveat', cursive; color: ${ACCENT_TEXT}; margin: 8pt 0 0; }
/* Chapter openers */
.chapter { break-before: page; min-height: 24cm; display: flex; flex-direction: column; }
.chapter .photo { width: 100%; height: 13cm; max-height: none; object-fit: cover; margin: 0; }
.chapter .num { font: 600 60pt/1 ${FONT_DISPLAY}; color: ${ACCENT}; margin: 26pt 0 0; }
.chapter h1 { font-size: 34pt; margin: 4pt 0 6pt; }
.chapter .sub { font-size: 12pt; color: #5C534A; margin: 0 0 16pt; }
.chapter ul { list-style: none; padding: 0; margin: 0; columns: 2; column-gap: 18pt; font-size: 11pt; }
.chapter li { padding: 5pt 0; border-bottom: 0.5pt solid rgba(31,26,20,0.15); break-inside: avoid; }
section > .eyebrow { margin: 0 0 2pt; }
.toc h2 { font-size: 13pt; margin: 14pt 0 2pt; color: ${ACCENT_TEXT}; }
.toc ol { margin-top: 0; }
/* Guestbook: last in the book and unnumbered, so more blank pages can be bound in later. */
@page guestbook { @bottom-left { content: none; } @bottom-right { content: none; } }
.guestbook { break-before: page; page: guestbook; }
.guestbook h1 { padding-bottom: 6pt; border-bottom: 1.5pt solid ${ACCENT}; }
.guestbook .entry { margin-top: 16pt; break-inside: avoid; }
.guestbook .meta { display: flex; gap: 18pt; font-size: 8.5pt; color: ${ACCENT_TEXT}; letter-spacing: 0.08em; text-transform: uppercase; }
.guestbook .meta span { flex: 1; border-bottom: 0.5pt solid rgba(31,26,20,0.35); padding-bottom: 14pt; }
.guestbook .line { height: 24pt; border-bottom: 0.5pt solid rgba(31,26,20,0.22); }
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
    if (s.dataset.nofit || start.pages < 2 || start.fill > 0.45) continue;
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
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&family=Caveat:wght@500&display=block" rel="stylesheet">';
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
  const firstNames = PROPERTY.hosts.map((h) => esc(h.name.split(' ')[0]));
  const signature = firstNames.length > 1 ? `${firstNames.slice(0, -1).join(', ')} ${c.and} ${firstNames.at(-1)}` : firstNames[0] ?? '';
  const letterPhoto = PROPERTY.print?.letterPhoto;
  const letter = `
<div class="letter">
  ${letterPhoto ? `<img class="photo" src="${fileSrc(letterPhoto)}" alt="">` : ''}
  <p class="eyebrow">${c.letterEyebrow}</p>
  <h1>${c.letter[0]}</h1>
  ${c.letter.slice(1).map((p) => `<p>${p}</p>`).join('')}
  ${signature ? `<p class="sign">${signature}</p>` : ''}
</div>`;
  const num = (n) => String(n + 1).padStart(2, '0');
  const inChapter = (n) => sections.filter((s) => chapterOf(s) === n);
  const item = (s) => `<li>${s.data.icon ?? ''} ${s.data.title}</li>`;
  const tail = sections.filter((s) => chapterOf(s) === null);
  // Chapter photo: set in property.ts, else the first photo inside that chapter.
  const chapterPhoto = (n) => {
    const set = PROPERTY.print?.chapterPhotos?.[n];
    if (set) return fileSrc(set);
    for (const s of inChapter(n)) { const m = s.body.match(/!\[[^\]]*\]\((\/[^)\s]+)/); if (m) return fileSrc(m[1]); }
    return null;
  };
  const toc = `
<div class="toc"><h1>${c.contents}</h1>
  ${c.chapters.map((t, n) => inChapter(n).length ? `<h2>${num(n)} · ${t}</h2><ol>${inChapter(n).map(item).join('')}</ol>` : '').join('')}
  <h2>${[...tail.map((s) => `${s.data.icon ?? ''} ${s.data.title}`), `✍️ ${c.guestbook}`].join(' · ')}</h2>
</div>`;
  const opener = (n) => `
<div class="chapter">
  ${chapterPhoto(n) ? `<img class="photo" src="${chapterPhoto(n)}" alt="">` : ''}
  <p class="num">${num(n)}</p>
  <h1>${c.chapters[n]}</h1>
  <p class="sub">${c.chapterSubs[n]}</p>
  <ul>${inChapter(n).map(item).join('')}</ul>
</div>`;
  let current = -1;
  const body = sections.map((s) => {
    const n = chapterOf(s);
    const open = n !== null && n !== current ? opener(n) : '';
    if (n !== null) current = n;
    const summary = s.data.printSummary ?? s.data.summary;
    return `${open}
<section id="${s.slug}"${s.slug === 'important' ? ' data-nofit="1" style="--img-max: 13cm"' : ''}>
  ${n === null ? '' : `<p class="eyebrow">${num(n)} · ${c.chapters[n]}</p>`}
  <h1>${s.data.icon ?? ''} ${s.data.title}</h1>
  ${summary ? `<p class="summary">${summary}</p>` : ''}
  ${s.data.safetyCritical ? `<p class="important">${c.important}</p>` : ''}
  ${render(s.body)}
</section>`;
  }).join('\n');
  const entry = `<div class="entry"><div class="meta"><span>${c.gbDate}</span><span style="flex:2">${c.gbNames}</span></div>${'<div class="line"></div>'.repeat(5)}</div>`;
  const guestbook = `
<div class="guestbook"><h1>✍️ ${c.guestbook}</h1><p class="summary">${c.guestbookSub}</p>${entry.repeat(3)}</div>
<div class="guestbook">${entry.repeat(4)}</div>`;
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
  const html = `<!doctype html><html lang="${lang}" style="--footer: '${footer.replace(/'/g, "\\'")}'"><head><meta charset="utf-8"><title>${name} · ${c.title}</title>${fonts}<style>${css}</style></head><body>${cover}${letter}${toc}${body}${back}${guestbook}${FIT}</body></html>`;
  writeFileSync(join(out, `guide-${lang}.html`), html);
  console.log(`dist-print/guide-${lang}.html (${sections.length} sections)`);
}
