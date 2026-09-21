# FacePass — marketing site

One-page, dark, cinematic marketing site for **FacePass**, an AI facial-recognition
attendance platform ("Attendance that recognizes you."). The centerpiece is a real-time
WebGL solid hologram head choreographed to scroll (hero materialization → detect/encode/
match/verify scrollytelling → anti-spoofing gauntlet → noise-burn dissolve), followed by
DOM sections.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- three + @react-three/fiber 9 + drei + custom solid hologram ShaderMaterial
- GSAP 3.15 (ScrollTrigger + SplitText) + Lenis 1.3 smooth scroll
- Motion v13 (nav entrance), Tailwind CSS v4 (tokens in `app/globals.css` `@theme`)
- No per-frame React state: the 3D reads one mutable scroll ref
  (`components/three/shared.ts`), so nothing re-renders per frame

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (must pass)
npm run start    # serve the production build
```

## Architecture notes

- `components/story.tsx` — the 800vh story zone: hero (100vh) + pipeline (4 × 100vh
  beat panels) + gauntlet (300vh sticky). One master `ScrollTrigger` writes progress into
  `storyState`; `useFrame` lerps camera/uniforms from it.
- `components/three/` — code-split (`next/dynamic`, `ssr: false`). **Solid render**: the
  welded scan mesh (smooth normals kept from the source GLB) is the centerpiece — a
  custom hologram shader carries key/fill lighting, a cyan/violet fresnel edge, faint
  scan stripes, the scan-line materialize reveal (clip-line discard with a glowing edge
  band), a glitch shimmer during encode, and a world-space noise-burn dissolve with an
  emissive edge (no post pass needed). A violet additive ghost shell of the same
  geometry snaps in for the match beat. The 53k-point additive particle cloud was
  retired for a cleaner look and better mobile performance; the ambient `DustField`
  motes and the verify/lock ring remain. Postprocessing is still deliberately dropped —
  the fresnel/emissive shader work and a CSS vignette replace it (avoids driver-sensitive
  fullscreen chains).
- On portrait screens the camera rig reframes: desktop lateral offsets are damped, the
  camera pulls back and the look target lifts so the bust sits below the copy
  (`portraitFactor` in `components/three/shared.ts`), and the shader brightness eases
  down so text keeps its contrast.
- Reduced motion (`prefers-reduced-motion`) renders the story statically: no scrub, no
  smooth scroll, all panels visible, no wash — and the gauntlet shows its settled end
  state (struck-out photo + "LIVENESS VERIFIED") so no content is lost. QA override:
  append `?motion=full` to force the full-motion path in a browser whose OS reports
  reduced motion (this also stands down the reduced-motion CSS kill switch, so CSS
  animations run in the QA view too).
- Scroll-reveal targets (`Reveal` / `SplitReveal` / hero copy) carry `data-motion` and are
  hidden pre-hydration by a tiny inline gate script in `app/layout.tsx` (added only when
  full motion is allowed, mirrored from `prefersReducedMotion()`), so hydrated content
  never flashes visible → hidden → animated. `SmoothScroll` lifts the gate after the
  layout effects commit; a CSS failsafe re-reveals everything if hydration never runs.
- Motion primitives live in `components/motion.tsx`: `SplitReveal` (masked line/char
  reveals), `Reveal` (transform/opacity, optional clip-path and blur — blur is skipped on
  low-power devices), `StaggerGroup` (cascades a group's direct children on scroll),
  `CountUp`, `Magnetic`, `Marquee`, `Parallax` (travel halved on small viewports),
  `ScrollProgress` (top progress line), `useSpotlightTilt` and `useVelocitySkew`
  (velocity skew is fine-pointer only — momentum scrolling on touch makes it jitter).
  A shared `window.__lenis` QA handle is set by `SmoothScroll` (plus a
  `window.__st` handle exposing ScrollTrigger for verification tooling).
  ScrollTriggers recalibrate automatically on window resize and, via a
  debounced ResizeObserver on the document height, on any layout change that
  fires no resize event (late fonts, dynamic content, embedded webviews).
- Section grids run one scrubbed scroll lifecycle each (staggered enter, hold
  drift, staggered exit, reversing on scroll-back): the features bento (one
  timeline plus checkerboard cell drift and a scan-light sweep), the metrics
  band (six cells, faint checkerboard hold drift) and the in-the-wild media
  grid (hold motion comes from the parallax render and breathe-zoom stills
  inside each tile).
- Nav (`components/nav.tsx`) hides while scrolling down past the hero and returns on the
  first upward tick, deepens its shadow once scrolled, and on mobile opens an animated
  glass menu (staggered links, hamburger → X morph) that pauses Lenis via
  `lockScroll()` while open.
- Mobile specifics: the gauntlet's desktop photo plane is hidden below `lg`, so the
  strike feedback lands as a compact "SPOOF REJECTED" stamp (`#spoof-stamp-m`, gated by
  the same `html.motion-full` escape hatch as the reduced-motion kill switch); bento
  icon badges float only where hover doesn't exist (`@media (hover: hover)` disables
  the float so the hover rotate/scale owns the transform); primary CTAs get a shine
  sweep on hover devices and rely on `active:scale` tap feedback on touch.
