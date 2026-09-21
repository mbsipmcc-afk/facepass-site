# Spec: FacePass marketing site
Date: 2026-09-12 / Status: implemented
Source: client brief (§1–§11), distilled. The brief is the source of truth for copy and facts.

## Problem
FacePass (AI facial-recognition attendance platform) has no online presence. It needs a
one-page, dark, cinematic marketing site whose centerpiece is a real-time WebGL head
choreographed to scroll — selling speed, spoof-proofing, and production hardening.

## Goals / Non-goals
- Goal: one long scroll page; persistent fixed `<Canvas>` behind the first story zone
  (hero → pipeline → anti-spoof gauntlet) driven by one scrubbed scroll progress value;
  DOM sections below; `npm run build` green; DOM-text LCP, code-split 3D bundle,
  reduced-motion + no-WebGL fallbacks.
- Goal: brand tokenized — renaming the product is a one-line change in `lib/brand.ts`.
- Non-goal: real backend, real demo booking, i18n, CMS. CTAs are placeholders (mailto).
- Non-goal: shadcn/ui — every widget is hand-built (marquee, spotlight, tilt), so a
  primitive library adds no value here (brief allows "sparingly").

## Design decisions
- Head asset: switched to the brief's **Option B** during the motion-upgrade pass — the
  three.js example head scan (Infinite Realities, CC-BY 3.0, attribution in README) baked
  into a 40k-point cloud with normals (`scripts/bake-head-points.mjs`), shaded with
  normal-based key/fill/rim lighting so it reads as a real face. Scroll choreography:
  assembly → profile turn (detect) → explode + 128-column ribbon (encode) → ghost align
  (match) → ring lock (verify) → color-wash turns (gauntlet) → full spin + data-stream
  dissolve (exit).
- Section order: the story zone (hero → pipeline → gauntlet) is one contiguous fixed-canvas
  region; §6's metrics/features therefore come after it. Deliberate reading of the brief.
- Scroll: one `ScrollTrigger` on the story wrapper writes progress into a shared mutable
  ref (`components/three/shared.ts`); `useFrame` reads it and lerps. No React state churn.
- Gauntlet color wash + photo strike are DOM (fixed overlay + card); the canvas receives
  the same wash color as a shader uniform from the shared ref → synced and cheap.
- Higgsfield MCP unavailable in this session → CSS/SVG ambience everywhere, OG image
  generated in code (`app/opengraph-image.tsx`), prompts + ffmpeg documented in README.
- Zone geometry: hero 100vh + pipeline 400vh (4 beat panels in flow, scrubbed in/out)
  + gauntlet 300vh (sticky panel). Story scrub distance 700vh; beat centers at global
  progress 0.143 / 0.286 / 0.429 / 0.571 (camera keyframes use the same numbers).

## Hard constraints (checked at the end)
- Case-insensitive repo-wide grep for the forbidden real-organization acronym → no
  matches anywhere (including this document).
- No real people/orgs: roster + logs are synthetic and labeled as such.
- Footer carries the exact disclaimer from the brief. No secrets/env files committed.

## Test plan
1. `npm run build` passes (typecheck + route generation).
2. Browser smoke test (production server): hero assembly, 4 pipeline beats, gauntlet
   strike, dissolve into DOM sections, nav anchors, flash-challenge demo pass + fail paths.
3. Constraint grep (forbidden organization acronym / secrets).
4. Reduced-motion + mobile-low-power code paths reviewed by construction.

## Tasks
1. [x] Scaffold Next 16 + React 19 + TS + Tailwind v4; install three/R3F/drei/postprocessing, gsap, lenis, motion, zustand
2. [x] Spec doc + brand token + synthetic data
3. [x] Tokens/fonts/globals, layout metadata, JSON-LD, OG image, icon
4. [x] Lenis↔GSAP provider; SplitText/FadeUp/CountUp/Magnetic/Cursor primitives
5. [x] 3D module: shared state, shaders, procedural head rig, effects, frameloop gating
6. [x] Story zone: hero copy, 4 beat panels, gauntlet HUD + photo strike, dissolve
7. [x] DOM sections: nav, metrics, bento, security + interactive demo, dashboard, reliability, marquee, CTA, footer
8. [x] Build green; browser smoke test; constraint grep; README
