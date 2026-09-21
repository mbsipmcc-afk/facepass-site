"use client";

import { Suspense, useMemo, useRef, use, useLayoutEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { MESH_FRAGMENT, MESH_VERTEX } from "./head-shaders";
import { GAUNTLET_LAYERS, STORY, portraitFactor, range01, storyState } from "./shared";

const CYAN = new THREE.Color("#38e1ff");
const VIOLET = new THREE.Color("#8b5cf6");
const GREEN = new THREE.Color("#34d399");
const WASH = GAUNTLET_LAYERS.map((l) => new THREE.Color(l.color));

type Env = {
  ready: boolean;
  p: number;
  t: number;
  assembly: number;
  detect: number;
  explode: number;
  encode: number;
  matchA: number;
  ghostAlign: number;
  dissolve: number;
  reducedMotion: boolean;
  meshAlpha: number;
  clipY: number;
  scanOn: number;
  scanY: number;
  tint: THREE.Color;
  tintAmt: number;
};

const smooth = (t: number) => t * t * (3 - 2 * t);

// solid head asset (scripts/bake-head-solid.mjs):
// [vCount u32] + position + normal + rand per vertex of the welded scan mesh —
// smooth-shaded, beard pad laser-shaved, winding-repaired for FrontSide culling
let solidBinPromise: Promise<ArrayBuffer> | null = null;
function loadSolidHead(): Promise<ArrayBuffer> {
  solidBinPromise ??= fetch("/models/head-solid.bin")
    .then((r) => {
      if (!r.ok) throw new Error(`head-solid.bin ${r.status}`);
      return r.arrayBuffer();
    });
  return solidBinPromise;
}

type Pose = { p: number; pos: [number, number, number]; look: [number, number, number] };
const POSES: Pose[] = [
  { p: 0.0, pos: [0.0, 0.32, 5.7], look: [-0.5, 0.08, 0] }, // hero — bust right of the copy
  { p: 0.1875, pos: [1.7, 0.4, 4.2], look: [-0.15, 0.3, 0] }, // detect — orbit in
  { p: 0.3125, pos: [0.0, 0.5, 5.0], look: [0.35, 0.1, 0] }, // encode — pulled back for the blast
  { p: 0.4375, pos: [0.0, 0.1, 3.6], look: [-0.4, 0.2, 0] }, // match — frontal
  { p: 0.5625, pos: [0.15, 0.15, 3.7], look: [0.3, 0.2, 0] }, // verify
  { p: 0.7, pos: [-0.6, 0.4, 4.5], look: [-0.2, 0.2, 0] }, // gauntlet
  { p: 0.86, pos: [0.45, 0.3, 4.7], look: [0.1, 0.2, 0] },
  { p: 0.925, pos: [0.0, 0.6, 5.1], look: [0.0, 0.3, 0] }, // lock
  { p: 1.0, pos: [0.0, 1.8, 6.2], look: [0.0, 0.7, 0] }, // exit rise
];

// scroll-driven head turning — the face sweeps through profiles as the story plays
const ROT: { p: number; y: number; x: number }[] = [
  { p: 0.0, y: -0.3, x: 0.03 }, // hero — slight three-quarter
  { p: 0.1, y: -0.18, x: 0.04 },
  { p: 0.1875, y: 0.85, x: -0.05 }, // detect — right profile for the scan
  { p: 0.26, y: 0.35, x: -0.02 },
  { p: 0.3125, y: -0.1, x: -0.08 }, // encode — front on for the explosion
  { p: 0.4375, y: 0.38, x: 0.0 }, // match — three-quarter right
  { p: 0.5625, y: 0.02, x: 0.04 }, // verify — square to camera
  { p: 0.68, y: -0.75, x: 0.05 }, // gauntlet — sweeping left profile
  { p: 0.84, y: -0.45, x: 0.02 },
  { p: 0.925, y: 0.15, x: 0.03 }, // lock — comes back to face you
  { p: 1.0, y: 0.15 + Math.PI * 2, x: 0.05 }, // exit — full spin while streaming away
];

function sampleRot(p: number) {
  let i = 0;
  while (i < ROT.length - 2 && ROT[i + 1].p < p) i++;
  const a = ROT[i];
  const b = ROT[i + 1];
  const t = smooth(range01(p, a.p, b.p));
  return { y: a.y + (b.y - a.y) * t, x: a.x + (b.x - a.x) * t };
}

function makeMeshMaterial(opts: { brightness: number }) {
  return new THREE.ShaderMaterial({
    vertexShader: MESH_VERTEX,
    fragmentShader: MESH_FRAGMENT,
    transparent: true,
    depthWrite: true,
    side: THREE.FrontSide,
    uniforms: {
      uTime: { value: 0 },
      uEncode: { value: 0 },
      uExplode: { value: 0 },
      uDissolve: { value: 0 },
      uNoiseAmp: { value: 1 },
      uAlpha: { value: 0 },
      uClipY: { value: 50 },
      uScanY: { value: 1.5 },
      uScanOn: { value: 0 },
      uTintAmt: { value: 0 },
      uBrightness: { value: opts.brightness },
      uColorA: { value: new THREE.Color("#1d7fa0") },
      uColorB: { value: new THREE.Color("#3fc6e8") },
      uRimColor: { value: VIOLET.clone() },
      uTint: { value: CYAN.clone() },
    },
  });
}

function DustField({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { geo, mat } = useMemo(() => {
    const n = count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1.5;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const m = new THREE.PointsMaterial({
      color: new THREE.Color("#2b7f96"),
      size: 0.02,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo: g, mat: m };
  }, [count]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.012;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

/* signature core — bridges the empty stretch between the encode explosion and
   the match ghost. The burst debris converges into a compact violet particle
   core ("your face, sealed as a signature"), breathes inside an orbiting ring,
   then releases upward into the returning face. Fully scroll-scrubbed. */
const CORE_VERT = /* glsl */ `
attribute vec3 aDir;
attribute float aRand;
uniform float uTime;
uniform float uGather;
uniform float uHold;
uniform float uRelease;
uniform float uSize;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  // converge from the burst radius into the sealed core
  vec3 p = mix(aDir * (1.6 + aRand * 0.9), aDir * 0.15, uGather);
  // orbit swirl, ramping in as the core seals
  float ang = uTime * (0.6 + aRand * 0.9) * (uGather * 0.45 + uHold);
  float c = cos(ang), s = sin(ang);
  p.xz = mat2(c, -s, s, c) * p.xz;
  // breathing pulse while held
  p *= 1.0 + uHold * 0.09 * sin(uTime * 3.2 + aRand * 6.2831);
  // release: stream up and out, feeding the returning face
  p += normalize(aDir + vec3(0.0, 1.4, 0.0)) * uRelease * (1.6 + aRand * 2.6);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.5 + aRand) * uPixelRatio / max(0.1, -mv.z);
  // per-particle staggered fade so the release disperses instead of popping;
  // the overall fade lives in uAlpha so the debris shows up as soon as it forms
  vAlpha = 1.0 - smoothstep(aRand * 0.4, aRand * 0.4 + 0.6, uRelease);
  gl_Position = projectionMatrix * mv;
}
`;

const CORE_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uAlpha;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.08, d);
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a * vAlpha * uAlpha);
}
`;

function SignatureCore() {
  const pointsRef = useRef<THREE.Points>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const coreMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CORE_VERT,
        fragmentShader: CORE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uGather: { value: 0 },
          uHold: { value: 0 },
          uRelease: { value: 0 },
          uSize: { value: 30 },
          uPixelRatio: { value: 1 },
          uColor: { value: new THREE.Color("#b39dfa") },
          uAlpha: { value: 0 },
        },
      }),
    [],
  );

  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: VIOLET,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const geo = useMemo(() => {
    const n = 780;
    const dir = new Float32Array(n * 3);
    const rand = new Float32Array(n);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.max(0, 1 - u * u));
      dir[i * 3] = r * Math.cos(th);
      dir[i * 3 + 1] = u * 0.85;
      dir[i * 3 + 2] = r * Math.sin(th);
      rand[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    return g;
  }, []);

  useFrame(({ camera, clock, gl }) => {
    const p = storyState.progress;
    const t = clock.elapsedTime;
    // gather as the burst fades -> breathe -> release upward into the face
    // as it materializes back (solid mesh returns ~0.40-0.46)
    const gather = smooth(range01(p, 0.35, 0.4));
    const hold = smooth(range01(p, 0.39, 0.41)) * (1 - smooth(range01(p, 0.43, 0.455)));
    const release = smooth(range01(p, 0.42, 0.475));
    const alpha = gather * (1 - release);

    const u = coreMat.uniforms;
    u.uTime.value = t;
    u.uGather.value = gather;
    u.uHold.value = hold;
    u.uRelease.value = release;
    u.uAlpha.value = Math.min(1, gather * 3.5) * (1 - release) * 0.9;
    u.uPixelRatio.value = gl.getPixelRatio();

    const ring = ringRef.current;
    if (ring) {
      ringMat.opacity = alpha * 0.5;
      ring.scale.setScalar((1 + hold * 0.12 + Math.sin(t * 3.2) * 0.05) * (1 + release * 1.6));
      ring.quaternion.copy(camera.quaternion);
      ring.rotateZ(t * 0.8);
    }
    if (pointsRef.current) pointsRef.current.visible = alpha > 0.01;
  });

  return (
    // parked in front of the face so the returning head mesh never occludes it
    <group position={[0, 0.15, 0.55]}>
      <points ref={pointsRef} geometry={geo} material={coreMat} frustumCulled={false} />
      <mesh ref={ringRef} material={ringMat} frustumCulled={false}>
        <torusGeometry args={[0.36, 0.007, 8, 96]} />
      </mesh>
    </group>
  );
}


/* solid hologram head — the primary centerpiece. Renders the shaved, welded
   scan mesh with a fresnel/scanline material plus a violet additive "ghost"
   shell that snaps in during the match beat. */
function SolidHead({ envRef, reducedMotion }: { envRef: React.RefObject<Env | undefined>; reducedMotion: boolean }) {
  const buf = use(loadSolidHead());
  const solidRef = useRef<THREE.Mesh>(null);
  const ghostRef = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  // demand frameloop (reduced motion) renders only on invalidate, and the
  // static face must appear the moment this suspended mesh commits - the
  // pre-Suspense render painted nothing but the clear color
  useLayoutEffect(() => {
    invalidate();
  }, [invalidate]);

  const { geo, solidMat, ghostMat } = useMemo(() => {
    const vCount = new DataView(buf).getUint32(0, true);
    const floats = new Float32Array(buf);
    // data starts right after the 4-byte (1-float) header
    const fpos = floats.subarray(1, 1 + vCount * 3);
    const fnor = floats.subarray(1 + vCount * 3, 1 + vCount * 6);
    const frnd = floats.subarray(1 + vCount * 6, 1 + vCount * 7);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(fnor, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(frnd, 1));
    g.computeBoundingSphere();
    const solid = makeMeshMaterial({ brightness: 1.12 });
    const ghost = makeMeshMaterial({ brightness: 1.7 });
    ghost.blending = THREE.AdditiveBlending;
    ghost.depthWrite = false;
    // ghost shell reads violet — tint overrides in useFrame
    (ghost.uniforms.uColorA.value as THREE.Color).set("#5a3fa8");
    (ghost.uniforms.uColorB.value as THREE.Color).set("#a78bfa");
    return { geo: g, solidMat: solid, ghostMat: ghost };
  }, [buf]);

  useFrame(({ size }) => {
    const e = envRef.current;
    const solid = solidRef.current;
    const ghost = ghostRef.current;
    if (!e?.ready || !solid || !ghost) return;
    // the flat shaved pad and the chest sit behind the copy on phones —
    // ease the glow down on portrait so text keeps its contrast
    const pf = portraitFactor(size.width, size.height);
    const dim = 1 - pf * 0.2;

    const su = solidMat.uniforms;
    su.uTime.value = reducedMotion ? 12 : e.t;
    su.uExplode.value = e.explode;
    su.uEncode.value = e.encode;
    su.uDissolve.value = e.dissolve;
    su.uAlpha.value = e.meshAlpha;
    su.uClipY.value = e.clipY;
    su.uScanY.value = e.scanY;
    su.uScanOn.value = e.scanOn;
    su.uTint.value.copy(e.tint);
    su.uTintAmt.value = e.tintAmt;
    su.uBrightness.value = 1.12 * dim;
    solid.visible = su.uAlpha.value > 0.01 && e.dissolve < 0.999;

    const gu = ghostMat.uniforms;
    gu.uTime.value = e.t;
    gu.uEncode.value = e.encode;
    gu.uDissolve.value = e.dissolve;
    gu.uClipY.value = e.clipY;
    gu.uScanOn.value = 0;
    gu.uTintAmt.value = 0;
    gu.uAlpha.value = e.matchA * 0.3 * (1 - e.dissolve);
    gu.uBrightness.value = 1.7 * dim;
    ghost.visible = gu.uAlpha.value > 0.01;
  });

  return (
    <>
      <mesh ref={solidRef} geometry={geo} material={solidMat} frustumCulled={false} />
      <mesh ref={ghostRef} geometry={geo} material={ghostMat} frustumCulled={false} />
    </>
  );
}

export function HeadRig({ reducedMotion, lowPower = false }: { reducedMotion: boolean; lowPower?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, depthWrite: false }),
    [],
  );
  const sm = useRef({ mx: 0, my: 0 });
  const bootRef = useRef<number | null>(null);
  const envRef = useRef<Env | undefined>(undefined);
  const tintRef = useRef(CYAN.clone());

  useFrame(({ camera, clock, size }) => {
    const p = storyState.progress;
    const t = clock.elapsedTime;

    // shared beat envelopes — written once, consumed by mesh + point layers
    if (bootRef.current === null) bootRef.current = t;
    const assembly = reducedMotion ? 1 : smooth(Math.min(1, Math.max(0, (t - bootRef.current) / 2.4)));

    const detectWin = range01(p, STORY.pipelineStart, STORY.pipelineStart + STORY.beat);
    const detect = smooth(range01(detectWin, 0.1, 0.35)) * (1 - smooth(range01(detectWin, 0.85, 1)));
    const explode = smooth(range01(p, 0.265, 0.3)) * (1 - smooth(range01(p, 0.335, 0.375)));
    const encodeUp = smooth(range01(p, 0.315, 0.36));
    const encodeDown = smooth(range01(p, 0.4, 0.46));
    const encode = encodeUp * (1 - encodeDown);
    const matchA = smooth(range01(p, 0.42, 0.48)) * (1 - smooth(range01(p, 0.52, 0.58)));
    const ghostAlign = smooth(range01(p, 0.42, 0.5));
    const dissolve = range01(p, STORY.dissolveStart, 1);

    // gauntlet wash tint
    const washLocal = range01(p, STORY.gauntletStart, STORY.gauntletEnd);
    let washAmt = 0;
    if (washLocal > 0 && washLocal < 1) {
      const s = washLocal * GAUNTLET_LAYERS.length;
      const idx = Math.min(GAUNTLET_LAYERS.length - 1, Math.floor(s));
      const frac = s - idx;
      const c0 = WASH[Math.max(0, idx - (frac === 0 ? 1 : 0))];
      const c1 = WASH[idx];
      tintRef.current.copy(c0).lerp(c1, frac);
      const edge = smooth(range01(washLocal, 0, 0.08)) * (1 - smooth(range01(washLocal, 0.92, 1)));
      washAmt = 0.55 * edge;
    }

    // hybrid mesh: materializes late in the assembly, hides during explode/ribbon
    const reveal = reducedMotion ? 1 : smooth(range01(assembly, 0.55, 1));
    const meshAlpha =
      reveal * (1 - Math.min(1, explode * 1.6)) * (1 - Math.min(1, encode * 2.5)) * (1 - dissolve);
    const clipY = reducedMotion || assembly >= 1 ? 50 : 1.35 - assembly * 2.75;
    const scanOn = encode < 0.5 && dissolve < 0.5 && !reducedMotion ? 0.7 : 0;
    const scanY = 0.18 + Math.cos((t / 4.5) * Math.PI * 2) * 0.55;

    envRef.current = {
      ready: true,
      p,
      t,
      assembly,
      detect,
      explode,
      encode,
      matchA,
      ghostAlign,
      dissolve,
      reducedMotion,
      meshAlpha,
      clipY,
      scanOn,
      scanY,
      tint: tintRef.current,
      tintAmt: washAmt,
    };

    // camera pose interpolation + idle drift + mouse parallax.
    // Portrait screens have no side-by-side room for the bust, so the desktop
    // lateral offsets are damped out, the camera pulls back for the narrow FOV
    // and the look target lifts — the head recenters and sinks below the copy.
    const pf = portraitFactor(size.width, size.height);
    const dampX = 1 - pf * 0.85;
    let i = 0;
    while (i < POSES.length - 2 && POSES[i + 1].p < p) i++;
    const a = POSES[i];
    const b = POSES[i + 1];
    const lt = smooth(range01(p, a.p, b.p));
    sm.current.mx += (storyState.mouseX - sm.current.mx) * 0.06;
    sm.current.my += (storyState.mouseY - sm.current.my) * 0.06;

    const drift = reducedMotion ? 0 : 1 - smooth(range01(p, 0, 0.07));
    camera.position.set(
      (a.pos[0] + (b.pos[0] - a.pos[0]) * lt) * dampX +
        sm.current.mx * 0.24 * (1 - pf * 0.5) +
        Math.sin(t * 0.18) * 0.12 * drift,
      a.pos[1] + (b.pos[1] - a.pos[1]) * lt + sm.current.my * 0.15 + Math.sin(t * 0.14) * 0.05 * drift,
      a.pos[2] + (b.pos[2] - a.pos[2]) * lt + pf * 1.2,
    );
    camera.lookAt(
      (a.look[0] + (b.look[0] - a.look[0]) * lt) * dampX,
      a.look[1] + (b.look[1] - a.look[1]) * lt + pf * 0.85,
      0,
    );

    // head turning curve + idle sway + mouse parallax
    const rot = sampleRot(p);
    const g = groupRef.current;
    if (g) {
      const targetY = rot.y + Math.sin(t * 0.12) * 0.06 + sm.current.mx * 0.16;
      const targetX = rot.x + sm.current.my * 0.1;
      g.rotation.y += (targetY - g.rotation.y) * 0.07;
      g.rotation.x += (targetX - g.rotation.x) * 0.07;
      g.position.y = Math.sin(t * 0.5) * 0.02 + dissolve * 0.4;
    }

    // verify ring: locks on verify beat, returns after the gauntlet; rolls slowly
    const ring = ringRef.current;
    if (ring) {
      const in1 = smooth(range01(p, 0.575, 0.61)) * (1 - smooth(range01(p, 0.66, 0.7)));
      const in2 = smooth(range01(p, STORY.lock - 0.02, STORY.lock + 0.01)) * (1 - smooth(range01(p, 0.93, 0.96)));
      const vis = Math.max(in1, in2);
      ringMat.opacity = vis * 0.95 * (1 - dissolve);
      const pulse = 1 + Math.sin(t * 3) * 0.008;
      const s = (1.42 - 0.34 * in1) * pulse * (1 - dissolve * 0.3) * (1 - pf * 0.25);
      ring.scale.setScalar(s);
      ring.quaternion.copy(camera.quaternion);
      ring.rotateZ(t * 0.25);
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <Suspense fallback={null}>
          <SolidHead envRef={envRef} reducedMotion={reducedMotion} />
        </Suspense>
        <mesh ref={ringRef} material={ringMat} frustumCulled={false}>
          <torusGeometry args={[1.28, 0.012, 8, 128]} />
        </mesh>
      </group>
      <DustField count={lowPower ? 320 : 700} />
      <SignatureCore />
    </>
  );
}

