// Pañcāṅga yantra: a skeleton almanac clock that computes the five limbs with gears.
// node build.mjs [--light] [--audit]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = process.env.ANATOMY || "/Users/nikitph/PycharmProjects/MaayaAI/.agents/skills/anatomy";
const k = await import(pathToFileURL(join(SKILL, "kit/iso-kit.mjs")));
const G = await import(pathToFileURL(join(SKILL, "kit/lathe.mjs")));
const A = await import(pathToFileURL(join(SKILL, "kit/audit.mjs")));
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts/inline-kit.mjs")));
import * as M from "./model-engine.mjs";
import { gearRing, gearSvg, wheelSvg, barRing, handRing } from "./parts.mjs";

const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 600, HEIGHT = 580;
const D2R = Math.PI / 180;
const ZERO = 225;                          // where 0° Aśvinī sits on the deck: at the back

/* ---------------- the machine, in world units (z up) ---------------- */
const BASE = { x: -112, y: -112, w: 224, d: 224, r: 12 };
const BASE_H = 12, FOOT_H = 5;
const PILLAR_R = 94;                       // four turned pillars carry the bridge and the deck
const PILLARS = [0, 90, 180, 270].map((a) => [PILLAR_R * Math.cos(a * D2R), PILLAR_R * Math.sin(a * D2R)]);
const DECK = { r: 106, z: 170, h: 5 };
const DECK_TOP = DECK.z + DECK.h;
const BRIDGE = { x: -PILLAR_R - 7, y: -11, w: PILLAR_R * 2 + 14, d: 22, r: 4 };
const BRIDGE_Z = 84, BRIDGE_H = 4;

// Gear train. Module m; pitch radius m·N/2. The ratio is the Antikythera mechanism's
// 127/32 · 50/25 · 64/38 = 254/19: 254 sidereal months in 19 sidereal years.
// The 127 rides the Sun's tube; an idler keeps the Moon turning the same way as the Sun.
const m1 = 0.45;
const pr = (n, m = m1) => (m * n) / 2;
const polar = (r, a) => [r * Math.cos(a * D2R), r * Math.sin(a * D2R)];
const dA = pr(127) + pr(32), dAB = pr(50) + pr(25), dBI = pr(64) + pr(20), dI = pr(20) + pr(38);
const dB = 31.2;
const alpha = Math.acos((dA ** 2 + dB ** 2 - dAB ** 2) / (2 * dA * dB)) / D2R;
const beta = Math.acos((dI ** 2 + dB ** 2 - dBI ** 2) / (2 * dI * dB)) / D2R;
const ANG_B = 40;
const POS = {
  A: polar(dA, ANG_B - alpha),
  B: polar(dB, ANG_B),
  I: polar(dI, ANG_B + beta),
  C: polar(pr(30) * 2, 30),
  D: polar(pr(30) * 2, -30),
  O: [0, 0],
};
// Every wheel: where it sits, its teeth, its height, and how it turns with the sun arbor.
// turn(s) gives its angle from the mean Sun s (degrees); the ratios are the tooth counts.
const R1 = 127 / 32, R2 = 50 / 25, R3 = 64 / 38;
const GEARS = [
  { id: "m38", at: "O", n: 38, z: 10, turn: (s) => s * R1 * R2 * R3 },
  { id: "i20", at: "I", n: 20, z: 10, turn: (s) => -s * R1 * R2 * (64 / 20) + 9 },
  { id: "b64", at: "B", n: 64, z: 10, turn: (s) => s * R1 * R2, spokes: 4 },
  { id: "b25", at: "B", n: 25, z: 16, turn: (s) => s * R1 * R2 + 7.2 },
  { id: "a50", at: "A", n: 50, z: 16, turn: (s) => -s * R1 },
  { id: "a32", at: "A", n: 32, z: 22, turn: (s) => -s * R1 + 5.6 },
  { id: "s127", at: "O", n: 127, z: 22, turn: (s) => s, spokes: 5 },
  { id: "s30", at: "O", n: 30, z: 92, turn: (s) => s },
  { id: "c30", at: "C", n: 30, z: 92, turn: (s) => -s + 6 },
  { id: "c30b", at: "C", n: 30, z: 98, turn: (s) => -s },
  { id: "d30", at: "D", n: 30, z: 98, turn: (s) => s + 6 },
  { id: "d30b", at: "D", n: 30, z: 104, turn: (s) => s },
  { id: "y30", at: "O", n: 30, z: 104, turn: (s) => -s + 6 },
].map((g) => ({ ...g, x: POS[g.at][0], y: POS[g.at][1], m: m1, h: 2, tone: "mid" }));
// The year wheel: 365 teeth, one per day, on the Sun's tube, turned by the worm.
const YEAR = { id: "year", x: 0, y: 0, n: 365, m: 0.36, z: 56, h: 2.2, tone: "mid", turn: (s) => s, rim: 47, spokes: 4 };
const WORM_A = 110;
const WORM_R = 3.4;
const WORM_C = [...polar(pr(365, 0.36) + WORM_R - 0.36, WORM_A), YEAR.z + YEAR.h / 2];
const WU = [Math.cos((WORM_A + 90) * D2R), Math.sin((WORM_A + 90) * D2R), 0];   // worm axis: across the screen
const WF = G.frameOf(WORM_C, WU, [Math.cos(WORM_A * D2R), Math.sin(WORM_A * D2R), 0], [0, 0, 1]);
const WAX = (s, du = 0, dz = 0) => [WORM_C[0] + WU[0] * s + Math.cos(WORM_A * D2R) * du, WORM_C[1] + WU[1] * s + Math.sin(WORM_A * D2R) * du, WORM_C[2] + dz];
const CRANK_S = -41, CRANK_R = 11;
const PIN_S = -25.5, AXLE_DZ = 15, DRUM_S0 = -39, DRUM_S1 = -27.8, DRUM_R = 7.6, POST_S = [-16, 16];
const UF = G.frameOf(WAX(0, 0, AXLE_DZ), WU, WF.u, WF.v);   // the drum's axle, above the worm shaft

