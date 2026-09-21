"use client";

import { BRAND } from "@/lib/brand";
import { Magnetic, Marquee, Reveal, SplitReveal, StaggerGroup } from "@/components/motion";
import { LivingBackdrop } from "@/components/living-backdrop";

const HIGHLIGHTS = [
  "Modern AI",
  "Custom AI Model",
  "Super-Secured AI",
  "Anti-Spoofing AI",
  "Real-Time Recognition",
  "Privacy-First Design",
  "Self-Healing Kiosk",
  "Liveness Detection",
  "Live Cloud Dashboard",
];

export function TechMarquee() {
  return (
    <section aria-label="Technology highlights" className="border-y border-fg/8 bg-panel/30 py-7">
      <Marquee>
        {HIGHLIGHTS.map((s) => (
          <span
            key={s}
            className="flex items-center whitespace-nowrap rounded-full border border-fg/10 bg-panel px-5 py-2.5 font-mono text-sm text-fg-muted"
          >
            {s}
          </span>
        ))}
      </Marquee>
    </section>
  );
}

export function CTA() {
  return (
    <section id="demo" className="relative overflow-hidden">
      {/* generated heartbeat-ring backdrop (Higgsfield, living-footage layered
          motion) + CSS pulse rings */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <LivingBackdrop
          src="/images/cta-ring.jpg"
          imageClass="opacity-30"
          glowColor="rgba(56, 225, 255, 0.10)"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/40 to-ink" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="animate-ring-pulse absolute h-[560px] w-[560px] rounded-full border border-brand/25" />
        <div className="animate-ring-pulse absolute h-[380px] w-[380px] rounded-full border border-brand/40" style={{ animationDelay: "1.3s" }} />
        <div className="animate-ring-pulse absolute h-[220px] w-[220px] rounded-full border border-verify/30" style={{ animationDelay: "2.6s" }} />
        <div className="absolute h-[560px] w-[560px] rounded-full bg-brand/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-36 text-center lg:py-48">
        <Reveal>
          <p className="hud-label mb-5 text-brand">Ready when you walk up</p>
        </Reveal>
        <SplitReveal as="h2" className="heading-gradient font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          See recognition in action.
        </SplitReveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">
            Book a walkthrough of {BRAND.name}. Live kiosk, cloud dashboard,
            and the numbers behind 1,284,509 verifications and 618 flawless
            mornings.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <StaggerGroup
            stagger={0.09}
            y={16}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Magnetic>
              <a
                href="/coming-soon"
                data-cursor-text="Say hi"
                className="btn-shine inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-sm font-semibold text-ink shadow-[0_16px_48px_-14px_rgba(56,225,255,0.65)] transition hover:bg-brand-soft active:scale-[0.97]"
              >
                Request a demo <span aria-hidden>→</span>
              </a>
            </Magnetic>
            <Magnetic>
              <a
                href="#reliability"
                className="inline-flex items-center rounded-full border border-fg/15 px-8 py-4 text-sm font-medium text-fg transition hover:border-brand/60 hover:text-brand active:scale-[0.97]"
              >
                View our reliability record
              </a>
            </Magnetic>
          </StaggerGroup>
        </Reveal>
      </div>
    </section>
  );
}
