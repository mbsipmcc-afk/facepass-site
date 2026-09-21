// GLSL for the scanned point-cloud head (see scripts/bake-head-points.mjs).
// Each point carries a surface normal, so the fragment stage can do real key/fill/rim
// shading â€” that's what turns "dot cloud" into "sculpted face".

const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

export const HEAD_VERTEX = /* glsl */ `
attribute vec3 aScatter;
attribute vec3 aRibbon;
attribute float aRand;
attribute float aScale;
attribute float aDensity;
uniform float uTime;
uniform float uAssembly;
uniform float uEncode;
uniform float uExplode;
uniform float uDissolve;
uniform float uScanY;
uniform float uScanOn;
uniform float uNoiseAmp;
uniform float uBrightness;
uniform float uAlpha;
uniform float uSize;
uniform float uPixelRatio;
uniform vec3 uTint;
uniform float uTintAmt;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vBright;
varying float vAlpha;
varying float vTintMix;
varying float vHot;
varying float vDense;
${SNOISE}
void main() {
  // living skin: gentle breathing displacement along the surface normal
  float n  = snoise(position * 1.6 + uTime * 0.045);
  float n2 = snoise(position * 4.5 - uTime * 0.08);
  vec3 nrm = normalize(normal);
  vec3 head = position + nrm * (n * 0.022 + n2 * 0.008) * uNoiseAmp;

  // assembly: converge from a scattered cloud with per-point stagger
  float t0 = smoothstep(aRand * 0.6, aRand * 0.6 + 0.4, uAssembly);
  vec3 p = mix(aScatter, head, t0);

  // explosion: blast outward along the surface normal + turbulent swirl
  float swirl = snoise(position * 2.2 + uTime * 0.35);
  vec3 burst = nrm * (1.6 + aRand * 2.6) + vec3(swirl, snoise(position * 1.9 - uTime * 0.3), snoise(position * 2.6 + uTime * 0.25)) * 0.85;
  p += burst * uExplode;

  // encode: reform into the 128-column data ribbon
  float t1 = smoothstep(aRand * 0.3, aRand * 0.3 + 0.7, uEncode);
  p = mix(p, aRibbon, t1);

  // dissolve: stream upward like data
  p.y += uDissolve * (1.6 + aRand * 5.5);
  p.x += uDissolve * (aRand - 0.5) * 1.3;

  // scan line sweeping the face
  // lift the sprite layer a hair off the solid surface (avoids z-fighting on the mesh)
  p += nrm * 0.012 * t0 * (1.0 - t1) * (1.0 - uExplode);

  float scan = uScanOn * (1.0 - smoothstep(0.0, 0.055, abs(head.y - uScanY)));

  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * nrm);

  vec4 mv = viewMatrix * world;
  float size = uSize * aScale * (1.0 + scan * 1.9) * (1.0 + uExplode * 0.5) * (1.0 - uDissolve * 0.55);
  gl_PointSize = size * uPixelRatio * (1.0 / max(0.1, -mv.z));
  gl_Position = projectionMatrix * mv;

  vBright = (0.7 + 0.3 * aRand) * (1.0 + scan * 1.8) * uBrightness * (1.0 + uExplode * 0.6);
  // the scan's bottom cut dissolves into nothing instead of showing a hard edge
  vAlpha = uAlpha * t0 * (1.0 - uDissolve * uDissolve) * smoothstep(-1.2, -0.82, position.y);
  vTintMix = clamp(uTintAmt + scan, 0.0, 1.0);
  vHot = scan;
  vDense = aDensity;
}
`;

export const HEAD_FRAGMENT = /* glsl */ `
// highp to match the vertex stage — a mediump uniform shared with the vertex
// shader fails program validation (precision mismatch) on WebGL2
precision highp float;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uRimColor;
uniform vec3 uTint;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vBright;
varying float vAlpha;
varying float vTintMix;
varying float vHot;
varying float vDense;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.1, d);
  if (a < 0.01) discard;
  // dense regions (lips, eyes, ears) thin out instead of saturating to white
  a *= mix(1.0, 0.42, vDense);

  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  // three-point lighting: cool key from camera-left, soft fill, violet rim
  float key  = max(dot(N, normalize(vec3(0.45, 0.35, 0.85))), 0.0);
  float fill = max(dot(N, normalize(vec3(-0.75, 0.05, 0.35))), 0.0);
  float rim  = pow(1.0 - abs(dot(N, V)), 2.4);

  vec3 col = mix(uColorA, uColorB, clamp(key * 0.9, 0.0, 1.0));
  col += uRimColor * rim * 1.05;
  col += uTint * vTintMix * 0.7;
  col *= (0.26 + key * 0.85 + fill * 0.3 + rim * 0.4);
  col *= vBright;
  col += vec3(0.55, 1.0, 0.75) * vHot * 0.35; // scan-line heat

  gl_FragColor = vec4(col, a * vAlpha);
}
`;

