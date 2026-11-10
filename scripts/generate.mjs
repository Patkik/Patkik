#!/usr/bin/env node
/**
 * AKATSUKI // ROGUE ARCHITECT - profile asset generator for github.com/Patkik
 *
 * Renders every SVG used by README.md into ./assets:
 *   header (Itachi base artwork + Akatsuki cloud pattern), section titles,
 *   dossier, arsenal, project scrolls, security audit, comms badges,
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
const EXCLUDED_REPOS = new Set(['whaze-iot-flood-monitor']);

/* --------------------------------------------------------- akatsuki theme */

const C = {
  void: '#050406',
  cloak: '#09070B',
  panel: '#100B0E',
  panel2: '#171015',
  panel3: '#1F141B',
  line: '#2E161D',
  lineBright: '#4C1D28',
  crimson: '#E50914',
  scarlet: '#FF1E27',
  blood: '#8B110B',
  darkBlood: '#4A0808',
  rose: '#FB7185',
  ember: '#FF5733',
  white: '#FFFFFF',
  text: '#F6F3F5',
  soft: '#D5C7CD',
  muted: '#947E88',
  dim: '#5E4B54',
};
const SANS = `'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const MONO = `'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace`;

/* ----------------------- exact traced akatsuki cloud paths (100x75 space) */

const CLOUD_OUTER =
  'M48.2 0L54 0.2L59 1.5L62.5 3.5L65.5 7.2L72.5 5.2L79 5.2L84.2 6.7L88.3 9.1L92 12.8L94.6 17.4L95.9 22.8L95.7 26.7L94.8 29.9L97.8 34.5L99.8 40.8L100 47.5L98.3 54.9L94.8 61.2L89.8 66.4L82 71.1L74.2 73.8L68.5 74.6L64 74.6L59.2 73.8L53.4 71.4L51 69.6L47.1 64.6L44.3 65.3L38.4 65.5L32.3 64.2L26.2 60.7L10.8 49.5L5.9 47.3L0 46.9L1.5 44.9L3.9 43.6L14.1 42.7L17.6 41.2L18.9 40.1L21 37.1L23.4 29.5L25.4 25.2L27.3 23L30.8 21.3L30.2 17.8L30.2 13.9L31.2 10L32.8 7.4L36.7 3.7L40.3 1.7L44.9 0.4L47.9 0.2Z';

const CLOUD_INNER =
  'M49.2 3.5L53.6 3.7L56.8 4.6L60.3 6.5L64.4 11.1L69.8 9.3L77.4 8.9L81.8 10L86.1 12.8L89.4 16.5L91.3 20.6L91.8 25.4L90 30.6L93.7 35.8L95.2 40.3L95.7 44.7L95.2 49.2L94.1 53.1L90.5 59.7L86.8 63.3L82.2 66.4L76.4 68.8L71.6 69.8L64.6 70.3L57.5 68.8L55.1 67.5L52.7 65.3L50.8 62L49.9 59.2L50.1 53.8L52.5 49.2L54.9 47.3L57.9 46L64.4 45.8L66.8 46.2L67 45.8L65.3 42.7L59.4 43L53.1 45.1L51 46.6L49 48.8L47.1 53.1L46.4 56.2L46.6 61.2L42.7 62L36.4 61.6L30.2 59L17.6 49.7L11.5 46.4L9.8 46L13.9 45.6L18 44.3L20 43.2L22.1 41L24.5 36.7L26.9 28.6L28.4 26.2L29.9 25.2L32.1 24.7L33.6 27.3L36.7 29.9L41 32.1L46 33.4L51.6 33.4L53.8 33L57.3 31.7L60.7 28.6L63.1 23.6L63.1 18.4L61.2 18.2L60.7 18.7L60.3 23L58.4 26.9L56.2 28.9L52.1 30.4L45.3 30.2L40.6 28.6L38.2 27.1L36 24.9L34.3 21.9L33.4 18.2L33.4 15.2L34.1 12.6L35.6 10L38.8 6.9L42.5 5L45.1 4.1L49 3.7Z';

const CROW_PATH =
  'M0 12 Q10 2 22 7 Q26 3 31 5 Q27 9 29 12 Q42 2 58 0 Q46 11 36 16 Q41 21 46 25 Q34 22 25 19 Q17 23 9 27 Q14 19 18 15 Q9 14 0 12Z';

/* ---------------------------------------------------------------- helpers */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tw = (s, size, mono = false, ls = 0) => String(s).length * size * (mono ? 0.6 : 0.56) + ls * String(s).length;
const fmt = (n) => Number(n).toLocaleString('en-US');
const r1 = (n) => Math.round(n * 10) / 10;

/** Katana-cut octagonal/diagonal frame */
const cutBox = (x, y, w, h, c = 16) =>
  `M${x + c} ${y}H${x + w - c * 0.45}L${x + w} ${y + c * 0.45}V${y + h - c}L${x + w - c} ${y + h}H${x + c * 0.45}L${x} ${y + h - c * 0.45}V${y + c}Z`;

