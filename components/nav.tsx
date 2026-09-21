"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { BRAND } from "@/lib/brand";
import { Magnetic } from "@/components/motion";
import { lockScroll } from "@/components/smooth-scroll";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "Dashboard", href: "#dashboard" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

const menuList = {
  closed: {},
  open: { transition: { staggerChildren: 0.05, delayChildren: 0.06 } },
};
const menuItem = {
  closed: { opacity: 0, y: -12 },
  open: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export function LogoMark({ className }: { className?: string }) {
  const dots: Array<[number, number, number]> = [
    [22, 26, 2.6], [34, 16, 2.1], [44, 30, 2.9], [28, 44, 2.2],
    [42, 52, 2.4], [18, 62, 2.0], [34, 72, 2.7], [48, 66, 2.0],
    [58, 40, 2.2], [62, 58, 2.6], [52, 82, 2.1], [66, 74, 2.3],
  ];
  return (
    <svg
      viewBox="0 0 80 96"
      className={["logo-dots", className].filter(Boolean).join(" ")}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      {dots.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={i % 5 === 0 ? "#8b5cf6" : "#38e1ff"} opacity={0.5 + ((i * 7) % 5) / 10} />
      ))}
      <circle cx="40" cy="48" r="34" fill="none" stroke="#38e1ff" strokeOpacity="0.35" strokeWidth="1.5" />
    </svg>
  );
}

export function Nav() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const { scrollY } = useScroll();
  const sectionsRef = useRef<Array<{ href: string; el: HTMLElement }>>([]);

  // scroll-spy: measure the nav's target sections once, then on every scroll
  // tick pick the last one whose top has crossed the viewport's reading band
  // ("most recent section" semantics - matches one-page anchor expectations)
  const pickActive = () => {
    const band = window.innerHeight * 0.42;
    let current: string | null = null;
    for (const { href, el } of sectionsRef.current) {
      if (el.getBoundingClientRect().top <= band) current = href;
    }
    setActive((prev) => (prev === current ? prev : current));
  };

  useEffect(() => {
    sectionsRef.current = LINKS.map((l) => ({
      href: l.href,
      el: document.querySelector<HTMLElement>(l.href),
    })).filter((s): s is { href: string; el: HTMLElement } => !!s.el);
    pickActive();
    window.addEventListener("resize", pickActive);
    return () => window.removeEventListener("resize", pickActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hide while scrolling down past the hero, reveal on the first upward tick
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    pickActive();
    if (open) {
      setHidden(false);
      return;
    }
    setHidden(y > prev && y > 160);
  });

  // pause page scroll behind the mobile menu (Lenis stop keeps position intact)
  useEffect(() => {
    lockScroll(open);
    return () => {
      if (open) lockScroll(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <MotionConfig reducedMotion="user">
      <motion.header
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: hidden && !open ? "-110%" : 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="fixed inset-x-0 top-4 z-50 flex flex-col items-center px-4"
      >
        <nav
          aria-label="Primary"
          className={`glass flex w-full max-w-5xl items-center justify-between rounded-full py-2.5 pl-5 pr-2.5 transition-shadow duration-500 ${
            scrolled
              ? "shadow-[0_20px_56px_-16px_rgba(0,0,0,0.9)]"
              : "shadow-[0_16px_48px_-18px_rgba(0,0,0,0.75)]"
          }`}
        >
          <a href="#hero" className="flex items-center gap-2.5" aria-label={`${BRAND.name}, back to top`}>
            <LogoMark className="h-6 w-5" />
            <span className="font-display text-base font-semibold tracking-tight text-fg">
              {BRAND.name}
            </span>
          </a>
          <ul className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={active === l.href ? "true" : undefined}
                  data-active={active === l.href || undefined}
                  className={`link-underline text-sm transition-colors ${
                    active === l.href ? "text-brand" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Magnetic strength={0.25}>
              <a
                href="/coming-soon"
                className="btn-shine inline-flex items-center rounded-full bg-brand px-4.5 py-2 text-sm font-semibold text-ink shadow-[0_10px_28px_-12px_rgba(56,225,255,0.55)] transition hover:bg-brand-soft active:scale-[0.96]"
              >
                Request a demo
              </a>
            </Magnetic>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-fg/12 text-fg transition-colors hover:border-brand/50 hover:text-brand active:scale-95 md:hidden"
            >
              <span aria-hidden className="relative block h-3 w-[18px]">
                <motion.span
                  className="absolute left-0 top-0 block h-px w-full rounded-full bg-current"
                  animate={open ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                />
                <motion.span
                  className="absolute bottom-0 left-0 block h-px w-full rounded-full bg-current"
                  animate={open ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                />
              </span>
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.985 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="glass mt-2 w-full max-w-5xl rounded-3xl p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] md:hidden"
            >
              <motion.ul variants={menuList} initial="closed" animate="open" exit="closed" className="flex flex-col">
                {LINKS.map((l) => (
                  <motion.li key={l.href} variants={menuItem}>
                    <a
                      href={l.href}
                      aria-current={active === l.href ? "true" : undefined}
                      onClick={() => {
                        lockScroll(false);
                        setOpen(false);
                      }}
                      className={`block rounded-2xl px-4 py-3.5 text-base transition-colors ${
                        active === l.href
                          ? "bg-brand/8 text-brand"
                          : "text-fg-muted hover:bg-fg/5 hover:text-fg active:bg-fg/10"
                      }`}
                    >
                      {l.label}
                    </a>
                  </motion.li>
                ))}
              </motion.ul>
              <motion.div variants={menuItem} className="border-t border-fg/8 p-2 pt-3">
                <a
                  href="/coming-soon"
                  onClick={() => {
                    lockScroll(false);
                    setOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-ink shadow-[0_14px_44px_-14px_rgba(56,225,255,0.65)] transition active:scale-[0.97]"
                >
                  Request a demo <span aria-hidden>→</span>
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </MotionConfig>
  );
}
