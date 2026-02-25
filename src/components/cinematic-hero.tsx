"use client";

import { useEffect, useState } from "react";
import { motion, useAnimate } from "framer-motion";
import Particles from "@/components/particles";

export function CinematicHero({ children }: { children: React.ReactNode }) {
  const [scope, animate] = useAnimate();
  const [isFocusing, setIsFocusing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const playSequence = async () => {
      // 1. Start slightly out of focus and zoomed
      // 2. Slow zoom in
      animate(
        "#bg-image",
        { scale: [1.15, 1.05], filter: ["blur(12px)", "blur(6px)"] },
        { duration: 2.2, ease: "easeInOut" }
      );
      
      await new Promise((r) => setTimeout(r, 2200));
      if (!mounted) return;

      // 3. Focus sharpens
      await animate(
        "#bg-image",
        { filter: "blur(0px)" },
        { duration: 0.8, ease: "easeOut" }
      );
      if (!mounted) return;

      // 4. Lens micro-adjustment
      await animate(
        "#bg-image",
        {
          filter: ["blur(0px)", "blur(3px)", "blur(0px)"],
          scale: [1.05, 1.055, 1.05],
        },
        { duration: 0.3, ease: "easeInOut" }
      );
      if (!mounted) return;

      // Lock focus visually
      setIsFocusing(false);
      
      // Brief pause before capture
      await new Promise((r) => setTimeout(r, 150));
      if (!mounted) return;

      // 5. Flash (Visual only, no audio to avoid autoplay permission issues)
      animate(
        "#flash",
        { opacity: [0, 1, 0] },
        { duration: 0.4, times: [0, 0.1, 1], ease: "easeOut" }
      );

      // Hide the background image and reveal the particles layer right at the peak of the flash
      animate(
        "#bg-image",
        { opacity: 0 },
        { duration: 0.1, delay: 0.05 }
      );
      animate(
        "#particles-layer",
        { opacity: 1 },
        { duration: 0.4, delay: 0.1 }
      );

      // 6. Reveal the UI layer
      animate(
        "#ui-layer",
        { opacity: [0, 1], y: [10, 0] },
        { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }
      );
      
      // 8. Subtle shutter frame closing effect / UI feedback
      animate(
        "#viewfinder",
        { scale: [1, 1.05, 1], opacity: [1, 0] },
        { duration: 0.6, ease: "easeOut", delay: 0.2 }
      );
    };

    playSequence();

    return () => {
      mounted = false;
    };
  }, [animate]);

  return (
    <div ref={scope} className="relative w-full min-h-svh overflow-hidden bg-background">
      {/* Background Image (Disappears after flash) */}
      <motion.div
        id="bg-image"
        className="absolute inset-0 z-10 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=3000&auto=format&fit=crop')",
          filter: "blur(12px)",
          scale: 1.15,
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </motion.div>

      {/* Particles Layer (Revealed after flash) */}
      <motion.div
        id="particles-layer"
        className="absolute inset-0 z-0 opacity-0"
      >
        <Particles />
      </motion.div>

      {/* Flash Overlay */}
      <motion.div
        id="flash"
        className="absolute inset-0 z-50 bg-white pointer-events-none"
        initial={{ opacity: 0 }}
      />

      {/* Viewfinder / Micro Animation */}
      <motion.div
        id="viewfinder"
        className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
      >
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 opacity-60">
          {/* Corner brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-[1.5px] border-l-[1.5px] border-white/70" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-[1.5px] border-r-[1.5px] border-white/70" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[1.5px] border-l-[1.5px] border-white/70" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[1.5px] border-r-[1.5px] border-white/70" />

          {/* Center focus indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                !isFocusing ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-white/50"
              }`}
            />
          </div>
          
          {/* Rule of thirds subtle grid */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
            <div className="border-b border-r border-white/30" />
            <div className="border-b border-r border-white/30" />
            <div className="border-b border-white/30" />
            <div className="border-b border-r border-white/30" />
            <div className="border-b border-r border-white/30" />
            <div className="border-b border-white/30" />
            <div className="border-r border-white/30" />
            <div className="border-r border-white/30" />
            <div className="" />
          </div>
        </div>
      </motion.div>

      {/* Actual Hero Content Layer (hidden until captured) */}
      <motion.div
        id="ui-layer"
        className="relative z-30 flex flex-col min-h-svh"
        initial={{ opacity: 0 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
