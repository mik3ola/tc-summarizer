"use client";

import createGlobe, { COBEOptions } from "cobe";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

export default function GlobeFeatureSection() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className={cn(
        "relative w-full overflow-hidden min-h-[600px] md:min-h-[700px]",
        isDark ? "bg-slate-950" : "bg-gray-50"
      )}
    >
      {/* Globe - positioned on the right, slides in from right */}
      <div 
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 w-[450px] h-[450px] md:w-[600px] md:h-[600px] lg:w-[750px] lg:h-[750px] -mr-24 md:-mr-16 lg:-mr-8",
          "transition-all duration-1000 ease-out",
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-[150px]"
        )}
      >
        {isVisible && <Globe isDark={isDark} className="w-full h-full" />}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 h-full min-h-[600px] md:min-h-[700px] flex flex-col justify-between py-16 md:py-20">
        {/* Title - Upper Left, slides in from left */}
        <div 
          className={cn(
            "max-w-xl transition-all duration-700 ease-out",
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-20"
          )}
        >
          <h2 className={cn(
            "text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-tight",
            isDark ? "text-white" : "text-gray-900"
          )}>
            Ready to understand what you&apos;re signing?
          </h2>
          <p className={cn(
            "mt-8 max-w-lg text-sm md:text-base font-light tracking-tight leading-relaxed",
            isDark ? "text-gray-400" : "text-gray-600"
          )}>
            Join thousands of users who stopped blindly accepting legal terms. Get instant AI-powered summaries.
          </p>
        </div>

        {/* Button - Bottom Left, slides in from left with delay */}
        <div 
          className={cn(
            "mt-auto pt-12 transition-all duration-700 ease-out delay-200",
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-16"
          )}
        >
          <a
            href="https://chrome.google.com/webstore/detail/termsdigest"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-8 py-4 rounded text-lg font-medium transition-all hover:scale-105 text-white shadow-lg shadow-purple-500/25"
          >
            Install TermsDigest - Free
          </a>
        </div>
      </div>
    </section>
  );
}

const MARKERS: Array<{ location: [number, number]; size: number }> = [
  { location: [14.5995, 120.9842], size: 0.03 },
  { location: [19.076, 72.8777], size: 0.1 },
  { location: [23.8103, 90.4125], size: 0.05 },
  { location: [30.0444, 31.2357], size: 0.07 },
  { location: [39.9042, 116.4074], size: 0.08 },
  { location: [-23.5505, -46.6333], size: 0.1 },
  { location: [19.4326, -99.1332], size: 0.1 },
  { location: [40.7128, -74.006], size: 0.1 },
  { location: [34.6937, 135.5022], size: 0.05 },
  { location: [41.0082, 28.9784], size: 0.06 },
  { location: [51.5074, -0.1278], size: 0.08 },
  { location: [48.8566, 2.3522], size: 0.07 },
  { location: [35.6762, 139.6503], size: 0.08 },
  { location: [-33.8688, 151.2093], size: 0.06 },
];

const getGlobeConfig = (isDark: boolean): COBEOptions => ({
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: isDark ? 1 : 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: isDark ? [0.3, 0.3, 0.6] : [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: isDark ? [0.3, 0.3, 0.6] : [1, 1, 1],
  markers: MARKERS,
});

export function Globe({
  className,
  isDark = true,
}: {
  className?: string;
  isDark?: boolean;
}) {
  const config = getGlobeConfig(isDark);
  let phi = 0;
  let width = 0;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const [r, setR] = useState(0);

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value ? "grabbing" : "grab";
    }
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
      setR(delta / 200);
    }
  };

  const onRender = useCallback(
    (state: Record<string, any>) => {
      if (!pointerInteracting.current) phi += 0.002;
      state.phi = phi + r;
      state.width = width * 2;
      state.height = width * 2;
    },
    [r]
  );

  const onResize = () => {
    if (canvasRef.current) {
      width = canvasRef.current.offsetWidth;
    }
  };

  useEffect(() => {
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvasRef.current!, {
      ...config,
      width: width * 2,
      height: width * 2,
      onRender,
    });

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = "1";
      }
    });
    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [isDark]);

  return (
    <div
      className={cn(
        "aspect-square",
        className
      )}
    >
      <canvas
        className="w-full h-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        ref={canvasRef}
        onPointerDown={(e) =>
          updatePointerInteraction(
            e.clientX - pointerInteractionMovement.current
          )
        }
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
    </div>
  );
}
