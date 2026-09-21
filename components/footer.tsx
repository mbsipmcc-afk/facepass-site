import { BRAND } from "@/lib/brand";
import { LogoMark } from "@/components/nav";
import { Reveal } from "@/components/motion";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "Dashboard", href: "#dashboard" },
  { label: "Request a demo", href: `${BRAND.basePath}/coming-soon` },
];

export function Footer() {
  return (
    // z-10 + opaque bg: the fixed story canvas sits at z-0 and would otherwise
    // paint over the footer whenever its exit fade never ran (reduced motion)
    <footer className="relative z-10 border-t border-fg/8 bg-ink">
      {/* brand hairline echoing the scroll-progress line motif */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/35 to-transparent"
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-3 lg:px-10">
        <Reveal>
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-6 w-5" />
              <span className="font-display text-base font-semibold tracking-tight text-fg">{BRAND.name}</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-faint">
              {BRAND.tagline} A walk-up facial recognition kiosk, 1.28M+
              verifications strong, running in production at a private
              educational campus.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.06}>
          <nav aria-label="Footer">
            <p className="hud-label mb-4">Explore</p>
            <ul className="space-y-2.5">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="link-underline text-sm text-fg-muted transition-colors hover:text-fg">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Reveal>
        <Reveal delay={0.12}>
          <div>
            <p className="hud-label mb-4">Notice</p>
            <p className="text-sm leading-relaxed text-fg-muted">{BRAND.disclaimer}</p>
            <p className="mt-3 text-xs leading-relaxed text-fg-faint">
              All names, roster entries and log lines shown on this page are
              synthetic. This site is a placeholder product presence for
              &ldquo;{BRAND.name}&rdquo;.
            </p>
          </div>
        </Reveal>
      </div>
      <div className="border-t border-fg/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 sm:flex-row lg:px-10">
          <p className="font-mono text-[11px] tracking-wider text-fg-faint">
            © 2026 {BRAND.name} · {BRAND.email}
          </p>
          {/* href anchor goes through the shared Lenis click handler, so the
              ride back up is smooth like every other in-page jump */}
          <a
            href="#hero"
            data-cursor-text="Up"
            className="group inline-flex items-center gap-2 font-mono text-[11px] tracking-widest text-fg-faint transition-colors hover:text-brand"
          >
            BACK TO TOP
            <span
              aria-hidden
              className="inline-block transition-transform duration-300 group-hover:-translate-y-0.5"
            >
              ↑
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
