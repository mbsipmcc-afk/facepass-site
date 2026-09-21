// Bakes the three.js example head scan (CC-BY, see README) into a point cloud:
// per point [px,py,pz, nx,ny,nz, rand, scale] as Float32 â†’ public/models/head-points.bin
// Run: node scripts/bake-head-points.mjs
import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const count0 = 55000;
let COUNT = count0;
let shaveSampleZ = null; // (x, y) => z — set by the laser-shave pass, reused by the mesh layer

// deterministic sampler — the orientation heuristic must be stable run-to-run
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0xfaceba5e);

// hermite smoothstep for the shave edge feather
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// signed distance to the beard-pad rect: >0 inside the pad, <0 outside
const sOf = (x, y) => Math.min(0.36 - Math.abs(x), y + 0.64, -0.16 - y);

const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({ "draco3d.decoder": await draco3d.createDecoderModule() });

const doc = await io.read(join(root, "tmp-head", "head.glb"));
const mesh = doc.getRoot().listMeshes()[0];
const prim = mesh.listPrimitives()[0];
const pos = prim.getAttribute("POSITION");
const nrm = prim.getAttribute("NORMAL");
const idx = prim.getIndices();
const P = pos.getArray();
const N = nrm ? nrm.getArray() : null;
const I = idx ? idx.getArray() : null;
const triCount = I ? I.length / 3 : pos.getCount() / 3;
console.log(`verts=${pos.getCount()} tris=${triCount} normals=${!!N}`);

// cumulative triangle-area table for area-weighted sampling
const areas = new Float64Array(triCount);
let total = 0;
const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
const setV = (arr, i) => {
  const vi = I ? I[i] : i;
  arr[0] = P[vi * 3]; arr[1] = P[vi * 3 + 1]; arr[2] = P[vi * 3 + 2];
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
console.log(`surface area=${total.toFixed(2)}`);
// bbox straight from the source array
let bMin = [Infinity, Infinity, Infinity], bMax = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < P.length; i += 3) {
  for (let k = 0; k < 3; k++) {
    bMin[k] = Math.min(bMin[k], P[i + k]);
    bMax[k] = Math.max(bMax[k], P[i + k]);
  }
}
console.log(`bbox-pos=(${bMin.map((v) => v.toFixed(2))})..(${bMax.map((v) => v.toFixed(2))})`);

// sample positions + normals (interpolated, normalized)
  let out = new Float32Array(COUNT * 8);
const avgN = [0, 0, 0];
for (let i = 0; i < COUNT; i++) {
  const target = rand() * total;
  let lo = 0, hi = triCount - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (areas[mid] < target) lo = mid + 1; else hi = mid;
  }
  const t = lo;
  setV(a, t * 3); setV(b, t * 3 + 1); setV(c, t * 3 + 2);
  let r1 = Math.sqrt(rand()), r2 = rand();
  const w = [1 - r1, r1 * (1 - r2), r1 * r2];
  const px = a[0] * w[0] + b[0] * w[1] + c[0] * w[2];
  const py = a[1] * w[0] + b[1] * w[1] + c[1] * w[2];
  const pz = a[2] * w[0] + b[2] * w[1] + c[2] * w[2];
  let nx, ny, nz;
  if (N) {
    const vi0 = I ? I[t * 3] : t * 3, vi1 = I ? I[t * 3 + 1] : t * 3 + 1, vi2 = I ? I[t * 3 + 2] : t * 3 + 2;
    nx = N[vi0 * 3] * w[0] + N[vi1 * 3] * w[1] + N[vi2 * 3] * w[2];
    ny = N[vi0 * 3 + 1] * w[0] + N[vi1 * 3 + 1] * w[1] + N[vi2 * 3 + 1] * w[2];
    nz = N[vi0 * 3 + 2] * w[0] + N[vi1 * 3 + 2] * w[1] + N[vi2 * 3 + 2] * w[2];
  } else {
    const ab = [0, 0, 0], ac = [0, 0, 0], cr = [0, 0, 0];
    sub(ab, b, a); sub(ac, c, a); cross(cr, ab, ac);
    nx = cr[0]; ny = cr[1]; nz = cr[2];
  }
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl; ny /= nl; nz /= nl;
  avgN[0] += nx; avgN[1] += ny; avgN[2] += nz;
  const o = i * 8;
  out[o] = px; out[o + 1] = py; out[o + 2] = pz;
  out[o + 3] = nx; out[o + 4] = ny; out[o + 5] = nz;
  out[o + 6] = rand();
  out[o + 7] = 0.6 + rand() * 0.9;
}
const avgL = Math.hypot(avgN[0], avgN[1], avgN[2]) || 1;
console.log(`avg normal (face axis): (${(avgN[0] / avgL).toFixed(2)}, ${(avgN[1] / avgL).toFixed(2)}, ${(avgN[2] / avgL).toFixed(2)})`);

