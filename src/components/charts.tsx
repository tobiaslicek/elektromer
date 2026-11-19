import { useRef, type PointerEvent, type MouseEvent } from "react";
import { nf, niceMax } from "../lib/format";
import { useChartPhase, useWidth } from "../lib/motion";

export interface BarCol {
  label: string;
  segs: Array<{ v: number; color: string }>;
}

function usePick(onSel: (i: number) => void) {
  const pick = (e: MouseEvent | PointerEvent) => {
    const i = (e.target as SVGElement).dataset?.i;
    if (i != null) onSel(Number(i));
  };
  return {
    onClick: pick,
    onPointerMove: (e: PointerEvent) => {
      if (e.pointerType === "mouse") pick(e);
    },
  };
}

export function BarChart({ cols, sel, onSel, unit, animKey, aria }: { cols: BarCol[]; sel: number; onSel: (i: number) => void; unit: string; animKey: string; aria: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const W = useWidth(ref);
  const phase = useChartPhase(ref, animKey);
  const handlers = usePick(onSel);
  const H = 204, L = 40, R = 6, T = 26, B = 24;
  const max = niceMax(Math.max(...cols.map((c) => c.segs.reduce((a, s) => a + s.v, 0))));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const slot = (W - L - R) / cols.length;
  const bw = Math.min(34, slot * 0.62);
  const sparse = cols.length > 8;
  return (
    <div ref={ref} className="chart w-full min-w-0" {...handlers}>
      <svg key={animKey} className={`block h-auto w-full touch-pan-y ${phase}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (max * i) / 4;
          return (
            <g key={i}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={i ? "var(--color-line)" : "var(--color-axis)"} strokeWidth={1} />
              <text x={L - 6} y={y(v) + 4} textAnchor="end">{nf(v)}</text>
            </g>
          );
        })}
        {cols.map((c, i) => {
          const cx = L + slot * i + slot / 2, x = cx - bw / 2;
          const segs = c.segs.filter((s) => s.v > 0);
          let acc = 0;
          const on = sel === i;
          return (
            <g key={i}>
              {segs.map((s, k) => {
                const y0 = y(acc), y1 = y(acc + s.v);
                acc += s.v;
                const top = k === segs.length - 1;
                const h = Math.max(2, y0 - y1 - (k ? 2 : 0));
                const yy = y0 - (k ? 2 : 0) - h;
                const r = top ? Math.min(4, h) : 0;
                return (
                  <path key={k} className="bar" style={{ "--i": i } as React.CSSProperties} fill={`var(${s.color})`} opacity={on ? 1 : 0.45}
                    d={`M${x},${yy + h}V${yy + r}q0,${-r} ${r},${-r}H${x + bw - r}q${r},0 ${r},${r}V${yy + h}z`} />
                );
              })}
              {on && acc > 0 && (
                <text x={Math.min(Math.max(cx, L + 34), W - R - 34)} y={y(acc) - 9} textAnchor="middle" className="val">
                  {nf(Math.round(acc))} {unit}
                </text>
              )}
              {(!sparse || i % 2 === 0) && (
                <text x={cx} y={H - 7} textAnchor="middle" className={on ? "val" : ""}>{c.label}</text>
              )}
              <rect data-i={i} x={L + slot * i} y={T} width={slot} height={H - T} fill="transparent" className="cursor-pointer" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function LineChart({ pts, sel, onSel, aria }: { pts: Array<{ label: string; v: number }>; sel: number; onSel: (i: number) => void; aria: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const W = useWidth(ref);
  const phase = useChartPhase(ref, "line");
  const handlers = usePick(onSel);
  const H = 170, L = 40, R = 16, T = 20, B = 24;
  const max = niceMax(Math.max(...pts.map((p) => p.v)));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const slot = (W - L - R) / pts.length;
  const x = (i: number) => L + slot * i + slot / 2;
  const sparse = pts.length > 8;
  return (
    <div ref={ref} className="chart w-full min-w-0" {...handlers}>
      <svg className={`block h-auto w-full touch-pan-y ${phase}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={aria}>
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (max * i) / 4;
          return (
            <g key={i}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={i ? "var(--color-line)" : "var(--color-axis)"} strokeWidth={1} />
              <text x={L - 6} y={y(v) + 4} textAnchor="end">{nf(v)}</text>
            </g>
          );
        })}
        {pts.length > 1 && (
          <polyline className="draw" pathLength={1} fill="none" stroke="var(--color-t2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
            points={pts.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")} />
        )}
        {pts.map((p, i) => {
          const on = sel === i;
          return (
            <g key={i}>
              <circle className="pt" style={{ "--i": i } as React.CSSProperties} cx={x(i)} cy={y(p.v)} r={on ? 6 : 4.5} fill="var(--color-t2)" stroke="var(--color-card)" strokeWidth={2} />
              {on && <text x={x(i)} y={y(p.v) - 11} textAnchor="middle" className="val">{nf(p.v, 1)}</text>}
              {(!sparse || i % 2 === 0) && <text x={x(i)} y={H - 7} textAnchor="middle" className={on ? "val" : ""}>{p.label}</text>}
              <rect data-i={i} x={L + slot * i} y={0} width={slot} height={H} fill="transparent" className="cursor-pointer" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
