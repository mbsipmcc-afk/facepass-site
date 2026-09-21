"use client";

import { useEffect, useRef } from "react";
import { CountUp, Reveal, SplitReveal, StaggerGroup, useIsomorphicLayoutEffect } from "@/components/motion";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/device";

const BACKOFF = [2, 5, 10, 20, 30];

const LOG_LINES = [
  { t: "07:41:02", lvl: "INF", msg: "camera.probe    delivered=1920x1080 @59.9 fps (target met)" },
  { t: "07:41:02", lvl: "INF", msg: "ai.engine       custom-vision model ready ~22 ms/frame @720p" },
  { t: "07:58:41", lvl: "INF", msg: "verify.ok       member=MP-0142 conf=0.97 vote=3/4 evidence=+1" },
  { t: "08:12:19", lvl: "WRN", msg: "camera.stall    dropped-frames>threshold → entering recovery" },
  { t: "08:12:21", lvl: "INF", msg: "camera.recover  attempt=2 backoff=5s → delivered fps nominal" },
  { t: "08:12:30", lvl: "INF", msg: "sync.push       batch=14 secure-checksum ok dedup=exactly-once" },
];

const SPECS = [
  ["Face detection", "Modern AI vision that locks onto your face in 20-30 milliseconds, even in a crowded lobby, even mid-stride"],
  ["Face signature", "Your face becomes a one-of-a-kind, encrypted private signature. Never a stored photo"],
  ["Recognition confidence", "97.4% average match confidence across 1.28M+ verifications. The AI must be certain before attendance logs"],
  ["Agreement check", "3 of 4 frames must agree before attendance is logged, so one noisy glance never flips a result"],
  ["Anti-spoofing AI", "Custom-built AI model. Live faces score 99%+; printed photos and screens score under 10%"],
  ["The engine", "A modern, super-secured AI engine with privacy-first design, proven across 618 days of production"],
];

function FpsMeter() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: 0.958,
        duration: 1.6,
        ease: "power3.out",
        transformOrigin: "left center",
        scrollTrigger: { trigger: bar, start: "top 88%", once: true },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-semibold text-fg">Delivered-FPS enforcement</h3>
        <span className="font-mono text-xs text-verify">59.9 fps nominal</span>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
        The kiosk probes what the camera actually delivers, not what the spec
        sheet promises, and enforces it every frame.
      </p>
      <div className="relative mt-6 h-3 overflow-hidden rounded-full bg-ink" role="img" aria-label="Delivered frame rate meter at 59.9 of 60 fps">
        <div
          ref={barRef}
          className="h-full w-full rounded-full bg-gradient-to-r from-brand to-verify"
          style={{ transform: "scaleX(0.958)", transformOrigin: "left center" }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[11px] tracking-widest text-fg-faint">
        <span>BACKUP CAMERA</span>
        <span>4K @ 30</span>
        <span className="text-verify">1080p @ 60 ✓</span>
      </div>
    </div>
  );
}

export function Reliability() {
  const logRef = useRef<HTMLDivElement>(null);

  // kiosk log lines stream in one by one, like the terminal booting up
  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const el = logRef.current;
    if (!el) return;
    const lines = Array.from(el.children);
    if (lines.length === 0) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        lines,
        { autoAlpha: 0, x: -10 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.45,
          ease: "power2.out",
          stagger: 0.12,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        },
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <section id="reliability" className="relative mx-auto w-full max-w-7xl px-6 py-28 lg:px-10 lg:py-36">
      <Reveal>
        <p className="hud-label mb-4 text-amber">Reliability</p>
      </Reveal>
      <SplitReveal as="h2" className="heading-gradient max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
        Built to survive a campus, not a demo.
      </SplitReveal>
      <Reveal delay={0.1}>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
          618 consecutive days without a missed morning, at 99.98% uptime.
          Cameras fail, networks drop, processes crash. The kiosk expects all
          three and recovers on its own.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {/* self-healing backoff */}
        <Reveal className="lg:col-span-1">
          <div className="glass h-full rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-fg">Self-healing camera</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
              If the camera drops, the kiosk calmly retries (2 → 5 → 10 → 20 → 30 s),
              then switches to a backup camera automatically. Full recovery in
              2-30 seconds, unattended.
            </p>
            <div className="mt-6 flex flex-wrap gap-2" aria-hidden>
              {BACKOFF.map((s, i) => (
                <span
                  key={s}
                  className="animate-step rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 font-mono text-xs text-brand"
                  style={{ animationDelay: `${i * 1.5}s` }}
                >
                  {s}s
                </span>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-verify/25 bg-verify/5 px-4 py-3">
              <span className="text-verify">✓</span>
              <span className="text-sm text-fg">
                <CountUp to={1247} className="font-mono font-semibold text-verify" /> automated tests passing
              </span>
            </div>
          </div>
        </Reveal>

        {/* fps meter */}
        <Reveal delay={0.06}>
          <FpsMeter />
        </Reveal>

        {/* terminal */}
        <Reveal delay={0.12}>
          <div className="glass h-full overflow-hidden rounded-2xl">
            <div className="flex items-center gap-1.5 border-b border-fg/8 px-5 py-3.5">
              <span className="h-2.5 w-2.5 rounded-full bg-alert/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-verify/70" />
              <span className="ml-3 font-mono text-[11px] tracking-widest text-fg-faint">kiosk.log · rotated, structured</span>
            </div>
            <div ref={logRef} className="space-y-1.5 p-5 font-mono text-[12px] leading-relaxed">
              {LOG_LINES.map((l, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-fg-faint">{l.t}</span>
                  <span className={l.lvl === "WRN" ? "text-amber" : "text-brand"}>{l.lvl}</span>
                  <span className="text-fg-muted">{l.msg}</span>
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <span className="text-fg-faint">08:12:31</span>
                <span className="text-brand">INF</span>
                <span className="text-fg-muted">heartbeat ok</span>
                <span className="animate-blink text-fg">▌</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* spec table */}
      <Reveal className="mt-6">
        <StaggerGroup
          as="dl"
          stagger={0.08}
          y={14}
          className="glass grid gap-x-10 gap-y-4 rounded-2xl p-7 sm:grid-cols-2"
        >
          {SPECS.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1 border-b border-fg/5 pb-4 sm:border-b-0 sm:pb-0">
              <dt className="hud-label">{k}</dt>
              <dd className="text-[15px] leading-relaxed text-fg">{v}</dd>
            </div>
          ))}
        </StaggerGroup>
      </Reveal>
    </section>
  );
}
