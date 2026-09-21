"use client";

import { useRef } from "react";
import { CountUp, useIsomorphicLayoutEffect } from "@/components/motion";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/device";

const METRICS: Array<{
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  note: string;
  display?: string;
}> = [
  { value: 1284509, label: "verifications completed", note: "and counting, every morning" },
  { value: 12847, label: "identities enrolled", note: "one campus roster" },
  { value: 618, label: "consecutive days", note: "live in production" },
  { value: 248119, label: "spoof attempts blocked", note: "not one got through" },
  { value: 1247, label: "automated tests", note: "green before every deploy" },
  // a range can't count up sensibly ("2-0 s"), so it renders settled
  { value: 5, suffix: " s", label: "to verify", note: "detect → match → verify", display: "2-5 s" },
];

export function MetricsBand() {
  const gridRef = useRef<HTMLDivElement>(null);

  // One scrubbed pass for the whole band, mirroring the features grid's
  // lifecycle: cells stagger in, hold with a faint checkerboard drift, then
  // lift away as the band scrolls out. Reverses on scroll-back.
  useIsomorphicLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid
      .querySelectorAll<HTMLElement>(".metric-motion")
      .forEach((el) => el.removeAttribute("data-motion"));
    if (prefersReducedMotion()) return;

    const cells = gsap.utils.toArray<HTMLElement>(".metric-motion", grid);
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

      // staggered entrance: rise + settle
      cells.forEach((cell, i) => {
        tl.fromTo(
          cell,
          { autoAlpha: 0, y: 26, scale: 0.985 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.16 },
          i * 0.03,
        );
      });

      // staggered exit: cells lift away as the band leaves
      cells.forEach((cell, i) => {
        tl.to(cell, { autoAlpha: 0, y: -20, duration: 0.14, ease: "power1.in" }, 0.88 + i * 0.02);
      });

      // checkerboard hold drift: neighboring cells counter-move; yPercent is a
      // separate transform channel from the timeline's y, so they compose
      cells.forEach((cell, i) => {
        const odd = i % 2 === 1;
        gsap.fromTo(
          cell,
          { yPercent: odd ? 1.4 : -1.4 },
          {
            yPercent: odd ? -1.4 : 1.4,
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
    <section aria-label="Production metrics" className="relative border-y border-fg/8 bg-panel/40">
      {/* ambient light pass sweeping the band, matching the living backdrops */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="animate-sheen absolute inset-y-[-20%] left-0 w-[200%] bg-gradient-to-r from-transparent via-white/5 to-transparent will-change-transform"
          style={{ animationDelay: "4s" }}
        />
      </div>
      <div
        ref={gridRef}
        className="mx-auto grid max-w-7xl grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-6"
      >
        {METRICS.map((m) => (
          <div
            key={m.label}
            className="px-6 py-10 text-center transition-colors duration-300 hover:bg-fg/[0.02] lg:py-12"
          >
            <div className="metric-motion will-change-transform" data-motion="">
              <div className="metric-value font-display text-3xl font-bold tracking-tight lg:text-4xl">
                {m.display ?? <CountUp to={m.value} suffix={m.suffix ?? ""} prefix={m.prefix ?? ""} />}
              </div>
              <div className="mt-2 text-sm font-medium text-fg-muted">{m.label}</div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-widest text-fg-faint">
                {m.note}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
