"use client";

import Image from "next/image";
import { useRef } from "react";
import { attendance, roster } from "@/lib/demo-data";
import { Marquee, Reveal, SplitReveal, useIsomorphicLayoutEffect } from "@/components/motion";
import { LivingBackdrop } from "@/components/living-backdrop";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/device";

const BADGES = [
  { label: "60 s sync", tone: "text-brand border-brand/30 bg-brand/5" },
  { label: "every record delivered once", tone: "text-verify border-verify/30 bg-verify/5" },
  { label: "secure, de-duplicated uploads", tone: "text-violet border-violet/30 bg-violet/5" },
  { label: "offline-safe queue", tone: "text-amber border-amber/30 bg-amber/5" },
];

const SYNC_TONE: Record<string, string> = {
  synced: "text-verify",
  queued: "text-amber",
};

const ROSTER_TONE: Record<string, string> = {
  verify: "text-verify",
  brand: "text-brand",
  violet: "text-violet",
  amber: "text-amber",
};

/* Synthetic evidence snapshots - AI-generated faces, no real people.
   Times/confidence mirror the attendance log rows above. */
const EVIDENCE = [
  { src: "/images/member-1.webp", name: "S. Okonkwo", time: "07:58:41", conf: "97%" },
  { src: "/images/member-2.webp", name: "R. Tanaka", time: "08:00:19", conf: "96%" },
  { src: "/images/member-3.webp", name: "M. Haddad", time: "08:01:02", conf: "98%" },
  { src: "/images/member-4.webp", name: "D. Marchetti", time: "08:04:10", conf: "97%" },
];

