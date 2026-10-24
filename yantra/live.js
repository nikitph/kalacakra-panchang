const DATA = __DATA__;
const { P, D2R, WORM_C, WU, WF, WORM_R, CRANK_S, CRANK_R, PIN_S, AXLE_DZ, DRUM_S0, DRUM_S1, DRUM_R, RN1, TZ, TH, ZERO } = DATA;
const GEARS = DATA.GEARS.map((g) => ({ ...g, turn: new Function("R1", "R2", "R3", `return ${g.turn}`)(127 / 32, 50 / 25, 64 / 38) }));
const stage = document.querySelector(".yt-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const $ = (sel) => svg.querySelector(sel);
const V = G.viewOf(P);
const DAY = 864e5;
const UJJAIN = [23.1765, 75.7885];

const TITHI = ["Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī", "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī", "Trayodaśī", "Caturdaśī", "Pūrṇimā"];
const NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśirā", "Ārdrā", "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "Pū. Phalgunī", "U. Phalgunī", "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla", "Pūrvāṣāḍhā", "Uttarāṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā", "Pū. Bhādrapadā", "U. Bhādrapadā", "Revatī"];
const YOGA = ["Viṣkambha", "Prīti", "Āyuṣmān", "Saubhāgya", "Śobhana", "Atigaṇḍa", "Sukarmā", "Dhṛti", "Śūla", "Gaṇḍa", "Vṛddhi", "Dhruva", "Vyāghāta", "Harṣaṇa", "Vajra", "Siddhi", "Vyatīpāta", "Varīyān", "Parigha", "Śiva", "Siddha", "Sādhya", "Śubha", "Śukla", "Brahma", "Aindra", "Vaidhṛti"];
const KMOV = ["Bava", "Bālava", "Kaulava", "Taitila", "Gara", "Vaṇija", "Viṣṭi"];
const KFIX = { 0: "Kiṁstughna", 57: "Śakuni", 58: "Catuṣpada", 59: "Nāga" };
const VARA = ["Ravi", "Soma", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
const VARA_DEV = ["रवि", "सोम", "मङ्गल", "बुध", "गुरु", "शुक्र", "शनि"];
const tithiName = (n) => (n === 30 ? "Amāvasyā" : TITHI[(n - 1) % 15]);

/* ---------- the day: sunrise to sunrise at Ujjain ---------- */
let dayCache = null;
function dayOf(t) {
  if (dayCache && t >= dayCache.rise && t < dayCache.next) return dayCache;
  const p = E.istParts(t);
  let rise = E.sunEvents(p.y, p.m, p.d, ...UJJAIN).rise;
  let base = Date.UTC(p.y, p.m, p.d);
  if (t < rise) { base -= DAY; const q = new Date(base); rise = E.sunEvents(q.getUTCFullYear(), q.getUTCMonth(), q.getUTCDate(), ...UJJAIN).rise; }
  const n = new Date(base + DAY);
  const next = E.sunEvents(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), ...UJJAIN).rise;
  dayCache = { rise, next, wd: E.istParts(rise).wd, count: Math.round(base / DAY) };
  return dayCache;
}

/* ---------- wheels ---------- */
const gearEls = Object.fromEntries(GEARS.map((g) => [g.id, $(`[data-gear="${g.id}"]`)]));
const lastAngle = {};
function marks(g, angle) {
  const p = (g.m * g.n) / 2;
  const hub = Math.max(2.4, Math.min(5, p * 0.3));
  const rimIn = p - 1.15 * g.m - Math.max(1.2, p * 0.12);
  let out = `<circle class="iso-line" data-tone="lo" r="${hub}" fill="none"/>`;
  if (false) {
    out += `<circle class="iso-line" data-tone="faint" r="${rimIn}" fill="none"/><g transform="rotate(${angle.toFixed(2)})">`;
    for (let i = 0; i < g.spokes; i++) out += `<path class="iso-line" data-tone="faint" d="M${hub} 0H${rimIn}" transform="rotate(${(i / g.spokes) * 360})"/>`;
    out += `</g>`;
  }
  if (p > 6) {
    out += `<g class="iso-dots" data-tone="mid">`;
    for (let i = 0; i < 3; i++) { const a = (angle + i * 120) * D2R; out += `<circle r="0.42" cx="${((hub + 1.6) * Math.cos(a)).toFixed(2)}" cy="${((hub + 1.6) * Math.sin(a)).toFixed(2)}"/>`; }
    out += `</g>`;
  }
  return `<g transform="${topMatrix([g.x, g.y], g.z + g.h, P, "x")}">${out}</g>`;
}
function drawGears(s) {
  for (const g of GEARS) {
    const angle = g.turn(s);
    const step = g.n > 100 ? 0.04 : 0.15;
    if (lastAngle[g.id] !== undefined && Math.abs(angle - lastAngle[g.id]) < step) continue;
    lastAngle[g.id] = angle;
    gearEls[g.id].innerHTML = PT.wheelSvg(K, P, g, angle) + marks(g, angle);
  }
}

