// Bakes the SOLID head model for the hero (replaces the particle-cloud look).
// Source: three.js example head scan "LeePerrySmith" (CC-BY 3.0, see README).
//
// The GLB is welded (9.3k verts) with the scan's own smooth normals — we:
//   1. apply the same normalize transform (yaw=0, x/z centered, 2.2 tall)
//   2. laser-shave the beard pad on the welded vertices, feathered over the
//      crease ring, normals re-derived from the height field — moving a shared
//      vertex keeps the surface watertight (no cracks, no hard seam)
//   3. expand the indexed mesh into a non-indexed triangle soup (the runtime
//      bin format has no index buffer), each corner carrying its source
//      vertex's smooth normal so shading stays smooth
//   4. write [vCount u32][pos xyz][normal xyz][rand f32] — the layout the
//      runtime loader in components/three/head-rig.tsx already reads
//
// Run: node scripts/bake-head-solid.mjs
import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// deterministic sampler — height-field anchors must be stable run-to-run
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0x5011dace);

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
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute("POSITION").getArray();
const N = prim.getAttribute("NORMAL")?.getArray() ?? null;
const I = prim.getIndices()?.getArray() ?? null;
const vCount = prim.getAttribute("POSITION").getCount();
const triCount = I ? I.length / 3 : vCount / 3;
console.log(`verts=${vCount} tris=${triCount} normals=${!!N} indexed=${!!I}`);

// ---- normalize transform (identical family to bake-head-points.mjs): the raw
// scan already faces +Z dead-on (yaw=0), so only center x/z and scale to 2.2 ----
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
for (let i = 0; i < vCount; i++) {
  minX = Math.min(minX, P[i * 3]); maxX = Math.max(maxX, P[i * 3]);
  minY = Math.min(minY, P[i * 3 + 1]); maxY = Math.max(maxY, P[i * 3 + 1]);
  minZ = Math.min(minZ, P[i * 3 + 2]); maxZ = Math.max(maxZ, P[i * 3 + 2]);
}
const scl = 2.2 / (maxY - minY);
const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
console.log(`transform: scale=${scl.toFixed(3)} cy=${cy.toFixed(2)}`);

const pos = new Float32Array(vCount * 3);
for (let i = 0; i < vCount; i++) {
  pos[i * 3] = (P[i * 3] - cx) * scl;
  pos[i * 3 + 1] = (P[i * 3 + 1] - cy) * scl;
  pos[i * 3 + 2] = (P[i * 3 + 2] - cz) * scl;
}
const nor = new Float32Array(N ? N : new Float32Array(vCount * 3)); // uniform scale → normals unchanged

// cumulative triangle-area table over the TRANSFORMED positions — used both to
// sample the surface for the height field and for centering sanity checks
const tri = (t, out) => {
  for (let k = 0; k < 3; k++) {
    const vi = I ? I[t * 3 + k] : t * 3 + k;
    out[k * 3] = pos[vi * 3]; out[k * 3 + 1] = pos[vi * 3 + 1]; out[k * 3 + 2] = pos[vi * 3 + 2];
  }
};
const areas = new Float64Array(triCount);
{
  let total = 0;
  const a = [0, 0, 0];
  for (let t = 0; t < triCount; t++) {
    tri(t, a);
    const ux = a[3] - a[0], uy = a[4] - a[1], uz = a[5] - a[2];
    const vx = a[6] - a[0], vy = a[7] - a[1], vz = a[8] - a[2];
    const cxr = uy * vz - uz * vy, cyr = uz * vx - ux * vz, czr = ux * vy - uy * vx;
    total += Math.hypot(cxr, cyr, czr) / 2;
    areas[t] = total;
  }
  console.log(`surface area=${total.toFixed(2)}`);
}

