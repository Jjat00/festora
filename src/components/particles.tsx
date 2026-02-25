"use client";

import { useEffect, useMemo, useState } from "react";
import ParticlesComponent, {
  initParticlesEngine,
} from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

// El hero tiene fondo oscuro fijo (#050505), las partículas siempre claras para verse
const PARTICLE_COLOR = "#ffffff";

export default function Particles() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

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
          value: PARTICLE_COLOR,
        },
        links: {
          enable: true,
          distance: 150,
          color: PARTICLE_COLOR,
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
    []
  );

  if (!ready) return null;

  return (
    <ParticlesComponent
      id="hero-particles"
      className="absolute inset-0"
      options={options}
    />
  );
}