// normalize: yaw-rotate face axis to +Z (horizontal part only — GLTF is Y-up),
// center, scale to height 2.2
// NOTE: the area-weighted average normal points toward the chest (+Z side), not the
// face — the face is the OPPOSITE horizontal direction, hence the +PI flip.
const ax = avgN[0] / avgL, az = avgN[2] / avgL;
const yaw = 0; // raw scan faces +Z dead-on (verified via 4-view turntable)
console.log(`face axis xz=(${ax.toFixed(2)}, ${az.toFixed(2)}) yaw=${((yaw * 180) / Math.PI).toFixed(1)}deg`);
const cosY = Math.cos(-yaw), sinY = Math.sin(-yaw);

let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
for (let i = 0; i < COUNT; i++) {
  const o = i * 8;
  const x = out[o], y = out[o + 1], z = out[o + 2];
  const x2 = x * cosY + z * sinY;
  const z2 = -x * sinY + z * cosY;
  out[o] = x2; out[o + 2] = z2;
  minX = Math.min(minX, x2); maxX = Math.max(maxX, x2);
  minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  minZ = Math.min(minZ, z2); maxZ = Math.max(maxZ, z2);
  // rotate normal the same way
  const nx = out[o + 3], nz = out[o + 5];
  out[o + 3] = nx * cosY + nz * sinY;
  out[o + 5] = -nx * sinY + nz * cosY;
}
const scale = 2.2 / (maxY - minY);
const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
for (let i = 0; i < COUNT * 8; i += 8) {
  out[i] = (out[i] - cx) * scale;
  out[i + 1] = (out[i + 1] - cy) * scale;
  out[i + 2] = (out[i + 2] - cz) * scale;
}
console.log(`final size: w=${((maxX - minX) * scale).toFixed(2)} h=${((maxY - minY) * scale).toFixed(2)} d=${((maxZ - minZ) * scale).toFixed(2)}`);

// interior-geometry removal: the scan hides teeth/tongue/inner-mouth surfaces INSIDE
// the closed mouth (invisible in a solid render, but sampled by the point cloud where
// they read as a floating disk). Within the mouth box, keep only the frontmost surface
// per (x,y) column — anything well behind it is interior and gets dropped.
{
  const CELL = 0.02;
  const inBox = (x, y, z) => Math.abs(x) < 0.4 && y > -0.62 && y < -0.14 && z > 0.1;
  const cols = new Map();
  for (let i = 0; i < COUNT; i++) {
    const o = i * 8;
    if (!inBox(out[o], out[o + 1], out[o + 2])) continue;
    const k = `${Math.round(out[o] / CELL)},${Math.round(out[o + 1] / CELL)}`;
    const front = cols.get(k) ?? -Infinity;
    if (out[o + 2] > front) cols.set(k, out[o + 2]);
  }
  let write = 0, dropped = 0;
  for (let i = 0; i < COUNT; i++) {
    const o = i * 8;
    if (inBox(out[o], out[o + 1], out[o + 2])) {
      const k = `${Math.round(out[o] / CELL)},${Math.round(out[o + 1] / CELL)}`;
      const front = cols.get(k) ?? -Infinity;
      if (front - out[o + 2] > 0.08) {
        dropped++;
        continue;
      }
    }
    if (write !== i) out.copyWithin(write * 8, o, o + 8);
    write++;
  }
  COUNT = write;
  console.log(`interior pass: dropped ${dropped} hidden points → ${COUNT}`);
}

// local-density pass:
//  1. THIN dense clusters (mouth/beard, eyes, ears) down to a uniform surface density —
//     the blob look comes from point pile-up; shading alone should carry the features
//  2. mildly shrink any remaining density so additive blending never saturates
//  3. store normalized density as a 9th float (shader alpha assist)

