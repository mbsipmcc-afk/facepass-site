"use client";

import { useRef, useState } from "react";
import { BRAND } from "@/lib/brand";
import {
  CountUp,
  Magnetic,
  Reveal,
  SplitReveal,
  useIsomorphicLayoutEffect,
} from "@/components/motion";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/device";
import { StoryCanvas } from "@/components/three/story-canvas";
import { FaceMesh } from "@/components/face-mesh";
import { GAUNTLET_LAYERS, STORY, range01, storyState } from "@/components/three/shared";
const BEATS = [
  {
    id: "detect",
    k: "01 · DETECT",
    title: "Found you in a crowd of one.",
    body: "The moment you step up, our modern AI locks onto your face in a fraction of a second, before your hand even moves toward a card you no longer need.",
    hud: ["FACES 1", "CONF 97%", "INSTANT LOCK"],
    accent: "text-brand",
  },
  {
    id: "encode",
    k: "02 · ENCODE",
    title: "Your face becomes a private signature.",
    body: "Our custom AI model turns your face into a one-of-a-kind encrypted signature in milliseconds. Never a photo. It runs on a pipeline of its own, so the kiosk never stutters, even at rush hour.",
    hud: ["UNIQUE SIGNATURE", "ENCRYPTED", "ZERO LAG"],
    accent: "text-violet",
  },
  {
    id: "match",
    k: "03 · MATCH",
    title: "Compared against every enrolled identity.",
    body: "That signature is swept against all 12,847 enrolled identities in the blink of an eye. Watch the ghost outline snap into place. Matched, identified, recognized.",
    hud: ["MATCH FOUND", "CONFIDENCE 97%", "ROSTER 12,847"],
    accent: "text-brand-soft",
  },
  {
    id: "verify",
    k: "04 · VERIFY",
    title: "Three of four frames agree. It's you.",
    body: "The AI double-checks itself frame after frame, so one noisy glance can't flip the result. When three of four frames agree, the ring locks green and attendance logs itself. No card, no app, no queue, ever.",
    hud: ["LIVENESS ✓", "VOTE 3 / 4", "2-5 S TOTAL"],
    accent: "text-verify",
    chips: ["Modern AI", "Custom AI Model", "Multi-Frame Agreement", "Super-Secured Design"],
  },
];

