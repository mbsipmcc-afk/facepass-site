"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { isFinePointer, prefersReducedMotion } from "@/lib/device";

/* Custom cursor: precision dot + elastic trailing ring (desktop / fine pointers only).
   The dot tracks the pointer near-instantly; the ring lags behind with a
   velocity-aware lerp so it stretches along its direction of motion, leans
   toward the center of whatever interactive element is hovered, and springs
   back on release. Elements may opt into a filled "bubble" state with a short
   label via data-cursor-text (keep labels under ~8 characters). */
export function CursorDot() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isFinePointer() || prefersReducedMotion()) return;
    const overlay = overlayRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!overlay || !dot || !ring || !label) return;

    document.body.dataset.cursor = "on";
    gsap.set(overlay, { autoAlpha: 0 });
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

    const dx = gsap.quickTo(dot, "x", { duration: 0.09, ease: "power2.out" });
    const dy = gsap.quickTo(dot, "y", { duration: 0.09, ease: "power2.out" });

    // ring state, driven by a single ticker so position, stretch and
    // hover scale never fight over the transform
    const ringState = { x: 0, y: 0, base: 1, stretch: 0, rot: 0 };
    let targetX = 0;
    let targetY = 0;
    let pullX = 0;
    let pullY = 0;
    let seen = false;
    let hovered: HTMLElement | null = null;
    let labelText: string | null = null;

    const setHover = (el: HTMLElement | null) => {
      if (el === hovered) return;
      hovered = el;
      const text = el?.getAttribute("data-cursor-text") ?? null;
      if (text !== labelText) {
        labelText = text;
        if (text) {
          label.textContent = text;
          ring.classList.add("is-label");
        } else {
          ring.classList.remove("is-label");
        }
      }
      gsap.to(ringState, {
        base: el && !text ? 1.9 : 1,
        duration: 0.35,
        ease: "power3.out",
        overwrite: "auto",
      });
      gsap.to(dot, {
        scale: text ? 0 : el ? 0.45 : 1,
        opacity: text ? 0 : 1,
        duration: 0.3,
        ease: "power3.out",
        overwrite: "auto",
      });
    };

    const tick = (_time: number, deltaMs: number) => {
      if (!seen) return;
      const dt = Math.min(deltaMs / 1000, 0.05) || 0.016;
      // frame-rate independent lag-lerp toward the (magnetically pulled) pointer
      const prevX = ringState.x;
      const prevY = ringState.y;
      ringState.x += (targetX + pullX - ringState.x) * (1 - Math.exp(-13 * dt));
      ringState.y += (targetY + pullY - ringState.y) * (1 - Math.exp(-13 * dt));
      // squash & stretch along the direction of travel
      const speed = Math.hypot(ringState.x - prevX, ringState.y - prevY) / dt;
      const targetStretch = Math.min(speed / 2400, 0.38);
      ringState.stretch += (targetStretch - ringState.stretch) * (1 - Math.exp(-10 * dt));
      if (speed > 30) ringState.rot = (Math.atan2(ringState.y - prevY, ringState.x - prevX) * 180) / Math.PI;
      gsap.set(ring, {
        x: ringState.x,
        y: ringState.y,
        rotation: ringState.stretch > 0.015 ? ringState.rot : 0,
        scaleX: ringState.base * (1 + ringState.stretch),
        scaleY: ringState.base * (1 - ringState.stretch * 0.55),
      });
    };

    const onMove = (e: PointerEvent) => {
      if (!seen) {
        seen = true;
        targetX = e.clientX;
        targetY = e.clientY;
        ringState.x = e.clientX;
        ringState.y = e.clientY;
        gsap.to(overlay, { autoAlpha: 1, duration: 0.3 });
      }
      targetX = e.clientX;
      targetY = e.clientY;
      dx(e.clientX);
      dy(e.clientY);
      // lean the ring toward the hovered element's center; read the live rect
      // because Magnetic may be translating the element under the pointer.
      // The pull is capped so a large target (e.g. a full-width card) can't
      // fling the ring across the screen.
      if (hovered?.isConnected) {
        const r = hovered.getBoundingClientRect();
        const ox = r.left + r.width / 2 - e.clientX;
        const oy = r.top + r.height / 2 - e.clientY;
        const len = Math.hypot(ox, oy) || 1;
        const mag = Math.min(len * 0.28, Math.min(Math.max(r.width, r.height) * 0.25, 44));
        pullX = (ox / len) * mag;
        pullY = (oy / len) * mag;
      } else {
        pullX = pullY = 0;
      }
    };

    const onOver = (e: PointerEvent) => {
      // [data-cursor]:not(body) - body carries our own "on" flag and must not
      // count as an interactive target
      const el = (e.target as HTMLElement).closest<HTMLElement>(
        "a, button, [role='button'], input, select, textarea, label, summary, [data-cursor]:not(body), [data-cursor-text]",
      );
      setHover(el);
    };

    const onDown = (e: PointerEvent) => {
      if (!seen) return;
      gsap.to(ringState, {
        base: Math.max(ringState.base * 0.72, 0.7),
        duration: 0.18,
        ease: "power2.out",
        overwrite: "auto",
      });
      const ripple = document.createElement("div");
      ripple.className = "cursor-ripple";
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      overlay.appendChild(ripple);
      gsap.fromTo(
        ripple,
        { scale: 0.35, opacity: 0.55 },
        { scale: 2.4, opacity: 0, duration: 0.55, ease: "power2.out", onComplete: () => ripple.remove() },
      );
    };

    const onUp = () => {
      gsap.to(ringState, {
        base: hovered && !labelText ? 1.9 : 1,
        duration: 0.45,
        ease: "elastic.out(1, 0.45)",
        overwrite: "auto",
      });
    };

    const onDocLeave = () => gsap.to(overlay, { autoAlpha: 0, duration: 0.25 });
    const onDocEnter = () => {
      if (seen) gsap.to(overlay, { autoAlpha: 1, duration: 0.25 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onDocLeave);
    document.documentElement.addEventListener("mouseenter", onDocEnter);
    gsap.ticker.add(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("mouseleave", onDocLeave);
      document.documentElement.removeEventListener("mouseenter", onDocEnter);
      gsap.ticker.remove(tick);
      gsap.killTweensOf(ringState);
      gsap.killTweensOf(dot);
      gsap.killTweensOf(overlay);
      overlay.querySelectorAll(".cursor-ripple").forEach((r) => r.remove());
      ring.classList.remove("is-label");
      delete document.body.dataset.cursor;
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90] hidden overflow-hidden [@media(pointer:fine)]:block"
    >
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-brand will-change-transform"
      />
      <div
        ref={ringRef}
        className="cursor-ring absolute left-0 top-0 flex items-center justify-center rounded-full border will-change-transform"
      >
        <span ref={labelRef} className="cursor-label" />
      </div>
    </div>
  );
}
