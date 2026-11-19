import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { nf } from "../lib/format";
import { REDUCED, tween, useSeen } from "../lib/motion";

export const cardCls =
  "bg-card text-ink rounded-[20px] border border-white/50 px-6 py-7 flex flex-col gap-[22px] min-w-0 shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_12px_32px_-16px_rgb(0_0_0/0.35)]";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`${cardCls} ${className}`}>{children}</section>;
}

export function Icon({ name, size, className = "" }: { name: string; size: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useSeen(ref);
  const [fx, setFx] = useState<"" | "charge" | "zap">("");
  useEffect(() => {
    if (seen && !REDUCED) setFx("charge");
  }, [seen]);
  const src = `icons/${name}.png`;
  const style = useMemo(
    () => ({ width: size, height: size, "--src": `url("${new URL(src, document.baseURI).href}")` }) as CSSProperties,
    [src, size],
  );
  const zap = () => {
    if (REDUCED) return;
    setFx("");
    requestAnimationFrame(() => setFx("zap"));
  };
  return (
    <span ref={ref} className={`icw ${fx} ${className}`} style={style} onClick={zap}>
      <img src={src} alt="" width={size} height={size} />
    </span>
  );
}

export function Banner({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="-mx-2 -mt-3 mb-0.5 flex min-w-0 flex-wrap items-center gap-x-[18px] gap-y-3 rounded-2xl bg-panel py-2 pr-5 pl-[18px] text-on-dark shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
      <Icon name={icon} size={88} className="drop-shadow-[0_10px_14px_rgb(0_0_0/0.45)]" />
      <div className="min-w-0 flex-1 basis-[calc(100%-110px)]">{children}</div>
    </div>
  );
}

export function BannerTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-lg leading-tight font-semibold text-balance">{children}</h2>;
}

export function Intro({ icon, title, sub }: { icon: string; title: ReactNode; sub: ReactNode }) {
  return (
    <div className="flex items-center gap-[18px] pt-1">
      <Icon name={icon} size={96} />
      <div className="min-w-0">
        <h2 className="font-display text-[22px] leading-tight font-bold tracking-[-0.01em] text-balance">{title}</h2>
        <p className="mt-1.5 text-[13px] text-on-dark-2">{sub}</p>
      </div>
    </div>
  );
}

export function CountUp({ value, dec = 0 }: { value: number; dec?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useSeen(ref);
  const [shown, setShown] = useState(value);
  const played = useRef(false);
  useEffect(() => {
    if (!seen || REDUCED || played.current) {
      setShown(value);
      return;
    }
    played.current = true;
    return tween(1100, (p) => setShown(value * p));
  }, [seen, value]);
  return <span ref={ref}>{nf(shown, dec)}</span>;
}

export function Dot({ color }: { color: "t1" | "t2" }) {
  return <i className={`inline-block size-2.5 flex-none rounded-[3px] ${color === "t1" ? "bg-t1" : "bg-t2"}`} />;
}

export function Split({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-5">{children}</div>;
}

export function Stat({ k, v, s, dot }: { k: ReactNode; v: ReactNode; s?: ReactNode; dot?: "t1" | "t2" }) {
  return (
    <div className="flex min-w-0 flex-col gap-[5px] border-t border-line pt-4">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        {dot && <Dot color={dot} />}
        {k}
      </p>
      <p className="font-display text-[17px] font-semibold tabular-nums">{v}</p>
      {s && <p className="text-xs text-ink-2 tabular-nums">{s}</p>}
    </div>
  );
}

export function Delta({ pct, long = false }: { pct: number; long?: boolean }) {
  return (
    <span className="self-start rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line)]">
      {pct >= 0 ? "▲" : "▼"} {nf(Math.abs(pct))} %{long ? " na den proti minulému období" : ""}
    </span>
  );
}

export function Readout({ children }: { children: ReactNode }) {
  return <p className="min-h-[42px] border-t border-line pt-[18px] text-[13px] leading-relaxed text-ink-2 tabular-nums [&_b]:text-ink">{children}</p>;
}

export const btnCls =
  "press inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 text-[15px] font-semibold disabled:opacity-50";
