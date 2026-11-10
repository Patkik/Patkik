#!/usr/bin/env node
/**
 * Abyssal System UI - profile asset generator for github.com/Patkik
 *
 * Renders every SVG used by README.md into ./assets:
 *   header, section titles, dossier, arsenal, project cards, comms badges,
 *   footer (static design) and telemetry + snake frame (live data).
 *
 * Usage:  node scripts/generate.mjs
 * Env:    METRICS_TOKEN or GITHUB_TOKEN (optional, enables GraphQL calendar)
 *         PROFILE_USER (default: Patkik)
 *         SNAKE_SVG    (default: dist/snake.svg, produced by Platane/snk)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets');
const USER = process.env.PROFILE_USER || 'Patkik';
const TOKEN = process.env.METRICS_TOKEN || process.env.GITHUB_TOKEN || '';
const SNAKE_SVG = path.resolve(ROOT, process.env.SNAKE_SVG || 'dist/snake.svg');

/* ------------------------------------------------------------------ theme */

const C = {
  bg: '#0D1117', abyss: '#060B14', panel: '#0B1322', panel2: '#0F1A2E',
  line: '#1C2A44', cyan: '#00F0FF', sky: '#38BDF8', blue: '#3B82F6',
  cobalt: '#1E3A8A', indigo: '#818CF8', text: '#E6EDF3', soft: '#B6C2D6',
  muted: '#7D8BA6', dim: '#4A5A78', ok: '#3DFFB0',
};
const SANS = `'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const MONO = `'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace`;

/* ---------------------------------------------------------------- helpers */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tw = (s, size, mono = false, ls = 0) => String(s).length * size * (mono ? 0.6 : 0.56) + ls * String(s).length;
const fmt = (n) => Number(n).toLocaleString('en-US');
const r1 = (n) => Math.round(n * 10) / 10;
const chamfer = (x, y, w, h, c = 14) => `M${x + c} ${y}H${x + w}V${y + h - c}L${x + w - c} ${y + h}H${x}V${y + c}Z`;

