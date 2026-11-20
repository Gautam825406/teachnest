"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** True when the user prefers reduced motion — animations should be skipped. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Observe an element once and report when it enters the viewport. */
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

type RevealProps = {
  children: ReactNode;
  /** Stagger delay in ms (keep 0–200). */
  delay?: number;
  className?: string;
};

/**
 * Fade + slide-up reveal when scrolled into view.
 * Renders instantly (no animation) for prefers-reduced-motion.
 */
export function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={inView ? { transitionDelay: `${delay}ms` } : undefined}
      className={`motion-reveal ${inView ? "motion-reveal-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/** Animate a number from 0 to `value` once `start` is true. Returns the current value. */
export function useCountUp(value: number, start: boolean, duration = 900): number {
  const reduced = usePrefersReducedMotion();
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (reduced) {
      setCurrent(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setCurrent(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, value, duration, reduced]);
  return current;
}

type CountUpProps = {
  value: number;
  start?: boolean;
  className?: string;
};

/** Number that counts up from 0 when `start` becomes true. */
export function CountUp({ value, start = true, className = "" }: CountUpProps) {
  const current = useCountUp(value, start);
  return <span className={`tnum ${className}`}>{current.toLocaleString("en-IN")}</span>;
}

/**
 * Lightweight page-content fade-in, for wrapping dashboard page bodies.
 * Runs once on mount (route change remounts the page), ~250ms.
 */
export function PageFade({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`motion-page-fade ${className}`}>{children}</div>;
}