export function Dashboard() {
  const rowsRef = useRef<HTMLTableSectionElement>(null);
  const rosterRef = useRef<HTMLUListElement>(null);

  // rows and roster cards cascade in as their panels scroll into view
  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const rows = rowsRef.current?.querySelectorAll("tr");
      if (rows?.length) {
        gsap.fromTo(
          rows,
          { autoAlpha: 0, y: 12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.07,
            scrollTrigger: { trigger: rowsRef.current, start: "top 88%", once: true },
          },
        );
      }
      const cards = rosterRef.current?.children;
      if (cards?.length) {
        gsap.fromTo(
          cards,
          { autoAlpha: 0, scale: 0.94, y: 10 },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.05,
            scrollTrigger: { trigger: rosterRef.current, start: "top 90%", once: true },
          },
        );
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <section id="dashboard" className="relative isolate mx-auto w-full max-w-7xl px-6 py-28 lg:px-10 lg:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <LivingBackdrop
          src="/images/cloud-sync.jpg"
          imageClass="opacity-25"
          glowColor="rgba(139, 92, 246, 0.09)"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/55 to-ink" />
        {/* violet ambience - lives inside the clipped backdrop so its 720px
            width never extends the mobile layout viewport */}
        <div className="absolute left-1/2 top-24 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet/8 blur-[120px]" />
      </div>
      <Reveal>
        <p className="hud-label mb-4 text-violet">Cloud admin</p>
      </Reveal>
      <SplitReveal as="h2" className="heading-gradient max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
        The campus sees every clock-in, live.
      </SplitReveal>
      <Reveal delay={0.1}>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
          Every one of those 1.28M+ verifications lands in a super-secured
          cloud admin dashboard: attendance logs, the full roster and
          photographic evidence, refreshed every 60 seconds. If the link drops,
          the kiosk keeps queueing and backfills when it returns. Zero records
          lost in 618 days. Nothing is ever sent twice.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-8 flex flex-wrap gap-2.5">
          {BADGES.map((b) => (
            <span key={b.label} className={`rounded-full border px-3.5 py-1.5 font-mono text-xs tracking-wider ${b.tone}`}>
              {b.label}
            </span>
          ))}
        </div>
      </Reveal>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {/* attendance log — min-w-0 keeps the 560px table from blowing the
            single-column mobile grid past the viewport */}
        <Reveal clip className="min-w-0 lg:col-span-2">
          <div className="glass overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-fg/8 px-6 py-4">
              <h3 className="font-mono text-xs tracking-widest text-fg-muted">attendance_logs</h3>
              <span className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-verify">
                <span className="inline-block h-1.5 w-1.5 animate-blink rounded-full bg-verify" />
                LIVE · SYNCED 12 s AGO
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-widest text-fg-faint">
                    <th scope="col" className="px-6 py-3 font-normal">Time</th>
                    <th scope="col" className="px-4 py-3 font-normal">Member</th>
                    <th scope="col" className="px-4 py-3 font-normal">Result</th>
                    <th scope="col" className="px-4 py-3 font-normal">Conf</th>
                    <th scope="col" className="px-4 py-3 font-normal">Latency</th>
                    <th scope="col" className="px-6 py-3 font-normal">Sync</th>
                  </tr>
                </thead>
                <tbody ref={rowsRef} className="font-mono text-[13px]">
                  {attendance.map((row) => (
                    <tr key={row.time + row.member} className="border-t border-fg/5 transition-colors hover:bg-fg/[0.03]">
                      <td className="px-6 py-3 text-fg-muted">{row.time}</td>
                      <td className="px-4 py-3">
                        <span className="text-fg">{row.name}</span>
                        <span className="ml-2 text-fg-faint">{row.member}</span>
                      </td>
                      <td className={`px-4 py-3 ${row.result === "VERIFIED" ? "text-verify" : "text-alert"}`}>
                        {row.result}
                      </td>
                      <td className="px-4 py-3 text-fg-muted">{row.conf}</td>
                      <td className="px-4 py-3 text-fg-muted">{row.latency}</td>
                      <td className={`px-6 py-3 ${SYNC_TONE[row.sync] ?? "text-fg-muted"}`}>{row.sync}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* roster */}
        <Reveal delay={0.08} className="min-w-0">
          <div className="glass overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-fg/8 px-6 py-4">
              <h3 className="font-mono text-xs tracking-widest text-fg-muted">members roster</h3>
              <span className="font-mono text-[11px] tracking-widest text-fg-faint">12,847 ENROLLED</span>
            </div>
            <ul ref={rosterRef} className="grid grid-cols-2 gap-2 p-4">
              {roster.map((m) => (
                <li key={m.id} className="rounded-xl border border-fg/8 bg-panel-2/60 p-3 transition-colors hover:border-fg/20">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/25 bg-brand/10 font-mono text-[11px] text-brand">
                      {m.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-fg">{m.name}</div>
                      <div className="font-mono text-[11px] text-fg-faint">{m.id}</div>
                    </div>
                  </div>
                  <div className={`mt-2.5 font-mono text-[10px] uppercase tracking-widest ${ROSTER_TONE[m.tone] ?? "text-fg-muted"}`}>
                    ● {m.status}
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-fg/8 px-6 py-3">
              <span className="font-mono text-[11px] tracking-widest text-fg-faint">
                SYNTHETIC DEMO DATA · NO REAL PEOPLE
              </span>
            </div>
          </div>
        </Reveal>
      </div>

      {/* verification evidence - synthetic faces, auto-scrolling strip */}
      <Reveal delay={0.05} className="mt-6">
        <div className="glass overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-fg/8 px-6 py-4">
            <h3 className="font-mono text-xs tracking-widest text-fg-muted">verification_evidence</h3>
            <span className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-verify">
              <span className="inline-block h-1.5 w-1.5 animate-blink rounded-full bg-verify" />
              ONE CLICK FROM THE LOG
            </span>
          </div>
          <Marquee className="py-5">
            {EVIDENCE.map((e) => (
              <figure
                key={e.name}
                className="flex shrink-0 items-center gap-3 rounded-2xl border border-fg/8 bg-panel-2/60 p-3 pr-5"
              >
                <Image
                  src={e.src}
                  alt={`Synthetic evidence snapshot of member ${e.name}`}
                  width={96}
                  height={96}
                  className="h-16 w-16 rounded-xl border border-fg/10 object-cover"
                />
                <figcaption>
                  <div className="text-[13px] font-medium text-fg">{e.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] tracking-widest text-fg-faint">
                    {e.time} · CONF {e.conf}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] tracking-widest text-verify">
                    ✓ VERIFIED · EVIDENCE +1
                  </div>
                </figcaption>
              </figure>
            ))}
          </Marquee>
          <div className="border-t border-fg/8 px-6 py-3">
            <span className="font-mono text-[11px] tracking-widest text-fg-faint">
              SYNTHETIC FACES · AI-GENERATED · NO REAL PEOPLE
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
