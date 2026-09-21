export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  // QA override: ?motion=full forces the full scrollytelling path in browsers
  // whose OS reports reduced motion (documented in README).
  if (new URLSearchParams(window.location.search).get("motion") === "full") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: fine)").matches;
}

/* Touch screens: hover/tilt/velocity effects read as jitter under a finger,
   and momentum scrolling makes velocity numbers spike - gate those off here. */
export function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

export function isSmallViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

export function isLowPower(): boolean {
  if (typeof window === "undefined") return false;
  const small = window.matchMedia("(max-width: 768px)").matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  return small || cores <= 4;
}