/* ---------------- camera ---------------- */
const P = k.fitProjection(
  [...k.boxCorners(BASE, -BASE_H - FOOT_H, 0), [0, 0, DECK_TOP + 16], [-DECK.r, 0, DECK_TOP], [DECK.r, 0, DECK_TOP], [0, -DECK.r, DECK_TOP], [0, DECK.r, DECK_TOP]],
  WIDTH, HEIGHT, { pad: 30, azimuth: 45, elevation: 36 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const Dt = (pts, style) => k.dotsSvg(pts, style);
const V = G.viewOf(P);
const R = A.recorder(P);
const up = [0, 0, 1];
const vert = (x, y) => G.frameOf([x, y, 0], up, [1, 0, 0], [0, 1, 0]);
const put = (name, centre, svg, shapes, extra = {}) => R.put({ name: R.nameFor(name), at: centre, svg, shapes: shapes.map((s) => R.solid(s)), ...extra });
const cyl = (name, x, y, r, z, h, style = { tone: "mid" }, steps, bevel = 0, inner = "") => put(name, [x, y, z + h / 2], S(k.cylinder(x, y, r, z, h, P, steps || G.stepsFor(r, 20, 96, G.scaleOf(P)), bevel), { ...style, inner }), [A.cylinder(x, y, r, z, h, { name })]);

/* ---------------- base ---------------- */
const fixed = [];
fixed.push(`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`);
for (const [x, y] of [...k.corners(BASE, 24)].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
  fixed.push(S(k.cylinder(x, y, 8, -BASE_H - FOOT_H, 1.6, P, 32), { tone: "lo" }));
  fixed.push(S(k.cylinder(x, y, 6.2, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 32), { tone: "mid" }));
  R.solid(A.cylinder(x, y, 6.2, -BASE_H - FOOT_H, FOOT_H, { name: "stand.foot" }));
}
fixed.push(S(k.slabOf(BASE, -BASE_H, BASE_H, P, 10, 1.6), { tone: "mid", inner: L(k.sideSeam(BASE, -BASE_H + 4, P, 10), { tone: "faint" }) }));
R.solid(A.slab(BASE, -BASE_H, BASE_H, { name: "stand.base" }, 10));
fixed.push(L(k.planOutline(k.insetPlan(BASE, 6), 0, P, 10), { tone: "lo" }));
const screws = k.corners(BASE, 11);
fixed.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 18)).join(""), { tone: "lo" }));
fixed.push(Dt(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
// ghaṭī ruler along the front-right edge: 60 ghaṭī to a day, a major every 5
{
  const strip = { x: BASE.x + BASE.w - 14, y: -78, w: 7, d: 156, r: 1 };
  fixed.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.y + 10, strip.y + strip.d - 10, 3, 5, strip.x + 0.8, 0.6, [2, 3.8], P, "y");
  fixed.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  fixed.push(Dt([at([strip.x + 3.5, strip.y + 4, 0.6]), at([strip.x + 3.5, strip.y + strip.d - 4, 0.6])], { size: 0.45 }));
}
// label plate on the front-left edge, with the one engraved word
{
  const plate = { x: -78, y: BASE.y + BASE.d - 17, w: 56, d: 10, r: 1.2 };
  fixed.push(S(k.slabOf(plate, 0, 0.8, P, 4), { tone: "lo" }));
  fixed.push(L(k.planOutline(k.insetPlan(plate, 1.4), 0.8, P, 4), { tone: "faint" }));
  fixed.push(k.faceTextSvg(k.topMatrix([plate.x + plate.w / 2, plate.y + 7.4], 0.8, P, "x"), "पञ्चाङ्ग यन्त्र", { size: 5, tone: "mid", anchor: "middle" }));
  fixed.push(Dt([at([plate.x + 2.6, plate.y + 5.5, 0.8]), at([plate.x + plate.w - 2.6, plate.y + 5.5, 0.8])], { size: 0.45 }));
}

/* ---------------- pillars and bridge ---------------- */
const CUTS = [...new Set([0, 10, 12, 16, 18, 22, 24, 56, 58.2, BRIDGE_Z, BRIDGE_Z + BRIDGE_H, 92, 94, 98, 100, 104, 106, DECK.z])].sort((a, b) => a - b);
function column(name, x, y, r, z0, z1, style) {
  // a vertical rod cut at every wheel plane, so each piece sorts against the wheels around it
  const marks = [z0, ...CUTS.filter((c) => c > z0 + 0.01 && c < z1 - 0.01), z1];
  for (let i = 0; i < marks.length - 1; i++) cyl(name, x, y, r, marks[i], marks[i + 1] - marks[i], style || { tone: "mid", crease: "none" });
}
PILLARS.forEach(([x, y], i) => {
  const F = vert(x, y);
  const foot = [[0, 8.4], [3, 8.4], [3, 6.6], [5.4, 5.4, 1], [7, 4.4, 1], [8, 4.2]];
  put(`pillar${i}.foot`, [x, y, 4], S(G.solidOf(foot, F, P), { tone: "mid" }), [A.solid(F, foot, { name: `pillar${i}.foot` })]);
  column(`pillar${i}.shaft`, x, y, 4.2, 8, i % 2 === 0 ? BRIDGE_Z - 2.5 : DECK.z - 6);
  if (i % 2 === 0) {
    // the bridge rests on a collar on the two pillars it spans
    cyl(`pillar${i}.collar`, x, y, 6.4, BRIDGE_Z - 2.5, 2.5, { tone: "mid" });
    column(`pillar${i}.upper`, x, y, 4.2, BRIDGE_Z + BRIDGE_H, DECK.z - 6);
  }
  const cap = [[0, 4.2], [2.2, 4.6, 1], [4.4, 5.8, 1], [6, 7.6]];
  const CF = vert(x, y);
  CF.o = [x, y, DECK.z - 6];
  put(`pillar${i}.cap`, [x, y, DECK.z - 3], S(G.solidOf(cap, CF, P), { tone: "mid" }), [A.solid(CF, cap, { name: `pillar${i}.cap` })]);
});
put("bridge", [0, 0, BRIDGE_Z + 2], S(k.slabOf(BRIDGE, BRIDGE_Z, BRIDGE_H, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(BRIDGE, BRIDGE_Z + 1.4, P, 4), { tone: "faint" }) }) +
  L([[-70, 0], [-40, 0], [40, 0], [70, 0]].map(([x]) => k.ring(x, 0, 2.2, BRIDGE_Z + BRIDGE_H, P, 14)).join(""), { tone: "lo" }) +
  Dt([-70, -40, 40, 70].map((x) => at([x, 0, BRIDGE_Z + BRIDGE_H])), { size: 0.5 }),
  [A.slab(BRIDGE, BRIDGE_Z, BRIDGE_H, { name: "bridge" }, 4)]);

