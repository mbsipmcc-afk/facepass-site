"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/device";

/* Shared handle so other components (mobile menu) can pause/resume scrolling. */
export const lenisRef: { current: Lenis | null } = { current: null };

export function lockScroll(lock: boolean) {
  if (lenisRef.current) {
    if (lock) lenisRef.current.stop();
    else lenisRef.current.start();
  } else {
    // reduced-motion path has no Lenis - fall back to native overflow lock
    document.body.style.overflow = lock ? "hidden" : "";
  }
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    // reveal targets are gated pre-hydration (see layout.tsx / globals.css);
    // all layout effects have committed by now, so the gate can be lifted
    document.documentElement.classList.remove("motion-pending");
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({ lerp: 0.11 });
    lenisRef.current = lenis;
    // QA handle: lets test tooling scroll through the Lenis instance
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    // QA handle: trigger introspection for animation verification tooling
    (window as unknown as { __st?: typeof ScrollTrigger }).__st = ScrollTrigger;
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // web fonts change line counts (and therefore page height + SplitText
    // masks) - re-measure every trigger once they settle
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    // anchor links inside the page go through Lenis so easing stays consistent
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -16 });
    };
    document.addEventListener("click", onClick);

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    // Layout can also change WITHOUT a resize event (late font swaps, dynamic
    // content, embedded webviews with odd viewport behavior). Keep triggers
    // calibrated by watching the document height itself. Debounced so bursts
    // of layout changes only refresh once.
    let lastH = document.documentElement.offsetHeight;
    let roTimer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      const h = document.documentElement.offsetHeight;
      if (Math.abs(h - lastH) < 2) return;
      lastH = h;
      clearTimeout(roTimer);
      roTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
    });
    ro.observe(document.documentElement);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      clearTimeout(roTimer);
      gsap.ticker.remove(raf);
      lenisRef.current = null;
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
