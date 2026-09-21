// Shared mutable state for the scroll-driven story - written by one ScrollTrigger,
// read every frame by useFrame. Never put this in React state (would re-render per frame).

// Story zone layout in viewport heights (hero 100 + pipeline 400 + gauntlet 300).
export const STORY_VH = { hero: 100, pipeline: 400, gauntlet: 300 };
export const STORY_TOTAL_VH = STORY_VH.hero + STORY_VH.pipeline + STORY_VH.gauntlet;

export const STORY = {
  heroEnd: 0.125, // 100/800
  beat: 0.125, // one pipeline beat = 100vh / 800vh
  pipelineStart: 0.125,
  pipelineEnd: 0.625,
  gauntletStart: 0.625,
  gauntletEnd: 0.925,
  strike: 0.8, // photo plane strike-through window
  lock: 0.9, // green ring returns
  dissolveStart: 0.93,
} as const;

// The five anti-spoof layers share one color sequence (gauntlet wash, HUD, demo).
export const GAUNTLET_LAYERS = [
  { name: "Flat-photo texture check", color: "#ff2d55" },
  { name: "Custom AI liveness model", color: "#ff9f0a" },
  { name: "Flash light challenge", color: "#ffd60a" },
  { name: "Gesture liveness check", color: "#30d158" },
  { name: "Heartbeat verification", color: "#38e1ff" },
] as const;

export const storyState = {
  progress: 0,
  mouseX: 0,
  mouseY: 0,
};

// local progress 0..1 for a sub-range of the global progress
export function range01(p: number, a: number, b: number): number {
  return Math.min(1, Math.max(0, (p - a) / (b - a)));
}

const smooth01 = (t: number) => t * t * (3 - 2 * t);

// 0 on landscape screens, →1 on tall/portrait phones. The camera poses park the
// bust beside the copy for desktop aspect ratios; on phones there is no
// side-by-side room, so the rig recenters, drops and pulls back by this factor.
export function portraitFactor(width: number, height: number): number {
  const aspect = width / Math.max(1, height);
  return smooth01(Math.min(1, Math.max(0, (1.05 - aspect) / 0.6)));
}
