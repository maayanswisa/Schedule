import { useEffect, useState } from "react";

export type AppSettings = {
  hours_from: number;
  hours_to: number;
  tz: string;
};

type ApiSettingsResponse =
  | { ok: true; data: AppSettings }
  | { ok: false; error?: string };

export function useAppSettings() {
  const [data, setData] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const json = (await res.json()) as ApiSettingsResponse;
        if (!cancel) {
          if (json.ok) {
            setData(json.data);
          } else {
            setError(new Error(json.error ?? "Failed to load settings"));
          }
        }
      } catch (e: unknown) {
        if (!cancel) setError(e instanceof Error ? e : new Error("Failed to load settings"));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return { data, loading, error };
}