{
  const CELL = 0.05;
  const key = (x, y, z) => `${Math.round(x / CELL)},${Math.round(y / CELL)},${Math.round(z / CELL)}`;
  const buildGrid = () => {
    const grid = new Map();
    for (let i = 0; i < COUNT; i++) {
      const k = key(out[i * 8], out[i * 8 + 1], out[i * 8 + 2]);
      let arr = grid.get(k);
      if (!arr) grid.set(k, (arr = []));
      arr.push(i);
    }
    return grid;
  };
  const countNeighbors = (grid) => {
    const counts = new Array(COUNT);
    let min = Infinity, max = 0, sum = 0;
    for (let i = 0; i < COUNT; i++) {
      const cx = Math.round(out[i * 8] / CELL), cy = Math.round(out[i * 8 + 1] / CELL), cz = Math.round(out[i * 8 + 2] / CELL);
      let c = 0;
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (let dz = -1; dz <= 1; dz++) {
            const arr = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
            if (arr) c += arr.length;
          }
      counts[i] = c;
      min = Math.min(min, c); max = Math.max(max, c); sum += c;
    }
    return { counts, min, max, uniform: sum / COUNT };
  };

  // thin: drop points in over-dense neighborhoods until density is near-uniform
  let grid = buildGrid();
  for (let round = 0; round < 3; round++) {
    const { counts, uniform } = countNeighbors(grid);
    const CAP = uniform * 1.25;
    let write = 0;
    let dropped = 0;
    for (let i = 0; i < COUNT; i++) {
      const excess = counts[i] > CAP ? 1 - CAP / counts[i] : 0;
      if (excess > 0 && rand() < excess) {
        dropped++;
        continue;
      }
      if (write !== i) out.copyWithin(write * 8, i * 8, i * 8 + 8);
      write++;
    }
    COUNT = write;
    console.log(`thin round ${round + 1}: dropped ${dropped} → ${COUNT} points`);
    if (dropped === 0) break;
    grid = buildGrid();
  }

  const { counts, uniform } = countNeighbors(grid);
  console.log(`density after thin: uniform≈${uniform.toFixed(0)}`);
  for (let i = 0; i < COUNT; i++) {
    const size = uniform / Math.max(1, counts[i]);
    const adj = Math.max(0.55, Math.min(1.25, size));
    out[i * 8 + 7] = Math.max(0.25, Math.min(1.6, out[i * 8 + 7] * adj));
    counts[i] = Math.min(1, Math.max(0, (counts[i] - uniform * 0.7) / (uniform * 1.6)));
  }
  // widen stride 8 → 9 and append the density channel
  const out9 = new Float32Array(COUNT * 9);
  for (let i = 0; i < COUNT; i++) {
    out9.set(out.subarray(i * 8, i * 8 + 8), i * 9);
    out9[i * 9 + 8] = counts[i];
  }
  out = out9;
}

// feather pass: blur the density channel so the dimming gradient is smooth — without
// this, the beard region's density boundary shows as a visible oval edge
{
  const CELL = 0.06;
  const key = (x, y, z) => `${Math.round(x / CELL)},${Math.round(y / CELL)},${Math.round(z / CELL)}`;
  const grid = new Map();
  for (let i = 0; i < COUNT; i++) {
    const k = key(out[i * 9], out[i * 9 + 1], out[i * 9 + 2]);
    let arr = grid.get(k);
    if (!arr) grid.set(k, (arr = []));
    arr.push(i);
  }
  for (let iter = 0; iter < 3; iter++) {
    const updates = [];
    for (let i = 0; i < COUNT; i++) {
      const o = i * 9;
      const cx = Math.round(out[o] / CELL), cy = Math.round(out[o + 1] / CELL), cz = Math.round(out[o + 2] / CELL);
      let sum = 0, n = 0;
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (let dz = -1; dz <= 1; dz++) {
            const arr = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
            if (!arr) continue;
            for (const j of arr) {
              sum += out[j * 9 + 8];
              n++;
            }
          }
      updates.push(sum / Math.max(1, n));
    }
    for (let i = 0; i < COUNT; i++) out[i * 9 + 8] = updates[i];
  }
  console.log("feather pass: density channel blurred x3");
}