/* ---------------- arbors and studs ---------------- */
// Studs stand on the base (A, B, I) or on the bridge (C, D); each is cut at its wheels.
const studs = [
  { name: "studA", at: "A", z0: 0, z1: 25.6 },
  { name: "studB", at: "B", z0: 0, z1: 19.6 },
  { name: "studI", at: "I", z0: 0, z1: 13.6 },
  { name: "studC", at: "C", z0: BRIDGE_Z + BRIDGE_H, z1: 101.5 },
  { name: "studD", at: "D", z0: BRIDGE_Z + BRIDGE_H, z1: 107.5 },
];
for (const s of studs) {
  const [x, y] = POS[s.at];
  cyl(`${s.name}.collar`, x, y, 3.2, s.z0, 2.4, { tone: "mid" });
  const wheels = GEARS.filter((g) => g.at === s.at).map((g) => [g.z, g.z + g.h]);
  let z = s.z0 + 2.4;
  for (const [a, b] of wheels.sort((p, q) => p[0] - q[0])) {
    if (a > z + 0.01) column(`${s.name}.rod`, x, y, 1.5, z, a);
    // a boss under each wheel, where it is pinned to the arbor
    z = b;
  }
  if (s.z1 > z) {
    column(`${s.name}.rod`, x, y, 1.5, z, s.z1 - 1.4);
    cyl(`${s.name}.cap`, x, y, 2.3, s.z1 - 1.4, 1.4, { tone: "mid" });
  }
}
// The central arbor: the Moon's arbor innermost (lowest wheel), the Sun's tube around it,
// the yoga tube outermost (highest wheel). Each pipe starts just below its own first wheel.
cyl("centre.step", 0, 0, 4.2, 0, 3, { tone: "mid" });
column("moon.arbor", 0, 0, 1.6, 3, 10);
column("moon.arbor", 0, 0, 1.6, 12, 20);
column("sun.tube", 0, 0, 3, 20, 22);
column("sun.tube", 0, 0, 3, 24, 56);
column("sun.tube", 0, 0, 3, 58.2, BRIDGE_Z);
column("sun.tube", 0, 0, 3, BRIDGE_Z + BRIDGE_H, 92);
column("sun.tube", 0, 0, 3, 94, 103);
column("yoga.tube", 0, 0, 4.4, 103, 104);
column("yoga.tube", 0, 0, 4.4, 106, DECK.z);
// a washer on the deck under the yoga disc
cyl("deck.washer", 0, 0, 9, DECK.z + DECK.h, 0.6, { tone: "mid" }, 40);