export function Story() {
  const wrap = useRef<HTMLDivElement>(null);
  const wash = useRef<HTMLDivElement>(null);
  // Lazy init: reduced-motion is known at first client render, so the scrub
  // choreography never mounts-and-reverts (which would clobber inline styles).
  const [reduced] = useState(
    () => typeof window !== "undefined" && prefersReducedMotion(),
  );

  // hero load-in stagger
  useIsomorphicLayoutEffect(() => {
    // lift the pre-hydration gate before anything paints (reduced motion never
    // adds the gate, but removing it here is free and keeps one code path)
    document
      .querySelectorAll<HTMLElement>(".hero-fade")
      .forEach((el) => el.removeAttribute("data-motion"));
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-fade",
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.12, delay: 0.35 },
      );
    });
    return () => ctx.revert();
  }, []);

  // master scrollytelling choreography
  useIsomorphicLayoutEffect(() => {
    wrap.current
      ?.querySelectorAll<HTMLElement>(".beat-inner")
      .forEach((el) => el.removeAttribute("data-motion"));
    if (reduced) return;
    const wrapEl = wrap.current;
    if (!wrapEl) return;

    const ctx = gsap.context(() => {
      // one scrubbed trigger drives the 3D progress + canvas exit fade
      ScrollTrigger.create({
        trigger: wrapEl,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          storyState.progress = self.progress;
          const el = document.getElementById("story-canvas");
          if (el) {
            const fade = range01(self.progress, STORY.dissolveStart, 0.995);
            el.style.opacity = String(1 - fade);
            el.style.visibility = fade >= 1 ? "hidden" : "visible";
          }
        },
      });

      // hero copy drifts up and out as the story begins
      gsap.to("#hero-copy", {
        autoAlpha: 0,
        y: -70,
        ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom 55%", scrub: true },
      });

      // pipeline beat panels slide through in flow; HUD chips cascade in
      // just after their panel lands (same scrub - they belong to the beat)
      gsap.utils.toArray<HTMLElement>(".beat-panel").forEach((panel) => {
        const inner = panel.querySelector(".beat-inner");
        if (!inner) return;
        const chips = panel.querySelectorAll(".beat-chip");
        const tl = gsap.timeline({
          scrollTrigger: { trigger: panel, start: "top bottom", end: "bottom top", scrub: 0.6 },
        });
        tl.fromTo(inner, { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.32, ease: "none" });
        if (chips.length) {
          tl.fromTo(
            chips,
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.025, ease: "none" },
            0.2,
          );
        }
        tl.to(inner, { duration: 0.36 }).to(inner, { autoAlpha: 0, y: -70, duration: 0.32, ease: "none" });
      });

      // gauntlet: 5-color wash → photo plane strike → verified verdict
      const colors = GAUNTLET_LAYERS.map((l) => l.color);
      const tl = gsap.timeline({
        scrollTrigger: { trigger: "#gauntlet", start: "top top", end: "bottom bottom", scrub: 0.4 },
      });
      tl.fromTo(wash.current, { opacity: 0 }, { opacity: 0.3, duration: 0.4, ease: "none" });
      colors.forEach((c, i) => {
        tl.to(wash.current, { backgroundColor: c, duration: 1, ease: "none" }, i === 0 ? "<" : undefined);
        tl.fromTo(`#layer-${i}`, { autoAlpha: 0.35, x: 0 }, { autoAlpha: 1, x: 10, color: c, duration: 0.3, ease: "none" }, "<0.25");
      });
      tl.fromTo(
        "#photo-plane",
        { autoAlpha: 0, rotateY: -40, y: 70 },
        { autoAlpha: 1, rotateY: -14, y: 0, duration: 0.7, ease: "power2.out" },
      )
        .to("#photo-plane", { rotateY: -9, duration: 0.3, ease: "none" })
        .fromTo("#photo-strike", { scaleX: 0 }, { scaleX: 1, duration: 0.2, ease: "power3.in" })
        .fromTo("#photo-stamp", { autoAlpha: 0, scale: 1.7 }, { autoAlpha: 1, scale: 1, duration: 0.16, ease: "power4.out" }, "<0.08")
        // phones have no room for the photo plane - the strike lands as a
        // compact stamp over the copy instead
        .fromTo(
          "#spoof-stamp-m",
          { autoAlpha: 0, scale: 1.5, rotate: -8 },
          { autoAlpha: 1, scale: 1, rotate: -3, duration: 0.18, ease: "power4.out" },
          "<",
        )
        .to("#photo-plane", { autoAlpha: 0, y: -50, duration: 0.5, ease: "none" }, "+=0.35")
        .fromTo("#gauntlet-verdict", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" })
        .to("#spoof-stamp-m", { autoAlpha: 0, duration: 0.4, ease: "none" }, "<0.25")
        .to(wash.current, { opacity: 0, duration: 0.9, ease: "none" }, "<");
    }, wrapEl);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <div ref={wrap} id="story" className="relative h-[800svh] overflow-x-clip">
      <StoryCanvas />

      {/* gauntlet color wash - above canvas, below text. Always rendered (it
          sits at opacity-0 until the scrub drives it): gating it on the
          `reduced` state would mismatch server/client hydration for
          reduced-motion visitors. */}
      <div
        ref={wash}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[5] opacity-0"
        style={{ backgroundColor: GAUNTLET_LAYERS[0].color }}
      />

      {/* ---- HERO (100svh) ---- */}
      <section id="hero" className="relative z-10 flex h-svh min-h-[640px] items-center pt-24">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
          <div id="hero-copy" className="copy-scrim max-w-2xl">
            <p className="hero-fade hud-label mb-6 flex items-center gap-3" data-motion="">
              <span className="inline-block h-1.5 w-1.5 animate-blink rounded-full bg-brand" />
              AI facial recognition platform
            </p>
            <SplitReveal as="h1" immediate delay={0.15} split="chars" className="heading-gradient font-display text-5xl font-bold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
              {BRAND.tagline}
            </SplitReveal>
            <p className="hero-fade mt-7 max-w-xl text-lg leading-relaxed text-fg-muted" data-motion="">
              Walk up. Look. Verified in under 5 seconds, 1.28 million times
              and counting. Printed photos, phone screens and replay attacks
              are rejected outright.
            </p>
            <div className="hero-fade mt-9 flex flex-wrap items-center gap-4" data-motion="">
              <Magnetic>
                <a
                  href={`${BRAND.basePath}/coming-soon`}
                  data-cursor-text="Demo"
                  className="btn-shine inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-ink shadow-[0_14px_44px_-14px_rgba(56,225,255,0.65)] transition hover:bg-brand-soft active:scale-[0.97]"
                >
                  Request a demo
                  <span aria-hidden>→</span>
                </a>
              </Magnetic>
              <Magnetic>
                <a
                  href="#how-it-works"
                  data-cursor-text="How"
                  className="inline-flex items-center gap-2 rounded-full border border-fg/15 px-7 py-3.5 text-sm font-medium text-fg transition hover:border-brand/60 hover:text-brand active:scale-[0.97]"
                >
                  See how it works
                </a>
              </Magnetic>
            </div>
            <div className="hero-fade mt-14 flex flex-wrap gap-x-8 gap-y-3 font-mono text-xs tracking-wider text-fg-muted" data-motion="">
              <span><strong className="font-semibold text-fg"><CountUp to={12847} /></strong> identities</span>
              <span aria-hidden className="hidden text-fg-faint sm:inline">·</span>
              <span><strong className="font-semibold text-fg"><CountUp to={1284509} /></strong> verifications</span>
              <span aria-hidden className="hidden text-fg-faint sm:inline">·</span>
              <span><strong className="font-semibold text-fg"><CountUp to={618} /></strong> days in production</span>
            </div>
          </div>
        </div>
        <div
          aria-hidden
          className="hero-fade absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
          data-motion=""
        >
          <span className="hud-label animate-cue">scroll</span>
          <span className="h-8 w-px animate-pulse bg-gradient-to-b from-brand to-transparent" />
        </div>
      </section>

      {/* ---- PIPELINE (400svh, 4 beats) ---- */}
      <section id="how-it-works" className="relative z-10">
        {BEATS.map((beat, i) => (
          <div key={beat.id} className="beat-panel relative flex h-svh items-center max-md:items-start max-md:pt-[12svh]">
            {/* full-motion: the scrub timeline hides/reveals this; reduced: always visible */}
            <div className="beat-inner mx-auto w-full max-w-7xl px-6 lg:px-10" data-motion="">
              <div className={`copy-scrim max-w-xl ${i % 2 === 1 ? "lg:ml-auto" : ""}`}>
                <p className={`hud-label mb-4 ${beat.accent}`}>{beat.k}</p>
                <SplitReveal as="h2" className="heading-gradient font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                  {beat.title}
                </SplitReveal>
                <p className="mt-6 text-lg leading-relaxed text-fg-muted">{beat.body}</p>
                <div className="mt-8 flex flex-wrap gap-2 font-mono text-[11px] tracking-widest text-fg-muted">
                  {beat.hud.map((h) => (
                    <span key={h} className="beat-chip rounded-full border border-fg/10 bg-ink/60 px-3 py-1.5 backdrop-blur-sm">
                      {h}
                    </span>
                  ))}
                </div>
                {beat.chips && (
                  <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-fg-faint">
                    <span className="hud-label mr-1">powered by</span>
                    {beat.chips.map((c) => (
                      <span key={c} className="rounded-md border border-fg/10 px-2.5 py-1 font-mono text-[11px] text-fg-muted">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ---- ANTI-SPOOF GAUNTLET (300svh, sticky) ---- */}
      <section id="gauntlet" className="relative z-10 h-[300svh]">
        <div className="sticky top-0 flex h-svh items-center">
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:px-10">
            <div className="copy-scrim">
              <p className="hud-label mb-4 text-alert">Anti-spoofing</p>
              <SplitReveal as="h2" className="heading-gradient font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                A photo won&apos;t do. Neither will a replay.
              </SplitReveal>
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-fg-muted">
                  Five independent anti-spoofing layers stand between a face
                  and a clock-in. Of 248,000+ attempts so far, not one has
                  made it through. Watch the screen wash through the flash
                  challenge, then watch a printed photo get struck out.
                </p>
              </Reveal>
              <Reveal delay={0.18}>
                <ul className="mt-10 space-y-4" aria-label="Anti-spoofing layers">
                  {GAUNTLET_LAYERS.map((layer, i) => (
                    <li key={layer.name} className="flex items-center gap-4">
                      <span className="font-mono text-[11px] text-fg-faint">L{i + 1}</span>
                      <span
                        id={`layer-${i}`}
                        className="font-mono text-sm tracking-wider text-fg-muted transition-none"
                      >
                        {layer.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>

            <div className="relative hidden flex-col items-center justify-center gap-8 lg:flex" style={{ perspective: "1200px" }}>
              {/* the "photo attack" plane */}
              <div
                id="photo-plane"
                className="relative w-80 rounded-2xl border border-fg/10 bg-panel-2 p-5 shadow-2xl"
                style={{ transformStyle: "preserve-3d" }}
                aria-hidden
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="hud-label">frame source</span>
                  <span className="rounded bg-alert/15 px-2 py-0.5 font-mono text-[10px] text-alert">UNTRUSTED</span>
                </div>
                <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-br from-panel to-ink">
                  {/* face-mesh svg stands in for the printed photo */}
                  <FaceMesh className="absolute inset-0 h-full w-full p-6" muted />
                  <div
                    id="photo-strike"
                    aria-hidden
                    className="absolute left-[-6%] top-1/2 h-[3px] w-[112%] origin-left rounded bg-alert shadow-[0_0_18px_rgba(251,113,133,0.8)]"
                  />
                </div>
                <div id="photo-stamp" className="mt-4 text-center">
                  <span className="inline-block rounded-md border-2 border-alert px-4 py-1.5 font-mono text-sm font-bold tracking-[0.2em] text-alert">
                    SPOOF REJECTED
                  </span>
                </div>
              </div>

              {/* reduced motion: the scrub never plays, so the story's end state
                  (live verdict) is shown statically under the struck-out photo.
                  CSS variant, not JS state — keeps server/client markup equal. */}
              <div className="flex flex-col items-center gap-2 text-center motion-safe:hidden">
                <p className="font-mono text-sm tracking-[0.25em] text-verify">✓ LIVENESS VERIFIED</p>
                <p className="max-w-xs text-sm text-fg-muted">
                  Live human confirmed. Attendance logged in 2-5 seconds, start to finish.
                </p>
              </div>

              {/* the live verdict (full-motion path - revealed after the strike) */}
              <div
                id="gauntlet-verdict"
                className="absolute inset-0 flex flex-col items-center justify-center gap-6 motion-reduce:hidden"
              >
                <div className="relative flex h-44 w-44 items-center justify-center">
                  <span className="animate-ring-pulse absolute inset-0 rounded-full border-2 border-verify" />
                  <span className="absolute inset-3 rounded-full border border-verify/40" />
                  <span className="text-3xl text-verify">✓</span>
                </div>
                <p className="font-mono text-sm tracking-[0.25em] text-verify">LIVENESS VERIFIED</p>
                <p className="max-w-xs text-center text-sm text-fg-muted">
                  Live human confirmed. Attendance logged in 2-5 seconds, start to finish.
                </p>
              </div>
            </div>
          </div>

          {/* mobile-only strike feedback: the desktop photo plane is hidden
              below lg, so the "SPOOF REJECTED" verdict lands as a compact
              stamp over the copy at the same scrub moment. Gated like the
              reduced-motion kill switch so ?motion=full QA still shows it. */}
          <div
            id="spoof-stamp-m"
            aria-hidden
            className="spoof-stamp-m pointer-events-none absolute inset-x-0 bottom-10 flex justify-center opacity-0 lg:hidden"
          >
            <span className="rounded-md border-2 border-alert bg-ink/70 px-4 py-1.5 font-mono text-sm font-bold tracking-[0.2em] text-alert backdrop-blur-sm">
              SPOOF REJECTED
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

