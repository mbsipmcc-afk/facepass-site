"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { HeadRig } from "./head-rig";

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
      <Suspense fallback={null} />
    </Canvas>
  );
}