/* ---------------- wheels (live) ---------------- */
const sun0 = M.meanSun(Date.now());
const live = [];
function wheel(g) {
  const angle = g.turn(sun0);
  const ring = gearRing(g.x, g.y, g.n, g.m, angle);
  const body = wheelSvg(k, P, g, angle);
  put(`wheel.${g.id}`, [g.x, g.y, g.z + g.h / 2], `<g data-gear="${g.id}">${body}${marks(g, angle)}</g>`, [A.extruded(ring, g.z, g.h, { name: `wheel.${g.id}` })], { live: g.id });
  live.push(g.id);
}
// What turns with a wheel and shows it turning: a hub ring, crossings, and screws.
function marks(g, angle) {
  return `<g data-marks="${g.id}" transform="${k.topMatrix([g.x, g.y], g.z + g.h, P, "x")}">${marksLocal(g, angle)}</g>`;
}
function marksLocal(g, angle) {
  const p = pr(g.n, g.m);
  const hub = Math.max(2.4, Math.min(5, p * 0.3));
  const rimIn = p - 1.15 * g.m - Math.max(1.2, p * 0.12);
  let out = `<circle class="iso-line" data-tone="lo" r="${hub}" fill="none"/>`;
  if (g.spokes && false) {
    out += `<circle class="iso-line" data-tone="faint" r="${rimIn}" fill="none"/>`;
    out += `<g transform="rotate(${angle})">`;
    for (let i = 0; i < g.spokes; i++) {
      const a = (i / g.spokes) * 360;
      out += `<path class="iso-line" data-tone="faint" d="M${hub} 0H${rimIn}" transform="rotate(${a})"/>`;
    }
    out += `</g>`;
  }
  const scr = [0, 1, 2].map((i) => ((angle + i * 120) * D2R)).map((a) => `<circle r="0.42" cx="${((hub + 1.6) * Math.cos(a)).toFixed(2)}" cy="${((hub + 1.6) * Math.sin(a)).toFixed(2)}"/>`).join("");
  return out + (p > 6 ? `<g class="iso-dots" data-tone="mid">${scr}</g>` : "");
}
GEARS.forEach(wheel);
wheel(YEAR);