const doc = (w, h, title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>\n`;

const text = (x, y, str, { size = 14, fill = C.text, font = SANS, weight = 400, anchor = 'start', ls = 0, opacity = 1, extra = '' } = {}) =>
  `<text x="${r1(x)}" y="${r1(y)}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}"${opacity !== 1 ? ` opacity="${opacity}"` : ''} ${extra}>${esc(str)}</text>`;
const mono = (x, y, str, o = {}) => text(x, y, str, { font: MONO, size: 11, fill: C.muted, ls: 2, ...o });

const GLOW = `<filter id="p-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

/** Shared chamfered HUD frame. Content goes between `back` and `front`. */
function panel(w, h, { label = '', meta = '', c = 22 } = {}) {
  const shape = chamfer(1, 1, w - 2, h - 2, c);
  const tabW = label ? Math.round(tw(label, 11, true, 2.5)) + 40 : 0;
  const a = c + 18;
  return {
    defs: `
      <linearGradient id="p-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.panel}"/><stop offset="1" stop-color="${C.abyss}"/></linearGradient>
      <linearGradient id="p-edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.blue}" stop-opacity=".3"/><stop offset="1" stop-color="${C.cyan}"/></linearGradient>
      <pattern id="p-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${C.cyan}" stroke-opacity=".035"/></pattern>
      <clipPath id="p-clip"><path d="${shape}"/></clipPath>
      ${GLOW}`,
    back: `<path d="${shape}" fill="url(#p-bg)"/><path d="${shape}" fill="url(#p-grid)"/>`,
    front: `
      <path d="${shape}" fill="none" stroke="${C.line}" stroke-width="1.5"/>
      <path d="${chamfer(7, 7, w - 14, h - 14, c - 4)}" fill="none" stroke="url(#p-edge)" stroke-opacity=".28"/>
      <path d="M1 ${c + 1}L${c + 1} 1" stroke="${C.cyan}" stroke-width="2.5" filter="url(#p-glow)"/>
      <path d="M${w - 1} ${h - c - 1}L${w - c - 1} ${h - 1}" stroke="${C.cyan}" stroke-width="2.5" filter="url(#p-glow)"/>
      <path d="M${w - 34} 1H${w - 1}V34" fill="none" stroke="${C.cyan}" stroke-width="2"/>
      <path d="M1 ${h - 34}V${h - 1}H34" fill="none" stroke="${C.cyan}" stroke-width="2"/>
      ${label ? `<path d="M${a} 1H${a + tabW}L${a + tabW - 12} 27H${a + 12}Z" fill="${C.cobalt}" fill-opacity=".6" stroke="${C.cyan}" stroke-opacity=".55"/>
      ${mono(a + tabW / 2, 18.5, label, { fill: C.cyan, anchor: 'middle', ls: 2.5 })}` : ''}
      ${meta ? mono(w - 46, 19, meta, { anchor: 'end' }) : ''}`,
  };
}

function wrap(str, max) {
  const lines = [];
  let cur = '';
  for (const word of str.split(/\s+/)) {
    if ((cur + ' ' + word).trim().length > max) { lines.push(cur); cur = word; } else cur = (cur + ' ' + word).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

async function writeIfChanged(name, content) {
  const file = path.join(OUT, name);
  try { if ((await fs.readFile(file, 'utf8')) === content) return; } catch { /* new file */ }
  await fs.writeFile(file, content);
  console.log('  wrote', name);
}

/* ------------------------------------------------------------------ icons */

const iconCache = new Map();
async function icon(slug) {
  if (!slug) return null;
  if (iconCache.has(slug)) return iconCache.get(slug);
  let d = null;
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@9/icons/${slug}.svg`);
    if (res.ok) d = (await res.text()).match(/ d="([^"]+)"/)?.[1] ?? null;
  } catch { /* offline: fall back to no icon */ }
  iconCache.set(slug, d);
  return d;
}
const iconAt = (d, x, y, size, fill, opacity = 1) =>
  d ? `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${d}" fill="${fill}" opacity="${opacity}"/></svg>` : '';

/* ================================================================ HEADER */

function header() {
  const W = 1200, H = 400;
  const p = panel(W, H, { label: 'PROFILE.SYS', meta: 'NODE PATKIK  /  8.15N 125.13E' });
  const cx = 968, cy = 214, R = 150;
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (a, r) => [r1(cx + r * Math.cos(rad(a))), r1(cy + r * Math.sin(rad(a)))];
  const wedge = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M${cx} ${cy}L${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}Z`; };

  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = i * 5, long = a % 30 === 0;
    const [x0, y0] = pt(a, R + 4), [x1, y1] = pt(a, R + (long ? 16 : 9));
    return `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${C.cyan}" stroke-opacity="${long ? 0.7 : 0.25}"/>`;
  }).join('');
  const bearings = [0, 90, 180, 270].map((a) => {
    const [x, y] = pt(a - 90, R + 30);
    return mono(x, y + 4, String(a).padStart(3, '0'), { anchor: 'middle', size: 10, fill: C.dim, ls: 1 });
  }).join('');
  const trail = Array.from({ length: 6 }, (_, k) => `<path d="${wedge(-8 * (k + 1), -8 * k, R)}" fill="${C.cyan}" fill-opacity="${r1(0.22 / (k + 1) * 10) / 10}"/>`).join('');
  const blips = [
    { a: -55, r: 108, l: 'RUST' }, { a: 28, r: 128, l: 'KOTLIN' },
    { a: 140, r: 82, l: 'TYPESCRIPT' }, { a: 215, r: 118, l: 'IOT / ESP32' }, { a: 95, r: 52, l: 'AI' },
  ].map(({ a, r, l }) => {
    const [x, y] = pt(a, r);
    const t = r1((((a % 360) + 360) % 360) / 360 * 6);
    return `<g>
      <circle cx="${x}" cy="${y}" r="4" fill="${C.cyan}" opacity=".15" filter="url(#p-glow)"><animate attributeName="opacity" values="1;.15;.15" keyTimes="0;.7;1" dur="6s" begin="${t}s" repeatCount="indefinite"/></circle>
      <circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${C.cyan}" opacity="0"><animate attributeName="r" values="4;18" dur="1.4s" begin="${t}s;${t + 6}s;${t + 12}s" fill="freeze"/><animate attributeName="opacity" values=".9;0" dur="1.4s" begin="${t}s;${t + 6}s;${t + 12}s" fill="freeze"/></circle>
      ${mono(x + 10, y - 8, l, { size: 9.5, fill: C.soft, ls: 1.5, opacity: 0.85 })}
    </g>`;
  }).join('');

  const chips = ['4TH-YR BSIT  /  BUKIDNON STATE UNIV', 'MALAYBALAY CITY, BUKIDNON, PH', 'FULL-STACK & SYSTEMS ARCHITECT'];
  let chipX = 70;
  const chipSvg = chips.map((c) => {
    const w = tw(c, 11, true, 1.5) + 26;
    const s = `<path d="${chamfer(chipX, 314, w, 28, 7)}" fill="${C.cobalt}" fill-opacity=".25" stroke="${C.cyan}" stroke-opacity=".35"/>${mono(chipX + w / 2, 332, c, { anchor: 'middle', fill: C.soft, ls: 1.5 })}`;
    chipX += w + 10;
    return s;
  }).join('');

  const wave = (amp, y, len) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= len; x += 30) d += ` Q${x + 15} ${y + (x / 30 % 2 ? amp : -amp)} ${x + 30} ${y}`;
    return d;
  };

  const body = `
  <defs>${p.defs}
    <radialGradient id="h-glow" cx=".8" cy=".52" r=".55"><stop offset="0" stop-color="${C.cobalt}" stop-opacity=".7"/><stop offset="1" stop-color="${C.cobalt}" stop-opacity="0"/></radialGradient>
    <linearGradient id="h-name" x1="0" x2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#BDF6FF"/></linearGradient>
    <linearGradient id="h-out" x1="0" x2="1"><stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.blue}"/></linearGradient>
    <linearGradient id="h-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity=".22"/><stop offset="1" stop-color="${C.cobalt}" stop-opacity=".05"/></linearGradient>
    <linearGradient id="h-shine" gradientUnits="userSpaceOnUse" x1="-260" y1="0" x2="-60" y2="0">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="0 0;0 0;900 0" keyTimes="0;.45;1" dur="5s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="h-fade" x1="0" x2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/><stop offset=".5" stop-color="${C.cyan}" stop-opacity=".8"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/></linearGradient>
  </defs>
  ${p.back}
  <g clip-path="url(#p-clip)">
    <rect width="${W}" height="${H}" fill="url(#h-glow)"/>
    <!-- depth contours -->
    <g fill="none" stroke="${C.blue}" stroke-opacity=".08">
      <ellipse cx="${cx}" cy="${cy}" rx="250" ry="200"/><ellipse cx="${cx}" cy="${cy}" rx="330" ry="260"/><ellipse cx="${cx}" cy="${cy}" rx="420" ry="330"/>
    </g>
    <!-- sonar -->
    <g>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.abyss}" fill-opacity=".55" stroke="${C.cyan}" stroke-opacity=".5"/>
      ${[37.5, 75, 112.5].map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.cyan}" stroke-opacity=".14" stroke-dasharray="2 4"/>`).join('')}
      <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${C.cyan}" stroke-opacity=".14"/>
      <line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="${C.cyan}" stroke-opacity=".14"/>
      ${ticks}${bearings}
      <g><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="6s" repeatCount="indefinite"/>
        ${trail}<line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${C.cyan}" stroke-width="2" filter="url(#p-glow)"/>
      </g>
      ${blips}
      <circle cx="${cx}" cy="${cy}" r="4" fill="${C.cyan}" filter="url(#p-glow)"/>
    </g>
    <!-- scan line -->
    <rect x="0" width="${W}" height="1.5" fill="url(#h-fade)" opacity=".5"><animate attributeName="y" values="40;${H - 20};40" dur="9s" repeatCount="indefinite"/></rect>
    <!-- waves -->
    <g opacity=".55">
      <path d="${wave(5, 378, 2460)}" fill="none" stroke="${C.cyan}" stroke-opacity=".35"><animateTransform attributeName="transform" type="translate" values="0 0;-60 0" dur="2.4s" repeatCount="indefinite"/></path>
      <path d="${wave(4, 386, 2460)}" fill="none" stroke="${C.blue}" stroke-opacity=".35"><animateTransform attributeName="transform" type="translate" values="-60 0;0 0" dur="3.2s" repeatCount="indefinite"/></path>
    </g>
  </g>

  <!-- identity -->
  <rect x="70" y="84" width="28" height="2" fill="${C.cyan}"/>
  ${mono(108, 89, 'OPERATOR FILE  /  CLASS: ARCHITECT', { fill: C.cyan, ls: 3.5 })}
  ${text(66, 166, 'PATRICK JOSH', { size: 68, weight: 800, fill: 'url(#h-name)', ls: 3 })}
  <text x="68" y="238" font-family="${SANS}" font-size="68" font-weight="800" letter-spacing="12" fill="url(#h-fill)" stroke="url(#h-out)" stroke-width="1.6">AÑEDEZ</text>
  <text x="68" y="238" font-family="${SANS}" font-size="68" font-weight="800" letter-spacing="12" fill="none" stroke="url(#h-shine)" stroke-width="2.2" filter="url(#p-glow)">AÑEDEZ</text>
  ${text(70, 286, 'Full-Stack Developer  ·  Systems & AI Engineer', { size: 22, fill: C.soft, ls: 0.5 })}
  ${chipSvg}
  <!-- status -->
  <circle cx="76" cy="58" r="4" fill="${C.ok}"><animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/></circle>
  ${mono(88, 62, 'SYSTEM ONLINE', { fill: C.ok, size: 10.5 })}
  ${mono(200, 62, '//  ABYSSAL INTERFACE v26.11', { size: 10.5, fill: C.dim })}
  ${p.front}`;
  return doc(W, H, 'Patrick Josh Añedez - Full-Stack Developer, Systems & AI Engineer', body);
}

/* ======================================================= SECTION TITLES */

function section(idx, title, sub, total = 5) {
  const W = 1200, H = 92;
  const n = String(idx).padStart(2, '0');
  const tW = tw(title, 26, false, 4) + 8;
  const lineStart = Math.max(96 + tW + 26, 96 + tw(sub, 12, true, 1) + 26);
  const lineEnd = 1080;
  const ticks = [];
  for (let x = lineStart; x <= lineEnd; x += 12) ticks.push(`<line x1="${r1(x)}" y1="44" x2="${r1(x)}" y2="${(x - lineStart) % 60 < 1 ? 36 : 40}" stroke="${C.cyan}" stroke-opacity=".3"/>`);
  const body = `
  <defs>${GLOW}
    <linearGradient id="s-line" x1="0" x2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity=".8"/><stop offset="1" stop-color="${C.blue}" stop-opacity=".1"/></linearGradient>
  </defs>
  <path d="${chamfer(2, 16, 70, 60, 12)}" fill="${C.cobalt}" fill-opacity=".35" stroke="${C.cyan}" stroke-opacity=".8"/>
  <path d="M2 28L14 16" stroke="${C.cyan}" stroke-width="2.5" filter="url(#p-glow)"/>
  ${text(37, 56, n, { font: MONO, size: 26, weight: 700, fill: C.cyan, anchor: 'middle', extra: 'filter="url(#p-glow)"' })}
  ${text(96, 50, title, { size: 26, weight: 700, ls: 4, fill: C.text })}
  ${mono(97, 72, sub, { size: 12, ls: 1, fill: C.muted })}
  <line x1="${r1(lineStart)}" y1="44" x2="${lineEnd}" y2="44" stroke="url(#s-line)"/>
  ${ticks.join('')}
  <circle cy="44" r="3" fill="${C.cyan}" filter="url(#p-glow)"><animate attributeName="cx" values="${r1(lineStart)};${lineEnd}" dur="3.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="3.5s" repeatCount="indefinite"/></circle>
  <path d="M${lineEnd + 8} 38l6 6-6 6" fill="none" stroke="${C.cyan}" stroke-opacity=".6"/>
  ${mono(1196, 48, `SEC.${n} / ${String(total).padStart(2, '0')}`, { anchor: 'end', fill: C.dim })}`;
  return doc(W, H, `${n} ${title}`, body);
}

/* ============================================================== DOSSIER */

function dossier() {
  const W = 1200, H = 480;
  const p = panel(W, H, { label: 'OPERATOR DOSSIER // TECHNICAL PORTFOLIO', meta: 'VERIFIED CREDENTIALS // ISO/IEC 25010' });
  const rows = [
    ['OPERATOR', 'Patrick Josh S. Añedez'],
    ['CALLSIGN', 'DracoNox  /  @Patkik'],
    ['CLASS', 'Full-Stack Developer & Systems Architect'],
    ['GUILD', 'Bukidnon State University (4th-Year BSIT)'],
    ['BASE', 'Malaybalay City, Bukidnon, Philippines'],
    ['ROLES', 'Lead Architect (CMS-V2)  /  Lead Dev (COMSOC)'],
    ['ENGINEERING', 'Async Microservices, RFID Telemetry, Hardening'],
    ['EVALUATION', 'ISO/IEC 25010 4.51/5.00 ("Excellent")  /  140 QA Cases'],
  ];
  const left = rows.map(([k, v], i) => {
    const y = 96 + i * 40;
    return `${mono(54, y, k, { size: 10.5 })}<line x1="${54 + tw(k, 10.5, true, 2) + 8}" y1="${y - 4}" x2="196" y2="${y - 4}" stroke="${C.line}" stroke-dasharray="2 3"/>${text(212, y + 1, v, { size: 16.5, fill: i === 0 ? C.text : C.soft, weight: i === 0 ? 600 : 400 })}`;
  }).join('');

  const status = { FLAGSHIP: C.ok, PRODUCTION: C.cyan, PIPELINE: C.sky, 'R&D': C.indigo };
  const ops = [
    ['FLAGSHIP', 'BukSU CMS-V2 (Project Workspace)', 'CHROMA VECTOR SIMILARITY / 4-TIER RBAC / DOCKER'],
    ['FLAGSHIP', 'RacePulsePH Event Timing', 'REAL-TIME RFID BIB & FINISH-LINE SENSOR SUITE'],
    ['PRODUCTION', 'COMSOC Mentoring Info System', 'PEER-TUTORING & PROGRAMMING MENTORSHIP MATCHING'],
    ['PRODUCTION', 'MedPulsePH Health Platform', 'VITAL TELEMETRY & CLINICAL ACCESS / RUST & POSTGRES'],
    ['PIPELINE', 'AudiobookTTSGenerator', 'NEURAL TTS CHUNKING & BOUNDARY NORMALIZATION'],
    ['R&D', 'WSB Dance Championship App', 'REAL-TIME BRACKET TRACKING & LIVE JUDGING SCORES'],
  ];
  const right = ops.map(([s, name, sub], i) => {
    const y = 124 + i * 50;
    const col = status[s];
    return `<path d="${chamfer(668, y - 15, 102, 22, 6)}" fill="${col}" fill-opacity=".1" stroke="${col}" stroke-opacity=".6"/>
      ${mono(719, y, s, { anchor: 'middle', size: 9.5, fill: col, ls: 1.5 })}
      ${text(786, y + 1, name, { size: 16, weight: 600, fill: C.text })}
      ${mono(786, y + 20, sub, { size: 9.5, fill: C.muted, ls: 1.1 })}`;
  }).join('');

  const prompt = 'patkik@abyss:~$ cargo run --release --bin portfolio-audit';
  const body = `
  <defs>${p.defs}</defs>
  ${p.back}
  <g clip-path="url(#p-clip)">
    <rect x="636" y="56" width="1" height="340" fill="${C.cyan}" opacity=".18"/>
    <rect x="636" y="56" width="1" height="60" fill="${C.cyan}" filter="url(#p-glow)"><animate attributeName="y" values="56;336;56" dur="7s" repeatCount="indefinite"/></rect>
  </g>
  ${left}
  ${mono(668, 82, 'FEATURED CAMPUS & ENTERPRISE SYSTEMS', { fill: C.cyan, ls: 2.5 })}
  ${right}
  <path d="${chamfer(40, 412, 1120, 44, 10)}" fill="${C.abyss}" stroke="${C.line}"/>
  ${mono(62, 439, prompt, { size: 13, fill: C.cyan, ls: 0.5 })}
  <rect x="${r1(62 + tw(prompt, 13, true, 0.5) + 8)}" y="427" width="9" height="16" fill="${C.cyan}"><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.5;.5;1" dur="1.1s" repeatCount="indefinite"/></rect>
  ${mono(1138, 439, 'EXIT 0  /  ISO/IEC 25010 VERIFIED  /  QA 140/140 PASSED', { anchor: 'end', size: 10.5, fill: C.ok, ls: 1.5 })}
  ${p.front}`;
  return doc(W, H, 'Operator dossier: Patrick Josh S. Añedez - Technical & Software Engineering Portfolio', body);
}

/* ============================================================== ARSENAL */

const ARSENAL = [
  { cat: 'LANGUAGES & SYSTEMS', color: C.cyan, items: [
    ['Rs', 'Rust', 'rust'], ['Ts', 'TypeScript', 'typescript'], ['Js', 'JavaScript', 'javascript'], ['Py', 'Python', 'python'],
    ['Jv', 'Java', 'openjdk'], ['Kt', 'Kotlin', 'kotlin'], ['Cp', 'C++', 'cplusplus'], ['Ph', 'PHP', 'php'], ['Sq', 'SQL', 'postgresql']] },
  { cat: 'INTERFACE & MOBILE', color: C.sky, items: [
    ['Re', 'React.js', 'react'], ['Rn', 'React Native', 'react'], ['Nx', 'Next.js', 'nextdotjs'], ['Jc', 'Compose', 'jetpackcompose'],
    ['Tw', 'Tailwind', 'tailwindcss'], ['Vt', 'Vite', 'vite'], ['Pw', 'PWA', 'pwa'], ['Lf', 'Leaflet GIS', 'leaflet'], ['An', 'Android', 'android']] },
  { cat: 'BACKEND, DATA & VECTORS', color: C.blue, items: [
    ['Fa', 'FastAPI', 'fastapi'], ['Ex', 'Express 5', 'express'], ['Nd', 'Node.js', 'nodedotjs'], ['Mg', 'MongoDB', 'mongodb'],
    ['Rd', 'Redis', 'redis'], ['Ch', 'ChromaDB', 'databricks'], ['S3', 'MinIO S3', 'minio'], ['Pg', 'PostgreSQL', 'postgresql'], ['Mq', 'BullMQ/Celery', 'celery']] },
  { cat: 'DEVOPS, SECURITY & TOOLS', color: C.indigo, items: [
    ['Dk', 'Docker', 'docker'], ['Ci', 'Cisco L2/L3', 'cisco'], ['Rf', 'RFID/Sensors', 'nfc'], ['Ga', 'GH Actions', 'githubactions'],
    ['Aw', 'AWS', 'amazon'], ['Lx', 'Linux Admin', 'linux'], ['Ax', 'Axum/Tokio', 'rust'], ['Cu', 'Cursor Pro', 'cursor'], ['Cl', 'Claude Code', 'anthropic']] },
];

async function arsenal() {
  const W = 1200, H = 650;
  const p = panel(W, H, { label: 'ARSENAL // PERIODIC TABLE', meta: `${ARSENAL.reduce((a, c) => a + c.items.length, 0)} ELEMENTS LOADED` });
  const tileW = 116, tileH = 120, gap = 9, x0 = 64, y0 = 104;
  let legendX = 64;
  const legend = ARSENAL.map(({ cat, color }) => {
    const s = `<rect x="${legendX}" y="62" width="10" height="10" fill="${color}"/>${mono(legendX + 18, 71.5, cat, { size: 10.5, fill: C.soft, ls: 2 })}`;
    legendX += tw(cat, 10.5, true, 2) + 52;
    return s;
  }).join('');

  let n = 0;
  const rows = [];
  for (const [ri, { color, items }] of ARSENAL.entries()) {
    const y = y0 + ri * (tileH + 14);
    rows.push(`<rect x="40" y="${y}" width="3" height="${tileH}" fill="${color}" opacity=".8"/>`);
    for (const [ci, [sym, name, slug]] of items.entries()) {
      n += 1;
      const x = x0 + ci * (tileW + gap);
      const d = await icon(slug);
      const begin = r1((ri * 9 + ci) * 0.22);
      rows.push(`<g transform="translate(${x} ${y})">
        <path d="${chamfer(0, 0, tileW, tileH, 12)}" fill="${C.panel2}" fill-opacity=".9"/>
        <path d="${chamfer(0, 0, tileW, tileH, 12)}" fill="${color}" fill-opacity="0"><animate attributeName="fill-opacity" values="0;.12;0;0" keyTimes="0;.03;.08;1" dur="8s" begin="${begin}s" repeatCount="indefinite"/></path>
        <path d="${chamfer(0, 0, tileW, tileH, 12)}" fill="none" stroke="${color}" stroke-opacity=".35"><animate attributeName="stroke-opacity" values=".35;1;.35;.35" keyTimes="0;.03;.08;1" dur="8s" begin="${begin}s" repeatCount="indefinite"/></path>
        <path d="M0 12L12 0" stroke="${color}" stroke-width="2"/>
        ${mono(14, 24, String(n).padStart(2, '0'), { size: 10, fill: C.muted, ls: 1 })}
        ${iconAt(d, tileW - 28, 10, 16, color, 0.85)}
        ${text(tileW / 2, 76, sym, { size: 38, weight: 700, fill: C.text, anchor: 'middle' })}
        ${mono(tileW / 2, 104, name.toUpperCase(), { size: name.length > 12 ? 8.5 : 9.5, fill: color, anchor: 'middle', ls: name.length > 12 ? 0.6 : 1.2 })}
      </g>`);
    }
  }
  const body = `<defs>${p.defs}</defs>${p.back}${legend}${rows.join('')}${p.front}`;
  return doc(W, H, 'Tech stack: languages, interface, backend and systems tooling', body);
}

/* ========================================================= PROJECT CARDS */

const PROJECTS = [
  { slug: 'cms-v2', repo: 'CMS-V2', title: 'BukSU CMS-V2 (Project Workspace)', tag: 'FLAGSHIP // CAPSTONE & PLAGIARISM', lang: ['JavaScript', '#F1E05A'],
    desc: 'Full-stack institutional capstone platform with async lexical winnowing + ChromaDB vector similarity across 22 audited algorithms, 4-tier RBAC, and Docker. Rated 4.51/5.00 ("Excellent") on ISO/IEC 25010 with 140 QA test cases.',
    chips: ['React.js', 'Express 5', 'FastAPI', 'ChromaDB', 'Redis', 'Docker'] },
  { slug: 'racepulse', repo: 'RacePulsePH', title: 'RacePulsePH', tag: 'FLAGSHIP // ATHLETIC EVENT TIMING', lang: ['TypeScript', '#3178C6'],
    desc: 'Athletic timing and race management system. Calibrated RFID bib scanners and finish-line checkpoint antenna hardware with real-time web dashboards and React Native mobile leaderboards.',
    chips: ['React Native', 'React.js', 'RFID', 'REST APIs', 'Sensors'] },
  { slug: 'comsoc', repo: 'Monitoring-Information-Systems', title: 'COMSOC Mentoring Info System', tag: 'CAMPUS // BUKSU COMPUTER SOCIETY', lang: ['TypeScript', '#3178C6'],
    desc: 'Automated peer-tutoring and programming mentorship matching system engineered as Lead Developer for BukSU Computer Society (COMSOC) with role-based session scheduling and conflict-free tracking.',
    chips: ['TypeScript', 'MongoDB Atlas', 'Session Scheduling', 'RBAC'] },
  { slug: 'medpulse', repo: 'MedPulsePH', title: 'MedPulsePH', tag: 'SPECIALIZED // DIGITAL HEALTHCARE', lang: ['Rust', '#DEA584'],
    desc: 'Digital healthcare platform centered on NFC wristbands and patient-authorized clinical access, with split identity and clinical PostgreSQL vaults, Redis, and health telemetry APIs.',
    chips: ['Rust API', 'React Native', 'PostgreSQL', 'Redis', 'NFC'] },
  { slug: 'audiobook', repo: 'AudiobookTTSGenerator', title: 'AudiobookTTSGenerator', tag: 'PIPELINE // NEURAL TEXT-TO-SPEECH', lang: ['Python', '#3572A5'],
    desc: 'Automated document-to-audiobook pipeline that extracts chapter text from manuscripts and ebooks, handles sentence chunking and boundary normalization, and batches high-fidelity neural audio.',
    chips: ['Python', 'Neural TTS', 'Audio Processing', 'CLI / Batch'] },
  { slug: 'wsb', repo: 'World-Supremacy-Battleground-app', title: 'World Supremacy Battlegrounds', tag: 'ENTERPRISE // EVENT SCORING & BRACKETS', lang: ['Rust', '#DEA584'],
    desc: 'Competition platform engineered for the international street dance championship, supporting participant registration, competition bracket tracking, real-time judging, and live leaderboard scoring.',
    chips: ['Next.js', 'Rust Axum', 'Firebase', 'Real-Time DB', 'Docker'] },
];

function projectCard(pj, i) {
  const W = 600, H = 300;
  const id = `OP-${String(i + 1).padStart(2, '0')}`;
  const shape = chamfer(1, 1, W - 2, H - 2, 18);
  const lines = wrap(pj.desc, 66).slice(0, 4);
  let cx = 32;
  const chips = pj.chips.map((c) => {
    const w = tw(c, 11, true, 1) + 22;
    const s = `<path d="${chamfer(cx, 222, w, 26, 6)}" fill="${C.cobalt}" fill-opacity=".3" stroke="${C.sky}" stroke-opacity=".4"/>${mono(cx + w / 2, 239.5, c, { anchor: 'middle', fill: C.soft, ls: 1 })}`;
    cx += w + 8;
    return s;
  }).join('');
  const body = `
  <defs>
    <linearGradient id="c-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.panel2}"/><stop offset="1" stop-color="${C.abyss}"/></linearGradient>
    <linearGradient id="c-top" x1="0" x2="1"><stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.cobalt}" stop-opacity="0"/></linearGradient>
    <clipPath id="c-clip"><path d="${shape}"/></clipPath>
    ${GLOW}
  </defs>
  <path d="${shape}" fill="url(#c-bg)"/>
  <g clip-path="url(#c-clip)">
    <text x="${W - 24}" y="${H - 34}" font-family="${MONO}" font-size="120" font-weight="700" fill="${C.cyan}" fill-opacity=".035" text-anchor="end">${String(i + 1).padStart(2, '0')}</text>
    <rect x="0" y="0" width="${W}" height="3" fill="url(#c-top)"/>
    <rect x="-200" y="0" width="200" height="3" fill="${C.cyan}" filter="url(#p-glow)"><animate attributeName="x" values="-200;${W}" dur="4s" begin="${i * 0.6}s" repeatCount="indefinite"/></rect>
  </g>
  <path d="${shape}" fill="none" stroke="${C.line}" stroke-width="1.5"/>
  <path d="M1 19L19 1" stroke="${C.cyan}" stroke-width="2.5" filter="url(#p-glow)"/>
  <path d="M${W - 24} 1H${W - 1}V24" fill="none" stroke="${C.cyan}" stroke-opacity=".7" stroke-width="1.5"/>
  ${mono(32, 44, `${id}  //  ${pj.tag}`, { fill: C.cyan, ls: 2 })}
  <circle cx="${W - 32 - tw(pj.lang[0], 11, true, 1) - 12}" cy="40" r="5" fill="${pj.lang[1]}"/>
  ${mono(W - 32, 44, pj.lang[0], { anchor: 'end', fill: C.soft, ls: 1 })}
  ${text(32, 88, pj.title, { size: 27, weight: 700, fill: C.text, ls: 0.3 })}
  ${lines.map((l, k) => text(32, 124 + k * 23, l, { size: 15.5, fill: C.soft })).join('')}
  ${chips}
  <line x1="32" y1="264" x2="${W - 32}" y2="264" stroke="${C.line}"/>
  ${mono(32, 284, `github.com/${USER}/${pj.repo}`.slice(0, 52), { size: 10, fill: C.dim, ls: 0.8 })}
  ${mono(W - 50, 284, 'OPEN REPOSITORY', { anchor: 'end', size: 10.5, fill: C.cyan, ls: 2 })}
  <path d="M${W - 42} 276l6 4.5-6 4.5" fill="none" stroke="${C.cyan}" stroke-width="1.5"/>`;
  return doc(W, H, `${pj.title} - ${pj.desc}`, body);
}

/* ======================================================= SECURITY & QA */

function securityAudit() {
  const W = 1200, H = 250;
  const p = panel(W, H, { label: 'STANDARDS // INFRASTRUCTURE HARDENING & QA', meta: 'VERIFIED ENGINEERING CONTROLS' });
  const colW = 356, h = 150, y = 62;
  const cols = [
    {
      tag: 'QA & EVALUATION', title: 'ISO/IEC 25010', score: '4.51 / 5.00', stat: '"EXCELLENT" RATING',
      lines: ['71 student & faculty evaluators', '140-case structured QA test suite', 'Automated regression test coverage'],
      col: C.ok
    },
    {
      tag: 'NETWORK HARDENING', title: 'Cisco L2/L3 Security', score: 'SSHv2 / ACL', stat: 'TOPOLOGY HARDENED',
      lines: ['Multi-router Layer 2/3 topology', 'Telnet & HTTP cleartext elimination', 'VLAN segmentation & Extended ACLs'],
      col: C.cyan
    },
    {
      tag: 'DATA COMPLIANCE', title: 'Legal & Risk Privacy', score: 'RA 10173', stat: 'NPC & GDPR AUDIT',
      lines: ['Republic Act 10173 (DPA 2012) controls', 'HTTP-only JWT family token rotation', 'Atomic updates & immutable audit trail'],
      col: C.sky
    },
  ];
  const items = cols.map((c, i) => {
    const x = 40 + i * (colW + 26);
    return `<g transform="translate(${x} ${y})">
      <path d="${chamfer(0, 0, colW, h, 10)}" fill="${C.panel2}" stroke="${C.line}"/>
      <path d="M0 14L14 0" stroke="${c.col}" stroke-width="2"/>
      ${mono(16, 24, c.tag, { size: 9.5, fill: c.col, ls: 1.5 })}
      ${text(16, 52, c.title, { size: 21, weight: 700, fill: C.text })}
      ${mono(colW - 16, 36, c.score, { anchor: 'end', size: 13, weight: 700, fill: c.col, ls: 1 })}
      ${mono(colW - 16, 52, c.stat, { anchor: 'end', size: 8.5, fill: C.muted, ls: 1 })}
      <line x1="16" y1="64" x2="${colW - 16}" y2="64" stroke="${C.line}"/>
      ${c.lines.map((l, k) => `<circle cx="22" cy="${84 + k * 22}" r="2" fill="${c.col}"/>${text(32, 88 + k * 22, l, { size: 12.5, fill: C.soft })}`).join('')}
    </g>`;
  }).join('');
  const body = `<defs>${p.defs}</defs>${p.back}${items}${p.front}`;
  return doc(W, H, 'Infrastructure Security, Cisco Hardening and ISO/IEC 25010 Evaluation', body);
}

/* ================================================================ COMMS */

const COMMS = [
  { slug: 'email', label: 'EMAIL DIRECT', value: 'patrickjoshanedez35@gmail.com', icon: 'gmail' },
  { slug: 'linkedin', label: 'LINKEDIN', value: 'patrickjosh19', icon: 'linkedin' },
  { slug: 'github', label: 'GITHUB PROFILE', value: '@Patkik', icon: 'github' },
  { slug: 'facebook', label: 'FACEBOOK', value: 'Patkik.juice', icon: 'facebook' },
];

async function badge({ label, value, icon: ic }, i) {
  const W = 588, H = 84;
  const shape = chamfer(1, 1, W - 2, H - 2, 14);
  const d = await icon(ic);
  const body = `
  <defs>
    <linearGradient id="b-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.panel2}"/><stop offset="1" stop-color="${C.abyss}"/></linearGradient>
    ${GLOW}
  </defs>
  <path d="${shape}" fill="url(#b-bg)"/>
  <path d="${shape}" fill="none" stroke="${C.line}" stroke-width="1.5"/>
  <path d="${shape}" fill="none" stroke="${C.cyan}" stroke-width="2" pathLength="100" stroke-dasharray="14 86" filter="url(#p-glow)"><animate attributeName="stroke-dashoffset" values="0;-100" dur="4s" begin="${i * 1.3}s" repeatCount="indefinite"/></path>
  <path d="${chamfer(16, 14, 56, 56, 10)}" fill="${C.cobalt}" fill-opacity=".45" stroke="${C.cyan}" stroke-opacity=".6"/>
  ${iconAt(d, 30, 28, 28, C.cyan) || text(44, 50, label[0], { size: 24, weight: 700, fill: C.cyan, anchor: 'middle' })}
  ${mono(88, 35, `${label}  //  CHANNEL 0${i + 1}`, { size: 10, fill: C.muted, ls: 1.8 })}
  ${text(88, 60, value, { size: value.length > 25 ? 16 : 19, weight: 600, fill: C.text })}
  <path d="M${W - 36} 36l8 6-8 6" fill="none" stroke="${C.cyan}" stroke-width="2"/>
  <path d="M${W - 46} 36l8 6-8 6" fill="none" stroke="${C.cyan}" stroke-opacity=".35" stroke-width="2"/>`;
  return doc(W, H, `${label}: ${value}`, body);
}

function footer() {
  const W = 1200, H = 150;
  const wave = (amp, y, len, step) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= len; x += step) d += ` Q${x + step / 2} ${y + ((x / step) % 2 ? amp : -amp)} ${x + step} ${y}`;
    return `${d} V${H} H0Z`;
  };
  const body = `
  <defs>
    <linearGradient id="f-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cobalt}" stop-opacity=".9"/><stop offset="1" stop-color="${C.abyss}"/></linearGradient>
    <linearGradient id="f-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity=".35"/><stop offset="1" stop-color="${C.abyss}" stop-opacity="0"/></linearGradient>
    <linearGradient id="f-l" x1="0" x2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/><stop offset=".5" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/></linearGradient>
    ${GLOW}
  </defs>
  <path d="${wave(10, 92, 2520, 120)}" fill="url(#f-b)"><animateTransform attributeName="transform" type="translate" values="0 0;-240 0" dur="7s" repeatCount="indefinite"/></path>
  <path d="${wave(8, 104, 2520, 160)}" fill="url(#f-a)"><animateTransform attributeName="transform" type="translate" values="-320 0;0 0" dur="9s" repeatCount="indefinite"/></path>
  <rect x="300" y="38" width="600" height="1" fill="url(#f-l)"/>
  ${mono(600, 28, 'END OF TRANSMISSION', { anchor: 'middle', fill: C.cyan, ls: 6, size: 12, extra: 'filter="url(#p-glow)"' })}
  ${mono(600, 60, 'DIVE DEEPER  /  BUILD FASTER  /  SHIP CLEANER', { anchor: 'middle', fill: C.muted, ls: 3, size: 10 })}
  ${mono(600, 136, 'ASSETS RENDERED BY SCRIPTS/GENERATE.MJS', { anchor: 'middle', fill: C.soft, ls: 2, size: 9, opacity: 0.55 })}`;
  return doc(W, H, 'End of transmission', body);
}

/* ============================================================ TELEMETRY */

const gh = async (url, opts = {}) => {
  const res = await fetch(url, { ...opts, headers: { 'User-Agent': 'patkik-profile', Accept: 'application/vnd.github+json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}), ...opts.headers } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

async function calendar() {
  if (TOKEN) {
    try {
      const q = `query($l:String!){user(login:$l){contributionsCollection{contributionCalendar{weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;
      const r = await gh('https://api.github.com/graphql', { method: 'POST', body: JSON.stringify({ query: q, variables: { l: USER } }) });
      const lv = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
      const days = r.data.user.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays)
        .map((d) => ({ date: d.date, count: d.contributionCount, level: lv[d.contributionLevel] ?? 0 }));
      if (days.length) return days;
    } catch (e) { console.warn('  graphql calendar failed, falling back:', e.message); }
  }
  const html = await (await fetch(`https://github.com/users/${USER}/contributions`, { headers: { 'User-Agent': 'patkik-profile' } })).text();
  const counts = new Map();
  for (const m of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) counts.set(m[1], Number(m[2].match(/^(\d+)/)?.[1] ?? 0));
  const days = [];
  for (const m of html.matchAll(/<td[^>]*data-date="[^"]+"[^>]*>/g)) {
    const tag = m[0];
    const date = tag.match(/data-date="([^"]+)"/)[1];
    const id = tag.match(/id="([^"]+)"/)?.[1];
    days.push({ date, count: counts.get(id) ?? 0, level: Number(tag.match(/data-level="(\d)"/)?.[1] ?? 0) });
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