const doc = (w, h, title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>\n`;

const text = (x, y, str, { size = 14, fill = C.text, font = SANS, weight = 400, anchor = 'start', ls = 0, opacity = 1, extra = '' } = {}) =>
  `<text x="${r1(x)}" y="${r1(y)}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}"${opacity !== 1 ? ` opacity="${opacity}"` : ''} ${extra}>${esc(str)}</text>`;
const mono = (x, y, str, o = {}) => text(x, y, str, { font: MONO, size: 11, fill: C.muted, ls: 2, ...o });

const GLOW = `<filter id="p-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

/** Renders the exact traced Akatsuki Cloud at (x, y) with scale s */
const cloudAt = (x, y, s = 0.28, { outline = C.white, fill = C.blood, opacity = 1, extra = '' } = {}) =>
  `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})" opacity="${opacity}" ${extra}><path d="${CLOUD_OUTER}" fill="${outline}"/><path d="${CLOUD_INNER}" fill="${fill}"/></g>`;

/** Renders a spinning Sharingan / Mangekyou seal at (cx, cy) */
const sharinganAt = (cx, cy, r = 10, dur = '10s') => `
  <g transform="translate(${r1(cx)} ${r1(cy)})">
    <circle r="${r}" fill="${C.blood}" stroke="${C.scarlet}" stroke-width="1.2"/>
    <circle r="${r1(r * 0.58)}" fill="none" stroke="${C.void}" stroke-width="0.9" stroke-opacity=".7"/>
    <g>
      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${dur}" repeatCount="indefinite"/>
      ${[0, 120, 240].map((a) => `<g transform="rotate(${a})"><circle cx="0" cy="${r1(-r * 0.58)}" r="${r1(r * 0.19)}" fill="${C.void}"/><path d="M0 ${r1(-r * 0.77)} Q${r1(r * 0.28)} ${r1(-r * 0.58)} ${r1(r * 0.08)} ${r1(-r * 0.36)}" fill="${C.void}"/></g>`).join('')}
    </g>
    <circle r="${r1(r * 0.22)}" fill="${C.void}"/>
    <circle r="${r1(r * 0.09)}" fill="${C.scarlet}"/>
  </g>`;

/** Shared Akatsuki Cloak HUD Frame with repeating Akatsuki Cloud Pattern */
function panel(w, h, { label = '', meta = '', c = 20, cloudOpacity = 0.075 } = {}) {
  const shape = cutBox(1, 1, w - 2, h - 2, c);
  const tabW = label ? Math.round(tw(label, 11, true, 2.4)) + 68 : 0;
  const a = c + 14;
  return {
    defs: `
      <linearGradient id="p-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${C.panel}"/>
        <stop offset=".55" stop-color="${C.cloak}"/>
        <stop offset="1" stop-color="${C.void}"/>
      </linearGradient>
      <linearGradient id="p-edge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${C.scarlet}"/>
        <stop offset=".5" stop-color="${C.white}" stop-opacity=".35"/>
        <stop offset="1" stop-color="${C.scarlet}"/>
      </linearGradient>
      <pattern id="ak-clouds" width="200" height="140" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
        <g transform="translate(14 10) scale(0.48)" opacity="${cloudOpacity}">
          <path d="${CLOUD_OUTER}" fill="${C.white}"/>
          <path d="${CLOUD_INNER}" fill="${C.crimson}"/>
        </g>
        <g transform="translate(114 78) scale(0.48)" opacity="${r1(cloudOpacity * 0.85)}">
          <path d="${CLOUD_OUTER}" fill="${C.white}"/>
          <path d="${CLOUD_INNER}" fill="${C.blood}"/>
        </g>
      </pattern>
      <pattern id="ak-grid" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M32 0H0V32" fill="none" stroke="${C.crimson}" stroke-opacity=".04"/>
        <path d="M0 32L32 0" fill="none" stroke="${C.crimson}" stroke-opacity=".025"/>
      </pattern>
      <clipPath id="p-clip"><path d="${shape}"/></clipPath>
      ${GLOW}`,
    back: `
      <path d="${shape}" fill="url(#p-bg)"/>
      <path d="${shape}" fill="url(#ak-grid)"/>
      <path d="${shape}" fill="url(#ak-clouds)"/>
      <g clip-path="url(#p-clip)">
        ${cloudAt(w - 195, h - 135, 1.85, { opacity: 0.055 })}
      </g>`,
    front: `
      <path d="${shape}" fill="none" stroke="${C.lineBright}" stroke-width="1.5"/>
      <path d="${cutBox(6, 6, w - 12, h - 12, c - 4)}" fill="none" stroke="url(#p-edge)" stroke-opacity=".32"/>
      <!-- Katana corner slashes -->
      <path d="M1 ${c + 1}L${c + 1} 1" stroke="${C.scarlet}" stroke-width="2.6" filter="url(#p-glow)"/>
      <path d="M${w - 1} ${h - c - 1}L${w - c - 1} ${h - 1}" stroke="${C.scarlet}" stroke-width="2.6" filter="url(#p-glow)"/>
      <path d="M${w - 42} 1H${w - c * 0.45 - 1}L${w - 1} ${c * 0.45 + 1}V42" fill="none" stroke="${C.white}" stroke-opacity=".75" stroke-width="1.6"/>
      <path d="M1 ${h - 42}V${h - c * 0.45 - 1}L${c * 0.45 + 1} ${h - 1}H42" fill="none" stroke="${C.white}" stroke-opacity=".75" stroke-width="1.6"/>
      ${label ? `
        <path d="M${a} 1H${a + tabW}L${a + tabW - 14} 29H${a + 10}Z" fill="${C.darkBlood}" fill-opacity=".92" stroke="${C.scarlet}" stroke-opacity=".85" stroke-width="1.2"/>
        ${cloudAt(a + 18, 6.5, 0.22, { opacity: 0.95 })}
        ${mono(a + 48, 19.5, label, { fill: C.white, anchor: 'start', ls: 2.3, weight: 700 })}
      ` : ''}
      ${meta ? `
        ${cloudAt(w - 48 - tw(meta, 11, true, 2) - 34, 6.5, 0.2, { opacity: 0.85 })}
        ${mono(w - 48, 19.5, meta, { anchor: 'end', fill: C.soft })}
      ` : ''}`,
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

async function header() {
  const W = 1200, H = 430;
  const p = panel(W, H, { label: 'AKATSUKI.SYS // S-RANK DOSSIER', meta: 'ROGUE NODE PATKIK  //  8.15N 125.13E', c: 24, cloudOpacity: 0.11 });

  let itachiDataUri = '';
  try {
    const imgBuf = await fs.readFile(path.join(OUT, 'itachi-base.jpg'));
    itachiDataUri = `data:image/jpeg;base64,${imgBuf.toString('base64')}`;
  } catch {
    console.warn('  itachi-base.jpg not found, rendering vector-only header');
  }

  const chips = [
    '4TH-YR BSIT · BUKIDNON STATE UNIV',
    'MALAYBALAY CITY, BUKIDNON, PH',
    'FULL-STACK & AI SYSTEMS ARCHITECT',
  ];
  let chipX = 68;
  const chipSvg = chips.map((c) => {
    const w = tw(c, 10.5, true, 1.4) + 46;
    const s = `
      <path d="${cutBox(chipX, 342, w, 30, 7)}" fill="${C.darkBlood}" fill-opacity=".65" stroke="${C.scarlet}" stroke-opacity=".75"/>
      ${cloudAt(chipX + 10, 349, 0.2, { opacity: 0.95 })}
      ${mono(chipX + 36, 361, c, { fill: C.white, size: 10.5, ls: 1.4 })}`;
    chipX += w + 10;
    return s;
  }).join('');

  // Floating crimson embers / Amaterasu sparks
  const embers = [
    [540, 380, 2.5, '5.5s', '0s'], [640, 400, 3.2, '6.8s', '1.2s'], [760, 390, 2.2, '4.9s', '2.1s'],
    [880, 410, 3.5, '6.2s', '0.7s'], [1020, 395, 2.8, '5.1s', '1.8s'], [1120, 385, 2.0, '7.0s', '0.4s'],
    [480, 395, 2.4, '6.0s', '2.8s'], [950, 405, 3.0, '5.4s', '3.1s'],
  ].map(([x, y, r, dur, begin], idx) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="${idx % 2 ? C.scarlet : C.white}" filter="url(#p-glow)">
      <animate attributeName="cy" values="${y};30" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>
      <animate attributeName="cx" values="${x};${x - 45 + (idx % 3) * 30}" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;.9;.7;0" keyTimes="0;.2;.75;1" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>
    </circle>`).join('');

  // Animated flying crows across the crimson right sky
  const crows = [
    { x: 690, y: 86, s: 0.65, dur: '11s', b: '0s' },
    { x: 820, y: 58, s: 0.48, dur: '14s', b: '2s' },
    { x: 1060, y: 120, s: 0.55, dur: '12s', b: '1s' },
  ].map(({ x, y, s, dur, b }) => `
    <g transform="translate(${x} ${y}) scale(${s})" opacity=".85">
      <path d="${CROW_PATH}" fill="${C.void}" stroke="${C.scarlet}" stroke-width=".6" stroke-opacity=".5"/>
      <animateTransform attributeName="transform" type="translate" values="${x + 60} ${y + 15};${x - 90} ${y - 25};${x + 60} ${y + 15}" dur="${dur}" begin="${b}" repeatCount="indefinite" additive="replace"/>
    </g>`).join('');

  // Tech seal tags floating along the katana slash divider
  const seals = [
    { x: 642, y: 108, l: 'RUST / AXUM' },
    { x: 612, y: 172, l: 'TYPESCRIPT / NEXT' },
    { x: 582, y: 236, l: 'CHROMADB / AI' },
    { x: 552, y: 300, l: 'DOCKER / CISCO' },
  ].map(({ x, y, l }, i) => {
    const bw = tw(l, 9.5, true, 1.5) + 24;
    return `
      <g>
        <path d="${cutBox(x, y, bw, 22, 5)}" fill="${C.void}" fill-opacity=".82" stroke="${C.scarlet}" stroke-opacity=".75"/>
        <circle cx="${x + 9}" cy="${y + 11}" r="2.5" fill="${C.scarlet}">
          <animate attributeName="opacity" values="1;.25;1" dur="2s" begin="${i * 0.4}s" repeatCount="indefinite"/>
        </circle>
        ${mono(x + 17, y + 14.5, l, { size: 9, fill: C.white, ls: 1.4 })}
      </g>`;
  }).join('');

  const body = `
  <defs>${p.defs}
    <!-- Mask that seamlessly blends the left Akatsuki Cloud cloak area into the Itachi artwork on the right -->
    <linearGradient id="h-img-mask-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000000" stop-opacity="0"/>
      <stop offset=".16" stop-color="#ffffff" stop-opacity=".18"/>
      <stop offset=".36" stop-color="#ffffff" stop-opacity=".88"/>
      <stop offset=".52" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="h-img-vfade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".9"/>
      <stop offset=".15" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset=".85" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="1" stop-color="#000000" stop-opacity=".25"/>
    </linearGradient>
    <mask id="h-itachi-mask">
      <rect x="340" y="0" width="860" height="${H}" fill="url(#h-img-mask-grad)"/>
    </mask>
    <radialGradient id="h-crimson-aura" cx=".75" cy=".45" r=".6">
      <stop offset="0" stop-color="${C.crimson}" stop-opacity=".55"/>
      <stop offset=".6" stop-color="${C.blood}" stop-opacity=".22"/>
      <stop offset="1" stop-color="${C.void}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="h-left-cloak" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.void}" stop-opacity=".97"/>
      <stop offset=".45" stop-color="${C.cloak}" stop-opacity=".92"/>
      <stop offset=".68" stop-color="${C.cloak}" stop-opacity=".35"/>
      <stop offset="1" stop-color="${C.void}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="h-name" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#FFE4E6"/>
    </linearGradient>
    <linearGradient id="h-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.scarlet}" stop-opacity=".9"/>
      <stop offset="1" stop-color="${C.blood}" stop-opacity=".95"/>
    </linearGradient>
    <linearGradient id="h-shine" gradientUnits="userSpaceOnUse" x1="-260" y1="0" x2="-60" y2="0">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset=".5" stop-color="#FFFFFF" stop-opacity=".98"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="0 0;0 0;920 0" keyTimes="0;.42;1" dur="5s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="h-slash" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.white}" stop-opacity="0"/>
      <stop offset=".3" stop-color="${C.scarlet}" stop-opacity=".9"/>
      <stop offset=".5" stop-color="${C.white}" stop-opacity=".95"/>
      <stop offset=".7" stop-color="${C.scarlet}" stop-opacity=".9"/>
      <stop offset="1" stop-color="${C.crimson}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  ${p.back}
  <g clip-path="url(#p-clip)">
    <rect width="${W}" height="${H}" fill="url(#h-crimson-aura)"/>

    <!-- Base Itachi & Crows Artwork -->
    ${itachiDataUri ? `<image href="${itachiDataUri}" x="360" y="-24" width="850" height="476" preserveAspectRatio="xMidYMid slice" mask="url(#h-itachi-mask)"/>` : ''}

    <!-- Left dark cloak & Akatsuki cloud pattern overlay so typography is razor-sharp -->
    <rect width="${W}" height="${H}" fill="url(#h-left-cloak)"/>
    <rect width="680" height="${H}" fill="url(#ak-clouds)" opacity=".95"/>

    <!-- Large drifting watermark Akatsuki clouds -->
    <g opacity=".16">
      ${cloudAt(48, 250, 1.35)}
      <animateTransform attributeName="transform" type="translate" values="0 0;18 -6;0 0" dur="9s" repeatCount="indefinite"/>
    </g>
    <g opacity=".22">
      ${cloudAt(420, 38, 0.95)}
      <animateTransform attributeName="transform" type="translate" values="0 0;-16 8;0 0" dur="11s" repeatCount="indefinite"/>
    </g>
    <!-- Prominent Akatsuki Cloud crest on the bottom-right cloak area -->
    <g>
      ${cloudAt(1055, 336, 1.05, { opacity: 0.92 })}
    </g>

    <!-- Diagonal Katana Slash Divider separating Dossier Text & Itachi Visual -->
    <line x1="695" y1="30" x2="545" y2="400" stroke="url(#h-slash)" stroke-width="2.2" filter="url(#p-glow)"/>
    <line x1="703" y1="30" x2="553" y2="400" stroke="${C.scarlet}" stroke-opacity=".35" stroke-width="1" stroke-dasharray="6 4"/>

    ${crows}
    ${embers}
    ${seals}

    <!-- Bottom crimson horizon pulse -->
    <rect x="0" y="${H - 5}" width="${W}" height="4" fill="${C.scarlet}" opacity=".75"/>
  </g>

  <!-- Rogue Shinobi Status Header -->
  ${sharinganAt(80, 62, 10, '9s')}
  ${mono(100, 66, 'TSUKUYOMI ONLINE', { fill: C.scarlet, size: 10.5, weight: 700, ls: 2.2 })}
  <!-- Slashed Rogue Village Symbol -->
  <g transform="translate(248 52)">
    <rect x="0" y="0" width="34" height="18" rx="3" fill="${C.panel3}" stroke="${C.muted}" stroke-width="1"/>
    <circle cx="17" cy="9" r="3.5" fill="none" stroke="${C.soft}" stroke-width="1.2"/>
    <line x1="3" y1="9" x2="31" y2="9" stroke="${C.scarlet}" stroke-width="2.2" filter="url(#p-glow)"/>
  </g>
  ${mono(294, 66, '//  AKATSUKI PROTOCOL v26.11', { size: 10.5, fill: C.soft, ls: 1.8 })}

  <!-- Identity Display -->
  <g transform="translate(68 92)">
    ${cloudAt(0, 0, 0.28, { opacity: 0.95 })}
    ${mono(38, 16, 'S-RANK OPERATIVE  //  LEAD SYSTEMS ARCHITECT', { fill: C.scarlet, ls: 3.2, size: 11, weight: 700 })}
  </g>

  ${text(66, 184, 'PATRICK JOSH', { size: 68, weight: 900, fill: 'url(#h-name)', ls: 3 })}
  <text x="68" y="258" font-family="${SANS}" font-size="68" font-weight="900" letter-spacing="11" fill="url(#h-fill)" stroke="${C.white}" stroke-width="2">AÑEDEZ</text>
  <text x="68" y="258" font-family="${SANS}" font-size="68" font-weight="900" letter-spacing="11" fill="none" stroke="url(#h-shine)" stroke-width="2.6" filter="url(#p-glow)">AÑEDEZ</text>

  ${text(70, 308, 'Full-Stack Developer  ·  Systems & AI Engineer', { size: 21, fill: C.text, weight: 600, ls: 0.6 })}
  ${chipSvg}
  ${p.front}`;
  return doc(W, H, 'Patrick Josh Añedez - Akatsuki Theme Full-Stack Developer, Systems & AI Engineer', body);
}

/* ======================================================= SECTION TITLES */

function section(idx, title, sub, total = 6) {
  const W = 1200, H = 94;
  const n = String(idx).padStart(2, '0');
  const tW = tw(title, 25, false, 4) + 12;
  const lineStart = Math.max(150 + tW + 24, 150 + tw(sub, 11.5, true, 1.2) + 24);
  const lineEnd = 1068;

  // Repeating mini Akatsuki clouds along the katana divider bar
  const cloudMarks = [];
  for (let x = lineStart + 30; x <= lineEnd - 60; x += 110) {
    cloudMarks.push(cloudAt(x, 31, 0.24, { opacity: 0.78 }));
  }

  const body = `
  <defs>${GLOW}
    <linearGradient id="s-blade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.scarlet}" stop-opacity=".95"/>
      <stop offset=".6" stop-color="${C.white}" stop-opacity=".45"/>
      <stop offset="1" stop-color="${C.crimson}" stop-opacity=".1"/>
    </linearGradient>
  </defs>
  <!-- Left S-Rank Seal Box with Rogue Horizontal Slash -->
  <path d="${cutBox(2, 15, 76, 64, 12)}" fill="${C.darkBlood}" fill-opacity=".85" stroke="${C.scarlet}" stroke-width="1.5"/>
  <path d="${cutBox(6, 19, 68, 56, 9)}" fill="none" stroke="${C.white}" stroke-opacity=".35"/>
  <line x1="8" y1="47" x2="70" y2="47" stroke="${C.scarlet}" stroke-opacity=".35" stroke-width="2"/>
  ${text(40, 56, n, { font: MONO, size: 26, weight: 800, fill: C.white, anchor: 'middle', extra: 'filter="url(#p-glow)"' })}

  <!-- Iconic Akatsuki Cloud Emblem next to section title -->
  ${cloudAt(92, 24, 0.44, { opacity: 0.96 })}

  ${text(148, 50, title, { size: 25, weight: 800, ls: 4, fill: C.white })}
  ${mono(149, 73, sub, { size: 11.5, ls: 1.2, fill: C.soft })}

  <!-- Katana Blade Line & Cloud Pattern Track -->
  <line x1="${r1(lineStart)}" y1="42" x2="${lineEnd}" y2="42" stroke="url(#s-blade)" stroke-width="2"/>
  <line x1="${r1(lineStart)}" y1="48" x2="${lineEnd - 40}" y2="48" stroke="${C.lineBright}" stroke-width="1" stroke-dasharray="8 6"/>
  ${cloudMarks.join('')}

  <!-- Animated Crimson Slash Pulse -->
  <rect y="40" width="54" height="4" rx="2" fill="${C.scarlet}" filter="url(#p-glow)">
    <animate attributeName="x" values="${r1(lineStart)};${lineEnd - 54}" dur="3.2s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="3.2s" repeatCount="indefinite"/>
  </rect>

  ${sharinganAt(lineEnd + 16, 44, 8, '12s')}
  ${mono(1196, 48, `SCROLL ${n}/${String(total).padStart(2, '0')}`, { anchor: 'end', fill: C.muted, size: 10.5, ls: 1.5 })}`;
  return doc(W, H, `${n} ${title}`, body);
}

/* ============================================================== DOSSIER */

function dossier() {
  const W = 1200, H = 490;
  const p = panel(W, H, { label: 'BINGO BOOK DOSSIER // S-RANK ARCHITECT', meta: 'VERIFIED CREDENTIALS // ISO/IEC 25010', cloudOpacity: 0.08 });
  const rows = [
    ['OPERATIVE', 'Patrick Josh S. Añedez'],
    ['ALIAS', 'DracoNox  /  @Patkik'],
    ['RANK / CLASS', 'S-Rank  ·  Full-Stack & Systems Architect'],
    ['AFFILIATION', 'Bukidnon State University (4th-Year BSIT)'],
    ['STRONGHOLD', 'Malaybalay City, Bukidnon, Philippines'],
    ['COMMAND', 'Lead Architect (CMS-V2)  /  Lead Dev (COMSOC)'],
    ['SPECIALTIES', 'Async Microservices, RFID Telemetry, Hardening'],
    ['EVALUATION', 'ISO/IEC 25010 4.51/5.00 ("Excellent")  /  140 QA Cases'],
  ];
  const left = rows.map(([k, v], i) => {
    const y = 98 + i * 40;
    return `
      <rect x="48" y="${y - 11}" width="3" height="14" fill="${i === 0 ? C.scarlet : C.blood}"/>
      ${mono(60, y, k, { size: 10.5, fill: i === 0 ? C.scarlet : C.muted, weight: 700 })}
      <line x1="${60 + tw(k, 10.5, true, 2) + 8}" y1="${y - 4}" x2="206" y2="${y - 4}" stroke="${C.lineBright}" stroke-dasharray="2 3"/>
      ${text(220, y + 1, v, { size: 16, fill: i === 0 ? C.white : C.soft, weight: i === 0 ? 700 : 400 })}`;
  }).join('');

  const status = {
    'S-RANK': { bg: C.darkBlood, border: C.scarlet, text: C.white },
    'A-RANK': { bg: '#2A0E17', border: C.rose, text: C.rose },
    'ANBU':   { bg: '#27120B', border: C.ember, text: C.ember },
  };
  const ops = [
    ['S-RANK', 'BukSU CMS-V2 (Project Workspace)', 'CHROMA VECTOR SIMILARITY / 4-TIER RBAC / DOCKER'],
    ['S-RANK', 'RacePulsePH Event Timing', 'REAL-TIME RFID BIB & FINISH-LINE SENSOR SUITE'],
    ['A-RANK', 'COMSOC Mentoring Info System', 'PEER-TUTORING & PROGRAMMING MENTORSHIP MATCHING'],
    ['A-RANK', 'MedPulsePH Health Platform', 'VITAL TELEMETRY & CLINICAL ACCESS / RUST & POSTGRES'],
    ['ANBU',   'AudiobookTTSGenerator', 'NEURAL TTS CHUNKING & BOUNDARY NORMALIZATION'],
    ['ANBU',   'WSB Dance Championship App', 'REAL-TIME BRACKET TRACKING & LIVE JUDGING SCORES'],
  ];
  const right = ops.map(([s, name, sub], i) => {
    const y = 124 + i * 50;
    const st = status[s];
    return `
      <path d="${cutBox(666, y - 16, 106, 24, 6)}" fill="${st.bg}" stroke="${st.border}" stroke-opacity=".85"/>
      ${cloudAt(674, y - 11, 0.18, { opacity: 0.95 })}
      ${mono(732, y, s, { anchor: 'middle', size: 9.5, fill: st.text, ls: 1.5, weight: 700 })}
      ${text(786, y + 1, name, { size: 16, weight: 700, fill: C.white })}
      ${mono(786, y + 20, sub, { size: 9.5, fill: C.muted, ls: 1.1 })}`;
  }).join('');

  const prompt = 'patkik@akatsuki:~$ cargo run --release --bin sharingan-audit';
  const body = `
  <defs>${p.defs}</defs>
  ${p.back}
  <g clip-path="url(#p-clip)">
    <!-- Center Katana Pillar -->
    <rect x="636" y="56" width="1.5" height="346" fill="${C.lineBright}"/>
    <rect x="635.5" y="56" width="2.5" height="64" fill="${C.scarlet}" filter="url(#p-glow)">
      <animate attributeName="y" values="56;338;56" dur="6s" repeatCount="indefinite"/>
    </rect>
    ${cloudAt(592, 340, 0.75, { opacity: 0.12 })}
  </g>
  ${left}
  ${cloudAt(666, 68, 0.24, { opacity: 0.95 })}
  ${mono(698, 82, 'ACTIVE S-RANK CONTRACTS & SYSTEMS', { fill: C.scarlet, ls: 2.5, weight: 700 })}
  ${right}
  <!-- Bottom Rogue Terminal Bar -->
  <path d="${cutBox(40, 418, 1120, 46, 10)}" fill="${C.void}" stroke="${C.lineBright}"/>
  ${sharinganAt(64, 441, 8, '8s')}
  ${mono(82, 445, prompt, { size: 13, fill: C.scarlet, ls: 0.5, weight: 600 })}
  <rect x="${r1(82 + tw(prompt, 13, true, 0.5) + 8)}" y="432" width="9" height="16" fill="${C.white}">
    <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.5;.5;1" dur="1.1s" repeatCount="indefinite"/>
  </rect>
  ${mono(1138, 445, 'EXIT 0  //  ISO/IEC 25010 VERIFIED  //  QA 140/140 PASSED', { anchor: 'end', size: 10.5, fill: C.white, ls: 1.5 })}
  ${p.front}`;
  return doc(W, H, 'Bingo Book Dossier: Patrick Josh S. Añedez - Akatsuki Technical Portfolio', body);
}

/* ============================================================== ARSENAL */

const ARSENAL = [
  { cat: 'I. LANGUAGES & SYSTEMS', color: C.scarlet, items: [
    ['Rs', 'Rust', 'rust'], ['Ts', 'TypeScript', 'typescript'], ['Js', 'JavaScript', 'javascript'], ['Py', 'Python', 'python'],
    ['Jv', 'Java', 'openjdk'], ['Kt', 'Kotlin', 'kotlin'], ['Cp', 'C++', 'cplusplus'], ['Ph', 'PHP', 'php'], ['Sq', 'SQL', 'postgresql']] },
  { cat: 'II. INTERFACE & MOBILE', color: C.white, items: [
    ['Re', 'React.js', 'react'], ['Rn', 'React Native', 'react'], ['Nx', 'Next.js', 'nextdotjs'], ['Jc', 'Compose', 'jetpackcompose'],
    ['Tw', 'Tailwind', 'tailwindcss'], ['Vt', 'Vite', 'vite'], ['Pw', 'PWA', 'pwa'], ['Po', 'PaddleOCR', 'opencv'], ['An', 'Android', 'android']] },
  { cat: 'III. BACKEND, DATA & VECTORS', color: C.crimson, items: [
    ['Fa', 'FastAPI', 'fastapi'], ['Ex', 'Express 5', 'express'], ['Nd', 'Node.js', 'nodedotjs'], ['Mg', 'MongoDB', 'mongodb'],
    ['Rd', 'Redis', 'redis'], ['Ch', 'ChromaDB', 'databricks'], ['S3', 'MinIO S3', 'minio'], ['Pg', 'PostgreSQL', 'postgresql'], ['Mq', 'BullMQ/Celery', 'celery']] },
  { cat: 'IV. DEVOPS, SECURITY & AI', color: C.rose, items: [
    ['Dk', 'Docker', 'docker'], ['Ci', 'Cisco L2/L3', 'cisco'], ['Rf', 'RFID/Sensors', 'nfc'], ['Ga', 'GH Actions', 'githubactions'],
    ['Aw', 'AWS', 'amazon'], ['Lx', 'Linux Admin', 'linux'], ['Ax', 'Axum/Tokio', 'rust'], ['Cu', 'Cursor Pro', 'cursor'], ['Cl', 'Claude Code', 'anthropic']] },
];

async function arsenal() {
  const W = 1200, H = 660;
  const p = panel(W, H, { label: 'SHINOBI ARSENAL // ELEMENTAL MATRIX', meta: `${ARSENAL.reduce((a, c) => a + c.items.length, 0)} JUTSU LOADED`, cloudOpacity: 0.08 });
  const tileW = 116, tileH = 120, gap = 9, x0 = 64, y0 = 108;
  let legendX = 64;
  const legend = ARSENAL.map(({ cat, color }) => {
    const s = `
      ${cloudAt(legendX, 58, 0.22, { fill: color === C.white ? C.blood : color, outline: C.white })}
      ${mono(legendX + 28, 72, cat, { size: 10.5, fill: C.text, ls: 1.8, weight: 700 })}`;
    legendX += tw(cat, 10.5, true, 1.8) + 56;
    return s;
  }).join('');

  let n = 0;
  const rows = [];
  for (const [ri, { color, items }] of ARSENAL.entries()) {
    const y = y0 + ri * (tileH + 14);
    rows.push(`<rect x="40" y="${y}" width="3.5" height="${tileH}" fill="${color}" opacity=".9"/>`);
    for (const [ci, [sym, name, slug]] of items.entries()) {
      n += 1;
      const x = x0 + ci * (tileW + gap);
      const d = await icon(slug);
      const begin = r1((ri * 9 + ci) * 0.2);
      const shape = cutBox(0, 0, tileW, tileH, 11);
      rows.push(`<g transform="translate(${x} ${y})">
        <path d="${shape}" fill="${C.panel2}" fill-opacity=".94"/>
        <!-- Subtle watermark Akatsuki cloud inside each tile -->
        ${cloudAt(tileW - 46, tileH - 38, 0.38, { opacity: 0.09 })}
        <path d="${shape}" fill="${C.scarlet}" fill-opacity="0">
          <animate attributeName="fill-opacity" values="0;.16;0;0" keyTimes="0;.04;.1;1" dur="8s" begin="${begin}s" repeatCount="indefinite"/>
        </path>
        <path d="${shape}" fill="none" stroke="${color}" stroke-opacity=".42">
          <animate attributeName="stroke-opacity" values=".42;1;.42;.42" keyTimes="0;.04;.1;1" dur="8s" begin="${begin}s" repeatCount="indefinite"/>
        </path>
        <path d="M0 11L11 0" stroke="${C.scarlet}" stroke-width="2.2"/>
        <rect x="12" y="${tileH - 3}" width="${tileW - 24}" height="2" fill="${color}" opacity=".65"/>
        ${mono(12, 23, String(n).padStart(2, '0'), { size: 9.5, fill: C.muted, ls: 1 })}
        ${iconAt(d, tileW - 28, 9, 16, color, 0.9)}
        ${text(tileW / 2, 74, sym, { size: 37, weight: 800, fill: C.white, anchor: 'middle' })}
        ${mono(tileW / 2, 103, name.toUpperCase(), { size: name.length > 12 ? 8.5 : 9.5, fill: color, anchor: 'middle', ls: name.length > 12 ? 0.6 : 1.1, weight: 600 })}
      </g>`);
    }
  }
  const body = `<defs>${p.defs}</defs>${p.back}${legend}${rows.join('')}${p.front}`;
  return doc(W, H, 'Akatsuki Arsenal: languages, interface, backend and systems tooling', body);
}

/* ========================================================= PROJECT CARDS */

const PROJECTS = [
  { slug: 'cms-v2', repo: 'CMS-V2', title: 'BukSU CMS-V2 (Project Workspace)', tag: 'S-RANK // CAPSTONE & PLAGIARISM', lang: ['JavaScript', '#F1E05A'],
    desc: 'Full-stack institutional capstone platform with async lexical winnowing + ChromaDB vector similarity across 22 audited algorithms, 4-tier RBAC, and Docker. Rated 4.51/5.00 ("Excellent") on ISO/IEC 25010 with 140 QA test cases.',
    chips: ['React.js', 'Express 5', 'FastAPI', 'ChromaDB', 'Redis', 'Docker'] },
  { slug: 'racepulse', repo: 'RacePulsePH', title: 'RacePulsePH', tag: 'S-RANK // ATHLETIC EVENT TIMING', lang: ['TypeScript', '#3178C6'],
    desc: 'Athletic timing and race management system. Calibrated RFID bib scanners and finish-line checkpoint antenna hardware with real-time web dashboards and React Native mobile leaderboards.',
    chips: ['React Native', 'React.js', 'RFID', 'REST APIs', 'Sensors'] },
  { slug: 'comsoc', repo: 'Monitoring-Information-Systems', title: 'COMSOC Mentoring Info System', tag: 'A-RANK // BUKSU COMPUTER SOCIETY', lang: ['TypeScript', '#3178C6'],
    desc: 'Automated peer-tutoring and programming mentorship matching system engineered as Lead Developer for BukSU Computer Society (COMSOC) with role-based session scheduling and conflict-free tracking.',
    chips: ['TypeScript', 'MongoDB Atlas', 'Session Scheduling', 'RBAC'] },
  { slug: 'medpulse', repo: 'MedPulsePH', title: 'MedPulsePH', tag: 'S-RANK // DIGITAL HEALTHCARE', lang: ['Rust', '#DEA584'],
    desc: 'Digital healthcare platform centered on NFC wristbands and patient-authorized clinical access, with split identity and clinical PostgreSQL vaults, Redis, and health telemetry APIs.',
    chips: ['Rust API', 'React Native', 'PostgreSQL', 'Redis', 'NFC'] },
  { slug: 'audiobook', repo: 'AudiobookTTSGenerator', title: 'AudiobookTTSGenerator', tag: 'ANBU // NEURAL TEXT-TO-SPEECH', lang: ['Python', '#3572A5'],
    desc: 'Automated document-to-audiobook pipeline that extracts chapter text from manuscripts and ebooks, handles sentence chunking and boundary normalization, and batches high-fidelity neural audio.',
    chips: ['Python', 'Neural TTS', 'Audio Processing', 'CLI / Batch'] },
  { slug: 'wsb', repo: 'World-Supremacy-Battleground-app', title: 'World Supremacy Battlegrounds', tag: 'S-RANK // EVENT SCORING & BRACKETS', lang: ['Rust', '#DEA584'],
    desc: 'Competition platform engineered for the international street dance championship, supporting participant registration, competition bracket tracking, real-time judging, and live leaderboard scoring.',
    chips: ['Next.js', 'Rust Axum', 'Firebase', 'Real-Time DB', 'Docker'] },
];

function projectCard(pj, i) {
  const W = 600, H = 306;
  const id = `SCROLL-${String(i + 1).padStart(2, '0')}`;
  const shape = cutBox(1, 1, W - 2, H - 2, 18);
  const lines = wrap(pj.desc, 65).slice(0, 4);
  let cx = 32;
  const chips = pj.chips.map((c) => {
    const w = tw(c, 10.5, true, 1) + 22;
    const s = `<path d="${cutBox(cx, 224, w, 26, 5)}" fill="${C.darkBlood}" fill-opacity=".6" stroke="${C.scarlet}" stroke-opacity=".65"/>${mono(cx + w / 2, 241, c, { anchor: 'middle', fill: C.white, size: 10.5, ls: 1 })}`;
    cx += w + 8;
    return s;
  }).join('');

  const body = `
  <defs>
    <linearGradient id="c-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.panel2}"/>
      <stop offset=".6" stop-color="${C.cloak}"/>
      <stop offset="1" stop-color="${C.void}"/>
    </linearGradient>
    <linearGradient id="c-top" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.scarlet}"/>
      <stop offset=".5" stop-color="${C.white}" stop-opacity=".6"/>
      <stop offset="1" stop-color="${C.blood}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="c-clouds" width="180" height="125" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">
      <g transform="translate(12 8) scale(0.42)" opacity=".075">
        <path d="${CLOUD_OUTER}" fill="${C.white}"/>
        <path d="${CLOUD_INNER}" fill="${C.crimson}"/>
      </g>
      <g transform="translate(102 68) scale(0.42)" opacity=".06">
        <path d="${CLOUD_OUTER}" fill="${C.white}"/>
        <path d="${CLOUD_INNER}" fill="${C.blood}"/>
      </g>
    </pattern>
    <clipPath id="c-clip"><path d="${shape}"/></clipPath>
    ${GLOW}
  </defs>
  <path d="${shape}" fill="url(#c-bg)"/>
  <path d="${shape}" fill="url(#c-clouds)"/>
  <g clip-path="url(#c-clip)">
    <!-- Large corner Akatsuki Cloud watermark -->
    ${cloudAt(W - 175, H - 128, 1.55, { opacity: 0.14 })}
    <text x="${W - 22}" y="${H - 38}" font-family="${MONO}" font-size="112" font-weight="800" fill="${C.scarlet}" fill-opacity=".045" text-anchor="end">${String(i + 1).padStart(2, '0')}</text>
    <rect x="0" y="0" width="${W}" height="3.5" fill="url(#c-top)"/>
    <rect x="-200" y="0" width="200" height="3.5" fill="${C.white}" filter="url(#p-glow)">
      <animate attributeName="x" values="-200;${W}" dur="4.2s" begin="${i * 0.6}s" repeatCount="indefinite"/>
    </rect>
  </g>
  <path d="${shape}" fill="none" stroke="${C.lineBright}" stroke-width="1.5"/>
  <path d="M1 19L19 1" stroke="${C.scarlet}" stroke-width="2.6" filter="url(#p-glow)"/>
  <path d="M${W - 26} 1H${W - 9}L${W - 1} 9V26" fill="none" stroke="${C.white}" stroke-opacity=".8" stroke-width="1.6"/>

  <!-- Top Mission Tag with Akatsuki Cloud Icon -->
  ${cloudAt(30, 30, 0.23, { opacity: 0.95 })}
  ${mono(60, 45, `${id}  //  ${pj.tag}`, { fill: C.scarlet, ls: 1.8, weight: 700 })}
  <circle cx="${W - 32 - tw(pj.lang[0], 11, true, 1) - 12}" cy="41" r="5" fill="${pj.lang[1]}"/>
  ${mono(W - 32, 45, pj.lang[0], { anchor: 'end', fill: C.white, ls: 1 })}

  ${text(32, 88, pj.title, { size: 26, weight: 800, fill: C.white, ls: 0.3 })}
  ${lines.map((l, k) => text(32, 124 + k * 23, l, { size: 15, fill: C.soft })).join('')}
  ${chips}

  <line x1="32" y1="268" x2="${W - 32}" y2="268" stroke="${C.lineBright}"/>
  ${mono(32, 288, `github.com/${USER}/${pj.repo}`.slice(0, 52), { size: 10, fill: C.muted, ls: 0.8 })}
  ${mono(W - 50, 288, 'UNSEAL REPOSITORY', { anchor: 'end', size: 10.5, fill: C.scarlet, ls: 2, weight: 700 })}
  <path d="M${W - 42} 280l6 4.5-6 4.5" fill="none" stroke="${C.white}" stroke-width="1.6"/>`;
  return doc(W, H, `${pj.title} - ${pj.desc}`, body);
}

function archiveScrolls() {
  const W = 1200, H = 256;
  const p = panel(W, H, { label: 'ADDITIONAL SCROLLS // SPECIALIZED REPOSITORIES & TOOLING', meta: 'OWNED ARCHIVES // VERIFIED', cloudOpacity: 0.08 });
  const items = [
    ['Kipit', 'KOTLIN / COMPOSE', 'Native Android offline-first budget tracker with Room persistence & Hilt DI.'],
    ['Spirits of the Vale', 'JAVA / 2D ENGINE', 'Top-down RPG engine with custom state-machine NPC behaviors & collision physics.'],
    ['Multi-Tenant SaaS Catering V2', 'FULL-STACK SAAS', 'Tenant-isolated catering architecture backed by 51 automated unit test specs.'],
    ['Orchestrator Agentic System', 'AI ORCHESTRATION', 'Autonomous multi-step agent task runner with durable state checkpoints.'],
    ['Vortex Studio A.I', 'APPLIED AI MEDIA', 'High-throughput generative media pipeline & automated processing workflows.'],
    ['Barcelon Store', 'ANDROID / MOBILE', 'Real-time mobile store inventory & transaction tracking infrastructure.'],
  ];
  const colW = 548, rowH = 52, x0 = 40, y0 = 62;
  const cards = items.map(([name, tag, desc], idx) => {
    const col = idx % 2, row = Math.floor(idx / 2);
    const x = x0 + col * (colW + 24), y = y0 + row * (rowH + 10);
    return `<g transform="translate(${x} ${y})">
      <path d="${cutBox(0, 0, colW, rowH, 8)}" fill="${C.panel2}" fill-opacity=".92" stroke="${C.lineBright}"/>
      <rect x="0" y="10" width="3" height="${rowH - 20}" fill="${C.scarlet}"/>
      ${cloudAt(14, 10, 0.18, { opacity: 0.95 })}
      ${text(40, 23, name, { size: 15, weight: 700, fill: C.white })}
      ${mono(colW - 14, 22, tag, { anchor: 'end', size: 9, fill: C.scarlet, ls: 1.4, weight: 700 })}
      ${text(16, 42, desc, { size: 12, fill: C.soft })}
    </g>`;
  }).join('');
  return doc(W, H, 'Additional Specialized Repositories and Open-Source Tooling', `<defs>${p.defs}</defs>${p.back}${cards}${p.front}`);
}

/* ======================================================= SECURITY & QA */

function securityAudit() {
  const W = 1200, H = 258;
  const p = panel(W, H, { label: 'ANBU BARRIER // INFRASTRUCTURE HARDENING & QA', meta: 'VERIFIED ENGINEERING CONTROLS', cloudOpacity: 0.08 });
  const colW = 356, h = 156, y = 64;
  const cols = [
    {
      tag: 'QA & EVALUATION', title: 'ISO/IEC 25010', score: '4.51 / 5.00', stat: '"EXCELLENT" RATING',
      lines: ['71 student & faculty evaluators', '140-case structured QA test suite', 'Automated regression test coverage'],
      col: C.scarlet,
    },
    {
      tag: 'NETWORK HARDENING', title: 'Cisco L2/L3 Security', score: 'SSHv2 / ACL', stat: 'TOPOLOGY HARDENED',
      lines: ['Multi-router Layer 2/3 topology', 'Telnet & HTTP cleartext elimination', 'VLAN segmentation & Extended ACLs'],
      col: C.white,
    },
    {
      tag: 'DATA COMPLIANCE', title: 'Legal & Risk Privacy', score: 'RA 10173', stat: 'NPC & GDPR AUDIT',
      lines: ['Republic Act 10173 (DPA 2012) controls', 'HTTP-only JWT family token rotation', 'Atomic updates & immutable audit trail'],
      col: C.rose,
    },
  ];
  const items = cols.map((c, i) => {
    const x = 40 + i * (colW + 26);
    return `<g transform="translate(${x} ${y})">
      <path d="${cutBox(0, 0, colW, h, 10)}" fill="${C.panel2}" fill-opacity=".92" stroke="${C.lineBright}"/>
      ${cloudAt(colW - 68, h - 48, 0.52, { opacity: 0.12 })}
      <path d="M0 14L14 0" stroke="${c.col}" stroke-width="2.2"/>
      ${cloudAt(14, 11, 0.18, { opacity: 0.95 })}
      ${mono(38, 24, c.tag, { size: 9.5, fill: c.col, ls: 1.5, weight: 700 })}
      ${text(16, 54, c.title, { size: 21, weight: 800, fill: C.white })}
      ${mono(colW - 16, 36, c.score, { anchor: 'end', size: 13, weight: 700, fill: c.col, ls: 1 })}
      ${mono(colW - 16, 52, c.stat, { anchor: 'end', size: 8.5, fill: C.muted, ls: 1 })}
      <line x1="16" y1="66" x2="${colW - 16}" y2="66" stroke="${C.lineBright}"/>
      ${c.lines.map((l, k) => `<circle cx="22" cy="${86 + k * 22}" r="2.2" fill="${C.scarlet}"/>${text(32, 90 + k * 22, l, { size: 12.5, fill: C.soft })}`).join('')}
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
  const W = 588, H = 86;
  const shape = cutBox(1, 1, W - 2, H - 2, 14);
  const d = await icon(ic);
  const body = `
  <defs>
    <linearGradient id="b-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.panel2}"/>
      <stop offset="1" stop-color="${C.void}"/>
    </linearGradient>
    <pattern id="b-clouds" width="140" height="90" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
      <g transform="translate(10 10) scale(0.32)" opacity=".08">
        <path d="${CLOUD_OUTER}" fill="${C.white}"/>
        <path d="${CLOUD_INNER}" fill="${C.crimson}"/>
      </g>
    </pattern>
    ${GLOW}
  </defs>
  <path d="${shape}" fill="url(#b-bg)"/>
  <path d="${shape}" fill="url(#b-clouds)"/>
  ${cloudAt(W - 116, 16, 0.72, { opacity: 0.16 })}
  <path d="${shape}" fill="none" stroke="${C.lineBright}" stroke-width="1.5"/>
  <path d="${shape}" fill="none" stroke="${C.scarlet}" stroke-width="2.2" pathLength="100" stroke-dasharray="16 84" filter="url(#p-glow)">
    <animate attributeName="stroke-dashoffset" values="0;-100" dur="4s" begin="${i * 1.1}s" repeatCount="indefinite"/>
  </path>
  <path d="${cutBox(16, 15, 56, 56, 10)}" fill="${C.darkBlood}" fill-opacity=".8" stroke="${C.scarlet}" stroke-opacity=".85"/>
  ${iconAt(d, 30, 29, 28, C.white) || text(44, 51, label[0], { size: 24, weight: 800, fill: C.white, anchor: 'middle' })}
  ${cloudAt(88, 22, 0.18, { opacity: 0.95 })}
  ${mono(112, 35, `${label}  //  CROW LINK 0${i + 1}`, { size: 10, fill: C.scarlet, ls: 1.8, weight: 700 })}
  ${text(88, 62, value, { size: value.length > 25 ? 16 : 19, weight: 700, fill: C.white })}
  <path d="M${W - 36} 37l8 6-8 6" fill="none" stroke="${C.scarlet}" stroke-width="2"/>
  <path d="M${W - 46} 37l8 6-8 6" fill="none" stroke="${C.white}" stroke-opacity=".5" stroke-width="2"/>`;
  return doc(W, H, `${label}: ${value}`, body);
}

function footer() {
  const W = 1200, H = 168;
  const wave = (amp, y, len, step) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= len; x += step) d += ` Q${x + step / 2} ${y + ((x / step) % 2 ? amp : -amp)} ${x + step} ${y}`;
    return `${d} V${H} H0Z`;
  };
  const body = `
  <defs>
    <linearGradient id="f-a" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.blood}" stop-opacity=".85"/>
      <stop offset="1" stop-color="${C.void}"/>
    </linearGradient>
    <linearGradient id="f-b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.scarlet}" stop-opacity=".42"/>
      <stop offset="1" stop-color="${C.void}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="f-l" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.scarlet}" stop-opacity="0"/>
      <stop offset=".5" stop-color="${C.scarlet}"/>
      <stop offset="1" stop-color="${C.scarlet}" stop-opacity="0"/>
    </linearGradient>
    ${GLOW}
  </defs>
  <rect width="${W}" height="${H}" fill="${C.void}"/>
  <path d="${wave(10, 102, 2520, 120)}" fill="url(#f-b)">
    <animateTransform attributeName="transform" type="translate" values="0 0;-240 0" dur="7s" repeatCount="indefinite"/>
  </path>
  <path d="${wave(8, 114, 2520, 160)}" fill="url(#f-a)">
    <animateTransform attributeName="transform" type="translate" values="-320 0;0 0" dur="9s" repeatCount="indefinite"/>
  </path>

  <!-- Floating Akatsuki Clouds across the horizon -->
  ${cloudAt(140, 74, 0.55, { opacity: 0.85 })}
  ${cloudAt(572, 82, 0.55, { opacity: 0.92 })}
  ${cloudAt(1005, 74, 0.55, { opacity: 0.85 })}

  <!-- Crows silhouettes -->
  <g transform="translate(360 32) scale(0.55)" opacity=".7"><path d="${CROW_PATH}" fill="${C.scarlet}"/></g>
  <g transform="translate(820 26) scale(0.45)" opacity=".6"><path d="${CROW_PATH}" fill="${C.white}"/></g>

  <rect x="260" y="42" width="680" height="1.5" fill="url(#f-l)"/>
  ${mono(600, 30, 'AKATSUKI PROTOCOL // END OF TRANSMISSION', { anchor: 'middle', fill: C.scarlet, ls: 5.5, size: 12, weight: 700, extra: 'filter="url(#p-glow)"' })}
  ${mono(600, 64, 'WALK IN THE SHADOWS  //  ARCHITECT WITH PRECISION  //  SHIP S-RANK SYSTEMS', { anchor: 'middle', fill: C.text, ls: 2.5, size: 10 })}
  ${mono(600, 152, 'RENDERED BY SCRIPTS/GENERATE.MJS  ·  AKATSUKI CLOUD EDITION', { anchor: 'middle', fill: C.soft, ls: 2, size: 9, opacity: 0.7 })}`;
  return doc(W, H, 'End of transmission - Akatsuki Cloud Edition', body);
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
  const allRepos = await gh(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner`);
  const repos = allRepos.filter((r) => !EXCLUDED_REPOS.has(r.name));
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
    repos: repos.length,
    stars: repos.reduce((a, r) => a + r.stargazers_count, 0),
    langs: Object.entries(langs).sort((a, b) => b[1] - a[1]),
  };
}