/* ---------------- worm, crank and the vāra drum ---------------- */
// Two bearing posts carry the worm shaft; the near one also carries the drum's axle above it.
// The shaft is drawn in pieces between the faces it passes through.
const shaftF = G.frameOf(WORM_C, WU, WF.u, WF.v);
const AXLE_TOP = WORM_C[2] + AXLE_DZ;
const HALF = 3.6, BOSS = 1.4;
const rod = (name, F, s0, s1, r, tone = "mid") => put(name, G.pointOf(F, (s0 + s1) / 2, 0, 0), S(G.disc(s0, s1, r, F, P), { tone, crease: "none" }), [A.disc(F, s0, s1, r, { name })]);
const axleF = G.frameOf(WAX(0, 0, AXLE_DZ), WU, WF.u, WF.v);
for (const [a, b] of [[CRANK_S + 1.2, PIN_S - 1], [PIN_S + 1, POST_S[0] - HALF - BOSS], [POST_S[0] + HALF, -7.4], [7.4, POST_S[1] - HALF], [POST_S[1] + HALF + BOSS, POST_S[1] + HALF + BOSS + 1.6]]) rod("worm.shaft", shaftF, a, b, 1.5);
for (const p of POST_S) {
  const [x, y] = WAX(p);
  const tall = p < 0;
  const h = (tall ? AXLE_TOP : WORM_C[2]) + 4.4;
  // the post is square to the shaft, so the bosses sit flat on its faces
  const PF = G.frameOf([x, y, 0], up, WU, WF.u);
  const sq = k.roundedPlan({ x: -HALF, y: -HALF, w: HALF * 2, d: HALF * 2, r: 1 }, 3);
  put(`worm.post${p}`, [x, y, h / 2], S(G.prismOf(PF, sq, 0, h, P), { tone: "mid" }), [A.prism(PF, sq, 0, h, { name: `worm.post${p}` })]);
  // a bearing boss on the outer face of the post, for each bore
  const out = Math.sign(p);
  for (const dz of tall ? [0, AXLE_DZ] : [0]) {
    const BF = G.frameOf(WAX(p, 0, dz), WU, WF.u, WF.v);
    const s0 = out > 0 ? HALF : -HALF - BOSS, s1 = s0 + BOSS;
    const r = dz ? 3 : 3.6;
    put(`worm.boss${p}.${dz}`, WAX(p + out * (HALF + BOSS / 2), 0, dz), S(G.disc(s0, s1, r, BF, P), { tone: "mid" }) + Dt(G.dotsOf(BF, out > 0 ? s1 : s0, r - 0.9, 4, P, { all: true }), { size: 0.35 }), [A.disc(BF, s0, s1, r, { name: `worm.boss${p}.${dz}` })]);
  }
}
// the worm: a threaded sleeve on the shaft, its thread drawn live
put("worm.body", WAX(0), `${S(G.disc(-7.4, 7.4, WORM_R - 0.6, shaftF, P), { tone: "hi", crease: "none" })}<g data-part="thread"></g>`, [A.disc(shaftF, -7.4, 7.4, WORM_R - 0.6, { name: "worm.body" })], { live: "worm" });
// crank wheel with four spokes and a handle (live)
const crankF = G.frameOf(WAX(CRANK_S), WU, WF.u, WF.v);
put("crank", WAX(CRANK_S), `<g data-part="crank"></g>`, [A.disc(crankF, -1.2, 1.2, CRANK_R, { name: "crank" })], { live: "crank" });
// the pin disc on the worm shaft, which steps the star wheel once a day
const pinF = G.frameOf(WAX(PIN_S), WU, WF.u, WF.v);
put("pin.disc", WAX(PIN_S), `<g data-part="pindisc"></g>`, [A.disc(pinF, -1, 1, 5, { name: "pin.disc" })], { live: "pin" });
// the drum's axle, the star wheel and the seven-sided drum
for (const [a, b] of [[PIN_S + 1, POST_S[0] - HALF - BOSS], [DRUM_S1, PIN_S - 1]]) rod("drum.axle", axleF, a, b, 1.3);
rod("drum.cap", axleF, DRUM_S0 - 0.7, DRUM_S0, 2.2);
put("star", WAX(PIN_S, 0, AXLE_DZ), `<g data-part="star"></g>`, [A.disc(G.frameOf(WAX(PIN_S, 0, AXLE_DZ), WU, WF.u, WF.v), -1, 1, 8.2, { name: "star" })], { live: "star" });
put("drum", WAX((DRUM_S0 + DRUM_S1) / 2, 0, AXLE_DZ), `<g data-part="drum"></g>`, [A.disc(G.frameOf(WAX(DRUM_S0, 0, AXLE_DZ), WU, WF.u, WF.v), 0, DRUM_S1 - DRUM_S0, DRUM_R * 0.9, { name: "drum" })], { live: "drum" });