async function collect() {
  const user = await gh(`https://api.github.com/users/${USER}`);
  const repos = await gh(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner`);
  const own = repos.filter((r) => !r.fork);
  const langs = {};
  await Promise.all(own.map(async (r) => {
    try { for (const [k, v] of Object.entries(await gh(r.languages_url))) langs[k] = (langs[k] || 0) + v; } catch { /* skip */ }
  }));
  const days = await calendar();
  const total = days.reduce((a, d) => a + d.count, 0);
  let longest = 0, run = 0;
  for (const d of days) { run = d.count > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  let i = days.length - 1, current = 0;
  if (i >= 0 && days[i].count === 0) i -= 1;
  for (; i >= 0 && days[i].count > 0; i -= 1) current += 1;
  return {
    user, days, total, longest, current,
    active: days.filter((d) => d.count > 0).length,
    best: Math.max(0, ...days.map((d) => d.count)),
    repos: user.public_repos,
    stars: repos.reduce((a, r) => a + r.stargazers_count, 0),
    langs: Object.entries(langs).sort((a, b) => b[1] - a[1]),
  };
}

function telemetry(t) {
  const W = 1200, H = 620;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const p = panel(W, H, { label: 'TELEMETRY // LIVE FEED', meta: `SYNC ${now} UTC` });

  // metric tiles
  const metrics = [
    ['CONTRIBUTIONS', fmt(t.total), 'LAST 12 MONTHS'], ['ACTIVE DAYS', fmt(t.active), `OF ${t.days.length}`],
    ['CURRENT STREAK', `${t.current}d`, t.current ? 'TRANSMITTING' : 'STANDBY'], ['LONGEST STREAK', `${t.longest}d`, 'LAST 12 MONTHS'],
    ['REPOSITORIES', fmt(t.repos), 'PUBLIC'], ['PEAK OUTPUT', fmt(t.best), 'IN A SINGLE DAY'],
  ];
  const mw = (1120 - 5 * 12) / 6;
  const tiles = metrics.map(([l, v, s], k) => {
    const x = 40 + k * (mw + 12);
    return `<path d="${chamfer(x, 50, mw, 92, 10)}" fill="${C.panel2}" stroke="${C.line}"/>
      <path d="M${x} 60L${x + 10} 50" stroke="${C.cyan}" stroke-width="2"/>
      ${mono(x + 18, 74, l, { size: 9.5, ls: 1.8 })}
      ${text(x + 18, 114, v, { size: 32, weight: 700, fill: C.text })}
      ${mono(x + 18, 132, s, { size: 9, fill: k === 2 && t.current ? C.ok : C.dim, ls: 1.2 })}`;
  }).join('');

  // heatmap
  const step = 20.5, cell = 16, hx = 72, hy = 212;
  const first = new Date(`${t.days[0]?.date ?? '2026-01-01'}T00:00:00Z`).getUTCDay();
  const shades = ['#111B2C', '#123372', '#1D5FD0', '#12B5EE', C.cyan];
  let lastMonth = -1;
  const months = [];
  const cells = t.days.map((d, k) => {
    const col = Math.floor((k + first) / 7), row = (k + first) % 7;
    const x = hx + col * step, y = hy + row * step;
    const dt = new Date(`${d.date}T00:00:00Z`);
    if (row === 0 || k === 0) {
      const m = dt.getUTCMonth();
      if (m !== lastMonth && dt.getUTCDate() <= 7 && col < 52) { months.push(mono(x, hy - 10, dt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(), { size: 9.5, ls: 1 })); lastMonth = m; }
    }
    const tw4 = d.level === 4 ? `<animate attributeName="opacity" values="1;.55;1" dur="${r1(2 + (k % 5) * 0.4)}s" repeatCount="indefinite"/>` : '';
    return `<rect x="${r1(x)}" y="${r1(y)}" width="${cell}" height="${cell}" rx="3" fill="${shades[d.level]}"${d.level >= 3 ? ' filter="url(#p-glow)"' : ''}>${tw4}<title>${d.date}: ${d.count}</title></rect>`;
  }).join('');
  const weekdays = ['MON', 'WED', 'FRI'].map((w, k) => mono(40, hy + (1 + k * 2) * step + 12, w, { size: 9, ls: 1, fill: C.dim })).join('');
  const legend = shades.map((s, k) => `<rect x="${1040 + k * 18}" y="368" width="12" height="12" rx="2" fill="${s}"/>`).join('');

  // languages
  const totalBytes = t.langs.reduce((a, [, v]) => a + v, 0) || 1;
  const top = t.langs.slice(0, 5);
  const other = t.langs.slice(5).reduce((a, [, v]) => a + v, 0);
  if (other) top.push(['Other', other]);
  const lc = [C.cyan, C.sky, C.blue, '#6366F1', '#A5B4FC', '#334155'];
  let bx = 64;
  const bar = top.map(([, v], k) => {
    const w = (v / totalBytes) * 502;
    const s = `<rect x="${r1(bx)}" y="460" width="${r1(Math.max(w - 2, 1))}" height="12" fill="${lc[k]}"/>`;
    bx += w;
    return s;
  }).join('');
  const langLegend = top.map(([name, v], k) => {
    const x = 64 + (k % 2) * 260, y = 506 + Math.floor(k / 2) * 30;
    return `<rect x="${x}" y="${y - 10}" width="10" height="10" fill="${lc[k]}"/>${text(x + 20, y, name, { size: 14, fill: C.soft })}${mono(x + 230, y, `${((v / totalBytes) * 100).toFixed(1)}%`, { anchor: 'end', size: 11, fill: C.text, ls: 0.5 })}`;
  }).join('');

  // weekly output chart
  const weeks = [];
  t.days.forEach((d, k) => { const col = Math.floor((k + first) / 7); weeks[col] = (weeks[col] || 0) + d.count; });
  const last = weeks.slice(-16);
  const max = Math.max(1, ...last);
  const ax = 650, ay = 462, aw = 480, ah = 100;
  const pts = last.map((v, k) => [r1(ax + (k * aw) / Math.max(1, last.length - 1)), r1(ay + ah - (v / max) * ah)]);
  const line = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join('');
  const peak = last.indexOf(max);
  const grid = [0, 0.5, 1].map((g) => `<line x1="${ax}" y1="${r1(ay + ah * g)}" x2="${ax + aw}" y2="${r1(ay + ah * g)}" stroke="${C.line}" stroke-dasharray="3 4"/>`).join('');

  const body = `
  <defs>${p.defs}
    <linearGradient id="t-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity=".35"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/></linearGradient>
  </defs>
  ${p.back}
  ${tiles}
  ${mono(40, 178, 'CONTRIBUTION SONAR  //  LAST 12 MONTHS', { fill: C.cyan, ls: 2.5 })}
  ${months.join('')}${weekdays}
  <g>${cells}</g>
  ${mono(72, 378, `${fmt(t.total)} SIGNALS DETECTED`, { size: 10, fill: C.soft, ls: 1.5 })}
  ${mono(1032, 378, 'LOW', { anchor: 'end', size: 9, ls: 1, fill: C.dim })}${legend}${mono(1136, 378, 'HIGH', { size: 9, ls: 1, fill: C.dim })}

  <path d="${chamfer(40, 400, 550, 196, 12)}" fill="${C.abyss}" fill-opacity=".6" stroke="${C.line}"/>
  ${mono(64, 434, 'LANGUAGE COMPOSITION', { fill: C.cyan, ls: 2.5 })}
  ${mono(566, 434, 'BY BYTES / OWN REPOS', { anchor: 'end', size: 9, fill: C.dim, ls: 1 })}
  <rect x="64" y="460" width="502" height="12" fill="${C.line}"/>${bar}
  ${langLegend}

  <path d="${chamfer(610, 400, 550, 196, 12)}" fill="${C.abyss}" fill-opacity=".6" stroke="${C.line}"/>
  ${mono(634, 434, 'WEEKLY OUTPUT  //  16 WEEKS', { fill: C.cyan, ls: 2.5 })}
  ${mono(1136, 434, `PEAK ${max} / WK`, { anchor: 'end', size: 9, fill: C.dim, ls: 1 })}
  ${grid}
  <path d="${line}L${ax + aw} ${ay + ah}L${ax} ${ay + ah}Z" fill="url(#t-area)"/>
  <path d="${line}" fill="none" stroke="${C.cyan}" stroke-width="2" filter="url(#p-glow)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" values="1;0" dur="2.5s" fill="freeze"/></path>
  ${pts.map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="${k === peak ? 4.5 : 2.5}" fill="${k === peak ? C.cyan : C.abyss}" stroke="${C.cyan}"/>`).join('')}
  ${pts[peak] ? mono(pts[peak][0], pts[peak][1] - 10, String(max), { anchor: 'middle', size: 10, fill: C.cyan, ls: 0.5 }) : ''}
  ${mono(ax, ay + ah + 22, '-16W', { size: 9, fill: C.dim, ls: 1 })}${mono(ax + aw, ay + ah + 22, 'NOW', { anchor: 'end', size: 9, fill: C.dim, ls: 1 })}
  ${p.front}`;
  return doc(W, H, `GitHub telemetry: ${t.total} contributions in the last year, ${t.repos} public repositories`, body);
}

async function snakeFrame() {
  let raw;
  try { raw = await fs.readFile(SNAKE_SVG, 'utf8'); } catch {
    try { await fs.access(path.join(OUT, 'snake.svg')); return null; } catch { /* write placeholder */ }
  }
  const vb = raw?.match(/viewBox="([^"]+)"/)?.[1]?.split(/[\s,]+/).map(Number) ?? [0, 0, 880, 192];
  const inner = raw ? raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') : '';
  const W = 1200, sw = 1120, sh = Math.round((sw * vb[3]) / vb[2]);
  const H = sh + 96;
  const p = panel(W, H, { label: 'CONTRIBUTION HUNTER', meta: 'AUTONOMOUS UNIT  /  DAILY PATROL' });
  const content = raw
    ? `<svg x="40" y="56" width="${sw}" height="${sh}" viewBox="${vb.join(' ')}">${inner}</svg>`
    : mono(W / 2, H / 2 + 4, 'UNIT DEPLOYS ON FIRST WORKFLOW RUN', { anchor: 'middle', fill: C.muted, ls: 3 });
  return doc(W, H, 'Contribution snake', `<defs>${p.defs}</defs>${p.back}${content}${p.front}`);
}

/* ================================================================= main */

await fs.mkdir(OUT, { recursive: true });
console.log('Rendering static assets');
await writeIfChanged('header.svg', header());
const sections = [
  ['OPERATOR PROFILE', '// identity, class and active operations'],
  ['ARSENAL', '// languages, frameworks and systems in rotation'],
  ['FIELD OPERATIONS', '// featured enterprise & campus systems'],
  ['HARDENING & AUDIT', '// cisco network security & iso/iec 25010 evaluation'],
  ['TELEMETRY', '// live analytics, regenerated daily'],
  ['COMMS CHANNEL', '// open a secure line'],
];
for (const [k, [t, s]] of sections.entries()) await writeIfChanged(`section-0${k + 1}.svg`, section(k + 1, t, s, 6));
await writeIfChanged('dossier.svg', dossier());
await writeIfChanged('arsenal.svg', await arsenal());
for (const [k, pj] of PROJECTS.entries()) await writeIfChanged(`project-${pj.slug}.svg`, projectCard(pj, k));
await writeIfChanged('security-audit.svg', securityAudit());
for (const [k, c] of COMMS.entries()) await writeIfChanged(`comms-${c.slug}.svg`, await badge(c, k));
await writeIfChanged('footer.svg', footer());

console.log('Rendering telemetry');
try {
  await writeIfChanged('telemetry.svg', telemetry(await collect()));
} catch (e) {
  console.error('  telemetry failed:', e.message);
  process.exitCode = 1;
}
const snake = await snakeFrame();
if (snake) await writeIfChanged('snake.svg', snake);
console.log('Done');
