import { useEffect, useRef, useState, type RefObject } from "react";

export const REDUCED =
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOut = (p: number) => 1 - Math.pow(1 - p, 4);

export function tween(ms: number, paint: (p: number) => void) {
  let done = false;
  const t0 = performance.now();
  const end = () => {
    if (!done) {
      done = true;
      paint(1);
    }
  };
  const step = (t: number) => {
    if (done) return;
    const p = Math.min(1, (t - t0) / ms);
    if (p >= 1) return end();
    paint(easeOut(p));
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  const guard = setTimeout(end, ms + 400);
  return () => {
    done = true;
    clearTimeout(guard);
  };
}

export function useSeen(ref: RefObject<Element | null>, threshold = 0.3) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return seen;
}

export function useWidth(ref: RefObject<HTMLElement | null>, fallback = 340) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setW(Math.max(280, el.clientWidth || fallback));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}

export function useChartPhase(ref: RefObject<Element | null>, animKey: string) {
  const seen = useSeen(ref);
  const [phase, setPhase] = useState<"wait" | "anim" | "">("wait");
  const first = useRef(true);
  useEffect(() => {
    if (!seen) return;
    first.current = false;
    setPhase("anim");
    const t = setTimeout(() => setPhase(""), 2600);
    return () => clearTimeout(t);
  }, [seen, animKey]);
  return REDUCED ? "" : phase;
}
