"use client";

import { useEffect, useRef, useState } from "react";
import { styleVars, useIsomorphicLayoutEffect } from "@/components/motion";
import { prefersReducedMotion } from "@/lib/device";

const NODES: Array<[number, number]> = [
  [50, 8], [72, 14], [86, 30], [90, 52], [82, 74], [64, 90], [50, 96],
  [36, 90], [18, 74], [10, 52], [14, 30], [28, 14],
  [34, 42], [44, 40], [56, 40], [66, 42],
  [50, 52], [50, 62], [42, 70], [50, 72], [58, 70],
];

const EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
  [9, 10], [10, 11], [11, 0],
  [12, 13], [13, 14], [14, 15], [12, 15],
  [13, 16], [14, 16], [16, 17], [17, 18], [17, 20], [18, 19], [19, 20],
  [12, 9], [15, 3], [16, 19], [2, 15], [10, 12], [4, 20], [8, 18],
];

/**
 * HUD face mesh. Outside the story's "photo" stand-in (muted) it draws itself
 * in the first time it scrolls into view: outline first, features after, nodes
 * last. SSR renders the static mesh, so no-JS and reduced-motion users always
 * see it fully drawn.
 */
export function FaceMesh({ className, muted = false }: { className?: string; muted?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  // static → armed (hidden, waiting for view) → drawn (staggered draw-in)
  const [state, setState] = useState<"static" | "armed" | "drawn">("static");

  useIsomorphicLayoutEffect(() => {
    if (muted || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    setState("armed");
  }, [muted]);

  useEffect(() => {
    if (state !== "armed") return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("drawn");
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state]);

  return (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      className={
        [
          "face-mesh",
          state === "armed" && "mesh-armed",
          state === "drawn" && "mesh-drawn",
          className,
        ]
          .filter(Boolean)
          .join(" ")
      }
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={styleVars({ "--mesh-node-o": muted ? "0.5" : "0.9" })}
    >
      {EDGES.map(([a, b], i) => {
        const [x1, y1] = NODES[a];
        const [x2, y2] = NODES[b];
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={muted ? "#93a3bd" : "#38e1ff"}
            strokeWidth={0.5}
            opacity={muted ? 0.4 : 0.7}
            style={
              state !== "static"
                ? styleVars({
                    "--dash-from": `${Math.hypot(x2 - x1, y2 - y1)}`,
                    "--edge-i": `${i}`,
                  })
                : undefined
            }
          />
        );
      })}
      {NODES.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={0.9}
          fill={muted ? "#93a3bd" : "#38e1ff"}
          opacity={muted ? 0.5 : state === "static" ? 0.9 : undefined}
          style={state !== "static" ? styleVars({ "--node-i": `${i}` }) : undefined}
        />
      ))}
    </svg>
  );
}
