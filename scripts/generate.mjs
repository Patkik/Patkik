#!/usr/bin/env node
/**
 * Akatsuki Theme - Profile Asset Generator for github.com/Patkik
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

/**
 * 4-pointed Shuriken SVG separator / emblem centered at (cx, cy).
 * Used in place of slashes or generic text separators.
 */
const shurikenAt = (cx, cy, r = 7.5, { color = C.scarlet, edge = C.white, spin = false, dur = '9s', opacity = 1 } = {}) => {
  const k = r1(r * 0.28);
  const h = r1(r * 0.24);
  const star = `M0 ${-r}L${k} ${-k}L${r} 0L${k} ${k}L0 ${r}L${-k} ${k}L${-r} 0L${-k} ${-k}Z`;
  const bevel = `M0 ${-r}L${k} ${-k}L0 0ZM${r} 0L${k} ${k}L0 0ZM0 ${r}L${-k} ${k}L0 0ZM${-r} 0L${-k} ${-k}L0 0Z`;
  const anim = spin ? `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${dur}" repeatCount="indefinite"/>` : '';
  return `<g transform="translate(${r1(cx)} ${r1(cy)})" opacity="${opacity}"><g>${anim}<path d="${star}" fill="${color}" stroke="${edge}" stroke-width="0.85" stroke-linejoin="bevel"/><path d="${bevel}" fill="${edge}" fill-opacity=".35"/><circle r="${h}" fill="${C.void}" stroke="${edge}" stroke-width="0.9"/></g></g>`;
};