// "laser-shave" pass: flatten the beard/mouth pad into a plain surface. The pad is a
// real geometric bulge in the scan (a crease ring at its edge survives every shading
// fix), so we replace it with a height-field Laplace fill bridged from the skin around
// it — the mouth region becomes clean, flat skin as requested.
{
  const inZone = (x, y, z) => sOf(x, y) > 0 && z > 0.35;
  const inRim = (x, y, z) => sOf(x, y) <= 0 && Math.abs(x) < 0.5 && y > -0.76 && y < -0.05 && z > 0.22;
  // everything from the pad interior out to just past the crease ring is shaved,
  // feathered over the band — the ring itself must go or it outlines the patch
  const inShave = (x, y, z) => sOf(x, y) > -0.075 && z > 0.28;
  const CELL = 0.024;
  const GX = Math.ceil(1.3 / CELL);
  const GY = Math.ceil(0.76 / CELL);
  const gi = (x, y) => {
    const gx = Math.floor((x + 0.65) / CELL);
    const gy = Math.floor((y + 1.05) / CELL);
    if (gx < 0 || gy < 0 || gx >= GX || gy >= GY) return -1;
    return gy * GX + gx;
  };

  const zval = new Float64Array(GX * GY).fill(0.6);
  const fixed = new Uint8Array(GX * GY);
  const sums = new Float64Array(GX * GY);
  const cnts = new Uint16Array(GX * GY);
  for (let i = 0; i < COUNT; i++) {
    const x = out[i * 9], y = out[i * 9 + 1], z = out[i * 9 + 2];
    if (!inZone(x, y, z) && !inRim(x, y, z)) continue;
    const g = gi(x, y);
    if (g < 0) continue;
    sums[g] += z;
    cnts[g]++;
    if (inRim(x, y, z) && sOf(x, y) < -0.05) fixed[g] = 1;
  }
  let rimMean = 0, rimN = 0;
  for (let g = 0; g < GX * GY; g++) {
    if (cnts[g] > 0) zval[g] = sums[g] / cnts[g];
    // anchor only on outer skin (clear of the crease) so the membrane relaxes
    // straight across the ring instead of preserving it as a raised border
    if (fixed[g] && cnts[g] > 0) { rimMean += zval[g]; rimN++; }
  }
  if (rimN > 0) rimMean /= rimN;
  for (let g = 0; g < GX * GY; g++) if (!fixed[g]) zval[g] = rimMean;
  // relax toward a smooth membrane anchored on the rim
  for (let it = 0; it < 500; it++) {
    for (let gy = 1; gy < GY - 1; gy++) {
      for (let gx = 1; gx < GX - 1; gx++) {
        const g = gy * GX + gx;
        if (fixed[g]) continue;
        zval[g] = (zval[g - 1] + zval[g + 1] + zval[g - GX] + zval[g + GX]) / 4;
      }
    }
  }
  const sampleZ = (x, y) => {
    const fx = (x + 0.65) / CELL - 0.5;
    const fy = (y + 1.05) / CELL - 0.5;
    const gx = Math.max(0, Math.min(GX - 2, Math.floor(fx)));
    const gy = Math.max(0, Math.min(GY - 2, Math.floor(fy)));
    const tx = Math.max(0, Math.min(1, fx - gx));
    const ty = Math.max(0, Math.min(1, fy - gy));
    const z00 = zval[gy * GX + gx], z10 = zval[gy * GX + gx + 1];
    const z01 = zval[(gy + 1) * GX + gx], z11 = zval[(gy + 1) * GX + gx + 1];
    return (z00 * (1 - tx) + z10 * tx) * (1 - ty) + (z01 * (1 - tx) + z11 * tx) * ty;
  };
  shaveSampleZ = sampleZ;
  let moved = 0;
  for (let i = 0; i < COUNT; i++) {
    const o = i * 9;
    if (!inShave(out[o], out[o + 1], out[o + 2])) continue;
    const x = out[o], y = out[o + 1];
    // feather across the pad edge and the crease ring: full shave deep inside the
    // pad, easing to untouched skin just past the ring, so no rectangular boundary
    // survives in position, size or density
    const t = smoothstep(-0.075, 0.075, sOf(x, y));
    const nz = sampleZ(x, y);
    const oz = out[o + 2];
    const onx = out[o + 3], ony = out[o + 4], onz = out[o + 5];
    out[o + 2] = oz * (1 - t) + (nz + (rand() - 0.5) * 0.006) * t;
    // normal from the height-field gradient
    const e = 0.02;
    const zx1 = sampleZ(x + e, y), zx0 = sampleZ(x - e, y);
    const zy1 = sampleZ(x, y + e), zy0 = sampleZ(x, y - e);
    const nx = -(zx1 - zx0) / (2 * e), ny = -(zy1 - zy0) / (2 * e);
    const nl = Math.hypot(nx, ny, 1) || 1;
    out[o + 3] = onx * (1 - t) + (nx / nl) * t;
    out[o + 4] = ony * (1 - t) + (ny / nl) * t;
    out[o + 5] = onz * (1 - t) + (1 / nl) * t;
    // uniform size/density across the shaved skin, eased in from the rim — the
    // camera-facing flat pad also renders a touch dimmer than curved skin
    out[o + 7] = out[o + 7] * (1 - t) + (0.7 + rand() * 0.3) * t;
    out[o + 8] = out[o + 8] * (1 - t) + 0.5 * t;
    moved++;
  }
  console.log(`laser-shave pass: flattened ${moved} points onto the bridged surface`);
}

