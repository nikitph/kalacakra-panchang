/* ---------- Jyotiṣa engine: low-precision sun & moon, Lahiri ayanāṁśa ---------- */
export const D2R = Math.PI / 180, DAY = 864e5, IST = 330 * 60000;
export const norm = a => ((a % 360) + 360) % 360;
export const sin = d => Math.sin(d * D2R), cos = d => Math.cos(d * D2R);
export const jdOf = ms => ms / DAY + 2440587.5;
export const cent = ms => (jdOf(ms + 69000) - 2451545) / 36525; // TT ≈ UT + 69s

export function sunTrop(ms) {
  const T = cent(ms);
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T) * sin(M) + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
  const om = 125.04 - 1934.136 * T;
  return norm(L0 + C - 0.00569 - 0.00478 * sin(om));
}
export function moonTrop(ms) {
  const T = cent(ms);
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T;
  const E = 1 - 0.002516 * T;
  const terms = [
    [0, 0, 1, 0, 6.288774], [2, 0, -1, 0, 1.274027], [2, 0, 0, 0, 0.658314], [0, 0, 2, 0, 0.213618],
    [0, 1, 0, 0, -0.185116], [0, 0, 0, 2, -0.114332], [2, 0, -2, 0, 0.058793], [2, -1, -1, 0, 0.057066],
    [2, 0, 1, 0, 0.053322], [2, -1, 0, 0, 0.045758], [0, 1, -1, 0, -0.040923], [1, 0, 0, 0, -0.03472],
    [0, 1, 1, 0, -0.030383], [2, 0, 0, -2, 0.015327], [0, 0, 1, 2, -0.012528], [0, 0, 1, -2, 0.01098],
    [4, 0, -1, 0, 0.010675], [0, 0, 3, 0, 0.010034], [4, 0, -2, 0, 0.008548], [2, 1, -1, 0, -0.007888],
    [2, 1, 0, 0, -0.006766], [1, 0, -1, 0, -0.005163], [1, 1, 0, 0, 0.004987], [2, -1, 1, 0, 0.004036],
    [2, 0, 2, 0, 0.003994], [4, 0, 0, 0, 0.003861], [2, 0, -3, 0, 0.003665], [0, 1, -2, 0, -0.002689],
    [2, 0, -1, 2, -0.002602], [2, -1, -2, 0, 0.00239], [1, 0, 1, 0, -0.002348], [2, -2, 0, 0, 0.002236],
    [0, 1, 2, 0, -0.00212], [0, 2, 0, 0, -0.002069], [2, -2, -1, 0, 0.002048], [2, 0, 1, -2, -0.001773],
    [2, 0, 0, 2, -0.001595], [4, -1, -1, 0, 0.001215], [0, 0, 2, 2, -0.00111], [3, 0, -1, 0, -0.000892],
    [2, 1, 1, 0, -0.000811], [4, -1, -2, 0, 0.000761], [0, 2, -1, 0, 0.000717], [2, 2, -1, 0, 0.000704],
  ];
  let s = 0;
  for (const [d, m, mp, f, c] of terms) {
    const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    s += c * e * sin(d * D + m * M + mp * Mp + f * F);
  }
  const A1 = 119.75 + 131.849 * T, A2 = 53.09 + 479264.29 * T;
  s += 0.003958 * sin(A1) + 0.001962 * sin(Lp - F) + 0.000318 * sin(A2);
  const om = 125.04 - 1934.136 * T;
  return norm(Lp + s - 0.00478 * sin(om));
}
export const ayanamsa = ms => 23.85306 + 1.39722 * cent(ms) + 0.00018 * cent(ms) ** 2; // Lahiri (Citrāpakṣa)
export const sunSid = ms => norm(sunTrop(ms) - ayanamsa(ms));
export const moonSid = ms => norm(moonTrop(ms) - ayanamsa(ms));
export const elong = ms => norm(moonTrop(ms) - sunTrop(ms));

