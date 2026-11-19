import { useCallback, useEffect, useRef, useState } from "react";
import type { Reading, Settings } from "../types";
import { DEFAULTS } from "./model";

interface DocSnap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
  metadata?: { fromCache?: boolean };
}
interface QuerySnap {
  docs: DocSnap[];
  metadata?: { fromCache?: boolean };
}
interface DocRef {
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(next: (s: DocSnap) => void, error?: (e: unknown) => void): () => void;
}
interface Db {
  doc(path: string): DocRef;
  collection(path: string): {
    doc(id: string): DocRef;
    onSnapshot(next: (s: QuerySnap) => void, error?: (e: unknown) => void): () => void;
  };
}
export interface Sample {
  json(prompt: string, options?: { images?: File[]; signal?: AbortSignal }): Promise<unknown>;
  limits(): Promise<{ images?: unknown }>;
}

declare global {
  interface Window {
    claude?: { use(name: string): Promise<unknown> };
  }
}

const isReading = (r: unknown): r is Reading => {
  const x = r as Reading;
  return !!x && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && Number.isFinite(x.t1) && Number.isFinite(x.t2);
};

export function useStore() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [sample, setSample] = useState<Sample | null>(null);
  const [canImages, setCanImages] = useState(false);
  const db = useRef<Db | null>(null);

  useEffect(() => {
    let dead = false;
    const off: Array<() => void> = [];
    const fallback = setTimeout(() => setLoaded(true), 6000);
    let slow: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const c = window.claude;
      if (!c || !c.use) {
        setLoaded(true);
        setNotice("Data se tady nedají načíst. Otevřete stránku přes Clauda a přihlaste se.");
        return;
      }
      c.use("sample").then(async (s) => {
        if (!s || dead) return;
        const smp = s as Sample;
        setSample(() => smp);
        const lim = await smp.limits().catch(() => null);
        if (!dead) setCanImages(!!(lim && lim.images));
      });
      const store = (await c.use("db")) as Db | null;
      if (dead) return;
      if (!store) {
        setLoaded(true);
        setNotice("Odečty se nepodařilo načíst. Zkontrolujte, že jste přihlášení ke Claudovi.");
        return;
      }
      db.current = store;
      slow = setTimeout(() => setNotice("Odečty se zatím nedaří načíst. Zkontrolujte připojení, stránka to zkouší dál."), 10000);
      off.push(
        store.collection("readings").onSnapshot(
          (snap) => {
            const list = snap.docs
              .map((d) => d.data() as unknown)
              .filter(isReading)
              .map((r) => ({ date: r.date, t1: r.t1, t2: r.t2 }))
              .sort((a, b) => (a.date < b.date ? -1 : 1));
            setReadings(list);
            setLoaded(true);
            if (!snap.metadata || !snap.metadata.fromCache) {
              clearTimeout(slow);
              setNotice("");
            }
          },
          () => {
            clearTimeout(slow);
            setLoaded(true);
            setNotice("Odečty se nepodařilo načíst. Zavřete stránku a otevřete ji znovu.");
          },
        ),
      );
      off.push(
        store.doc("settings/main").onSnapshot(
          (snap) => {
            if (!snap.exists) return;
            const d = snap.data() || {};
            const next = { ...DEFAULTS } as Record<string, unknown>;
            for (const k of Object.keys(DEFAULTS) as Array<keyof Settings>) {
              if (typeof d[k] === typeof DEFAULTS[k]) next[k] = d[k];
            }
            setSettings(next as unknown as Settings);
          },
          () => {},
        ),
      );
    })();

    return () => {
      dead = true;
      clearTimeout(fallback);
      clearTimeout(slow);
      off.forEach((f) => f());
    };
  }, []);

  const saveSettings = useCallback(async (next: Settings) => {
    setSettings(next);
    if (!db.current) return "local" as const;
    try {
      await db.current.doc("settings/main").set({ ...next });
      return "saved" as const;
    } catch {
      return "error" as const;
    }
  }, []);

  const saveReading = useCallback(async (r: Reading, source: "photo" | "manual", replaces: string | null) => {
    if (!db.current) throw { code: "no_db" };
    const col = db.current.collection("readings");
    await col.doc(r.date).set({ ...r, source, savedAt: new Date().toISOString() });
    if (replaces && replaces !== r.date) await col.doc(replaces).delete();
  }, []);

  const deleteReading = useCallback(async (date: string) => {
    if (!db.current) throw { code: "no_db" };
    await db.current.collection("readings").doc(date).delete();
  }, []);

  return { readings, settings, loaded, notice, sample, canImages, saveSettings, saveReading, deleteReading };
}

export type Store = ReturnType<typeof useStore>;
