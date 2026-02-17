"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ParticlesComponent, {
  initParticlesEngine,
} from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

function useIsDark() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isDark;
}

export default function Particles() {
  const [ready, setReady] = useState(false);
  const isDark = useIsDark();

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const color = isDark ? "#ffffff" : "#000000";

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: false,
      fpsLimit: 120,
      particles: {
        number: {
          value: 50,
          density: {
            enable: true,
          },
        },
        color: {
          value: color,
        },
        links: {
          enable: true,
          distance: 150,
          color: color,
          opacity: 0.07,
          width: 1,
        },
        move: {
          enable: true,
          speed: 0.6,
          direction: "none",
          outModes: {
            default: "out",
          },
        },
        opacity: {
          value: { min: 0.03, max: 0.15 },
        },
        size: {
          value: { min: 1, max: 2 },
        },
        shape: {
          type: "circle",
        },
      },
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: "grab",
          },
        },
        modes: {
          grab: {
            distance: 160,
            links: {
              opacity: 0.2,
            },
          },
        },
      },
      detectRetina: true,
    }),
    [color]
  );

  if (!ready) return null;

  return (
    <ParticlesComponent
      key={color}
      id="hero-particles"
      className="absolute inset-0"
      options={options}
    />
  );
}