function telemetry(t) {
  const W = 1200, H = 626;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const p = panel(W, H, { label: 'SHARINGAN TELEMETRY // LIVE FEED', meta: `SYNC ${now} UTC`, cloudOpacity: 0.08 });

  // metric tiles
  const metrics = [
    ['CONTRIBUTIONS', fmt(t.total), 'LAST 12 MONTHS'], ['ACTIVE DAYS', fmt(t.active), `OF ${t.days.length}`],
    ['CURRENT STREAK', `${t.current}d`, t.current ? 'MANGEKYOU ACTIVE' : 'STANDBY'], ['LONGEST STREAK', `${t.longest}d`, 'LAST 12 MONTHS'],
    ['REPOSITORIES', fmt(t.repos), 'OWNED REPOS'], ['PEAK OUTPUT', fmt(t.best), 'IN A SINGLE DAY'],
  ];
  const mw = (1120 - 5 * 12) / 6;
  const tiles = metrics.map(([l, v, s], k) => {
    const x = 40 + k * (mw + 12);
    return `
      <path d="${cutBox(x, 50, mw, 92, 10)}" fill="${C.panel2}" stroke="${C.lineBright}"/>
      ${cloudAt(x + mw - 42, 58, 0.32, { opacity: 0.16 })}
      <path d="M${x} 60L${x + 10} 50" stroke="${C.scarlet}" stroke-width="2.2"/>
      ${mono(x + 16, 74, l, { size: 9.5, ls: 1.6, fill: C.soft })}
      ${text(x + 16, 114, v, { size: 32, weight: 800, fill: C.white })}
      ${mono(x + 16, 132, s, { size: 9, fill: k === 2 && t.current ? C.scarlet : C.muted, ls: 1.2, weight: 600 })}`;
  }).join('');

  // heatmap in Akatsuki Crimson & Obsidian shades
  const step = 20.5, cell = 16, hx = 72, hy = 212;
  const first = new Date(`${t.days[0]?.date ?? '2026-01-01'}T00:00:00Z`).getUTCDay();
  const shades = ['#181116', '#4A080C', '#8B110B', '#D90429', C.scarlet];
  let lastMonth = -1;
  const months = [];
  const cells = t.days.map((d, k) => {
    const col = Math.floor((k + first) / 7), row = (k + first) % 7;
    const x = hx + col * step, y = hy + row * step;
    const dt = new Date(`${d.date}T00:00:00Z`);
    if (row === 0 || k === 0) {
      const m = dt.getUTCMonth();
      if (m !== lastMonth && dt.getUTCDate() <= 7 && col < 52) {
        months.push(mono(x, hy - 10, dt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase(), { size: 9.5, ls: 1, fill: C.soft }));
        lastMonth = m;
      }
    }
    const tw4 = d.level === 4 ? `<animate attributeName="opacity" values="1;.55;1" dur="${r1(2 + (k % 5) * 0.4)}s" repeatCount="indefinite"/>` : '';
    return `<rect x="${r1(x)}" y="${r1(y)}" width="${cell}" height="${cell}" rx="3" fill="${shades[d.level]}"${d.level >= 3 ? ` stroke="${C.white}" stroke-opacity=".35" stroke-width=".6" filter="url(#p-glow)"` : ''}>${tw4}<title>${d.date}: ${d.count}</title></rect>`;
  }).join('');
  const weekdays = ['MON', 'WED', 'FRI'].map((w, k) => mono(40, hy + (1 + k * 2) * step + 12, w, { size: 9, ls: 1, fill: C.muted })).join('');
  const legend = shades.map((s, k) => `<rect x="${1040 + k * 18}" y="368" width="12" height="12" rx="2" fill="${s}"/>`).join('');

  // languages
  const totalBytes = t.langs.reduce((a, [, v]) => a + v, 0) || 1;
  const top = t.langs.slice(0, 5);
  const other = t.langs.slice(5).reduce((a, [, v]) => a + v, 0);
  if (other) top.push(['Other', other]);
  const lc = [C.scarlet, C.white, C.crimson, C.rose, C.ember, '#4E3842'];
  let bx = 64;
  const bar = top.map(([, v], k) => {
    const w = (v / totalBytes) * 502;
    const s = `<rect x="${r1(bx)}" y="460" width="${r1(Math.max(w - 2, 1))}" height="12" fill="${lc[k]}"/>`;
    bx += w;
    return s;
  }).join('');
  const langLegend = top.map(([name, v], k) => {
    const x = 64 + (k % 2) * 260, y = 506 + Math.floor(k / 2) * 30;
    return `<rect x="${x}" y="${y - 10}" width="10" height="10" fill="${lc[k]}"/>${text(x + 20, y, name, { size: 14, fill: C.soft })}${mono(x + 230, y, `${((v / totalBytes) * 100).toFixed(1)}%`, { anchor: 'end', size: 11, fill: C.white, ls: 0.5 })}`;
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
  const grid = [0, 0.5, 1].map((g) => `<line x1="${ax}" y1="${r1(ay + ah * g)}" x2="${ax + aw}" y2="${r1(ay + ah * g)}" stroke="${C.lineBright}" stroke-dasharray="3 4"/>`).join('');

  const body = `
  <defs>${p.defs}
    <linearGradient id="t-area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.scarlet}" stop-opacity=".42"/>
      <stop offset="1" stop-color="${C.blood}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  ${p.back}
  ${tiles}
  ${cloudAt(40, 164, 0.22, { opacity: 0.95 })}
  ${mono(68, 178, 'CHAKRA & COMMIT MATRIX  //  LAST 12 MONTHS', { fill: C.scarlet, ls: 2.5, weight: 700 })}
  ${months.join('')}${weekdays}
  <g>${cells}</g>
  ${mono(72, 378, `${fmt(t.total)} SIGNALS RECORDED`, { size: 10, fill: C.soft, ls: 1.5 })}
  ${mono(1032, 378, 'LOW', { anchor: 'end', size: 9, ls: 1, fill: C.muted })}${legend}${mono(1136, 378, 'HIGH', { size: 9, ls: 1, fill: C.muted })}

  <path d="${cutBox(40, 400, 550, 198, 12)}" fill="${C.void}" fill-opacity=".68" stroke="${C.lineBright}"/>
  ${cloudAt(64, 420, 0.2, { opacity: 0.95 })}
  ${mono(90, 434, 'LANGUAGE COMPOSITION', { fill: C.scarlet, ls: 2.5, weight: 700 })}
  ${mono(566, 434, 'BY BYTES / OWN REPOS', { anchor: 'end', size: 9, fill: C.muted, ls: 1 })}
  <rect x="64" y="460" width="502" height="12" fill="${C.line}"/>${bar}
  ${langLegend}

  <path d="${cutBox(610, 400, 550, 198, 12)}" fill="${C.void}" fill-opacity=".68" stroke="${C.lineBright}"/>
  ${cloudAt(634, 420, 0.2, { opacity: 0.95 })}
  ${mono(660, 434, 'WEEKLY OUTPUT  //  16 WEEKS', { fill: C.scarlet, ls: 2.5, weight: 700 })}
  ${mono(1136, 434, `PEAK ${max} / WK`, { anchor: 'end', size: 9, fill: C.muted, ls: 1 })}
  ${grid}
  <path d="${line}L${ax + aw} ${ay + ah}L${ax} ${ay + ah}Z" fill="url(#t-area)"/>
  <path d="${line}" fill="none" stroke="${C.scarlet}" stroke-width="2.2" filter="url(#p-glow)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1">
    <animate attributeName="stroke-dashoffset" values="1;0" dur="2.5s" fill="freeze"/>
  </path>
  ${pts.map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="${k === peak ? 4.5 : 2.5}" fill="${k === peak ? C.white : C.void}" stroke="${C.scarlet}" stroke-width="1.5"/>`).join('')}
  ${pts[peak] ? mono(pts[peak][0], pts[peak][1] - 10, String(max), { anchor: 'middle', size: 10, fill: C.white, ls: 0.5, weight: 700 }) : ''}
  ${mono(ax, ay + ah + 22, '-16W', { size: 9, fill: C.muted, ls: 1 })}${mono(ax + aw, ay + ah + 22, 'NOW', { anchor: 'end', size: 9, fill: C.muted, ls: 1 })}
  ${p.front}`;
  return doc(W, H, `GitHub telemetry: ${t.total} contributions in the last year, ${t.repos} repositories`, body);
}

async function snakeFrame() {
  let raw;
  try { raw = await fs.readFile(SNAKE_SVG, 'utf8'); } catch { /* fallback to placeholder or existing */ }
  const vb = raw?.match(/viewBox="([^"]+)"/)?.[1]?.split(/[\s,]+/).map(Number) ?? [0, 0, 880, 192];
  let inner = raw ? raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') : '';
  // Ensure any blue colors in raw snake SVG are mapped to Akatsuki crimson palette
  if (inner) {
    inner = inner
      .replace(/#00F0FF/gi, C.scarlet)
      .replace(/#12B5EE/gi, '#D90429')
      .replace(/#1D5FD0/gi, C.blood)
      .replace(/#123372/gi, '#4A080C')
      .replace(/#111B2C/gi, '#181116');
  }
  const W = 1200, sw = 1120, sh = Math.round((sw * vb[3]) / vb[2]);
  const H = sh + 96;
  const p = panel(W, H, { label: 'SUMMONING // CONTRIBUTION SERPENT', meta: 'AUTONOMOUS UNIT  //  DAILY PATROL', cloudOpacity: 0.08 });
  const content = inner
    ? `<svg x="40" y="56" width="${sw}" height="${sh}" viewBox="${vb.join(' ')}">${inner}</svg>`
    : `
      <g>
        ${cloudAt(W / 2 - 48, H / 2 - 44, 0.95, { opacity: 0.25 })}
        ${mono(W / 2, H / 2 + 12, 'SUMMONING CONTRACT ACTIVATES ON WORKFLOW RUN', { anchor: 'middle', fill: C.soft, ls: 3, weight: 700 })}
      </g>`;
  return doc(W, H, 'Akatsuki Contribution Serpent', `<defs>${p.defs}</defs>${p.back}${content}${p.front}`);
}

/* ================================================================= main */

await fs.mkdir(OUT, { recursive: true });
console.log('Rendering static Akatsuki assets');
await writeIfChanged('header.svg', await header());
const sections = [
  ['BINGO BOOK DOSSIER', '// s-rank operative identity, affiliation & active contracts'],
  ['SHINOBI ARSENAL', '// core languages, interface jutsu, backend & cloud infrastructure'],
  ['S-RANK MISSIONS', '// flagship enterprise, campus & neural systems'],
  ['ANBU HARDENING & QA', '// cisco network security, iso/iec 25010 & data privacy'],
  ['SHARINGAN TELEMETRY', '// live github intelligence, regenerated daily'],
  ['CROW MESSENGER COMMS', '// direct transmission channels & network links'],
];
for (const [k, [t, s]] of sections.entries()) await writeIfChanged(`section-0${k + 1}.svg`, section(k + 1, t, s, 6));
await writeIfChanged('dossier.svg', dossier());
await writeIfChanged('arsenal.svg', await arsenal());
for (const [k, pj] of PROJECTS.entries()) await writeIfChanged(`project-${pj.slug}.svg`, projectCard(pj, k));
await writeIfChanged('archive-scrolls.svg', archiveScrolls());
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