/** Shared Akatsuki Frame with repeating Akatsuki Cloud Pattern */
function panel(w, h, { label = '', c = 20, cloudOpacity = 0.075 } = {}) {
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
      <path d="M1 ${c + 1}L${c + 1} 1" stroke="${C.scarlet}" stroke-width="2.6" filter="url(#p-glow)"/>
      <path d="M${w - 1} ${h - c - 1}L${w - c - 1} ${h - 1}" stroke="${C.scarlet}" stroke-width="2.6" filter="url(#p-glow)"/>
      <path d="M${w - 42} 1H${w - c * 0.45 - 1}L${w - 1} ${c * 0.45 + 1}V42" fill="none" stroke="${C.white}" stroke-opacity=".75" stroke-width="1.6"/>
      <path d="M1 ${h - 42}V${h - c * 0.45 - 1}L${c * 0.45 + 1} ${h - 1}H42" fill="none" stroke="${C.white}" stroke-opacity=".75" stroke-width="1.6"/>
      ${label ? `
        <path d="M${a} 1H${a + tabW}L${a + tabW - 14} 29H${a + 10}Z" fill="${C.darkBlood}" fill-opacity=".92" stroke="${C.scarlet}" stroke-opacity=".85" stroke-width="1.2"/>
        ${cloudAt(a + 18, 6.5, 0.22, { opacity: 0.95 })}
        ${mono(a + 48, 19.5, label, { fill: C.white, anchor: 'start', ls: 2.3, weight: 700 })}
      ` : ''}
      ${shurikenAt(w - 28, 16, 6.5, { spin: true, dur: '12s', opacity: 0.85 })}`,
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
  const W = 1200, H = 420;
  const p = panel(W, H, { label: 'PORTFOLIO', c: 24, cloudOpacity: 0.11 });

  let itachiDataUri = '';
  try {
    const imgBuf = await fs.readFile(path.join(OUT, 'itachi-base.jpg'));
    itachiDataUri = `data:image/jpeg;base64,${imgBuf.toString('base64')}`;
  } catch {
    console.warn('  itachi-base.jpg not found, rendering vector-only header');
  }

  const chips = [
    'BSIT · Bukidnon State University',
    'Malaybalay City, PH',
  ];
  let chipX = 68;
  const chipSvg = chips.map((c) => {
    const w = tw(c, 11, true, 1.2) + 44;
    const s = `
      <path d="${cutBox(chipX, 334, w, 30, 7)}" fill="${C.darkBlood}" fill-opacity=".65" stroke="${C.scarlet}" stroke-opacity=".75"/>
      ${shurikenAt(chipX + 18, 349, 5.5)}
      ${mono(chipX + 32, 353, c, { fill: C.white, size: 11, ls: 1.2 })}`;
    chipX += w + 12;
    return s;
  }).join('');

  const embers = [
    [540, 380, 2.5, '5.5s', '0s'], [640, 400, 3.2, '6.8s', '1.2s'], [760, 390, 2.2, '4.9s', '2.1s'],
    [880, 410, 3.5, '6.2s', '0.7s'], [1020, 395, 2.8, '5.1s', '1.8s'], [1120, 385, 2.0, '7.0s', '0.4s'],
  ].map(([x, y, r, dur, begin], idx) => `
    <circle cx="${x}" cy="${y}" r="${r}" fill="${idx % 2 ? C.scarlet : C.white}" filter="url(#p-glow)">
      <animate attributeName="cy" values="${y};30" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>
      <animate attributeName="cx" values="${x};${x - 45 + (idx % 3) * 30}" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;.9;.7;0" keyTimes="0;.2;.75;1" dur="${dur}" begin="${begin}" repeatCount="indefinite"/>
    </circle>`).join('');

  const crows = [
    { x: 690, y: 86, s: 0.65, dur: '11s', b: '0s' },
    { x: 820, y: 58, s: 0.48, dur: '14s', b: '2s' },
    { x: 1060, y: 120, s: 0.55, dur: '12s', b: '1s' },
  ].map(({ x, y, s, dur, b }) => `
    <g transform="translate(${x} ${y}) scale(${s})" opacity=".85">
      <path d="${CROW_PATH}" fill="${C.void}" stroke="${C.scarlet}" stroke-width=".6" stroke-opacity=".5"/>
      <animateTransform attributeName="transform" type="translate" values="${x + 60} ${y + 15};${x - 90} ${y - 25};${x + 60} ${y + 15}" dur="${dur}" begin="${b}" repeatCount="indefinite" additive="replace"/>
    </g>`).join('');

  const seals = [
    { x: 642, y: 104, l: 'RUST' },
    { x: 614, y: 168, l: 'TYPESCRIPT' },
    { x: 586, y: 232, l: 'REACT & NEXT' },
    { x: 558, y: 296, l: 'DOCKER & CLOUD' },
  ].map(({ x, y, l }, i) => {
    const bw = tw(l, 9.5, true, 1.5) + 30;
    return `
      <g>
        <path d="${cutBox(x, y, bw, 24, 5)}" fill="${C.void}" fill-opacity=".85" stroke="${C.scarlet}" stroke-opacity=".75"/>
        ${shurikenAt(x + 12, y + 12, 4.8, { spin: true, dur: `${6 + i * 2}s` })}
        ${mono(x + 23, y + 15.5, l, { size: 9, fill: C.white, ls: 1.4 })}
      </g>`;
  }).join('');

  const body = `
  <defs>${p.defs}
    <linearGradient id="h-img-mask-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000000" stop-opacity="0"/>
      <stop offset=".16" stop-color="#ffffff" stop-opacity=".18"/>
      <stop offset=".36" stop-color="#ffffff" stop-opacity=".88"/>
      <stop offset=".52" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="1"/>
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
    ${itachiDataUri ? `<image href="${itachiDataUri}" x="360" y="-24" width="850" height="476" preserveAspectRatio="xMidYMid slice" mask="url(#h-itachi-mask)"/>` : ''}
    <rect width="${W}" height="${H}" fill="url(#h-left-cloak)"/>
    <rect width="680" height="${H}" fill="url(#ak-clouds)" opacity=".95"/>

    <g opacity=".16">
      ${cloudAt(48, 240, 1.35)}
      <animateTransform attributeName="transform" type="translate" values="0 0;18 -6;0 0" dur="9s" repeatCount="indefinite"/>
    </g>
    <g opacity=".22">
      ${cloudAt(420, 38, 0.95)}
      <animateTransform attributeName="transform" type="translate" values="0 0;-16 8;0 0" dur="11s" repeatCount="indefinite"/>
    </g>
    <g>
      ${cloudAt(1055, 326, 1.05, { opacity: 0.92 })}
    </g>

    <line x1="695" y1="30" x2="545" y2="390" stroke="url(#h-slash)" stroke-width="2.2" filter="url(#p-glow)"/>
    <line x1="703" y1="30" x2="553" y2="390" stroke="${C.scarlet}" stroke-opacity=".35" stroke-width="1" stroke-dasharray="6 4"/>

    ${crows}
    ${embers}
    ${seals}

    <rect x="0" y="${H - 5}" width="${W}" height="4" fill="${C.scarlet}" opacity=".75"/>
  </g>

  <!-- Role Tag with Shuriken Separators -->
  <g transform="translate(68 82)">
    ${shurikenAt(8, 10, 6.5, { spin: true })}
    ${mono(26, 14, 'SOFTWARE ENGINEER', { fill: C.scarlet, ls: 2.8, size: 11, weight: 700 })}
    ${shurikenAt(210, 10, 5.5)}
    ${mono(228, 14, 'SYSTEMS ARCHITECT', { fill: C.soft, ls: 2.5, size: 11, weight: 600 })}
  </g>

  ${text(66, 174, 'PATRICK JOSH', { size: 68, weight: 900, fill: 'url(#h-name)', ls: 3 })}
  <text x="68" y="248" font-family="${SANS}" font-size="68" font-weight="900" letter-spacing="11" fill="url(#h-fill)" stroke="${C.white}" stroke-width="2">AÑEDEZ</text>
  <text x="68" y="248" font-family="${SANS}" font-size="68" font-weight="900" letter-spacing="11" fill="none" stroke="url(#h-shine)" stroke-width="2.6" filter="url(#p-glow)">AÑEDEZ</text>

  <!-- Subtitle with Shuriken separators -->
  ${text(70, 298, 'Full-Stack Developer', { size: 20, fill: C.text, weight: 600, ls: 0.4 })}
  ${shurikenAt(278, 291, 6)}
  ${text(296, 298, 'Systems Engineer', { size: 20, fill: C.soft, weight: 500, ls: 0.4 })}

  ${chipSvg}
  ${p.front}`;
  return doc(W, H, 'Patrick Josh Añedez - Full-Stack Developer & Systems Engineer', body);
}

/* ======================================================= SECTION TITLES */

function section(idx, title, sub) {
  const W = 1200, H = 90;
  const n = String(idx).padStart(2, '0');
  const tW = tw(title, 25, false, 3.5) + 12;
  const subX = 148 + tW + 28;
  const lineStart = subX + tw(sub, 12, true, 1.4) + 28;
  const lineEnd = 1140;

  const cloudMarks = [];
  for (let x = lineStart + 36; x <= lineEnd - 70; x += 120) {
    cloudMarks.push(cloudAt(x, 29, 0.23, { opacity: 0.78 }));
  }

  const body = `
  <defs>${GLOW}
    <linearGradient id="s-blade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.scarlet}" stop-opacity=".95"/>
      <stop offset=".6" stop-color="${C.white}" stop-opacity=".45"/>
      <stop offset="1" stop-color="${C.crimson}" stop-opacity=".1"/>
    </linearGradient>
  </defs>
  <path d="${cutBox(2, 13, 72, 62, 12)}" fill="${C.darkBlood}" fill-opacity=".85" stroke="${C.scarlet}" stroke-width="1.5"/>
  <path d="${cutBox(6, 17, 64, 54, 9)}" fill="none" stroke="${C.white}" stroke-opacity=".35"/>
  ${text(38, 53, n, { font: MONO, size: 25, weight: 800, fill: C.white, anchor: 'middle', extra: 'filter="url(#p-glow)"' })}

  ${cloudAt(88, 22, 0.44, { opacity: 0.96 })}

  ${text(146, 52, title, { size: 25, weight: 800, ls: 3.5, fill: C.white })}
  ${shurikenAt(146 + tW + 6, 44, 6.5, { spin: true, dur: '10s' })}
  ${mono(subX, 48, sub, { size: 11.5, ls: 1.4, fill: C.soft })}

  <line x1="${r1(lineStart)}" y1="42" x2="${lineEnd}" y2="42" stroke="url(#s-blade)" stroke-width="2"/>
  <line x1="${r1(lineStart)}" y1="48" x2="${lineEnd - 30}" y2="48" stroke="${C.lineBright}" stroke-width="1" stroke-dasharray="8 6"/>
  ${cloudMarks.join('')}

  <rect y="40" width="54" height="4" rx="2" fill="${C.scarlet}" filter="url(#p-glow)">
    <animate attributeName="x" values="${r1(lineStart)};${lineEnd - 54}" dur="3.2s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="3.2s" repeatCount="indefinite"/>
  </rect>

  ${shurikenAt(1172, 44, 9, { spin: true, dur: '8s' })}`;
  return doc(W, H, `${n} ${title}`, body);
}

/* ============================================================== DOSSIER */

function dossier() {
  const W = 1200, H = 430;
  const p = panel(W, H, { label: 'ABOUT', cloudOpacity: 0.08 });
  const rows = [
    ['NAME', 'Patrick Josh S. Añedez'],
    ['HANDLE', '@Patkik'],
    ['ROLE', 'Full-Stack & Systems Developer'],
    ['EDUCATION', 'BSIT · Bukidnon State University'],
    ['LOCATION', 'Malaybalay City, Philippines'],
    ['LEADERSHIP', 'Lead Architect (CMS-V2) · Lead Dev (COMSOC)'],
    ['FOCUS', 'Web Platforms, Mobile Apps & Systems'],
    ['STANDARD', 'ISO/IEC 25010 Rated 4.51 / 5.00'],
  ];
  const left = rows.map(([k, v], i) => {
    const y = 94 + i * 40;
    return `
      ${shurikenAt(52, y - 5, 4.8, { opacity: i === 0 ? 1 : 0.7 })}
      ${mono(66, y, k, { size: 10.5, fill: i === 0 ? C.scarlet : C.muted, weight: 700 })}
      <line x1="${66 + tw(k, 10.5, true, 2) + 8}" y1="${y - 4}" x2="206" y2="${y - 4}" stroke="${C.lineBright}" stroke-dasharray="2 3"/>
      ${text(220, y + 1, v, { size: 16, fill: i === 0 ? C.white : C.soft, weight: i === 0 ? 700 : 400 })}`;
  }).join('');

  const status = {
    FLAGSHIP:   { bg: C.darkBlood, border: C.scarlet, text: C.white },
    PRODUCTION: { bg: '#2A0E17', border: C.rose, text: C.rose },
    PIPELINE:   { bg: '#27120B', border: C.ember, text: C.ember },
  };
  const ops = [
    ['FLAGSHIP',   'BukSU CMS-V2', 'Capstone Management & Vector Plagiarism Engine'],
    ['FLAGSHIP',   'RacePulsePH', 'RFID Athletic Timing & Mobile Leaderboards'],
    ['PRODUCTION', 'COMSOC Mentoring System', 'Peer-Tutoring & Session Scheduling Platform'],
    ['PRODUCTION', 'MedPulsePH', 'NFC Digital Healthcare & Clinical Records'],
    ['PIPELINE',   'AudiobookTTSGenerator', 'Neural Text-to-Speech Synthesis Pipeline'],
    ['PRODUCTION', 'World Supremacy Battlegrounds', 'Live Championship Scoring & Bracket System'],
  ];
  const right = ops.map(([s, name, sub], i) => {
    const y = 118 + i * 50;
    const st = status[s];
    return `
      <path d="${cutBox(666, y - 16, 110, 24, 6)}" fill="${st.bg}" stroke="${st.border}" stroke-opacity=".85"/>
      ${shurikenAt(680, y - 4, 4.5)}
      ${mono(730, y, s, { anchor: 'middle', size: 9, fill: st.text, ls: 1.2, weight: 700 })}
      ${text(790, y + 1, name, { size: 16, weight: 700, fill: C.white })}
      ${text(790, y + 20, sub, { size: 12.5, fill: C.muted })}`;
  }).join('');

  const body = `
  <defs>${p.defs}</defs>
  ${p.back}
  <g clip-path="url(#p-clip)">
    <rect x="636" y="56" width="1.5" height="336" fill="${C.lineBright}"/>
    <rect x="635.5" y="56" width="2.5" height="64" fill="${C.scarlet}" filter="url(#p-glow)">
      <animate attributeName="y" values="56;328;56" dur="6s" repeatCount="indefinite"/>
    </rect>
    ${shurikenAt(636.5, 224, 9, { spin: true, dur: '10s' })}
  </g>
  ${left}
  ${shurikenAt(674, 74, 6)}
  ${mono(690, 78, 'ACTIVE PROJECTS', { fill: C.scarlet, ls: 2.5, weight: 700 })}
  ${right}
  ${p.front}`;
  return doc(W, H, 'Profile: Patrick Josh S. Añedez', body);
}

/* ============================================================== ARSENAL */

const ARSENAL = [
  { cat: 'LANGUAGES', color: C.scarlet, items: [
    ['Rs', 'Rust', 'rust'], ['Ts', 'TypeScript', 'typescript'], ['Js', 'JavaScript', 'javascript'], ['Py', 'Python', 'python'],
    ['Jv', 'Java', 'openjdk'], ['Kt', 'Kotlin', 'kotlin'], ['Cp', 'C++', 'cplusplus'], ['Ph', 'PHP', 'php'], ['Sq', 'SQL', 'postgresql']] },
  { cat: 'FRONTEND & MOBILE', color: C.white, items: [
    ['Re', 'React.js', 'react'], ['Rn', 'React Native', 'react'], ['Nx', 'Next.js', 'nextdotjs'], ['Jc', 'Compose', 'jetpackcompose'],
    ['Tw', 'Tailwind', 'tailwindcss'], ['Vt', 'Vite', 'vite'], ['Pw', 'PWA', 'pwa'], ['Po', 'PaddleOCR', 'opencv'], ['An', 'Android', 'android']] },
  { cat: 'BACKEND & DATA', color: C.crimson, items: [
    ['Fa', 'FastAPI', 'fastapi'], ['Ex', 'Express 5', 'express'], ['Nd', 'Node.js', 'nodedotjs'], ['Mg', 'MongoDB', 'mongodb'],
    ['Rd', 'Redis', 'redis'], ['Ch', 'ChromaDB', 'databricks'], ['S3', 'MinIO S3', 'minio'], ['Pg', 'PostgreSQL', 'postgresql'], ['Mq', 'BullMQ', 'celery']] },
  { cat: 'DEVOPS & TOOLS', color: C.rose, items: [
    ['Dk', 'Docker', 'docker'], ['Ci', 'Cisco L2/L3', 'cisco'], ['Rf', 'RFID / NFC', 'nfc'], ['Ga', 'GH Actions', 'githubactions'],
    ['Aw', 'AWS', 'amazon'], ['Lx', 'Linux', 'linux'], ['Ax', 'Axum', 'rust'], ['Cu', 'Cursor', 'cursor'], ['Cl', 'Claude Code', 'anthropic']] },
];

async function arsenal() {
  const W = 1200, H = 660;
  const p = panel(W, H, { label: 'TECH STACK', cloudOpacity: 0.08 });
  const tileW = 116, tileH = 120, gap = 9, x0 = 64, y0 = 108;
  let legendX = 64;
  const legend = ARSENAL.map(({ cat, color }) => {
    const s = `
      ${shurikenAt(legendX + 8, 67, 6, { color: color === C.white ? C.scarlet : color })}
      ${mono(legendX + 24, 71, cat, { size: 11, fill: C.text, ls: 2, weight: 700 })}`;
    legendX += tw(cat, 11, true, 2) + 64;
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
  return doc(W, H, 'Tech Stack', body);
}

/* ========================================================= PROJECT CARDS */

const PROJECTS = [
  { slug: 'cms-v2', repo: 'CMS-V2', title: 'BukSU CMS-V2', tag: 'CAPSTONE & PLAGIARISM PLATFORM', lang: ['JavaScript', '#F1E05A'],
    desc: 'Institutional capstone management platform with lexical winnowing and ChromaDB vector similarity across 22 algorithms, 4-tier RBAC, and Docker.',
    chips: ['React.js', 'Express 5', 'FastAPI', 'ChromaDB', 'Redis', 'Docker'] },
  { slug: 'racepulse', repo: 'RacePulsePH', title: 'RacePulsePH', tag: 'ATHLETIC EVENT TIMING', lang: ['TypeScript', '#3178C6'],
    desc: 'Race timing and event management system integrating RFID bib scanners and finish-line checkpoints with live web dashboards and mobile leaderboards.',
    chips: ['React Native', 'React.js', 'RFID', 'REST APIs', 'Sensors'] },
  { slug: 'comsoc', repo: 'Monitoring-Information-Systems', title: 'COMSOC Mentoring System', tag: 'CAMPUS MENTORSHIP PLATFORM', lang: ['TypeScript', '#3178C6'],
    desc: 'Automated peer-tutoring and programming mentorship platform built for BukSU Computer Society with role-based scheduling and session tracking.',
    chips: ['TypeScript', 'MongoDB Atlas', 'Scheduling', 'RBAC'] },
  { slug: 'medpulse', repo: 'MedPulsePH', title: 'MedPulsePH', tag: 'DIGITAL HEALTHCARE', lang: ['Rust', '#DEA584'],
    desc: 'Healthcare platform utilizing NFC wristbands for patient-authorized clinical access, backed by split PostgreSQL vaults, Redis, and Rust APIs.',
    chips: ['Rust API', 'React Native', 'PostgreSQL', 'Redis', 'NFC'] },
  { slug: 'audiobook', repo: 'AudiobookTTSGenerator', title: 'AudiobookTTSGenerator', tag: 'NEURAL TEXT-TO-SPEECH', lang: ['Python', '#3572A5'],
    desc: 'Automated document-to-audiobook pipeline that extracts chapters, normalizes sentence boundaries, and synthesizes batched neural audio.',
    chips: ['Python', 'Neural TTS', 'Audio Processing', 'CLI'] },
  { slug: 'wsb', repo: 'World-Supremacy-Battleground-app', title: 'World Supremacy Battlegrounds', tag: 'EVENT SCORING & BRACKETS', lang: ['Rust', '#DEA584'],
    desc: 'International street dance championship platform featuring participant registration, bracket tracking, real-time judging, and live leaderboards.',
    chips: ['Next.js', 'Rust Axum', 'Firebase', 'Real-Time DB', 'Docker'] },
];

function projectCard(pj, i) {
  const W = 600, H = 290;
  const shape = cutBox(1, 1, W - 2, H - 2, 18);
  const lines = wrap(pj.desc, 64).slice(0, 3);
  let cx = 32;
  const chips = pj.chips.map((c) => {
    const w = tw(c, 10.5, true, 1) + 22;
    const s = `<path d="${cutBox(cx, 208, w, 26, 5)}" fill="${C.darkBlood}" fill-opacity=".6" stroke="${C.scarlet}" stroke-opacity=".65"/>${mono(cx + w / 2, 225, c, { anchor: 'middle', fill: C.white, size: 10.5, ls: 1 })}`;
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
    ${cloudAt(W - 175, H - 128, 1.55, { opacity: 0.14 })}
    <rect x="0" y="0" width="${W}" height="3.5" fill="url(#c-top)"/>
    <rect x="-200" y="0" width="200" height="3.5" fill="${C.white}" filter="url(#p-glow)">
      <animate attributeName="x" values="-200;${W}" dur="4.2s" begin="${i * 0.6}s" repeatCount="indefinite"/>
    </rect>
  </g>
  <path d="${shape}" fill="none" stroke="${C.lineBright}" stroke-width="1.5"/>
  <path d="M1 19L19 1" stroke="${C.scarlet}" stroke-width="2.6" filter="url(#p-glow)"/>
  <path d="M${W - 26} 1H${W - 9}L${W - 1} 9V26" fill="none" stroke="${C.white}" stroke-opacity=".8" stroke-width="1.6"/>

  ${shurikenAt(38, 40, 6)}
  ${mono(54, 44, pj.tag, { fill: C.scarlet, ls: 1.8, weight: 700 })}
  <circle cx="${W - 32 - tw(pj.lang[0], 11, true, 1) - 12}" cy="40" r="5" fill="${pj.lang[1]}"/>
  ${mono(W - 32, 44, pj.lang[0], { anchor: 'end', fill: C.white, ls: 1 })}

  ${text(32, 86, pj.title, { size: 26, weight: 800, fill: C.white, ls: 0.3 })}
  ${lines.map((l, k) => text(32, 122 + k * 24, l, { size: 15, fill: C.soft })).join('')}
  ${chips}

  <line x1="32" y1="252" x2="${W - 32}" y2="252" stroke="${C.lineBright}"/>
  ${mono(32, 272, pj.repo, { size: 10.5, fill: C.muted, ls: 1 })}
  ${shurikenAt(W - 140, 268, 5)}
  ${mono(W - 32, 272, 'VIEW REPO', { anchor: 'end', size: 10.5, fill: C.scarlet, ls: 2, weight: 700 })}`;
  return doc(W, H, `${pj.title} - ${pj.desc}`, body);
}