/* ---------------- deck and dials ---------------- */
const deckSvg = [];
const RN0 = 81, RN1 = DECK.r - 4;           // nakṣatra ring, fixed on the deck
const RY0 = 58, RY1 = 78;                   // yoga disc, turns against the Sun
const RT0 = 21, RT1 = 56;                   // tithi disc, turns with the Sun
const deckF = G.frameOf([0, 0, DECK.z], up, [1, 0, 0], [0, 1, 0]);
put("deck", [0, 0, DECK.z + DECK.h / 2], S(k.cylinder(0, 0, DECK.r, DECK.z, DECK.h, P, 128, 1.2), { tone: "mid", inner: L(k.sideArc(0, 0, DECK.r, DECK.z + 1.6, P, 96), { tone: "faint" }) }) + deckEngraving(), [A.cylinder(0, 0, DECK.r, DECK.z, DECK.h, { name: "deck" })]);
function deckEngraving() {
  // the 27 nakṣatras of 13°20′, each in four pādas, with Aśvinī 0° at the back
  const T = k.topMatrix([0, 0], DECK_TOP, P, "x");
  let g = `<g transform="${T}">`;
  g += `<circle class="iso-line" data-tone="lo" r="${RN1}" fill="none"/><circle class="iso-line" data-tone="lo" r="${RN0}" fill="none"/>`;
  for (let i = 0; i < 108; i++) {
    const a = ZERO + i * (360 / 108);
    const major = i % 4 === 0;
    g += `<path class="iso-line" data-tone="${major ? "mid" : "lo"}" d="M${RN1} 0H${major ? RN0 : RN1 - 3}" transform="rotate(${a.toFixed(3)})"/>`;
  }
  for (let i = 0; i < 27; i++) {
    const a = ZERO + (i + 0.5) * (360 / 27);
    g += `<text class="yt-num" transform="rotate(${a.toFixed(2)}) translate(${(RN0 + RN1) / 2 - 1.6} 0) rotate(90)" text-anchor="middle" dominant-baseline="central">${dev(i + 1)}</text>`;
  }
  // screws holding the ring plate
  g += `<g class="iso-dots" data-tone="mid">`;
  for (let i = 0; i < 6; i++) { const a = (i * 60 + 15) * D2R; g += `<circle r="0.5" cx="${((RN1 + 2) * Math.cos(a)).toFixed(2)}" cy="${((RN1 + 2) * Math.sin(a)).toFixed(2)}"/>`; }
  g += `</g>`;
  return g + `</g>`;
}
function dev(n) { return String(n).replace(/\d/g, (d) => "०१२३४५६७८९"[d]); }
// yoga disc: on a washer just above the deck; its engraving is rebuilt live as one rotated group
const YZ = DECK_TOP + 0.6, YH = 2.6, TZ = YZ + YH, TH = 3.4;
put("yoga.disc", [0, 0, YZ + YH / 2], S(k.cylinder(0, 0, RY1, YZ, YH, P, 112, 0.8), { tone: "hi", crease: "lo" }) +
  `<g transform="${k.topMatrix([0, 0], YZ + YH, P, "x")}"><g data-part="yoga">${yogaFace()}</g></g>`, [A.cylinder(0, 0, RY1, YZ, YH, { name: "yoga.disc" })], { live: "yoga" });
function yogaFace() {
  const bad = [0, 5, 8, 9, 12, 14, 16, 18, 26];
  let g = "";
  for (let i = 0; i < 27; i++) {
    const a0 = i * (360 / 27), a1 = a0 + 360 / 27;
    if (bad.includes(i)) g += `<path class="yt-bad" d="${sectorPath(RY0, RY1 - 0.8, a0, a1)}"/>`;
    g += `<path class="iso-line" data-tone="lo" d="M${RY0} 0H${RY1}" transform="rotate(${a0.toFixed(3)})"/>`;
    g += `<text class="yt-num yt-small" transform="rotate(${(a0 + 180 / 27).toFixed(2)}) translate(${(RY0 + RY1) / 2} 0) rotate(90)" text-anchor="middle" dominant-baseline="central">${dev(i + 1)}</text>`;
  }
  return g + `<circle class="iso-line" data-tone="lo" r="${RY0}" fill="none"/>`;
}
function sectorPath(r0, r1, a0, a1) {
  const p = (r, a) => `${(r * Math.cos(a * D2R)).toFixed(2)} ${(r * Math.sin(a * D2R)).toFixed(2)}`;
  return `M${p(r0, a0)}L${p(r1, a0)}A${r1} ${r1} 0 0 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`;
}
put("tithi.disc", [0, 0, TZ + TH / 2], S(k.cylinder(0, 0, RT1, TZ, TH, P, 96, 0.8), { tone: "hi", crease: "lo" }) +
  `<g transform="${k.topMatrix([0, 0], TZ + TH, P, "x")}"><g data-part="tithi">${tithiFace()}</g></g>`, [A.cylinder(0, 0, RT1, TZ, TH, { name: "tithi.disc" })], { live: "tithi" });