// solid head layer — the welded scan mesh with its own smooth normals renders
// as a clean hologram bust: fresnel rim + scan stripes + scan-line materialize
// reveal, glitch shimmer during encode, and a noise-burn dissolve (edge glow
// without a post pass — see research notes in the README).
export const MESH_VERTEX = /* glsl */ `
attribute float aRand;
uniform float uTime;
uniform float uEncode;
uniform float uExplode;
uniform float uDissolve;
uniform float uNoiseAmp;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vObj;
varying float vY;
varying float vRand;
${SNOISE}
void main() {
  vec3 nrm = normalize(normal);
  float n = snoise(position * 1.6 + uTime * 0.045);
  vec3 p = position + nrm * n * 0.014 * uNoiseAmp;

  // explosion: tear outward along the normals with region-wise noise variance
  float burstVar = 0.55 + 0.45 * snoise(position * 2.4 + 7.3);
  p += nrm * uExplode * (0.9 + aRand * 2.2) * burstVar;
  p += vec3(
    snoise(position * 2.0 + uTime * 0.3),
    snoise(position * 1.7 - uTime * 0.27),
    snoise(position * 2.3 + uTime * 0.22)) * uExplode * 0.5;

  // encode: digital glitch — intermittent horizontal slices shear sideways
  float slice = step(0.82, snoise(vec3(0.0, position.y * 9.0, uTime * 0.8)));
  p.x += slice * uEncode * (snoise(position * 3.1 + uTime * 1.7) * 0.16 + aRand * 0.05);
  p.z += slice * uEncode * snoise(position * 2.6 - uTime * 1.3) * 0.08;

  // dissolve: gentle upward drift while the burn eats the surface
  p.y += uDissolve * (0.5 + aRand * 0.9);
  p.x += uDissolve * (aRand - 0.5) * 0.35;

  vNormalW = normalize(mat3(modelMatrix) * nrm);
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vObj = position;
  vY = position.y;
  vRand = aRand;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const MESH_FRAGMENT = /* glsl */ `
precision highp float; // match vertex-stage precision (see HEAD_FRAGMENT note)
uniform float uTime;
uniform float uAlpha;
uniform float uClipY;
uniform float uScanY;
uniform float uScanOn;
uniform float uTintAmt;
uniform float uBrightness;
uniform float uDissolve;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uRimColor;
uniform vec3 uTint;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vObj;
varying float vY;
varying float vRand;
${SNOISE}
void main() {
  // materialize reveal: nothing above the sweeping clip line during assembly
  if (vY > uClipY) discard;

  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float key  = max(dot(N, normalize(vec3(0.45, 0.35, 0.85))), 0.0);
  float fill = max(dot(N, normalize(vec3(-0.75, 0.05, 0.35))), 0.0);
  float rim  = pow(1.0 - abs(dot(N, V)), 2.2);
  float scan = uScanOn * (1.0 - smoothstep(0.0, 0.07, abs(vY - uScanY)));

  vec3 col = mix(uColorA, uColorB, clamp(key * 0.9, 0.0, 1.0));
  col += uRimColor * rim * 1.15;                    // violet fresnel edge
  col += vec3(0.22, 0.88, 1.0) * rim * rim * 0.55;  // hot cyan fresnel core
  col += uTint * clamp(uTintAmt, 0.0, 1.0) * 0.6;

  // hologram scan stripes — faint lines drifting upward over the solid body
  float stripes = 0.5 + 0.5 * sin(vWorld.y * 80.0 - uTime * 3.5);
  col *= 0.96 + stripes * 0.07;

  col *= (0.26 + key * 0.72 + fill * 0.32 + rim * 0.45) * uBrightness;
  col += vec3(0.55, 1.0, 0.75) * scan * 0.5;

  // materialize edge: bright band riding the clip line while assembling
  float clipEdge = 1.0 - smoothstep(0.0, 0.1, uClipY - vY);
  col += vec3(0.3, 0.9, 1.0) * clipEdge * 1.2;

  // noise-burn dissolve: threshold discard + glowing burn band at the edge
  float dn = snoise(vObj * 2.3) * 0.5 + 0.5;
  if (uDissolve > 0.001) {
    if (dn < uDissolve) discard;
    float burn = 1.0 - smoothstep(0.0, 0.22, dn - uDissolve);
    col += vec3(0.45, 1.0, 0.9) * burn * 1.6;
  }

  float a = uAlpha * (0.9 + rim * 0.1);
  gl_FragColor = vec4(col, a);
}
`;