// micro-jitter: breaks the regular fibonacci alignment that shows as moiré grids on
// flat areas (chest) once density-based sizing shrinks the points
for (let i = 0; i < COUNT; i++) {
  out[i * 9] += (rand() - 0.5) * 0.022;
  out[i * 9 + 1] += (rand() - 0.5) * 0.022;
  out[i * 9 + 2] += (rand() - 0.5) * 0.022;
}
console.log("jitter pass: anti-moiré");

// solid surface layer: unwelded flat-shaded triangles for the hybrid render — the
// near-opaque mesh hides any interior scan geometry (mouth region) and gives the bust
// real solidity, while the point layer keeps the particle aesthetic on top.
{
  const VP = prim.getAttribute("POSITION").getArray();
  const VI = prim.getIndices() ? prim.getIndices().getArray() : null;
  const triTotal = VI ? VI.length / 3 : VP.length / 3;
  const mCount = triTotal * 3;
  const mpos = new Float32Array(mCount * 3);
  const mnor = new Float32Array(mCount * 3);
  const mrnd = new Float32Array(mCount);
  const cr2 = [0, 0, 0];
  let inward = 0;
  const inShaveZone = (x, y, z) => sOf(x, y) > -0.075 && z > 0.28;
  for (let t = 0; t < triTotal; t++) {
    setV(a, t * 3); setV(b, t * 3 + 1); setV(c, t * 3 + 2);
    const ab = [0, 0, 0], ac = [0, 0, 0];
    sub(ab, b, a); sub(ac, c, a); cross(cr2, ab, ac);
    // winding repair: the scan has mixed orientation — flip triangles whose normal
    // points toward the head axis so FrontSide culling never punches holes
    const fx = (a[0] + b[0] + c[0]) / 3, fy = (a[1] + b[1] + c[1]) / 3, fz = (a[2] + b[2] + c[2]) / 3;
    const flip = cr2[0] * fx + cr2[1] * fy + cr2[2] * fz < 0;
    if (flip) { cr2[0] *= -1; cr2[1] *= -1; cr2[2] *= -1; inward++; }
    const nl = Math.hypot(cr2[0], cr2[1], cr2[2]) || 1;
    const r = rand();
    for (let k = 0; k < 3; k++) {
      const vi = VI ? VI[t * 3 + (flip ? 2 - k : k)] : t * 3 + k;
      const x = (VP[vi * 3] * cosY + VP[vi * 3 + 2] * sinY - cx) * scale;
      const y = (VP[vi * 3 + 1] - cy) * scale;
      let z = (-VP[vi * 3] * sinY + VP[vi * 3 + 2] * cosY - cz) * scale;
      // flatten beard-pad verts onto the same bridged surface as the points,
      // feathered at the zone edge so the mesh shows no rectangular shelf
      if (shaveSampleZ && inShaveZone(x, y, z)) {
        const d = Math.min(0.36 - Math.abs(x), y + 0.64, -0.16 - y);
        const t = smoothstep(0, 0.075, d);
        z = z * (1 - t) + (shaveSampleZ(x, y) + (r - 0.5) * 0.005) * t;
      }
      const o = (t * 3 + k) * 3;
      mpos[o] = x; mpos[o + 1] = y; mpos[o + 2] = z;
      mnor[o] = cr2[0] / nl; mnor[o + 1] = cr2[1] / nl; mnor[o + 2] = cr2[2] / nl;
      mrnd[t * 3 + k] = r;
    }
  }
  // with per-triangle winding repair, all normals face outward (inward=flipped count)
  const header = Buffer.from(new Uint32Array([mCount]).buffer);
  writeFileSync(
    join(root, "public", "models", "head-mesh.bin"),
    Buffer.concat([header, Buffer.from(mpos.buffer), Buffer.from(mnor.buffer), Buffer.from(mrnd.buffer)]),
  );
  console.log(`wrote public/models/head-mesh.bin (${mCount} flat-shaded verts, ${inward}/${triTotal} re-wound)`);
}

mkdirSync(join(root, "public", "models"), { recursive: true });
writeFileSync(join(root, "public", "models", "head-points.bin"), Buffer.from(out.buffer));
console.log(`wrote public/models/head-points.bin (${(out.byteLength / 1024 / 1024).toFixed(2)} MB, ${COUNT} points)`);






