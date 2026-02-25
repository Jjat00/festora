"use client";

import { useEffect, useState, useRef } from "react";

export function DynamicFocusBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePosition] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to avoid synchronous setState inside useEffect
    // which triggers the React Compiler / linter warning for cascading renders
    const animationFrameId = requestAnimationFrame(() => {
      setIsReady(true);
      setMousePosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
    });

    const updatePosition = (clientX: number, clientY: number) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: clientX - rect.left,
          y: clientY - rect.top,
        });
        setIsActive(true);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchEnd = () => {
      setIsActive(false);
    };

    const handleMouseLeave = () => {
      setIsActive(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchstart", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchstart", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  if (!isReady) return null;

  // Cinematic dark photography background (same as the hero entrance)
  const bgImage =
    // "url('https://images.unsplash.com/photo-1516724562728-afc824a36e84?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y2FtZXJhJTIwd2FsbHBhcGVyfGVufDB8fDB8fHww')";
    "url('https://img.freepik.com/free-photo/artists-doing-touch-ups-model_53876-139545.jpg?semt=ais_user_personalization&w=740&q=80')";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#050505] pointer-events-none"
    >
      {/* Base Layer: Darkened and Heavily Blurred (Out of focus) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: bgImage,
          filter: "blur(24px)",
          transform: "scale(1.1)", // Prevent blur edges from showing
        }}
      />

      {/* Top Layer: Sharp, Bright and fully in focus, but MASKED by the cursor position */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ease-out ${
          isActive ? "opacity-90" : "opacity-0"
        }`}
        style={{
          backgroundImage: bgImage,
          transform: "scale(1.1)",
          // The CSS mask creates a transparent hole that follows the mouse, revealing the sharp image
          WebkitMaskImage: `radial-gradient(circle 400px at ${mousePos.x}px ${mousePos.y}px, black 0%, rgba(0,0,0,0.8) 20%, transparent 60%)`,
          maskImage: `radial-gradient(circle 400px at ${mousePos.x}px ${mousePos.y}px, black 0%, rgba(0,0,0,0.8) 20%, transparent 60%)`,
        }}
      />

      {/* Inner Vignette / Shadow Overlay to make text legible */}
      <div className="absolute inset-0 bg-linear-to-t from-[#050505] via-transparent to-black/40" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] opacity-70" />

      {/* Heavy Grain overlay to sell the high-ISO photography feel */}
      <div
        className="absolute inset-0 z-10 opacity-[0.25] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')",
        }}
      />
    </div>
  );
}