- No WebGL → `fallback-aurora` CSS/SVG mesh scene. Runtime GL failure → same fallback
  via an error boundary. Canvas pauses (`frameloop="never"`) when the story is out of
  view or the tab is hidden.

## 3D head asset

The 3D centerpiece is baked from the three.js example head scan ("LeePerrySmith" — head
scan courtesy of **Infinite Realities**, published via the three.js examples under
**CC-BY 3.0**; attribution kept here per the license, used as the brief's §5 Option B
allows).

- Source: `tmp-head/head.glb` (Draco-compressed GLB, welded with the scan's own smooth
  normals)
- Solid bake: `node scripts/bake-head-solid.mjs` → `public/models/head-solid.bin`
  ([vCount u32] + position + normal + rand per vertex — the layout
  `components/three/head-rig.tsx` reads). The bake:
  1. normalize transform (yaw 0 — the raw scan faces +Z dead-on; x/z centered, 2.2 tall)
  2. "laser-shave" — the scan's mustache/goatee is a real geometric bulge whose crease
     ring survives shading fixes, so the beard pad is flattened onto a height-field
     Laplace fill bridged from the surrounding skin, feathered across the crease ring;
     shaved vertex normals are re-derived from the height field. Working on the welded
     mesh keeps the surface watertight (a shared vertex moves whole triangles). The
     source winding is left untouched — it is consistent, and flipping "inward-pointing"
     triangles punches holes in concave regions.
- Point-cloud bake (dev/reference): `node scripts/bake-head-points.mjs` →
  `public/models/head-points.bin` + `head-mesh.bin` (the retired particle layer +
  shard surface). No longer fetched by the site; kept with the preview tools.
- `public/preview-solid.html` (baked solid bust viewer), `public/preview-points.html`
  (raw point-bin viewer) and `public/preview-mesh.html` (solid GLB turntable) are dev
  tools for checking the assets — safe to delete.

No other third-party 3D assets are used.

## Generated media (Higgsfield MCP)

The 3D hero is pure WebGL. Section ambience + the OG image were generated with the
Higgsfield MCP (`z_image`, 16:9, 2048×1152) and post-processed locally (center-crop,
resize, JPEG q72–88). Job IDs (server-side outputs retained ~7 days):

