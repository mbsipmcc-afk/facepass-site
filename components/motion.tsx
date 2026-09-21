"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { isCoarsePointer, isFinePointer, isLowPower, isSmallViewport, prefersReducedMotion } from "@/lib/device";

/* Runs before browser paint on the client so reveal targets are hidden (and
   SplitText is applied) before the first post-hydration frame - no flash. */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* Masked line- or char-level headline reveal (SplitText, free in gsap 3.13+). */
export function SplitReveal({
  children,
  as: Tag = "h2",
  className,
  delay = 0,
  immediate = false,
  split = "lines",
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  immediate?: boolean;
  split?: "lines" | "chars";
}) {
  const ref = useRef<HTMLElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TagComp = Tag as any;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // lift the pre-hydration gate (see globals.css .motion-pending) before
    // anything reads it - the masked lines are already hidden at this point
    el.removeAttribute("data-motion");
    if (prefersReducedMotion()) return;

    const splitType = split === "chars" ? "chars,words" : "lines";
    const splitInst = SplitText.create(el, {
      type: splitType,
      mask: split === "chars" ? "chars" : "lines",
      autoSplit: true,
      ...(split === "chars" ? { charsClass: "split-char" } : { linesClass: "split-line" }),
    });
    const targets = split === "chars" ? splitInst.chars : splitInst.lines;
    const tween = gsap.fromTo(
      targets,
      { yPercent: 115 },
      {
        yPercent: 0,
        duration: split === "chars" ? 0.85 : 1.05,
        ease: "power4.out",
        delay,
        stagger: split === "chars" ? 0.018 : 0.08,
        ...(immediate
          ? {}
          : {
              scrollTrigger: { trigger: el, start: "top 82%", once: true },
            }),
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      splitInst.revert();
    };
  }, [delay, immediate, split]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <TagComp ref={ref as any} className={className} data-motion="">
      {children}
    </TagComp>
  );
}

/* Generic scroll reveal - transform/opacity (+ optional clip-path / blur),
   animates once. Blur costs GPU time, so it is skipped on low-power devices. */
export function Reveal({
  children,
  className,
  delay = 0,
  clip = false,
  blur = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  clip?: boolean;
  blur?: boolean;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TagComp = Tag as any;
  const useBlur = blur && !isLowPower();

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.removeAttribute("data-motion");
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        {
          autoAlpha: 0,
          y: 36,
          ...(clip ? { clipPath: "inset(10% 0% 10% 0%)" } : {}),
          ...(useBlur ? { filter: "blur(12px)" } : {}),
        },
        {
          autoAlpha: 1,
          y: 0,
          ...(clip ? { clipPath: "inset(0% 0% 0% 0%)" } : {}),
          ...(useBlur ? { filter: "blur(0px)" } : {}),
          duration: 0.95,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        },
      );
    });
    return () => ctx.revert();
  }, [delay, clip, useBlur]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <TagComp ref={ref as any} className={className} data-motion="">
      {children}
    </TagComp>
  );
}

/* Staggered children reveal - each direct element child slides in sequence
   when the group scrolls into view. The wrapper carries the data-motion gate;
   children are animated individually for the cascade. */
export function StaggerGroup({
  children,
  className,
  as: Tag = "div",
  stagger = 0.07,
  y = 22,
  start = "top 85%",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  stagger?: number;
  y?: number;
  start?: string;
  [key: string]: unknown;
}) {
  const ref = useRef<HTMLElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const TagComp = Tag as any;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.removeAttribute("data-motion");
    if (prefersReducedMotion()) return;
    const kids = Array.from(el.children).filter(
      (c): c is HTMLElement => c instanceof HTMLElement,
    );
    if (kids.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        kids,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger,
          scrollTrigger: { trigger: el, start, once: true },
        },
      );
    });
    return () => ctx.revert();
  }, [stagger, y, start]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <TagComp ref={ref as any} className={className} data-motion="" {...rest}>
      {children}
    </TagComp>
  );
}

