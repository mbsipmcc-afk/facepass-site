// Diagnostic v2: inspect the nose/mouth ring region of the raw scan with the EXACT
// transform used by bake-head-points.mjs (yaw -26.8°, x/z centroid-centered, 2.2 tall).
// Points colored by depth (z) reveal duplicated/offset layers. → public/preview-mouth2.html
import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({ "draco3d.decoder": await draco3d.createDecoderModule() });
const doc = await io.read(join(root, "tmp-head", "head.glb"));
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute("POSITION").getArray();
const I = prim.getIndices()?.getArray() ?? null;

// mirror the main bake transform
const yaw = (-26.8 * Math.PI) / 180;
const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
// rotate all verts, get bbox, center x/z, scale 2.2 / height
const R = new Float32Array(P.length);
for (let i = 0; i < P.length; i += 3) {
  R[i] = P[i] * cosY + P[i + 2] * sinY;
  R[i + 1] = P[i + 1];
  R[i + 2] = -P[i] * sinY + P[i + 2] * cosY;
}
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
for (let i = 0; i < R.length; i += 3) {
  minX = Math.min(minX, R[i]); maxX = Math.max(maxX, R[i]);
  minY = Math.min(minY, R[i + 1]); maxY = Math.max(maxY, R[i + 1]);
  minZ = Math.min(minZ, R[i + 2]); maxZ = Math.max(maxZ, R[i + 2]);
}
const scl = 2.2 / (maxY - minY);
const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
console.log(`transform: scale=${scl.toFixed(3)} cx=${cx.toFixed(2)} cz=${cz.toFixed(2)}`);

// area-weighted sample
const triCount = I ? I.length / 3 : P.length / 3;
const areas = new Float64Array(triCount);
let total = 0;
const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
const setV = (arr, i) => {
  const vi = I ? I[i] : i;
  arr[0] = R[vi * 3]; arr[1] = R[vi * 3 + 1]; arr[2] = R[vi * 3 + 2];
};
const sub = (o, u, v) => { o[0] = u[0] - v[0]; o[1] = u[1] - v[1]; o[2] = u[2] - v[2]; };
const cross = (o, u, v) => {
  o[0] = u[1] * v[2] - u[2] * v[1];
  o[1] = u[2] * v[0] - u[0] * v[2];
  o[2] = u[0] * v[1] - u[1] * v[0];
};
for (let t = 0; t < triCount; t++) {
  setV(a, t * 3); setV(b, t * 3 + 1); setV(c, t * 3 + 2);
  const ab = [0, 0, 0], ac = [0, 0, 0], cr = [0, 0, 0];
  sub(ab, b, a); sub(ac, c, a); cross(cr, ab, ac);
  total += Math.hypot(cr[0], cr[1], cr[2]) / 2;
  areas[t] = total;
}

// sample the RING region: |x|<0.5, y +0.35..-0.42 (nose+mouth), any z on the face side
const pts = [];
for (let i = 0; i < 80000; i++) {
  const target = Math.random() * total;
  let lo = 0, hi = triCount - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (areas[mid] < target) lo = mid + 1; else hi = mid;
  }
  const t = lo;
  setV(a, t * 3); setV(b, t * 3 + 1); setV(c, t * 3 + 2);
  const r1 = Math.sqrt(Math.random()), r2 = Math.random();
  const w = [1 - r1, r1 * (1 - r2), r1 * r2];
  const px = (a[0] * w[0] + b[0] * w[1] + c[0] * w[2] - cx) * scl;
  const py = (a[1] * w[0] + b[1] * w[1] + c[1] * w[2]) * scl;
  const pz = (a[2] * w[0] + b[2] * w[1] + c[2] * w[2] - cz) * scl;
  if (Math.abs(px) < 0.5 && py < 0.4 && py > -0.45 && pz > -0.1) {
    pts.push([px, py, pz]);
  }
}
console.log(`ring-region points: ${pts.length}`);

// depth histogram
const zs = pts.map((p) => p[2]).sort((x, y) => x - y);
const bins = 26;
const lo = zs[0], hi = zs[zs.length - 1];
const hist = new Array(bins).fill(0);
for (const z of zs) hist[Math.min(bins - 1, Math.floor(((z - lo) / (hi - lo)) * bins))]++;
console.log("z histogram:");
hist.forEach((h, i) => console.log(`  ${(lo + ((i + 0.5) * (hi - lo)) / bins).toFixed(3)}: ${"#".repeat(Math.round((h / Math.max(...hist)) * 70))} ${h}`));

const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000;display:flex;flex-wrap:wrap">
<canvas id="f" width="640" height="640"></canvas><canvas id="s" width="640" height="640"></canvas>
<script>
const pts = ${JSON.stringify(pts)};
for (const [id, ai, label] of [["f", 0, "FRONT x/y"], ["s", 2, "SIDE z/y"]]) {
  const cv = document.getElementById(id).getContext("2d");
  cv.fillStyle = "#000"; cv.fillRect(0, 0, 640, 640);
  let lo = Infinity, hi = -Infinity;
  for (const p of pts) { lo = Math.min(lo, p[2]); hi = Math.max(hi, p[2]); }
  for (const [x, y, z] of pts) {
    const t = Math.floor(((z - lo) / (hi - lo)) * 5);
    const colors = ["#7f2aff", "#2a7fff", "#2affd5", "#d5ff2a", "#ff7f2a", "#ff2a2a"];
    cv.fillStyle = colors[t];
    const px = ai === 0 ? 320 + x * 900 : 320 + z * 900;
    const py = 320 - y * 900;
    cv.fillRect(px, py, 2, 2);
  }
  cv.fillStyle = "#fff"; cv.fillText(label + " — color = depth z: purple(back) → red(front)", 14, 22);
}
</script></body>`;
writeFileSync(join(root, "public", "preview-mouth2.html"), html);
console.log("wrote public/preview-mouth2.html");