function archiveScrolls() {
  const W = 1200, H = 250;
  const p = panel(W, H, { label: 'MORE PROJECTS', cloudOpacity: 0.08 });
  const items = [
    ['Kipit', 'KOTLIN', 'Offline-first Android budget tracker with Compose, Room & Hilt.'],
    ['Spirits of the Vale', 'JAVA', '2D RPG engine with state-machine NPCs and collision physics.'],
    ['Multi-Tenant SaaS Catering V2', 'SAAS', 'Tenant-isolated catering platform with 51 automated test specs.'],
    ['Orchestrator', 'AI AGENTS', 'Autonomous multi-step task runner with durable state checkpoints.'],
    ['Vortex Studio A.I', 'MEDIA AI', 'High-throughput generative media & automated processing pipeline.'],
    ['Barcelon Store', 'ANDROID', 'Mobile store inventory and real-time transaction tracking app.'],
  ];
  const colW = 548, rowH = 52, x0 = 40, y0 = 60;
  const cards = items.map(([name, tag, desc], idx) => {
    const col = idx % 2, row = Math.floor(idx / 2);
    const x = x0 + col * (colW + 24), y = y0 + row * (rowH + 10);
    return `<g transform="translate(${x} ${y})">
      <path d="${cutBox(0, 0, colW, rowH, 8)}" fill="${C.panel2}" fill-opacity=".92" stroke="${C.lineBright}"/>
      <rect x="0" y="10" width="3" height="${rowH - 20}" fill="${C.scarlet}"/>
      ${shurikenAt(20, 19, 5)}
      ${text(34, 23, name, { size: 15, weight: 700, fill: C.white })}
      ${mono(colW - 14, 22, tag, { anchor: 'end', size: 9.5, fill: C.scarlet, ls: 1.4, weight: 700 })}
      ${text(16, 42, desc, { size: 12.5, fill: C.soft })}
    </g>`;
  }).join('');
  return doc(W, H, 'More Projects', `<defs>${p.defs}</defs>${p.back}${cards}${p.front}`);
}