/* ---------- worm, crank, pin, star, drum ---------- */
const UP = [0, 0, 1];
const axisAt = (s, du = 0, dz = 0) => [WORM_C[0] + WU[0] * s + WF.u[0] * du, WORM_C[1] + WU[1] * s + WF.u[1] * du, WORM_C[2] + dz];
const frameAt = (o) => G.frameOf(o, WU, WF.u, WF.v);
const flat = (p) => iso(p, P);
// a matrix that lays (a, b) on the plane through o spanned by e1 and e2
function planeMatrix(o, e1, e2) {
  const O = flat(o), X = flat(G.add3(o, e1)), Y = flat(G.add3(o, e2));
  return `matrix(${(X[0] - O[0]).toFixed(4)} ${(X[1] - O[1]).toFixed(4)} ${(Y[0] - O[0]).toFixed(4)} ${(Y[1] - O[1]).toFixed(4)} ${O[0].toFixed(2)} ${O[1].toFixed(2)})`;
}
const faceSign = Math.sign(-G.dot3(WU, V)) || 1;     // which end face of the shaft parts we see: -WU
const wormEl = $('[data-part="thread"]'), crankEl = $('[data-part="crank"]'), pinEl = $('[data-part="pindisc"]'), starEl = $('[data-part="star"]'), drumEl = $('[data-part="drum"]');
function drawThread(phase) {
  // a single-start thread: a helix on the worm sleeve, drawn on the side that faces us
  const pitch = 2.2, r = WORM_R - 0.3, out = [];
  let run = [];
  for (let s = -7.2; s <= 7.2; s += 0.18) {
    const a = (s / pitch) * Math.PI * 2 + phase * D2R;
    const n = [WF.u[0] * Math.cos(a), WF.u[1] * Math.cos(a), Math.sin(a)];
    const p = G.add3(axisAt(s), G.mul3(n, r));
    if (G.dot3(n, V) > 0.05) run.push(flat(p));
    else if (run.length) { out.push(run); run = []; }
  }
  if (run.length) out.push(run);
  wormEl.innerHTML = lineSvg(out.filter((r) => r.length > 1).map((r) => "M" + r.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L")).join(""), { tone: "lo" });
}
function faceLines(o, r, lines, angle) {
  // radial marks on the visible end face of a part on the worm axis
  const e1 = WF.u, e2 = UP;
  const T = planeMatrix(o, e1, e2);
  return `<g transform="${T}"><g transform="rotate(${(-angle).toFixed(2)})">${lines}</g></g>`;
}
function drawCrank(angle) {
  const F = frameAt(axisAt(CRANK_S));
  const face = axisAt(CRANK_S - 1.2 * faceSign);
  let svgText = solidSvg(G.disc(-1.2, 1.2, CRANK_R, F, P), { tone: "mid" });
  let lines = `<circle class="iso-line" data-tone="lo" r="${CRANK_R - 2}" fill="none"/><circle class="iso-line" data-tone="lo" r="2.6" fill="none"/>`;
  for (let i = 0; i < 4; i++) lines += `<path class="iso-line" data-tone="faint" d="M2.6 0H${CRANK_R - 2}" transform="rotate(${i * 90})"/>`;
  svgText += faceLines(face, CRANK_R, lines, angle);
  // the handle: a pin out of the face and a knurled grip on it
  const a = angle * D2R;
  const base = G.add3(face, G.add3(G.mul3(WF.u, Math.cos(a) * (CRANK_R - 2.6)), G.mul3(UP, Math.sin(a) * (CRANK_R - 2.6))));
  const HF = G.frameOf(base, WU.map((c) => -c * faceSign), WF.u, WF.v);
  svgText += solidSvg(G.disc(0, 2.2, 1, HF, P), { tone: "mid", crease: "none" }) + solidSvg(G.disc(2.2, 8.4, 2.1, HF, P), { tone: "hi" });
  crankEl.innerHTML = svgText;
}
function drawPin(angle) {
  const F = frameAt(axisAt(PIN_S));
  const face = axisAt(PIN_S - 1 * faceSign);
  let t = solidSvg(G.disc(-1, 1, 5, F, P), { tone: "mid" });
  t += faceLines(face, 5, `<circle class="iso-line" data-tone="lo" r="1.8" fill="none"/>`, angle);
  const a = angle * D2R;
  const at = G.add3(face, G.add3(G.mul3(WF.u, Math.cos(a) * 3.6), G.mul3(UP, Math.sin(a) * 3.6)));
  t += solidSvg(G.disc(0, 2.2, 0.8, G.frameOf(at, WU.map((c) => -c * faceSign), WF.u, WF.v), P), { tone: "hi" });
  pinEl.innerHTML = t;
}
function drawStar(angle) {
  const o = axisAt(PIN_S, 0, AXLE_DZ);
  let t = solidSvg(G.disc(-1, 1, 8.2, frameAt(o), P), { tone: "mid" });
  let lines = `<circle class="iso-line" data-tone="lo" r="2" fill="none"/>`;
  for (let i = 0; i < 7; i++) lines += `<path class="iso-line" data-tone="lo" d="M4.2 -0.7H8.2M4.2 0.7H8.2M4.2 -0.7V0.7" transform="rotate(${(i * 360) / 7 + 360 / 14})"/>`;
  t += faceLines(axisAt(PIN_S - faceSign, 0, AXLE_DZ), 8.2, lines, angle);
  starEl.innerHTML = t;
}
const HEPT = (angle) => Array.from({ length: 7 }, (_, j) => { const a = (angle + j * (360 / 7)) * D2R; return [DRUM_R * Math.cos(a), DRUM_R * Math.sin(a)]; });
function drawDrum(angle) {
  // a seven-sided drum on the upper axle; each face is engraved with one weekday
  const o = axisAt(DRUM_S0, 0, AXLE_DZ);
  const F = frameAt(o);
  let t = solidSvg(G.prismOf(F, HEPT(angle), 0, DRUM_S1 - DRUM_S0, P), { tone: "hi", crease: "lo" });
  const pts = HEPT(angle);
  for (let j = 0; j < 7; j++) {
    const p0 = pts[j], p1 = pts[(j + 1) % 7];
    const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    const n3 = G.unit3(G.add3(G.mul3(WF.u, mid[0]), G.mul3(WF.v, mid[1])));
    const facing = G.dot3(n3, V);
    if (facing < 0.35) continue;
    const tan = G.unit3(G.add3(G.mul3(WF.u, p1[0] - p0[0]), G.mul3(WF.v, p1[1] - p0[1])));
    const c = G.add3(o, G.add3(G.mul3(WU, (DRUM_S1 - DRUM_S0) / 2), G.add3(G.mul3(WF.u, mid[0]), G.mul3(WF.v, mid[1]))));
    const along = G.mul3(WU, -faceSign);
    const T = planeMatrix(c, along, G.mul3(tan, -1));
    t += `<text class="yt-num yt-drum" transform="${T}" text-anchor="middle" dominant-baseline="central" style="opacity:${Math.min(1, (facing - 0.35) / 0.25).toFixed(2)}">${VARA_DEV[j]}</text>`;
  }
  drumEl.innerHTML = t;
}

/* ---------- dials and hands ---------- */
const tithiEl = $('[data-part="tithi"]'), yogaEl = $('[data-part="yoga"]'), sunHandEl = $('[data-part="sunhand"]'), moonHandEl = $('[data-part="moonhand"]');
function emblemAt(lon, r, z, body) {
  const a = (ZERO + lon) * D2R;
  return `<g transform="${topMatrix([r * Math.cos(a), r * Math.sin(a)], z, P, "x")}">${body}</g>`;
}
function drawDials(sun, moon) {
  tithiEl.setAttribute("transform", `rotate(${(ZERO + sun).toFixed(3)})`);
  yogaEl.setAttribute("transform", `rotate(${(ZERO - sun).toFixed(3)})`);
  const ER = 67;
  // the Sun hand carries a small sun: a boss with twelve rays engraved round it
  const sa = (ZERO + sun) * D2R, sz = TZ + TH + 3.4;
  let sunSvg = solidSvg(extrude(PT.handRing(0, 0, 12, RN1 - 2, 3.2, ZERO + sun), TZ + TH + 2.2, 1.2, P), { tone: "hi", crease: "lo" });
  sunSvg += solidSvg(cylinder(ER * Math.cos(sa), ER * Math.sin(sa), 4.4, sz, 0.9, P, 40), { tone: "hi", crease: "lo" });
  let rays = `<circle class="iso-line" data-tone="lo" r="2.2" fill="none"/>`;
  for (let i = 0; i < 12; i++) rays += `<path class="iso-line" data-tone="lo" d="M2.2 0H3.7" transform="rotate(${i * 30})"/>`;
  sunSvg += emblemAt(sun, ER, sz + 0.9, rays);
  sunHandEl.innerHTML = sunSvg;
  // the Moon hand carries the Moon, lit on the side that faces the Sun
  const ma = (ZERO + moon) * D2R, mz = TZ + TH + 7.2;
  let moonSvg = solidSvg(extrude(PT.handRing(0, 0, 14, RN1 - 1, 3.6, ZERO + moon), TZ + TH + 5.8, 1.4, P), { tone: "hi", lit: true });
  moonSvg += solidSvg(cylinder(ER * Math.cos(ma), ER * Math.sin(ma), 4.6, mz, 0.9, P, 40), { tone: "hi", lit: true });
  const e = ((moon - sun) % 360 + 360) % 360, r = 3.4, c = Math.cos(e * D2R);
  const rx = Math.max(0.05, Math.abs(c) * r).toFixed(2);
  const lit = `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx} ${r} 0 0 ${c > 0 ? 0 : 1} 0 ${-r}Z`;
  moonSvg += emblemAt(moon, ER, mz + 0.9, `<circle class="yt-dark" r="${r}" style="opacity:.7"/><path class="yt-lit" d="${lit}" transform="rotate(${(Math.atan2(Math.sin(sa) - Math.sin(ma), Math.cos(sa) - Math.cos(ma)) / D2R).toFixed(2)})"/><circle class="iso-line" data-tone="hi" r="${r}" fill="none"/>`);
  moonHandEl.innerHTML = moonSvg;
}

/* ---------- state and loop ---------- */
let t = Date.now(), target = t, touring = false, frame = 0, last = 0, visible = false, idle = 0;
const TOUR_RATE = DAY / 4;          // one day every four seconds
const TOUR_SPAN = 30 * DAY;
let tourFrom = t;
function draw() {
  const s = E.meanSun(t);
  drawGears(s);
  const D = dayOf(t);
  const frac = (t - D.rise) / (D.next - D.rise);
  const crank = frac * 360;
  drawThread(crank);
  drawCrank(crank);
  drawPin(crank + 90);
  const p = Math.min(1, Math.max(0, (frac - 0.94) / 0.06));
  const step = p * p * (3 - 2 * p);
  const facing = Math.atan2(G.dot3(WF.v, V), G.dot3(WF.u, V)) / D2R;
  const drum = facing - (D.wd + step + 0.5) * (360 / 7);
  drawStar(drum * 1);
  drawDrum(drum);
  const sun = E.sunSid(t), moon = E.moonSid(t);
  drawDials(sun, moon);
  const e = ((moon - sun) % 360 + 360) % 360;
  const n = Math.floor(e / 12) + 1;
  const nak = Math.floor(moon / (360 / 27));
  const yoga = Math.floor((((sun + moon) % 360) + 360) % 360 / (360 / 27));
  const kar = Math.floor(e / 6);
  const karName = KFIX[kar] || KMOV[(kar - 1) % 7];
  const date = new Date(t + 330 * 60000);
  const text = `${date.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getUTCMonth()]} ${E.fmt(t)} · ${tithiName(n)} ${n <= 15 ? "Śu" : "Kṛ"} · ${NAK[nak]} · ${YOGA[yoga]} · ${karName} · ${VARA[D.wd]}`;
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) {
    target += dt * TOUR_RATE;
    if (target > tourFrom + TOUR_SPAN) { touring = false; target = Date.now(); idleSoon(); }
    t = target;
  } else {
    const k = still.matches ? 1 : 1 - Math.exp(-dt / 0.35);
    t += (target - t) * k;
    if (Math.abs(target - t) < 1000) t = target;
  }
  draw();
  const settled = !touring && t === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
  if (settled && !touring && visible) live();
}
// at rest the clock follows real time, once a second
let liveTimer = 0;
function live() { clearTimeout(liveTimer); liveTimer = setTimeout(() => { if (!touring && Math.abs(target - Date.now()) < 5000) { target = t = Date.now(); draw(); } live(); }, 1000); }
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
function idleSoon(delay = 3600) {
  clearTimeout(idle);
  if (still.matches) return;
  idle = setTimeout(() => { touring = true; tourFrom = target = t; run(); }, delay);
}
const steer = (to) => { touring = false; target = to; idleSoon(); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
let hoverFrom = null;
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const fx = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
  if (hoverFrom === null) hoverFrom = touring ? t : target;
  steer(hoverFrom + (fx - 0.5) * 30 * DAY);
});
stage.addEventListener("pointerleave", () => { hoverFrom = null; idleSoon(); });
stage.addEventListener("keydown", (event) => {
  const unit = event.shiftKey ? 3600e3 : DAY;
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = (touring ? t : target) + unit;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = (touring ? t : target) - unit;
  if (event.key === "Home") to = Date.now();
  if (to === null) return;
  event.preventDefault();
  hoverFrom = null;
  steer(to);
  stage.setAttribute("aria-valuetext", readout.textContent);
});
draw();
idleSoon(1400);
