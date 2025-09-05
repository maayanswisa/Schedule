"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";

// Keep this list in sync with ALLOWED_TZ on the server
const COMMON_TZ = [
  "Asia/Jerusalem",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
] as const;

// What the API returns on GET /api/settings
type SettingsResponse = {
  ok: boolean;
  data?: { hours_from: number; hours_to: number; tz: string };
  error?: string;
};

export default function AdminSettingsPage() {
  const [hoursFrom, setHoursFrom] = useState<number>(8);
  const [hoursTo, setHoursTo] = useState<number>(20);
  const [tz, setTz] = useState<string>("Asia/Jerusalem");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // fetch current settings on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const json: SettingsResponse = await res.json();
        if (!alive) return;
        if (!json.ok || !json.data) throw new Error(json.error || "Failed to load settings");
        setHoursFrom(json.data.hours_from);
        setHoursTo(json.data.hours_to);
        setTz(json.data.tz);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message || "שגיאה בטעינת הגדרות");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // client-side validation mirroring the API logic
  const validationError = useMemo(() => {
    if (!Number.isInteger(hoursFrom) || hoursFrom < 0 || hoursFrom > 23)
      return "שעת התחלה חייבת להיות מספר בין 0 ל-23";
    if (!Number.isInteger(hoursTo) || hoursTo < 1 || hoursTo > 24)
      return "שעת סיום חייבת להיות מספר בין 1 ל-24";
    if (hoursFrom >= hoursTo)
      return "שעת התחלה חייבת להיות קטנה משעת הסיום";
    if (!tz || typeof tz !== "string") return "אזור זמן לא תקין";
    const re = /^[A-Za-z]+(?:[_-][A-Za-z]+)*(?:\/[A-Za-z]+(?:[_-][A-Za-z]+)*)+$/;
    if (!COMMON_TZ.includes(tz as any) && !re.test(tz))
      return "אזור זמן בפורמט IANA (למשל Europe/Berlin)";
    return null;
  }, [hoursFrom, hoursTo, tz]);

  const save = useCallback(async () => {
    setMsg(null);
    setErr(null);
    if (validationError) {
      setErr(validationError);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours_from: hoursFrom, hours_to: hoursTo, tz }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error || "שמירה נכשלה");
      setMsg("ההגדרות נשמרו בהצלחה");
    } catch (e: any) {
      setErr(e?.message || "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }, [hoursFrom, hoursTo, tz, validationError]);

  // options 0..24
  const hourOptions = useMemo(() => Array.from({ length: 25 }, (_, h) => h), []);

  const preview = useMemo(() => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hoursFrom)}:00 → ${pad(hoursTo)}:00`;
  }, [hoursFrom, hoursTo]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl p-6" dir="rtl">
        <h1 className="mb-4 text-2xl font-semibold">הגדרות מערכת</h1>
        <div className="animate-pulse rounded-2xl bg-gray-100 p-6">טוען…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6" dir="rtl">
      <h1 className="mb-4 text-2xl font-semibold">הגדרות מערכת</h1>

            <div className="flex justify-end mb-4">
  <Link
    href="/admin"
    className="rounded border px-4 py-2 hover:bg-gray-50"
  >
    חזרה למערכת שעות
  </Link>
</div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm" htmlFor="hours_from">
            שעת התחלה (כולל)
            <select
              id="hours_from"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={hoursFrom}
              onChange={(e) => setHoursFrom(parseInt(e.target.value, 10))}
            >
              {hourOptions.slice(0, 24).map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm" htmlFor="hours_to">
            שעת סיום 
            <select
              id="hours_to"
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={hoursTo}
              onChange={(e) => setHoursTo(parseInt(e.target.value, 10))}
            >
              {hourOptions.slice(1).map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>

          <label className="col-span-1 sm:col-span-2 block text-sm" htmlFor="tz_input">
            אזור זמן (IANA)
            <div className="mt-1 flex gap-2">
              <select
                className="w-1/2 rounded-md border px-3 py-2"
                value={COMMON_TZ.includes(tz as any) ? tz : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setTz(v || tz);
                }}
                aria-label="Timezone preset"
              >
                <option value="">אחר…</option>
                {COMMON_TZ.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
              <input
                id="tz_input"
                className="w-1/2 rounded-md border px-3 py-2"
                placeholder="למשל Europe/Berlin"
                value={tz}
                onChange={(e) => setTz(e.target.value)}
              />
            </div>
          </label>
        </div>

        <div className="mb-3 text-sm text-gray-600">
          <b>תצוגה מקדימה של טווח שעות:</b> {preview}
        </div>

        {err && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-red-700">
            {err}
          </div>
        )}
        {msg && (
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
            {msg}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setErr(null);
              setMsg(null);
              setLoading(true);
              fetch("/api/settings", { cache: "no-store" })
                .then((r) => r.json())
                .then((json: SettingsResponse) => {
                  if (!json.ok || !json.data) throw new Error(json.error || "");
                  setHoursFrom(json.data.hours_from);
                  setHoursTo(json.data.hours_to);
                  setTz(json.data.tz);
                })
                .catch((e) => setErr(e?.message || "שגיאה בטעינה מחדש"))
                .finally(() => setLoading(false));
            }}
            className="rounded-lg border px-4 py-2 hover:bg-gray-50"
          >
            שחזור
          </button>

          <button
            onClick={save}
            disabled={!!validationError || saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {saving ? "שומר…" : "שמירה"}
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        טיפ: הטופס מאמת את אותם החוקים של ה-API (0≤from&lt;to≤24). שינוי אזור הזמן ישפיע על חישובי התאריכים וההמרות בצד הלקוח.
      </p>
    </div>
  );
}