/* ======================================================= SECURITY & QA */

function securityAudit() {
  const W = 1200, H = 250;
  const p = panel(W, H, { label: 'SECURITY & QUALITY', cloudOpacity: 0.08 });
  const colW = 356, h = 152, y = 62;
  const cols = [
    {
      tag: 'QUALITY STANDARD', title: 'ISO/IEC 25010', score: '4.51 / 5.00',
      lines: ['71 student & faculty evaluators', '140 structured QA test cases', 'Automated regression test suite'],
      col: C.scarlet,
    },
    {
      tag: 'NETWORK SECURITY', title: 'Cisco L2/L3', score: 'SSHv2 · ACL',
      lines: ['Multi-router Layer 2/3 topology', 'Telnet & cleartext elimination', 'VLAN segmentation & Extended ACLs'],
      col: C.white,
    },
    {
      tag: 'DATA PRIVACY', title: 'RA 10173', score: 'DPA 2012',
      lines: ['Republic Act 10173 compliance', 'HTTP-only JWT token rotation', 'Atomic updates & audit logging'],
      col: C.rose,
    },
  ];
  const items = cols.map((c, i) => {
    const x = 40 + i * (colW + 26);
    return `<g transform="translate(${x} ${y})">
      <path d="${cutBox(0, 0, colW, h, 10)}" fill="${C.panel2}" fill-opacity=".92" stroke="${C.lineBright}"/>
      ${cloudAt(colW - 68, h - 48, 0.52, { opacity: 0.12 })}
      <path d="M0 14L14 0" stroke="${c.col}" stroke-width="2.2"/>
      ${shurikenAt(22, 20, 5, { color: c.col === C.white ? C.scarlet : c.col })}
      ${mono(34, 24, c.tag, { size: 9.5, fill: c.col, ls: 1.5, weight: 700 })}
      ${text(16, 52, c.title, { size: 21, weight: 800, fill: C.white })}
      ${mono(colW - 16, 48, c.score, { anchor: 'end', size: 12.5, weight: 700, fill: c.col, ls: 1 })}
      <line x1="16" y1="64" x2="${colW - 16}" y2="64" stroke="${C.lineBright}"/>
      ${c.lines.map((l, k) => `<circle cx="22" cy="${84 + k * 22}" r="2.2" fill="${C.scarlet}"/>${text(32, 88 + k * 22, l, { size: 12.5, fill: C.soft })}`).join('')}
    </g>`;
  }).join('');
  const body = `<defs>${p.defs}</defs>${p.back}${items}${p.front}`;
  return doc(W, H, 'Security and Quality Standards', body);
}

