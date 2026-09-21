"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { HeadRig } from "./head-rig";

/* The story canvas parks on frameloop="never" while inactive. Re-arming an
   R3F loop from "never" has historically been flaky across versions - the
   flag flips but no frame is ever scheduled, leaving an initialized canvas
   that renders only the clear color. One explicit invalidate on the wake-up
   transition makes the resume deterministic. */
function WakeOnActive({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (active && !reducedMotion) invalidate();
  }, [active, reducedMotion, invalidate]);
  return null;
}

/**
 * Plain render path - no EffectComposer. Additive point sprites carry the glow
 * themselves; a CSS vignette overlay adds the cinematic edge. This avoids
 * driver-sensitive fullscreen post chains (white-output quirk on some GPUs).
 */
export default function Scene({
  reducedMotion,
  lowPower,
  active,
  onReady,
}: {
  reducedMotion: boolean;
  lowPower: boolean;
  active: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      frameloop={reducedMotion ? "demand" : active ? "always" : "never"}
      dpr={lowPower ? [1, 1.5] : [1, 1.75]}
      camera={{ fov: 42, position: [0, 0.05, 4.4], near: 0.1, far: 40 }}
      gl={{ antialias: false, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor("#05070d", 1);
        onReady?.();
      }}
    >
      <color attach="background" args={["#05070d"]} />
      <HeadRig reducedMotion={reducedMotion} lowPower={lowPower} />
      <WakeOnActive active={active} reducedMotion={reducedMotion} />
      <Suspense fallback={null} />
    </Canvas>
  );
}