function tithiFace() {
  // 30 cells of 12°, each shaded by how much of the Moon is lit in it; karaṇa half-ticks on the rim
  let g = "";
  for (let i = 0; i < 30; i++) {
    const a0 = i * 12, lit = (1 - Math.cos((a0 + 6) * D2R)) / 2;
    g += `<path class="yt-dark" style="opacity:${((1 - lit) * 0.62).toFixed(3)}" d="${sectorPath(RT0, RT1 - 0.8, a0, a0 + 12)}"/>`;
    g += `<path class="iso-line" data-tone="${i % 15 === 0 ? "hi" : "lo"}" d="M${RT0} 0H${RT1}" transform="rotate(${a0})"/>`;
    g += `<path class="iso-line" data-tone="lo" d="M${RT1} 0H${RT1 - 3.2}" transform="rotate(${a0 + 6})"/>`;
    const n = i < 15 ? i + 1 : i - 14;
    g += `<text class="yt-num ${lit < 0.4 ? "yt-light" : ""}" transform="rotate(${a0 + 6}) translate(${(RT0 + RT1) / 2 + 3} 0) rotate(90)" text-anchor="middle" dominant-baseline="central">${i === 14 ? "पू" : i === 29 ? "अ" : dev(n)}</text>`;
  }
  // the centre plate: a turned groove and four screws that turn with the disc
  g += `<circle class="iso-line" data-tone="faint" r="${RT0 - 4}" fill="none"/><g class="iso-dots" data-tone="mid">`;
  for (let i = 0; i < 4; i++) g += `<circle r="0.5" cx="${((RT0 - 7.5) * Math.cos(i * Math.PI / 2 + 0.6)).toFixed(2)}" cy="${((RT0 - 7.5) * Math.sin(i * Math.PI / 2 + 0.6)).toFixed(2)}"/>`;
  return g + `</g><circle class="iso-line" data-tone="lo" r="${RT0}" fill="none"/>`;
}
// hub: the Sun tube's collar, the Moon hand, and the nut
cyl("hub.collar", 0, 0, 8.4, TZ + TH, 2.2, { tone: "mid" }, 48, 0.5);
put("sun.hand", [0, 0, TZ + TH + 2.6], `<g data-part="sunhand"></g>`, [A.extruded(handRing(0, 0, 12, RN1 - 2, 3.2, 0), TZ + TH + 2.2, 1.2, { name: "sun.hand" })], { live: "sunhand" });
cyl("hub.boss", 0, 0, 5.2, TZ + TH + 3.4, 2.4, { tone: "mid" }, 40);
put("moon.hand", [0, 0, TZ + TH + 6.4], `<g data-part="moonhand"></g>`, [A.extruded(handRing(0, 0, 14, RN1 - 1, 3.6, 0), TZ + TH + 5.8, 1.4, { name: "moon.hand" })], { live: "moonhand" });
put("hub.nut", [0, 0, TZ + TH + 8.4], S(G.solidOf([[0, 3.4], [1.6, 3.4], [2.6, 2.6, 1], [3.2, 0.6, 1]], G.frameOf([0, 0, TZ + TH + 7.2], up, [1, 0, 0], [0, 1, 0]), P), { tone: "mid" }), [A.solid(G.frameOf([0, 0, TZ + TH + 7.2], up, [1, 0, 0], [0, 1, 0]), [[0, 3.4], [1.6, 3.4], [2.6, 2.6, 1], [3.2, 0.6, 1]], { name: "hub.nut" })]);

/* ---------------- order and audit ---------------- */
A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
// meshing wheels interleave their teeth by design
const MESH = [["wheel.a50", "wheel.b25"], ["wheel.a32", "wheel.s127"], ["wheel.b64", "wheel.i20"], ["wheel.i20", "wheel.m38"], ["wheel.s30", "wheel.c30"], ["wheel.c30b", "wheel.d30"], ["wheel.d30b", "wheel.y30"], ["wheel.year", "worm.body"]];
A.auditOrExit(R, P, { allow: MESH });

const DATA = {
  P, D2R, WORM_C, WU, WF: { u: WF.u, v: WF.v }, WORM_R, CRANK_S, CRANK_R, PIN_S, AXLE_DZ, DRUM_S0, DRUM_S1, DRUM_R,
  GEARS: [...GEARS, YEAR].map(({ turn, ...g }) => ({ ...g, turn: turn.toString() })),
  RN1, TZ, TH, ZERO,
};

