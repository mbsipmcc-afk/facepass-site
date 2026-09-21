"use client";

import { useRef, type ReactNode } from "react";
import {
  Reveal,
  SplitReveal,
  useIsomorphicLayoutEffect,
  useSpotlightTilt,
  useVelocitySkew,
} from "@/components/motion";
import { gsap } from "@/lib/gsap";
import { isSmallViewport, prefersReducedMotion } from "@/lib/device";

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    scan: (
      <>
        <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
        <circle cx="12" cy="12" r="3.2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3l7 3v5c0 4.4-2.9 7.8-7 9-4.1-1.2-7-4.6-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
    cloud: (
      <>
        <path d="M7 18a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 8.6 3.8 3.8 0 0 1 17.5 16" />
        <path d="M8.5 16.5L12 13l3.5 3.5M12 13v6" />
      </>
    ),
    heal: (
      <>
        <path d="M20.5 12A8.5 8.5 0 1 1 12 3.5c2.9 0 5.4 1.4 7 3.5" />
        <path d="M19 3v4h-4" />
      </>
    ),
    offline: (
      <>
        <path d="M3 3l18 18" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a9 9 0 0 1 4-2.3M19 13a9 9 0 0 0-6-2.9" />
        <circle cx="12" cy="19.5" r="0.8" fill="currentColor" stroke="none" />
      </>
    ),
    camera: (
      <>
        <path d="M4 8h3l2-3h6l2 3h3v11H4V8z" />
        <circle cx="12" cy="13" r="3.4" />
      </>
    ),
    audio: (
      <>
        <path d="M4 10v4h3l5 4V6l-5 4H4z" />
        <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
      </>
    ),
    sliders: (
      <>
        <path d="M5 6h14M5 12h14M5 18h14" />
        <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
        <circle cx="8" cy="18" r="2" fill="currentColor" stroke="none" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-brand"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

const TILES = [
  { icon: "scan", title: "Verify in 2-5 seconds", body: "Our AI studies your face across several frames in a blink, and three of them must agree before anyone gets in. Across 1.28M+ walk-ups, one blurry glance has never flipped a result.", span: 2 },
  { icon: "shield", title: "Photos don't pass", body: "Five independent AI checks stand guard: flat-photo detection, a custom AI liveness model, a flash light challenge, gestures and even heartbeat verification. 248,000+ attempts blocked, zero passes.", span: 2 },
  { icon: "cloud", title: "Roster + logs, live", body: "A secure cloud dashboard refreshes every 60 s with the full 12,847-person roster: every record delivered exactly once, never duplicated, safe even offline.", span: 2 },
  { icon: "heal", title: "Fails, then fixes itself", body: "Camera hiccup? The kiosk quietly heals itself in 2-30 seconds and switches to a backup camera on its own. No operator, no ticket, no downtime.", span: 2 },
  { icon: "offline", title: "Never loses a record", body: "Network down? A built-in queue holds every single event with zero data loss and backfills the moment the link returns. 618 days, zero records lost.", span: 2 },
  { icon: "camera", title: "Proof on file", body: "Every verification files timestamped photographic evidence, one click away from the log entry. 1.28M+ audit trails and counting.", span: 2 },
  { icon: "audio", title: "Heard, not watched", body: "Randomized audio cues confirm every event to operators and members alike. Nobody watches a screen, everybody knows it worked.", span: 3 },
  { icon: "sliders", title: "Tuned on site", body: "Light and dark kiosk themes, sensitivity tuning and live camera health checks, all from one simple operator panel.", span: 3 },
];

function Tile({ tile, index }: { tile: (typeof TILES)[number]; index: number }) {
  const tiltRef = useSpotlightTilt<HTMLDivElement>(5);
  return (
    <div className={`bento-cell ${tile.span === 3 ? "lg:col-span-3" : "lg:col-span-2"}`}>
      {/* bento-motion carries the scrubbed enter/exit + drift transforms so the
          tilt on the glass tile never fights them for the transform */}
      <div className="bento-motion h-full will-change-transform" data-motion="">
        <div
          ref={tiltRef}
          className="spotlight-tile glass group h-full rounded-2xl p-7 transition-transform duration-300 will-change-transform active:scale-[0.99]"
        >
          <div
            className="icon-float mb-5 inline-flex rounded-xl border border-brand/20 bg-brand/5 p-2.5 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
            style={{ animationDelay: `${(index % 5) * 0.85}s` }}
          >
            <Icon name={tile.icon} />
          </div>
          <h3 className="font-display text-lg font-semibold text-fg">{tile.title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{tile.body}</p>
        </div>
      </div>
    </div>
  );
}

export function Features() {
  const gridRef = useRef<HTMLDivElement>(null);
  useVelocitySkew(".bento-cell", 4);

  // Scroll lifecycle for the whole grid, driven by one scrub so it stays
  // coherent and reverses when scrolling back: cards enter with a stagger,
  // hold while on screen, then exit upward as the section scrolls away.
  // A checkerboard drift between neighboring cells and a scanning light that
  // sweeps down the grid add motion while the cards are holding.
  useIsomorphicLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid
      .querySelectorAll<HTMLElement>(".bento-motion")
      .forEach((el) => el.removeAttribute("data-motion"));
    if (prefersReducedMotion()) return;

    const small = isSmallViewport();
    const enterY = small ? 48 : 84;
    const drift = small ? 2.2 : 3.4;
    const cells = gsap.utils.toArray<HTMLElement>(".bento-cell", grid);
    const cards = cells
      .map((c) => c.querySelector<HTMLElement>(".bento-motion"))
      .filter((c): c is HTMLElement => !!c);
    const scan = grid.querySelector<HTMLElement>(".bento-scan");
    const PASS_END = 1.21; // timeline length the scrub maps the scroll range onto

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power1.out" },
        scrollTrigger: {
          trigger: grid,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      // staggered entrance: rise + settle as each card scrolls into view
      cards.forEach((card, i) => {
        tl.fromTo(
          card,
          { autoAlpha: 0, y: enterY, scale: 0.965 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.18 },
          i * 0.035,
        );
      });

      // staggered exit: cards lift away as the section scrolls out
      cards.forEach((card, i) => {
        tl.to(
          card,
          { autoAlpha: 0, y: -enterY * 0.75, scale: 0.97, duration: 0.18, ease: "power1.in" },
          0.82 + i * 0.03,
        );
      });

      // scanning light sweeps down the grid across the whole pass
      if (scan) {
        tl.fromTo(
          scan,
          { y: -160 },
          { y: () => grid.offsetHeight + 160, duration: PASS_END, ease: "none" },
          0,
        );
        tl.fromTo(scan, { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.04);
        tl.to(scan, { opacity: 0, duration: 0.12 }, PASS_END - 0.14);
      }

      // checkerboard depth drift: neighboring cells counter-move while holding
      cells.forEach((cell, i) => {
        const odd = i % 2 === 1;
        gsap.fromTo(
          cell,
          { yPercent: odd ? drift : -drift },
          {
            yPercent: odd ? -drift : drift,
            ease: "none",
            scrollTrigger: {
              trigger: grid,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              invalidateOnRefresh: true,
            },
          },
        );
      });
    }, grid);
    return () => ctx.revert();
  }, []);

  return (
    <section id="features" className="relative mx-auto w-full max-w-7xl px-6 py-28 lg:px-10 lg:py-36">
      <Reveal>
        <p className="hud-label mb-4 text-brand">Features</p>
      </Reveal>
      <SplitReveal as="h2" className="heading-gradient max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
        Everything a walk-up kiosk has to get right.
      </SplitReveal>
      <Reveal delay={0.1}>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
          Recognition is the easy part. FacePass also ships the hard parts:
          liveness, sync, recovery and the operator experience, all hardened
          across 618 days of real mornings.
        </p>
      </Reveal>
      <div ref={gridRef} className="relative mt-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {TILES.map((tile, i) => (
            <Tile key={tile.title} tile={tile} index={i} />
          ))}
        </div>
        {/* scan-light overlay: clipped so the sweeping glow never paints
            outside the grid while the cards move */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <div className="bento-scan absolute inset-x-8 top-0 h-28 rounded-full bg-gradient-to-b from-transparent via-brand/15 to-transparent opacity-0 blur-2xl" />
        </div>
      </div>
    </section>
  );
}