| Asset | File | Prompt (as submitted) | Job ID |
| --- | --- | --- | --- |
| OG/social card | `app/opengraph-image.jpg` (1200×630) | "Minimal dark tech poster background, a glowing cyan point-cloud human head in three-quarter view made of thousands of luminous particles and fine dots, thin green horizontal scan line crossing it, deep navy vignette, electric cyan and violet rim glow, generous empty dark space on the left third for text, ultra-clean composition, no text, no letters, cinematic lighting" | `b85496a6-ecc0-4e48-b776-d415c4afe406` |
| Cloud-sync backdrop (dashboard section) | `public/images/cloud-sync.jpg` | "Endless streams of glowing data packets flowing along luminous circuit pathways toward a distant radiant cloud-shaped node, deep blue environment, soft bokeh light flares, cool cinematic color grade, abstract non-literal visualization of cloud synchronization, wide establishing shot, dark and moody, no readable text" | `cd3f023e-05cd-43e6-9a01-f59ca0af51f7` |
| Heartbeat ring backdrop (CTA section) | `public/images/cta-ring.jpg` | "Dark void with a single glowing ring of light at center expanding like a heartbeat, fine concentric ripple waves, ultra-minimal composition, deep charcoal and electric blue palette, soft volumetric glow, perfectly centered symmetrical framing, no text" | `c604c03a-d197-42e5-ad82-aa24223c4e74` |
| Kiosk concept render ("In the wild" banner) | `public/images/kiosk.jpg` | "Modern glass lobby of a private educational campus in the morning, a sleek self-service kiosk terminal with a softly glowing screen and a subtle green light halo above the display, floor-to-ceiling windows, warm sunlight mixed with cool screen glow, corporate-clean look, no people, no readable text" | `4da0de6e-4699-4441-8627-e19cf85f9c86` |

To regenerate similar media in Higgsfield Studio, paste the same prompts. If video
credits become available, the brief's b-roll prompts (cloud-sync dolly loop, CTA ring
YoYo loop, dashboard hologram arc, transition wipe) can replace these stills — encode
with:

```bash
ffmpeg -i raw.mp4 -an -c:v libvpx-vp9 -crf 30 -b:v 0 out.webm   # ≤4 MB, 1080p/720p
ffmpeg -i out.mp4 -frames:v 1 poster.jpg
```

…and swap each Ken-Burns backdrop div for the `<video>` pattern from the brief
(`autoPlay muted loop playsInline poster`, IntersectionObserver pause,
`prefers-reduced-motion` → poster). The kiosk render is labeled "CONCEPT RENDER —
SYNTHETIC" on the site; all imagery is AI-generated — no real people or places.

## Content constraints

- The brand name lives in one token: `lib/brand.ts` (rename there, done).
- The site never names the real deployment organization — only "a private educational
  campus". A repo-wide case-insensitive grep for that acronym returns nothing.
- Roster rows, attendance logs and log lines are synthetic and labeled as such
  (`lib/demo-data.ts`, visible "SYNTHETIC DEMO DATA" badge).
- Footer carries the required disclaimer verbatim. No secrets or env files in the repo.

## Deployment (Vercel)

The site is linked to the GitHub repo in Vercel (project `facepass-site`,
team `mbsipmcc-5235s-projects`): every push to `main` deploys to production
automatically at https://facepass-site-mbsipmcc-5235s-projects.vercel.app and
every pull request gets its own preview deployment.

One constant controls every absolute URL the site emits (metadataBase,
canonical, `og:url`, `og:image`, sitemap, robots, JSON-LD): `BRAND.siteUrl`
in `lib/brand.ts`. Keep it in sync with the production domain; when a custom
domain is attached, change it there only. Next 16.3.5 note: `metadataBase`
must be a bare origin (no sub-path), see the comment in `app/layout.tsx`.

## Social sharing + SEO

- `app/opengraph-image.jpg` (1200x630) + `app/opengraph-image.alt.txt`: the
  card image shown by Facebook/LinkedIn/WhatsApp/X/iMessage/Discord. Next
  emits the full Open Graph + Twitter tag set from these files.
- `app/icon.png` and `app/apple-icon.png`: generated from the OG image
  (square crop centered on the head); `app/favicon.ico` is the legacy icon.
- `app/sitemap.ts` and `app/robots.ts`: prerendered to `sitemap.xml` and
  `robots.txt` at build time.
- JSON-LD `@graph` (Organization + WebSite + SoftwareApplication) lives in
  `app/layout.tsx`. `/coming-soon` is noindexed and excluded from the sitemap.
- After changing the OG image, re-scrape once at
  https://developers.facebook.com/tools/debug/ (Meta caches by URL).
