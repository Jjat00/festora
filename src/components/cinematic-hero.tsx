"use client";

import { useEffect, useState } from "react";
import { motion, useAnimate } from "framer-motion";
import Particles from "@/components/particles";

export function CinematicHero({ children }: { children: React.ReactNode }) {
  const [scope, animate] = useAnimate();
  const [isFocusing, setIsFocusing] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let mounted = true;

    const playSequence = async () => {
      // 1. Start UI and Background slightly out of focus and zoomed
      animate(
        "#ui-layer, #particles-layer",
        { scale: [1.15, 1.05], filter: ["blur(12px)", "blur(6px)"] },
        { duration: 1.0, ease: "easeInOut" },
      );

      await new Promise((r) => setTimeout(r, 1000));
      if (!mounted) return;

      // 3. Focus sharpens
      await animate(
        "#ui-layer, #particles-layer",
        { filter: "blur(0px)" },
        { duration: 0.4, ease: "easeOut" },
      );
      if (!mounted) return;

      // 4. Lens micro-adjustment
      await animate(
        "#ui-layer, #particles-layer",
        {
          filter: ["blur(0px)", "blur(3px)", "blur(0px)"],
          scale: [1.05, 1.055, 1.05],
        },
        { duration: 0.2, ease: "easeInOut" },
      );
      if (!mounted) return;

      // Lock focus visually
      setIsFocusing(false);

      // Brief pause before capture
      await new Promise((r) => setTimeout(r, 50));
      if (!mounted) return;

      // 5. Flash (Visual only)
      animate(
        "#flash",
        { opacity: [0, 1, 0] },
        { duration: 0.3, times: [0, 0.1, 1], ease: "easeOut" },
      );

      // Settle UI and background scale to 1 smoothly
      animate(
        "#ui-layer, #particles-layer",
        { scale: 1 },
        { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
      );

      // 8. Subtle shutter frame closing effect / UI feedback
      animate(
        "#viewfinder",
        { scale: [1, 1.05, 1], opacity: [1, 0] },
        { duration: 0.4, ease: "easeOut", delay: 0.15 },
      );
    };

    playSequence();

    return () => {
      mounted = false;
    };
  }, [animate]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={scope}
      onMouseMove={handleMouseMove}
      className="relative w-full min-h-svh overflow-hidden bg-background transition-colors duration-300"
    >
      {/* Spotlight (tema claro: oscuro; tema oscuro: claro) */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300 dark:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.06), transparent 40%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-100 transition-opacity duration-300 dark:opacity-0"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,0.04), transparent 40%)`,
        }}
        aria-hidden
      />

      {/* Abstract Animated Background */}
      <motion.div
        id="particles-layer"
        className="absolute inset-0 z-0"
        initial={{ filter: "blur(12px)", scale: 1.15 }}
      >
        <Particles />
      </motion.div>

      {/* Flash Overlay (blanco en oscuro, negro en claro) */}
      <motion.div
        id="flash"
        className="absolute inset-0 z-50 bg-black pointer-events-none dark:bg-white"
        initial={{ opacity: 0 }}
      />

      {/* Viewfinder / Micro Animation */}
      <motion.div
        id="viewfinder"
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
      >
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 opacity-60">
          {/* Corner brackets — siguen el tema */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-[1.5px] border-l-[1.5px] border-foreground/70" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-[1.5px] border-r-[1.5px] border-foreground/70" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[1.5px] border-l-[1.5px] border-foreground/70" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[1.5px] border-r-[1.5px] border-foreground/70" />

          {/* Center focus indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                !isFocusing
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                  : "bg-foreground/50"
              }`}
            />
          </div>

          {/* Rule of thirds subtle grid */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
            <div className="border-b border-r border-foreground/30" />
            <div className="border-b border-r border-foreground/30" />
            <div className="border-b border-foreground/30" />
            <div className="border-b border-r border-foreground/30" />
            <div className="border-b border-r border-foreground/30" />
            <div className="border-b border-foreground/30" />
            <div className="border-r border-foreground/30" />
            <div className="border-r border-foreground/30" />
            <div className="" />
          </div>
        </div>
      </motion.div>

      {/* Actual Hero Content Layer */}
      <motion.div
        id="ui-layer"
        className="relative z-30 flex flex-col min-h-svh"
        initial={{ filter: "blur(12px)", scale: 1.15 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
