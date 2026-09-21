"use client";

/* Turns a still backdrop image into "living footage" for sections that were
   designed around Higgsfield b-roll: the still keeps its slow Ken-Burns drift
   while three transform/opacity-only layers add depth - a scroll-scrubbed
   counter-drift, a lerped pointer parallax on fine pointers, and a soft light
   sheen sweeping across every ~13s, plus a breathing accent glow.
   Reduced motion or low power → a single static layer, nothing runs. */

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useIsomorphicLayoutEffect } from "@/components/motion";
import { isFinePointer, isLowPower, prefersReducedMotion } from "@/lib/device";

export function LivingBackdrop({
  src,
  className = "",
  imageClass = "",
  glowColor,
}: {
  src: string;
  className?: string;
  imageClass?: string;
  glowColor?: string;
}) {
  const driftRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion() || isLowPower()) return;
    const drift = driftRef.current;
    const pointer = pointerRef.current;
    if (!drift || !pointer) return;

    const ctx = gsap.context(() => {
      // scroll-scrubbed counter-drift: the backdrop sinks slightly against
      // the page scroll so the section reads as a video plate, not a poster
      gsap.fromTo(
        drift,
        { yPercent: -2.4 },
        {
          yPercent: 2.4,
          ease: "none",
          scrollTrigger: {
            trigger: drift.parentElement ?? drift,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        },
      );
    }, drift);

    let cleanup: (() => void) | undefined;
    if (isFinePointer()) {
      // lerped pointer parallax, driven from quickTo so it never fights the
      // scrub (different element owns each transform)
      const xTo = gsap.quickTo(pointer, "x", { duration: 1.1, ease: "power2.out" });
      const yTo = gsap.quickTo(pointer, "y", { duration: 1.1, ease: "power2.out" });
      const onMove = (e: PointerEvent) => {
        xTo((e.clientX / window.innerWidth - 0.5) * -14);
        yTo((e.clientY / window.innerHeight - 0.5) * -10);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        gsap.killTweensOf(pointer);
      };
    }

    return () => {
      cleanup?.();
      ctx.revert();
    };
  }, []);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div ref={driftRef} className="absolute inset-[-8%] will-change-transform">
        <div ref={pointerRef} className="h-full w-full will-change-transform">
          {/* the CSS ken-burns owns this element's transform */}
          <div
            className={`animate-ken-burns h-full w-full bg-cover bg-center ${imageClass}`}
            style={{ backgroundImage: `url('${src}')` }}
          />
        </div>
      </div>
      {/* light sheen sweeping across, like a reflection passing over footage */}
      <div className="animate-sheen absolute inset-y-[-20%] left-0 w-[200%] will-change-transform bg-gradient-to-r from-transparent via-white/7 to-transparent" />
      {glowColor ? (
        <div
          className="animate-breathe absolute inset-0 will-change-auto"
          style={{
            background: `radial-gradient(56% 48% at 50% 46%, ${glowColor}, transparent 74%)`,
          }}
        />
      ) : null}
    </div>
  );
}
