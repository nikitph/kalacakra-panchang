// Parts that move and are rebuilt in the page each frame. The build uses the same
// functions for the rest pose, so the page and the build can't drift apart.
// `K` is the kit: { extrude, solidSvg, iso, lineSvg, onTop, pathOf }.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

// One tooth = root, flank, tip, tip, flank, root. Module m, N teeth, angle in degrees.
export function gearRing(cx, cy, N, m, angle) {
  const pitch = (m * N) / 2;
  const root = pitch - 1.15 * m;
  const tip = pitch + m;
  const step = TAU / N;
  const out = [];
  for (let i = 0; i < N; i++) {
    const a = angle * DEG + i * step;
    for (const [f, r] of [[-0.5, root], [-0.27, root], [-0.13, tip], [0.13, tip], [0.27, root]]) {
      out.push([cx + r * Math.cos(a + f * step), cy + r * Math.sin(a + f * step)]);
    }
  }
  return out;
}

export function gearSvg(K, P, g, angle) {
  const paths = K.extrude(gearRing(g.x, g.y, g.n, g.m, angle), g.z, g.h, P, { convex: false });
  return K.solidSvg(paths, { tone: g.tone || "mid", crease: "lo" });
}

// A rectangle bar on the floor plane, rotated about (cx, cy): spokes, hands, arms.
export function barRing(cx, cy, from, to, w0, w1, angle) {
  const c = Math.cos(angle * DEG), s = Math.sin(angle * DEG);
  const at = (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
  return [at(from, -w0 / 2), at(to, -w1 / 2), at(to, w1 / 2), at(from, w0 / 2)];
}

// A hand: a tapered blade with a rounded tail disc, as one convex-enough outline.
export function handRing(cx, cy, tail, tip, w, angle) {
  const c = Math.cos(angle * DEG), s = Math.sin(angle * DEG);
  const at = (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI;
    pts.push(at(-tail + Math.cos(a) * w * 0.9 + w * 0.9, Math.sin(a) * w * 0.9));
  }
  pts.push(at(tip - 2.4, -w * 0.22), at(tip, 0), at(tip - 2.4, w * 0.22));
  return pts;
}

// Points of a single-start worm thread (a helix) along axis u at height z, with its phase.
export function wormThread(o, u, r, from, to, pitch, phase) {
  const pts = [];
  const steps = Math.ceil(((to - from) / pitch) * 24);
  for (let i = 0; i <= steps; i++) {
    const s = from + ((to - from) * i) / steps;
    const a = ((s - from) / pitch) * TAU + phase * DEG;
    pts.push([o[0] + u[0] * s, o[1] + u[1] * s, o[2], a, s]);
  }
  return pts.map(([x, y, z, a, s]) => ({ a, p: [x - u[1] * r * Math.cos(a) * 0 + (-u[1]) * r * Math.cos(a), y + u[0] * r * Math.cos(a), z + r * Math.sin(a)], s }));
}

// A crossed-out wheel: toothed rim with real windows, spokes and a hub.
// K needs extrude, solidSvg, ring, lineSvg, cylinder.
export function wheelSvg(K, P, g, angle) {
  if (!g.spokes) return gearSvg(K, P, g, angle);
  const pitch = (g.m * g.n) / 2;
  const rimIn = pitch - 1.15 * g.m - Math.max(2.2, pitch * 0.13);
  const hub = Math.max(3.2, pitch * 0.12);
  const top = K.ring(g.x, g.y, rimIn, g.z + g.h, P, 96);
  const bottom = K.ring(g.x, g.y, rimIn, g.z, P, 96);
  const id = `yt-win-${g.id}`;
  let out = `<clipPath id="${id}"><path clip-rule="evenodd" d="M-2000 -2000H4000V4000H-2000Z${top}"/></clipPath>`;
  out += `<clipPath id="${id}-in"><path d="${top}"/></clipPath>`;
  out += `<g clip-path="url(#${id})">${gearSvg(K, P, g, angle)}</g>`;
  // the far inner wall of the rim, seen through the window
  out += `<path class="iso-shade" data-shade="1" fill-rule="evenodd" clip-path="url(#${id}-in)" d="${top}${bottom}"/>`;
  out += K.lineSvg(top, { tone: "lo" });
  for (let i = 0; i < g.spokes; i++) {
    const a = angle + (i / g.spokes) * 360 + 360 / (g.spokes * 2);
    out += K.solidSvg(K.extrude(barRing(g.x, g.y, hub - 0.5, rimIn + 0.6, 3.6, 2.6, a), g.z, g.h, P), { tone: "mid", crease: "lo" });
  }
  out += K.solidSvg(K.cylinder(g.x, g.y, hub, g.z, g.h + 0.6, P, 32), { tone: "mid" });
  return out;
}
