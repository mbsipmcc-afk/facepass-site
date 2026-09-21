"use client";

import { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@/components/face-mesh";
import { Reveal, SplitReveal, StaggerGroup } from "@/components/motion";
import { GAUNTLET_LAYERS } from "@/components/three/shared";

type Phase = "idle" | "running" | "passed" | "rejected";
type Status = "idle" | "checking" | "pass" | "fail";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Security() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeLayer, setActiveLayer] = useState(-1);
  const [status, setStatus] = useState<Status[]>(() => GAUNTLET_LAYERS.map(() => "idle"));
  const [flash, setFlash] = useState<string | null>(null);
  const runId = useRef(0);

  useEffect(() => () => { runId.current += 1; }, []);

  async function run(attack: boolean) {
    const id = ++runId.current;
    const alive = () => runId.current === id;
    setPhase("running");
    setActiveLayer(-1);
    setStatus(GAUNTLET_LAYERS.map(() => "idle"));
    setFlash(null);

    for (let i = 0; i < GAUNTLET_LAYERS.length; i++) {
      if (!alive()) return;
      setActiveLayer(i);
      setStatus((s) => s.map((v, j) => (j === i ? "checking" : v)));
      setFlash(GAUNTLET_LAYERS[i].color);
      await sleep(attack && i === 0 ? 900 : 640);
      if (!alive()) return;
      setFlash(null);

      if (attack && i === 0) {
        setStatus((s) => s.map((v, j) => (j === i ? "fail" : v)));
        setPhase("rejected");
        return;
      }
      setStatus((s) => s.map((v, j) => (j === i ? "pass" : v)));
      await sleep(120);
    }
    if (!alive()) return;
    setActiveLayer(-1);
    setPhase("passed");
  }

  const meshColor = phase === "rejected" ? "#fb7185" : phase === "passed" ? "#34d399" : "#38e1ff";
  const statusChip: Record<Status, { label: string; cls: string }> = {
    idle: { label: "STANDBY", cls: "border-fg/15 text-fg-faint" },
    checking: { label: "CHECKING", cls: "border-brand/50 text-brand animate-pulse" },
    pass: { label: "PASS", cls: "border-verify/50 text-verify" },
    fail: { label: "REJECT", cls: "border-alert/60 text-alert" },
  };

  return (
    <section id="security" className="relative mx-auto w-full max-w-7xl px-6 py-28 lg:px-10 lg:py-36">
      <Reveal>
        <p className="hud-label mb-4 text-alert">Security</p>
      </Reveal>
      <SplitReveal as="h2" className="heading-gradient max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
        Try the gauntlet yourself.
      </SplitReveal>
      <Reveal delay={0.1}>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
          A printed photo, a phone screen, a replayed video. Each one is some
          mix of flat texture, missing depth and wrong light. Five layers look
          for exactly that. Across 248,000+ attempts, none has passed.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-8 lg:grid-cols-5">
        {/* stage */}
        <Reveal clip blur className="lg:col-span-3">
          <div
            className="relative aspect-[16/11] overflow-hidden rounded-3xl border border-fg/10 bg-panel"
            role="img"
            aria-label="Anti-spoofing simulation stage"
          >
            <div className="grid-backdrop absolute inset-0" />
            {/* flash wash */}
            <div
              aria-hidden
              className="absolute inset-0 transition-opacity duration-150"
              style={{ backgroundColor: flash ?? "transparent", opacity: flash ? 0.32 : 0 }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-[78%]">
                <FaceMesh className="h-full w-full" />
                {/* confirm line draws in when every layer passes */}
                {phase === "passed" && (
                  <div
                    aria-hidden
                    className="animate-draw-x absolute inset-x-[10%] top-1/2 h-px origin-left bg-gradient-to-r from-transparent via-verify to-transparent"
                  />
                )}
              </div>
              {/* scan line */}
              {phase !== "passed" && phase !== "rejected" && (
                <div
                  aria-hidden
                  className="animate-scan-y absolute inset-x-[12%] h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${meshColor}, transparent)` }}
                />
              )}
            </div>

            {/* strike line on reject */}
            {phase === "rejected" && (
              <div aria-hidden className="absolute inset-0 flex items-center justify-center">
                <div className="animate-strike-in h-[3px] w-[70%] origin-left rounded bg-alert shadow-[0_0_24px_rgba(251,113,133,0.8)]" />
              </div>
            )}

            {/* verdict */}
            {(phase === "passed" || phase === "rejected") && (
              <div className="absolute inset-x-0 bottom-6 flex justify-center">
                <span
                  className={`animate-pop-in inline-flex items-center gap-2 rounded-full border px-5 py-2 font-mono text-xs tracking-[0.2em] ${
                    phase === "passed"
                      ? "border-verify/60 bg-verify/10 text-verify"
                      : "border-alert/60 bg-alert/10 text-alert"
                  }`}
                >
                  {phase === "passed" ? "✓ LIVENESS VERIFIED · LIVE HUMAN" : "✕ REJECTED · PRINT / SCREEN REPLAY"}
                </span>
              </div>
            )}

            {/* HUD corner */}
            <div className="absolute left-5 top-5 font-mono text-[11px] tracking-widest text-fg-faint">
              SIMULATION · NO CAMERA USED
            </div>
            <div className="absolute right-5 top-5 flex items-center gap-2 font-mono text-[11px] tracking-widest text-fg-faint">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${phase === "running" ? "animate-blink bg-brand" : "bg-fg-faint"}`} />
              {phase.toUpperCase()}
            </div>
          </div>

          <p className="mt-4 text-sm text-fg-faint" aria-live="polite">
            {phase === "idle" && "Pick a scenario to replay the kiosk's decision flow in software only."}
            {phase === "running" && "Running anti-spoofing layers…"}
            {phase === "passed" && "All five layers agreed: live human. Attendance would be logged now."}
            {phase === "rejected" && "Layer 1 spotted the flat, printed look of a photo, so the request never even reached the AI."}
          </p>
        </Reveal>

        {/* layers + controls */}
        <Reveal delay={0.1} className="lg:col-span-2">
          <StaggerGroup as="ul" stagger={0.06} y={16} className="space-y-2.5" aria-label="Simulation layers">
            {GAUNTLET_LAYERS.map((layer, i) => {
              const chip = statusChip[status[i]];
              return (
                <li
                  key={layer.name}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3.5 transition-[background-color,border-color,transform] duration-200 ${
                    activeLayer === i
                      ? "translate-x-1 border-fg/20 bg-panel-2"
                      : "border-fg/8 bg-panel/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-fg-faint">L{i + 1}</span>
                    <span className="text-sm text-fg">{layer.name}</span>
                  </div>
                  <span
                    key={chip.label}
                    className={`animate-pop-in rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-widest ${chip.cls}`}
                  >
                    {chip.label}
                  </span>
                </li>
              );
            })}
          </StaggerGroup>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => run(false)}
              disabled={phase === "running"}
              data-cursor-text="Run"
              className="btn-shine inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-ink shadow-[0_14px_44px_-14px_rgba(56,225,255,0.65)] transition hover:bg-brand-soft active:scale-[0.97] disabled:opacity-50"
            >
              Run live-face simulation
            </button>
            <button
              type="button"
              onClick={() => run(true)}
              disabled={phase === "running"}
              data-cursor-text="Spoof"
              className="inline-flex items-center gap-2 rounded-full border border-alert/40 px-6 py-3 text-sm font-medium text-alert transition hover:bg-alert/10 active:scale-[0.97] disabled:opacity-50"
            >
              Run photo-attack simulation
            </button>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-fg-faint">
            Pure software replay: no camera access, no biometric data, nothing
            leaves this page. In production, our super-secured AI scores real
            faces above 99% confidence, while printed photos and screens score
            below 10%.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
