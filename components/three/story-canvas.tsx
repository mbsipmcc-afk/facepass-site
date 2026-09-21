"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { isFinePointer, isLowPower, prefersReducedMotion } from "@/lib/device";
import { storyState } from "./shared";

// The 3D bundle is code-split from the main page and never server-rendered.
const Scene = dynamic(() => import("./scene"), { ssr: false });

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean; message: string }
> {
  state = { failed: false, message: "" };
  static getDerivedStateFromError(error: unknown) {
    return { failed: true, message: error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error) };
  }
  componentDidCatch() {
    const w = window as unknown as { __sceneError?: string };
    w.__sceneError = this.state.message;
    this.props.onError();
  }
  // the ambience layer beneath the canvas takes over visually, so render nothing
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* CSS/SVG ambience shown when WebGL is unavailable. */
function FallbackScene() {
  return (
    <div className="fallback-aurora absolute inset-0" aria-hidden>
      <svg className="absolute inset-0 h-full w-full opacity-[0.16]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="mesh" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M0 0H46V46" fill="none" stroke="#38e1ff" strokeWidth="0.5" />
            <circle cx="46" cy="46" r="1.2" fill="#38e1ff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mesh)" />
      </svg>
      <div className="absolute left-1/2 top-1/2 h-[58vh] w-[40vh] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-brand/25" />
      <div className="animate-scan-y absolute left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent" />
    </div>
  );
}

/**
 * Fixed full-screen canvas that lives behind the story zone (hero → pipeline → gauntlet).
 * Pauses rendering when the story is out of view or the tab is hidden.
 */
export function StoryCanvas() {
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(true);
  // render only while the story is on screen AND the tab is visible - two
  // independent flags so one can't silently resurrect the other (e.g. the
  // visibilitychange handler firing after the story scrolled out of view)
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [low, setLow] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    setWebgl(hasWebGL());
    setReduced(prefersReducedMotion());
    setLow(isLowPower());
    setMounted(true);
  }, []);

  // QA/diagnosis marker: window.__sceneState explains which path rendered.
  useEffect(() => {
    const w = window as unknown as { __sceneState?: string };
    w.__sceneState = !webgl
      ? "no-webgl"
      : failed
        ? "scene-error"
        : stuck
          ? "root-stuck"
          : ready
            ? "ready"
            : "initializing";
  }, [webgl, failed, stuck, ready]);

  useEffect(() => {
    const story = document.getElementById("story");
    if (!story || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(story);
    return () => io.disconnect();
  }, [mounted]);

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!isFinePointer() || prefersReducedMotion()) return;
    const onMove = (e: PointerEvent) => {
      storyState.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      storyState.mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mounted]);

  const showCanvas = mounted && webgl;

  // R3F creates its root only once react-use-measure reports a non-zero
  // container size, and that size arrives via a ResizeObserver notification.
  // When the page loads while the window is occluded or minimized, rendering
  // steps are paused, the initial notification is lost, and the root never
  // initializes - silently, with no error. Keep nudging the measurement with
  // resize events (their handler path is synchronous) until onCreated confirms
  // the root exists. No hard cap: one dispatched event per 300ms is negligible,
  // the loop stops as soon as the root is ready, and a tab loaded while
  // occluded for longer than any fixed cap would otherwise stay broken for
  // good. While hidden nothing renders anyway, so skip and resume on visible.
  useEffect(() => {
    if (!showCanvas || ready) return;
    const kick = () => window.dispatchEvent(new Event("resize"));
    kick();
    const id = window.setInterval(() => {
      if (document.hidden) return;
      kick();
    }, 300);
    const onVisible = () => {
      if (!document.hidden) kick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [showCanvas, ready]);

  // If the root still hasn't come up after 15s of visible page life, say so:
  // flag it (window.__sceneState "root-stuck" + console) instead of leaving a
  // silently empty stage. The ambience layer beneath the canvas carries the
  // visuals meanwhile, and the kicks keep trying.
  useEffect(() => {
    if (!showCanvas || ready) return;
    const t = window.setTimeout(() => {
      setStuck(true);
      console.warn("[scene] WebGL root did not initialize after 15s; showing ambience fallback");
    }, 15000);
    return () => window.clearTimeout(t);
  }, [showCanvas, ready]);

  return (
    <div
      id="story-canvas"
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    >
      {/* CSS/SVG ambience lives beneath the WebGL canvas: covered by the
          opaque canvas whenever the scene is live, and the only thing on
          stage when WebGL is unavailable, the scene crashed, or the root
          never initialized. No failure mode can leave a blank background. */}
      <div className="absolute inset-0">
        <FallbackScene />
      </div>
      {showCanvas && !failed ? (
        <SceneBoundary onError={() => setFailed(true)}>
          <Scene
            reducedMotion={reduced}
            lowPower={low}
            active={inView && tabVisible}
            onReady={() => setReady(true)}
          />
        </SceneBoundary>
      ) : null}
      {/* cinematic vignette (replaces the WebGL post-processing vignette) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 92% 78% at 50% 45%, transparent 52%, rgba(2,4,9,0.6) 100%)",
        }}
      />
    </div>
  );
}