/* Thin scroll-progress line pinned to the top of the viewport.
   Scroll-linked (not autonomous), so it stays honest under reduced motion. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "scaleX(0)";
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        el.style.transform = `scaleX(${self.progress})`;
      },
    });
    return () => st.kill();
  }, []);

  return <div ref={ref} aria-hidden className="scroll-progress" />;
}

/* Count-up number that starts when scrolled into view. */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  duration = 1.8,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // render the final value (SSR / no-JS / reduced-motion all show real numbers);
  // full motion resets to 0 pre-paint and counts up when scrolled into view
  const final = `${prefix}${to.toLocaleString("en-US")}${suffix}`;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (n: number) =>
      n >= 1000 ? Math.round(n).toLocaleString("en-US") : Math.round(n).toString();
    if (prefersReducedMotion()) return;
    const state = { v: 0 };
    el.textContent = `${prefix}${fmt(0)}${suffix}`;
    const tween = gsap.to(state, {
      v: to,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = `${prefix}${fmt(state.v)}${suffix}`;
      },
      scrollTrigger: { trigger: el, start: "top 96%", once: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [to, suffix, prefix, duration]);

  return (
    <span ref={ref} className={className} aria-label={final}>
      {final}
    </span>
  );
}

/* Magnetic hover wrapper (desktop / fine pointers only). */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !isFinePointer() || prefersReducedMotion()) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      xTo((e.clientX - (rect.left + rect.width / 2)) * strength);
      yTo((e.clientY - (rect.top + rect.height / 2)) * strength);
    };
    const onLeave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);

  return (
    <span ref={ref} className={className} style={{ display: "inline-block" }}>
      {children}
    </span>
  );
}

/* Infinite marquee (pure CSS animation, duplicated track aria-hidden). */
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`group relative overflow-hidden ${className ?? ""}`} role="presentation">
      <div className="flex w-max animate-marquee gap-3 pr-3 group-hover:[animation-play-state:paused]">
        <div className="flex shrink-0 gap-3">{children}</div>
        <div className="flex shrink-0 gap-3" aria-hidden>
          {children}
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink to-transparent"
      />
    </div>
  );
}

/* Spotlight + tilt hover behavior for bento tiles. */
export function useSpotlightTilt<T extends HTMLElement>(maxTilt = 6) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !isFinePointer() || prefersReducedMotion()) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
      el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * maxTilt}deg) rotateY(${(px - 0.5) * maxTilt}deg) translateZ(0)`;
    };
    const onLeave = () => {
      el.style.transform = "";
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [maxTilt]);

  return ref;
}

export function styleVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

/* Scroll-scrubbed vertical drift for media inside an overflow-hidden frame.
   Pair with a ~1.1 scale on the child so the frame edges stay covered. */
export function Parallax({
  children,
  className,
  amount = 5,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    // full-bleed parallax reads as motion sickness on phones - halve the travel
    const amt = isSmallViewport() ? amount * 0.45 : amount;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: -amt },
        {
          yPercent: amt,
          ease: "none",
          scrollTrigger: {
            trigger: el.parentElement ?? el,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        },
      );
    });
    return () => ctx.revert();
  }, [amount]);

  return (
    <div ref={ref} className={className} style={{ willChange: "transform" }}>
      {children}
    </div>
  );
}

/* Scroll-velocity skew (transform-only) - elements lean while the page scrolls fast.
   Fine-pointer only: momentum scrolling on touch makes velocity spike erratically.
   Only escalates while velocity is high, then always decays back to 0 so a hard
   scroll stop can't leave a stuck lean. */
export function useVelocitySkew(selector: string, max = 5) {
  useEffect(() => {
    if (prefersReducedMotion() || isCoarsePointer()) return;
    const els = gsap.utils.toArray<HTMLElement>(selector);
    if (els.length === 0) return;
    const clamp = gsap.utils.clamp(-max, max);
    const proxy = { skew: 0 };
    const apply = () => {
      for (const el of els) gsap.set(el, { skewY: proxy.skew });
    };
    const st = ScrollTrigger.create({
      onUpdate: (self) => {
        const skew = clamp(self.getVelocity() / -400);
        if (Math.abs(skew) > Math.abs(proxy.skew)) {
          proxy.skew = skew;
          gsap.to(proxy, {
            skew: 0,
            duration: 0.8,
            ease: "power3.out",
            overwrite: true,
            onUpdate: apply,
          });
        }
      },
    });
    return () => {
      st.kill();
      gsap.killTweensOf(proxy);
      for (const el of els) gsap.set(el, { skewY: 0 });
    };
  }, [selector, max]);
}