/* ================================================================ COMMS */

const COMMS = [
  { slug: 'email', label: 'EMAIL', value: 'patrickjoshanedez35@gmail.com', icon: 'gmail' },
  { slug: 'linkedin', label: 'LINKEDIN', value: 'patrickjosh19', icon: 'linkedin' },
  { slug: 'github', label: 'GITHUB', value: '@Patkik', icon: 'github' },
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
  ${shurikenAt(95, 31, 5)}
  ${mono(108, 35, label, { size: 10.5, fill: C.scarlet, ls: 2, weight: 700 })}
  ${text(88, 62, value, { size: value.length > 25 ? 16 : 19, weight: 700, fill: C.white })}
  ${shurikenAt(W - 34, 43, 6.5, { spin: true, dur: '10s' })}`;
  return doc(W, H, `${label}: ${value}`, body);
}

function footer() {
  const W = 1200, H = 136;
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
  <path d="${wave(9, 82, 2520, 120)}" fill="url(#f-b)">
    <animateTransform attributeName="transform" type="translate" values="0 0;-240 0" dur="7s" repeatCount="indefinite"/>
  </path>
  <path d="${wave(7, 94, 2520, 160)}" fill="url(#f-a)">
    <animateTransform attributeName="transform" type="translate" values="-320 0;0 0" dur="9s" repeatCount="indefinite"/>
  </path>

  ${cloudAt(140, 56, 0.55, { opacity: 0.85 })}
  ${cloudAt(572, 64, 0.55, { opacity: 0.92 })}
  ${cloudAt(1005, 56, 0.55, { opacity: 0.85 })}

  <rect x="320" y="34" width="560" height="1.5" fill="url(#f-l)"/>
  ${shurikenAt(468, 22, 6, { spin: true })}
  ${mono(600, 26, 'PATRICK JOSH AÑEDEZ', { anchor: 'middle', fill: C.white, ls: 4, size: 11.5, weight: 700 })}
  ${shurikenAt(732, 22, 6, { spin: true })}`;
  return doc(W, H, 'Patrick Josh Añedez', body);
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
  const W = 1200, H = 620;
  const p = panel(W, H, { label: 'GITHUB ACTIVITY', cloudOpacity: 0.08 });

  const metrics = [
    ['CONTRIBUTIONS', fmt(t.total), 'PAST YEAR'], ['ACTIVE DAYS', fmt(t.active), `OF ${t.days.length}`],
    ['CURRENT STREAK', `${t.current}d`, t.current ? 'ACTIVE' : 'IDLE'], ['LONGEST STREAK', `${t.longest}d`, 'PAST YEAR'],
    ['REPOSITORIES', fmt(t.repos), 'PUBLIC'], ['PEAK DAY', fmt(t.best), 'COMMITS'],
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
  ${shurikenAt(48, 174, 6)}
  ${mono(64, 178, 'CONTRIBUTIONS', { fill: C.scarlet, ls: 2.5, weight: 700 })}
  ${months.join('')}${weekdays}
  <g>${cells}</g>
  ${mono(1032, 378, 'LOW', { anchor: 'end', size: 9, ls: 1, fill: C.muted })}${legend}${mono(1136, 378, 'HIGH', { size: 9, ls: 1, fill: C.muted })}

  <path d="${cutBox(40, 400, 550, 194, 12)}" fill="${C.void}" fill-opacity=".68" stroke="${C.lineBright}"/>
  ${shurikenAt(72, 430, 5.5)}
  ${mono(88, 434, 'LANGUAGES', { fill: C.scarlet, ls: 2.5, weight: 700 })}
  <rect x="64" y="460" width="502" height="12" fill="${C.line}"/>${bar}
  ${langLegend}

  <path d="${cutBox(610, 400, 550, 194, 12)}" fill="${C.void}" fill-opacity=".68" stroke="${C.lineBright}"/>
  ${shurikenAt(642, 430, 5.5)}
  ${mono(658, 434, 'WEEKLY COMMITS', { fill: C.scarlet, ls: 2.5, weight: 700 })}
  ${mono(1136, 434, `PEAK ${max}`, { anchor: 'end', size: 9.5, fill: C.muted, ls: 1 })}
  ${grid}
  <path d="${line}L${ax + aw} ${ay + ah}L${ax} ${ay + ah}Z" fill="url(#t-area)"/>
  <path d="${line}" fill="none" stroke="${C.scarlet}" stroke-width="2.2" filter="url(#p-glow)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1">
    <animate attributeName="stroke-dashoffset" values="1;0" dur="2.5s" fill="freeze"/>
  </path>
  ${pts.map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="${k === peak ? 4.5 : 2.5}" fill="${k === peak ? C.white : C.void}" stroke="${C.scarlet}" stroke-width="1.5"/>`).join('')}
  ${pts[peak] ? mono(pts[peak][0], pts[peak][1] - 10, String(max), { anchor: 'middle', size: 10, fill: C.white, ls: 0.5, weight: 700 }) : ''}
  ${mono(ax, ay + ah + 22, '-16W', { size: 9, fill: C.muted, ls: 1 })}${mono(ax + aw, ay + ah + 22, 'NOW', { anchor: 'end', size: 9, fill: C.muted, ls: 1 })}
  ${p.front}`;
  return doc(W, H, `GitHub Activity`, body);
}

async function snakeFrame() {
  let raw;
  try { raw = await fs.readFile(SNAKE_SVG, 'utf8'); } catch {
    try {
      const existing = await fs.readFile(path.join(OUT, 'snake.svg'), 'utf8');
      const m = existing.match(/<svg x="40" y="56"[^>]*viewBox="([^"]+)">([\s\S]*?)<\/svg>/);
      if (m) raw = `<svg viewBox="${m[1]}">${m[2]}</svg>`;
    } catch { /* fallback to placeholder */ }
  }
  const vb = raw?.match(/viewBox="([^"]+)"/)?.[1]?.split(/[\s,]+/).map(Number) ?? [0, 0, 880, 192];
  let inner = raw ? raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') : '';
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
  const p = panel(W, H, { label: 'CONTRIBUTION GRAPH', cloudOpacity: 0.08 });
  const content = inner
    ? `<svg x="40" y="56" width="${sw}" height="${sh}" viewBox="${vb.join(' ')}">${inner}</svg>`
    : `
      <g>
        ${cloudAt(W / 2 - 48, H / 2 - 44, 0.95, { opacity: 0.25 })}
        ${mono(W / 2, H / 2 + 12, 'CONTRIBUTION GRAPH', { anchor: 'middle', fill: C.soft, ls: 3, weight: 700 })}
      </g>`;
  return doc(W, H, 'Contribution Graph', `<defs>${p.defs}</defs>${p.back}${content}${p.front}`);
}

/* ================================================================= main */

await fs.mkdir(OUT, { recursive: true });
console.log('Rendering static assets');
await writeIfChanged('header.svg', await header());
const sections = [
  ['ABOUT', 'Profile & Active Projects'],
  ['TECH STACK', 'Languages, Frameworks & Tools'],
  ['PROJECTS', 'Web & Mobile Systems'],
  ['SECURITY & QA', 'Network Hardening & Standards'],
  ['ACTIVITY', 'Contributions & Languages'],
  ['CONTACT', 'Direct Links & Socials'],
];
for (const [k, [t, s]] of sections.entries()) await writeIfChanged(`section-0${k + 1}.svg`, section(k + 1, t, s));
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
