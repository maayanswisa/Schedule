"use client";

import { useEffect, useState } from "react";

export type AppSettings = {
  hours_from: number;
  hours_to: number;
  tz: string;
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // no-store כדי שתמיד נקבל את ההגדרות המעודכנות מאדמין
        const res = await fetch("/api/settings", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (!json.ok || !json.data) throw new Error(json.error || "Failed to load settings");
        setSettings(json.data);
      } catch (e: any) {
        setErr(e?.message || "שגיאה בטעינת הגדרות");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return { settings, loading, err };
}