// ---- laser-shave height field (same math as bake-head-points.mjs) ----
{
  const inZone = (x, y, z) => sOf(x, y) > 0 && z > 0.35;
  const inRim = (x, y, z) => sOf(x, y) <= 0 && Math.abs(x) < 0.5 && y > -0.76 && y < -0.05 && z > 0.22;
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

  // sample the transformed surface for the rim/pad cells
  const SAMPLES = 60000;
  for (let i = 0; i < SAMPLES; i++) {
    const target = rand() * areas[triCount - 1];
    let lo = 0, hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (areas[mid] < target) lo = mid + 1; else hi = mid;
    }
    const a = [0, 0, 0];
    tri(lo, a);
    const r1 = Math.sqrt(rand()), r2 = rand();
    const w = [1 - r1, r1 * (1 - r2), r1 * r2];
    const x = a[0] * w[0] + a[3] * w[1] + a[6] * w[2];
    const y = a[1] * w[0] + a[4] * w[1] + a[7] * w[2];
    const z = a[2] * w[0] + a[5] * w[1] + a[8] * w[2];
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
    if (fixed[g] && cnts[g] > 0) { rimMean += zval[g]; rimN++; }
  }
  if (rimN > 0) rimMean /= rimN;
  for (let g = 0; g < GX * GY; g++) if (!fixed[g]) zval[g] = rimMean;
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

  // shave: flatten pad + crease ring onto the bridged membrane, feathered over
  // the band so no rectangular shelf survives in position or normal
  const inShave = (x, y, z) => sOf(x, y) > -0.075 && z > 0.28;
  let moved = 0;
  for (let i = 0; i < vCount; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    if (!inShave(x, y, z)) continue;
    const t = smoothstep(-0.075, 0.075, sOf(x, y));
    const nz = sampleZ(x, y) + (rand() - 0.5) * 0.002;
    pos[i * 3 + 2] = z * (1 - t) + nz * t;
    const e = 0.02;
    const zx1 = sampleZ(x + e, y), zx0 = sampleZ(x - e, y);
    const zy1 = sampleZ(x, y + e), zy0 = sampleZ(x, y - e);
    const nx = -(zx1 - zx0) / (2 * e), ny = -(zy1 - zy0) / (2 * e);
    const nl = Math.hypot(nx, ny, 1) || 1;
    if (N) {
      nor[i * 3] = nor[i * 3] * (1 - t) + (nx / nl) * t;
      nor[i * 3 + 1] = nor[i * 3 + 1] * (1 - t) + (ny / nl) * t;
      nor[i * 3 + 2] = nor[i * 3 + 2] * (1 - t) + (1 / nl) * t;
      const l = Math.hypot(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]) || 1;
      nor[i * 3] /= l; nor[i * 3 + 1] /= l; nor[i * 3 + 2] /= l;
    }
    moved++;
  }
  console.log(`laser-shave: flattened ${moved}/${vCount} verts onto the bridged surface`);
}

// per-vertex random for the glitch/explode variance in the vertex shader
const rnd = new Float32Array(vCount);
for (let i = 0; i < vCount; i++) rnd[i] = rand();

// ---- emit as a non-indexed triangle soup (the runtime bin format has no index
// buffer): expand the indexed GLB into per-triangle vertices, each carrying its
// source vertex's SMOOTH normal so shading stays smooth after the expansion ----
const mCount = triCount * 3;
const mpos = new Float32Array(mCount * 3);
const mnor = new Float32Array(mCount * 3);
const mrnd = new Float32Array(mCount);
for (let t = 0; t < triCount; t++) {
  for (let k = 0; k < 3; k++) {
    const vi = I ? I[t * 3 + k] : t * 3 + k;
    const o = (t * 3 + k) * 3;
    mpos[o] = pos[vi * 3]; mpos[o + 1] = pos[vi * 3 + 1]; mpos[o + 2] = pos[vi * 3 + 2];
    mnor[o] = nor[vi * 3]; mnor[o + 1] = nor[vi * 3 + 1]; mnor[o + 2] = nor[vi * 3 + 2];
    mrnd[t * 3 + k] = rnd[vi];
  }
}

// NOTE: no winding repair. The source GLB's winding is consistent (it renders
// hole-free with FrontSide in the three.js demos); a faceNormal·faceCenter
// heuristic flips legitimate concave-region triangles (ears, nostrils,
// under-chin) and punches holes instead — measured before dropping it.

const header = Buffer.from(new Uint32Array([mCount]).buffer);
writeFileSync(
  join(root, "public", "models", "head-solid.bin"),
  Buffer.concat([header, Buffer.from(mpos.buffer), Buffer.from(mnor.buffer), Buffer.from(mrnd.buffer)]),
);
const sizeMB = (header.byteLength + mpos.byteLength + mnor.byteLength + mrnd.byteLength) / 1024 / 1024;
console.log(`wrote public/models/head-solid.bin (${sizeMB.toFixed(2)} MB, ${triCount} tris / ${mCount} soup verts, smooth normals carried per corner)`);
console.log(`source: ${vCount} welded verts, winding kept from GLB`);
