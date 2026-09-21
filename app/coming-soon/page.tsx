import type { Metadata } from "next";
import { LogoMark } from "@/components/nav";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND.name} | Demo coming soon`,
  description:
    "The FacePass live demo is almost ready. We are preparing a walkthrough of the kiosk and the cloud dashboard.",
  // Utility page, not part of the public marketing surface.
  robots: { index: false, follow: false },
};

export default function ComingSoon() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* ambient ring, echoing the CTA section's heartbeat motif */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="animate-ring-pulse absolute h-[520px] w-[520px] rounded-full border border-brand/20" />
        <div
          className="animate-ring-pulse absolute h-[340px] w-[340px] rounded-full border border-brand/35"
          style={{ animationDelay: "1.3s" }}
        />
        <div className="absolute h-[520px] w-[520px] rounded-full bg-brand/5 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center">
        <a href="/" className="rise-in flex items-center gap-2.5" aria-label={`${BRAND.name}, back to home`}>
          <LogoMark className="h-6 w-5" />
          <span className="font-display text-base font-semibold tracking-tight text-fg">{BRAND.name}</span>
        </a>
        <p className="rise-in hud-label mt-12 text-brand" style={{ animationDelay: "0.1s" }}>
          Request a demo
        </p>
        <h1 className="rise-in heading-gradient mt-4 max-w-2xl font-display text-5xl font-bold tracking-tight sm:text-6xl">
          Coming soon.
        </h1>
        <p
          className="rise-in mt-5 max-w-md text-lg leading-relaxed text-fg-muted"
          style={{ animationDelay: "0.2s" }}
        >
          We are preparing a live walkthrough of the kiosk and the cloud
          dashboard. Check back soon.
        </p>
        <a
          href="/"
          className="rise-in btn-shine mt-9 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-ink shadow-[0_14px_44px_-14px_rgba(56,225,255,0.65)] transition hover:bg-brand-soft active:scale-[0.97]"
          style={{ animationDelay: "0.3s" }}
        >
          Back to home <span aria-hidden>←</span>
        </a>
      </div>
    </main>
  );
}
