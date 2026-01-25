"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface IntroAnimationProps {
  onComplete?: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const [phase, setPhase] = useState<"loading" | "visible" | "transitioning" | "complete">("loading");
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);
  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  
  // Keep ref updated
  onCompleteRef.current = onComplete;

  const completeIntro = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    setPhase("complete");
    sessionStorage.setItem("intro-seen", "true");
    onCompleteRef.current?.();
  }, []);

  useEffect(() => {
    // Check if user has seen intro in this session
    const hasSeenIntro = sessionStorage.getItem("intro-seen");
    if (hasSeenIntro) {
      setShouldShow(false);
      document.body.classList.add("intro-skip");
      completeIntro();
      return;
    }

    setShouldShow(true);
    
    // Phase 1: Make headline visible after brief delay
    const showTimer = setTimeout(() => {
      setPhase("visible");
    }, 100);

    // Phase 2: After 2s, start transition to final position
    const transitionTimer = setTimeout(() => {
      setPhase("transitioning");
    }, 2000);

    // Phase 3: After transition (1.2s), mark complete
    const completeTimer = setTimeout(() => {
      completeIntro();
    }, 3200);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(transitionTimer);
      clearTimeout(completeTimer);
    };
  }, [completeIntro]);

  // Don't render anything until we know if we should show
  if (shouldShow === null) {
    return null;
  }

  if (!shouldShow) {
    return null;
  }

  return (
    <div 
      className={`intro-overlay ${phase === "transitioning" ? "intro-transitioning" : ""} ${phase === "complete" ? "intro-complete" : ""}`}
    >
      <div className={`intro-headline ${phase === "visible" || phase === "transitioning" || phase === "complete" ? "intro-visible" : ""} ${phase === "transitioning" || phase === "complete" ? "intro-settle" : ""}`}>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display tracking-tight">
          <span className="block mb-2">Stop Blindly Accepting</span>
          <span className="intro-gradient-text">Terms & Conditions</span>
        </h1>
      </div>
    </div>
  );
}