/* sunrise / sunset for a civil date (IST) at lat/lon — returns UTC ms */
export function sunEvents(y, m, d, lat, lon) {
  const jd0 = Date.UTC(y, m, d) / DAY + 2440587.5;
  const n = Math.round(jd0 + 0.5 - 2451545);
  const Js = n - lon / 360;
  const M = norm(357.5291 + 0.98560028 * Js);
  const C = 1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M);
  const lam = norm(M + C + 180 + 102.9372);
  const Jt = 2451545 + Js + 0.0053 * sin(M) - 0.0069 * sin(2 * lam);
  const sd = sin(lam) * sin(23.44), cd = Math.cos(Math.asin(sd));
  const w0 = Math.acos((sin(-0.833) - sin(lat) * sd) / (cos(lat) * cd)) / D2R;
  const toMs = J => (J - 2440587.5) * DAY;
  return { rise: toMs(Jt - w0 / 360), set: toMs(Jt + w0 / 360), noon: toMs(Jt) };
}

/* the five limbs as continuous quantities */
export const limbs = {
  tithi: ms => elong(ms) / 12,                          // 0..30
  nakshatra: ms => moonSid(ms) / (360 / 27),            // 0..27
  yoga: ms => norm(sunSid(ms) + moonSid(ms)) / (360 / 27),
  karana: ms => elong(ms) / 6,                          // 0..60
};
export const idx = (k, ms) => Math.floor(limbs[k](ms));

/* find where a limb's integer index changes, with bisection to ~20 s */
export function refine(k, a, b) {
  const ia = idx(k, a);
  while (b - a > 20000) { const m = (a + b) / 2; if (idx(k, m) === ia) a = m; else b = m; }
  return b;
}
export function spans(k, start, end) {
  const step = k === 'karana' ? 20 * 60000 : 40 * 60000;
  const out = []; let cur = idx(k, start), from = start, t = start;
  while (t < end) {
    const nt = Math.min(t + step, end), ni = idx(k, nt);
    if (ni !== cur) { const x = refine(k, t, nt); out.push({ i: cur, from, to: x }); cur = idx(k, x); from = x; }
    t = nt;
  }
  out.push({ i: cur, from, to: end });
  return out;
}
/* when did the limb active at `ms` begin and when does it end (unclipped) */
export function limbWindow(k, ms) {
  const span = k === 'karana' ? 6 : k === 'tithi' ? 12 : 360 / 27;
  const i = idx(k, ms);
  let a = ms, b = ms;
  while (idx(k, a) === i) a -= 3 * 3600e3;
  while (idx(k, b) === i) b += 3 * 3600e3;
  // bisect both edges
  let lo = a, hi = ms; while (hi - lo > 20000) { const m = (lo + hi) / 2; if (idx(k, m) === i) hi = m; else lo = m; }
  const start = hi;
  lo = ms; hi = b; while (hi - lo > 20000) { const m = (lo + hi) / 2; if (idx(k, m) === i) lo = m; else hi = m; }
  return { i, start, end: hi, span };
}

/* new moons around ms (Newton on elongation) */
export function newMoonNear(ms, dir) {
  let t = ms;
  const e = elong(ms);
  t += (dir < 0 ? -e : 360 - e) / 12.19 * DAY;
  for (let k = 0; k < 6; k++) { const s = ((elong(t) + 180) % 360) - 180; t -= s / 12.19 * DAY; }
  return t;
}
export function masaInfo(ms) {
  const p = newMoonNear(ms, -1), n = newMoonNear(ms + 3600e3, 1);
  const rp = Math.floor(sunSid(p) / 30), rn = Math.floor(sunSid(n) / 30);
  return { prevNM: p, nextNM: n, amanta: (rp + 1) % 12, adhika: rp === rn };
}

/* civil helpers in IST */
export const istParts = ms => { const d = new Date(ms + IST); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay(), h: d.getUTCHours(), mi: d.getUTCMinutes() }; };
export const fmt = ms => { const p = istParts(ms); return String(p.h).padStart(2, '0') + ':' + String(p.mi).padStart(2, '0'); };


/* mean motions: what the gear train carries (sidereal, Lahiri) */
export const meanSun = (ms) => { const d = jdOf(ms) - 2451545; return norm(280.46646 + 0.98564736 * d - ayanamsa(ms)); };
export const meanMoon = (ms) => { const d = jdOf(ms) - 2451545; return norm(218.3164477 + 13.17639648 * d - ayanamsa(ms)); };
