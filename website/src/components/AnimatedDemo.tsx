"use client";

import { useEffect, useRef, useState } from "react";

// Animation stages:
// 0 – idle:     cursor resting away from link
// 1 – moving:   cursor animates toward the link
// 2 – loading:  "Analysing…" bubble
// 3 – result:   full summary card
// 4 – pause before loop

const STAGE_DURATIONS = [1000, 800, 1200, 4000, 700];

export default function AnimatedDemo({ isDark }: { isDark: boolean }) {
  const [stage, setStage] = useState(0);
  const [started, setStarted] = useState(false);

  // Refs for measuring DOM positions
  const containerRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLSpanElement>(null);

  // Computed positions (set after mount + on resize)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [idlePos, setIdlePos] = useState({ x: 0, y: 0 });
  const [loadingPos, setLoadingPos] = useState({ x: 0, y: 0 });

  const measure = () => {
    if (!containerRef.current || !linkRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const lRect = linkRef.current.getBoundingClientRect();

    // Cursor tip lands just inside the right-half of the link text
    setHoverPos({
      x: lRect.left - cRect.left + lRect.width * 0.55,
      y: lRect.top - cRect.top + lRect.height * 0.8,
    });

    // "Analysing" bubble appears just below the link
    setLoadingPos({
      x: lRect.left - cRect.left,
      y: lRect.bottom - cRect.top + 6,
    });

    // Idle cursor: bottom-centre of the container
    setIdlePos({
      x: cRect.width * 0.45,
      y: cRect.height * 0.72,
    });
  };

  useEffect(() => {
    // Small delay so DOM has painted before we measure
    const t = setTimeout(() => {
      measure();
      setStarted(true);
    }, 300);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advance stages
  useEffect(() => {
    if (!started) return;
    const t = setTimeout(
      () => setStage((s) => (s + 1) % STAGE_DURATIONS.length),
      STAGE_DURATIONS[stage]
    );
    return () => clearTimeout(t);
  }, [stage, started]);

  const isHovering = stage >= 1;
  const isLoading = stage === 2;
  const showResult = stage >= 3;

  const cursorPos = isHovering ? hoverPos : idlePos;

  return (
    <div
      className={`rounded-2xl overflow-hidden border shadow-2xl ${
        isDark ? "border-white/10 bg-gray-900" : "border-gray-200 bg-gray-50"
      }`}
    >
      {/* Browser chrome bar */}
      <div
        className={`px-4 py-3 flex items-center gap-3 border-b ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"
        }`}
      >
        <div className="flex gap-1.5 flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div
          className={`flex-1 flex items-center gap-2 rounded-md px-3 py-1 text-xs ${
            isDark
              ? "bg-gray-700 text-gray-400"
              : "bg-white text-gray-500 border border-gray-200"
          }`}
        >
          <svg
            className="w-3 h-3 flex-shrink-0 opacity-50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
          </svg>
          example.com/checkout
        </div>
      </div>

      {/* Simulated page body */}
      <div ref={containerRef} className="relative pt-3 px-6 pb-6 sm:pt-5 sm:px-10 sm:pb-10 min-h-[400px] sm:min-h-[440px] overflow-hidden">

        {/* Page text */}
        <div className="mb-6">
          <p className={`text-base font-medium mb-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>
            Complete your purchase
          </p>
          <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            By continuing, you agree to our{" "}
            <span
              ref={linkRef}
              className={`relative inline-flex items-center cursor-pointer transition-all duration-300 ${
                isHovering
                  ? "text-blue-400"
                  : isDark
                  ? "text-blue-500"
                  : "text-blue-600"
              }`}
            >
              Terms of Service
              {/* Idle: animated underline sweep (text colour) */}
              {!isHovering && (
                <span
                  className="absolute bottom-0 left-0 h-px bg-current"
                  style={{
                    animation: "underline-sweep 1.8s ease-in-out infinite",
                  }}
                />
              )}
              {/* Hover: highlight ring */}
              {isHovering && (
                <span className="absolute -inset-1 rounded bg-blue-500/10 border border-blue-500/30 animate-pulse" />
              )}
            </span>
          </p>
        </div>

        {/* Animated cursor — positioned using measured DOM coords */}
        {started && (
          <div
            className="absolute pointer-events-none z-30 transition-all duration-700 ease-in-out"
            style={{ left: cursorPos.x, top: cursorPos.y - 24, opacity: stage === 0 ? 0.5 : 1 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M3 1.5L14.5 9L9.5 10.5L7.5 15.5L3 1.5Z"
                fill="white"
                stroke="#1e293b"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Analysing bubble */}
        {isLoading && (
          <div
            className="demo-summary-card absolute z-20 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white bg-slate-800 border border-slate-700/60 shadow-xl"
            style={{ left: loadingPos.x, top: loadingPos.y - 16 }}
          >
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            Analysing…
          </div>
        )}

        {/* Summary card — always dark, never responds to isDark */}
        <div
          style={{ colorScheme: "dark", top: "1.5rem" }}
          className={`demo-summary-card absolute inset-x-4 sm:inset-x-auto sm:right-4 sm:left-auto sm:w-72 rounded-xl overflow-hidden shadow-2xl transition-all duration-500
            bg-slate-800 border border-slate-700/60
            ${showResult ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}
        >
          {/* Card header */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2 gap-2">
            <span className="font-semibold text-xs text-white leading-snug">Checkout Terms of Service</span>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 whitespace-nowrap flex-shrink-0">
              high confidence
            </span>
          </div>

          {/* Body */}
          <div className="px-4 pb-2 space-y-2.5">

            {/* TL;DR */}
            <p className="text-xs text-gray-400 leading-relaxed">
              Standard e-commerce terms. Key risks are auto-renewal and limited refund rights.
            </p>

            {/* Costs */}
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-1">💰 Costs &amp; renewal</p>
              <ul className="space-y-0.5 text-xs text-gray-400 pl-1">
                <li className="flex gap-1.5"><span className="text-gray-600 flex-shrink-0">•</span>Auto-renews at £9.99/month unless cancelled</li>
              </ul>
            </div>

            {/* Cancellation */}
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-1">🔄 Cancellation &amp; refunds</p>
              <ul className="space-y-0.5 text-xs text-gray-400 pl-1">
                <li className="flex gap-1.5"><span className="text-gray-600 flex-shrink-0">•</span>No refunds for partial billing periods</li>
              </ul>
            </div>

            {/* Privacy */}
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-1">🔒 Privacy &amp; data</p>
              <ul className="space-y-0.5 text-xs text-gray-400 pl-1">
                <li className="flex gap-1.5"><span className="text-gray-600 flex-shrink-0">•</span>Data may be shared with advertising partners</li>
              </ul>
            </div>

            {/* Red flags */}
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-1">🚩 Red flags</p>
              <ul className="space-y-0.5 text-xs pl-1">
                <li className="flex gap-1.5 text-red-400"><span className="flex-shrink-0">•</span>Arbitration clause - waives right to sue in court</li>
              </ul>
            </div>

            <p className="text-xs text-gray-500 pt-0.5">
              Note: automated summary.{" "}
              <span className="text-blue-400">View full content</span>.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-700/50">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-400 font-medium">
                5<span className="text-gray-500 font-normal">/50 Used</span>
              </span>
              <span className="text-green-400 font-medium">
                ~12<span className="text-gray-500 font-normal"> Mins saved</span>
              </span>
            </div>
            <svg
              className="w-3.5 h-3.5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
