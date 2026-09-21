"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  Parallax,
  useIsomorphicLayoutEffect,
  useSpotlightTilt,
} from "@/components/motion";
import { gsap } from "@/lib/gsap";
import { isSmallViewport, prefersReducedMotion } from "@/lib/device";

const MEDIA_NOTE = "AI-GENERATED · SYNTHETIC";

/* The caption card gets the bento tiles' spotlight hover (tilt disabled, only
   the light follows the pointer) so every glass card on the page reacts alike. */
function CaptionCard() {
  const ref = useSpotlightTilt<HTMLDivElement>(0);
  return (
    <div
      ref={ref}
      className="spotlight-tile glass flex h-full flex-col justify-center gap-4 rounded-3xl p-7 lg:p-8"
    >
      <p className="hud-label text-brand">Walk-up, not wall-up</p>
      <p className="max-w-xl text-[15px] leading-relaxed text-fg-muted">
        The terminal needs no queue, no badge and no trained staff.
        Members stop for the length of a glance, the four-frame agreement
        runs, and the log entry with its photographic evidence files
        itself in the cloud.
      </p>
      <div className="flex flex-wrap gap-2 font-mono text-[11px] tracking-widest text-fg-faint">
        <span className="rounded-full border border-fg/10 px-3 py-1.5">2000+ WALK-UPS / DAY</span>
        <span className="rounded-full border border-fg/10 px-3 py-1.5">2-5 s START TO FINISH</span>
        <span className="rounded-full border border-fg/10 px-3 py-1.5">ZERO TRAINING</span>
      </div>
    </div>
  );
}

export function InTheWild() {
  const gridRef = useRef<HTMLDivElement>(null);

  // Same scroll lifecycle as the features grid: one grid-level scrub drives
  // staggered entrances and exits for all four tiles (reverses on scroll-back).
  // The hold motion lives inside each tile - scroll parallax on the main
  // render, breathe-zoom on the two stills - so the channels never collide.
  useIsomorphicLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid
      .querySelectorAll<HTMLElement>(".wild-motion")
      .forEach((el) => el.removeAttribute("data-motion"));
    if (prefersReducedMotion()) return;

    const items = gsap.utils.toArray<HTMLElement>(".wild-motion", grid);
    const enterY = isSmallViewport() ? 40 : 72;
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
      items.forEach((item, i) => {
        tl.fromTo(
          item,
          { autoAlpha: 0, y: enterY, scale: 0.985 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.16 },
          i * 0.04,
        );
      });

      // staggered exit: tiles drift away as the grid scrolls out
      items.forEach((item, i) => {
        tl.to(
          item,
          { autoAlpha: 0, y: -enterY * 0.7, duration: 0.15, ease: "power1.in" },
          0.86 + i * 0.03,
        );
      });
    }, grid);
    return () => ctx.revert();
  }, []);

  return (
    <section aria-label="Kiosk in the wild" className="mx-auto w-full max-w-7xl px-6 lg:px-10">
      <div ref={gridRef} className="grid gap-4 lg:grid-cols-3">
        {/* main: the original concept render with scroll parallax */}
        <div className="wild-motion h-full will-change-transform lg:col-span-2" data-motion="">
          <figure className="group relative aspect-[16/9] overflow-hidden rounded-3xl border border-fg/10">
            <Parallax amount={5}>
              <Image
                src="/images/kiosk.jpg"
                alt="Concept render of a self-service kiosk terminal with a glowing screen in a bright campus lobby"
                width={1600}
                height={900}
                className="h-auto w-full scale-[1.12] transition-transform duration-700 group-hover:scale-[1.16]"
              />
            </Parallax>
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-ink/95 via-transparent to-transparent"
            />
            <figcaption className="absolute inset-x-0 bottom-0 p-6 lg:p-8">
              <p className="hud-label text-verify">In the wild</p>
              <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-fg-muted">
                A walk-up kiosk in a campus lobby. Members look, get verified,
                and keep walking, 2,000+ times every day. No card, no app,
                no queue.
              </p>
            </figcaption>
            <span className="absolute right-4 top-4 rounded-full border border-fg/15 bg-ink/70 px-3 py-1 font-mono text-[10px] tracking-widest text-fg-faint">
              CONCEPT RENDER · SYNTHETIC
            </span>
          </figure>
        </div>

        {/* the morning lobby moment, same kiosk design */}
        <div className="wild-motion h-full will-change-transform" data-motion="">
          <figure className="group relative aspect-[3/4] overflow-hidden rounded-3xl border border-fg/10 lg:aspect-auto lg:h-full">
            <div className="animate-breathe-zoom absolute inset-0 will-change-transform">
              <Image
                src="/images/kiosk-lobby.webp"
                alt="The FacePass kiosk standing between glass walls of a bright campus lobby in morning light"
                width={1024}
                height={576}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
            </div>
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent"
            />
            <figcaption className="absolute inset-x-0 bottom-0 p-5">
              <p className="hud-label text-brand">The morning lobby</p>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                Between 7 and 9 am, the flow never stops.
              </p>
            </figcaption>
            <span className="absolute right-4 top-4 rounded-full border border-fg/15 bg-ink/70 px-3 py-1 font-mono text-[10px] tracking-widest text-fg-faint">
              {MEDIA_NOTE}
            </span>
          </figure>
        </div>

        {/* the verify moment, screen closeup */}
        <div className="wild-motion h-full will-change-transform" data-motion="">
          <figure className="group relative aspect-[3/2] overflow-hidden rounded-3xl border border-fg/10 lg:aspect-auto lg:h-full">
            <div className="animate-breathe-zoom absolute inset-0 will-change-transform" style={{ animationDelay: "-5.5s" }}>
              <Image
                src="/images/kiosk-screen.webp"
                alt="Closeup of the kiosk display showing a cyan face-scan frame resolving into a green verification check"
                width={1024}
                height={683}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
            </div>
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent"
            />
            <figcaption className="absolute inset-x-0 bottom-0 p-5">
              <p className="hud-label text-verify">The verify moment</p>
              <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                Scan, agreement, green. About two seconds.
              </p>
            </figcaption>
            <span className="absolute right-4 top-4 rounded-full border border-fg/15 bg-ink/70 px-3 py-1 font-mono text-[10px] tracking-widest text-fg-faint">
              {MEDIA_NOTE}
            </span>
          </figure>
        </div>

        {/* caption card */}
        <div className="wild-motion h-full will-change-transform lg:col-span-2" data-motion="">
          <CaptionCard />
        </div>
      </div>
    </section>
  );
}