const CSS = `
.yt-num{font-family:"Noto Serif Devanagari","Kohinoor Devanagari",serif;font-size:4.4px;fill:var(--anatomy-mid)}
.yt-small{font-size:3.4px}
.yt-drum{font-size:4.2px;fill:var(--anatomy-hi)}
.yt-light{fill:var(--anatomy-card)}
.yt-dark{fill:var(--anatomy-hi)}
.yt-lit{fill:var(--anatomy-card)}
.yt-bad{fill:var(--anatomy-shade-0)}
.iso[data-theme="dark"] .yt-dark{fill:#000}
.iso[data-theme="dark"] .yt-lit{fill:var(--anatomy-hi)}
.iso[data-theme="dark"] .yt-light{fill:var(--anatomy-mid)}
@media (max-width:520px){.iso-plate-corner[data-corner="readout"]{white-space:normal;max-width:74%;text-align:right;line-height:1.4}.iso-plate{padding-bottom:76px}}
.yt-nav{margin:28px 0 0;color:var(--anatomy-text);font-size:13px}.yt-nav a{color:var(--anatomy-strong)}
.yt-stage{outline:none;touch-action:pan-y}
.yt-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
`;
const body = [];
const order = R.items.map((item) => item.svg).join("");
const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "A brass skeleton almanac clock. A crank turns a worm, one turn a day, which turns a 365-tooth year wheel on the Sun's tube. The Antikythera gear train, 64/38, 48/24 and 127/32, turns the Moon's arbor 254 times for every 19 turns of the Sun's. On the deck a tithi disc turns with the Sun and a yoga disc turns against it, so the one Moon hand reads tithi, yoga and nakshatra together. A pin on the crank shaft steps a seven-sided drum at every sunrise to show the weekday.",
  body: [...fixed, order],
});
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const strip = (text) => text.replace(/^import .*$/gm, "").replace(/^export /gm, "");
const latheSource = strip(readFileSync(join(SKILL, "kit/lathe.mjs"), "utf8"));
const KT = 'const K = { extrude, solidSvg, ring, lineSvg, cylinder };\n';
const latheScript = `const G = (() => {${latheSource}\nreturn { viewOf, scaleOf, frameOf, pointOf, disc, prismOf, circleOf, dotsOf, dot3, add3, mul3, sub3, unit3, cross3, lightOf, stepsFor };})();\n`;
const engineScript = `const E = (() => {${strip(readFileSync(join(HERE, "model-engine.mjs"), "utf8"))}\nreturn { sunSid, moonSid, meanSun, meanMoon, sunEvents, idx, limbs, istParts, fmt, elong };})();\n`;
const partsScript = `const PT = (() => {${strip(readFileSync(join(HERE, "parts.mjs"), "utf8"))}\nreturn { gearRing, gearSvg, wheelSvg, barRing, handRing };})();\n`;
const page = k.pageHtml({
  title: "Pañcāṅga yantra",
  theme,
  width: 680,
  body: `<style>${CSS}</style>` + k.plateHtml({
    fig: "Fig 1",
    title: "Pañcāṅga yantra",
    hint: "Hover · ← →",
    readout: "",
    keys: [
      { mark: "lit", label: "The Moon hand: it reads tithi, yoga and nakṣatra at once" },
      { mark: "raised", label: "Tithi disc turns with the Sun, yoga disc against it" },
      { mark: "edge", label: "Gear train 64/38 · 48/24 · 127/32 = 254/19, the Metonic cycle" },
    ],
    caption: "A tithi is the Moon's lead over the Sun in steps of 12°, so the tithi disc rides the Sun's tube and the Moon hand reads its lead directly. A yoga is the Sun and Moon added, in steps of 13°20′, so the yoga disc is turned backwards by a three-wheel reverser and the same hand reads the sum. The fixed ring on the deck is the 27 nakṣatras, each in four pādas. The wheels carry the mean motions; the hands show the true Sun and Moon, as a Siddhānta's manda correction would. A pin on the crank shaft steps the seven-sided vāra drum at sunrise, when the Hindu day begins.",
    body: `<div class="iso-stage yt-stage" tabindex="0" role="slider" aria-label="Almanac clock: hover or use the arrow keys to move time; Home returns to now" aria-valuetext="now">${svg}</div>`,
  }) + `<p class="yt-nav"><a href="../">← Kālacakra Pañcāṅga</a>, the same five limbs as an interactive almanac.</p>`,
  script: kitScript() + KT + latheScript + engineScript + partsScript + LIVE,
});
const out = theme === "light" ? "yantra-light.html" : "yantra.html";
writeFileSync(join(HERE, out), page);
console.log("wrote", out, R.items.length, "items");
