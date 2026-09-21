import { Nav } from "@/components/nav";
import { Story } from "@/components/story";
import { MetricsBand } from "@/components/sections/metrics";
import { Features } from "@/components/sections/features";
import { InTheWild } from "@/components/sections/in-the-wild";
import { Security } from "@/components/sections/security";
import { Dashboard } from "@/components/sections/dashboard";
import { Reliability } from "@/components/sections/reliability";
import { CTA, TechMarquee } from "@/components/sections/cta";
import { Footer } from "@/components/footer";
import { SmoothScroll } from "@/components/smooth-scroll";
import { CursorDot } from "@/components/cursor";
import { ScrollProgress } from "@/components/motion";

export default function Home() {
  return (
    <SmoothScroll>
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <CursorDot />
      <Nav />
      <main className="relative">
        {/* the WebGL scrollytelling story: hero → pipeline → anti-spoof gauntlet */}
        <Story />
        {/* DOM sections below the story */}
        <div className="relative z-10 bg-ink">
          <MetricsBand />
          <Features />
          <InTheWild />
          <Security />
          <Dashboard />
          <Reliability />
          <TechMarquee />
          <CTA />
        </div>
      </main>
      <Footer />
    </SmoothScroll>
  );
}
