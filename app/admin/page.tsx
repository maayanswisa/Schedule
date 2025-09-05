"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";

type AdminSlot = {
  id: string;
  starts_at: string; // ISO
  ends_at: string;   // ISO
  is_booked: boolean;
};

type AppSettings = {
  hours_from: number; // 0..23
  hours_to: number;   // 1..24 (מציגים [from,to))
  tz: string;         // לדוגמה 'Asia/Jerusalem'
};

const dayLabels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/* ─────────────── Helpers ─────────────── */

function startOfWeekLocal(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay(); // Sunday=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toYMD(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function fmtDateFull(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function fmtDateShort(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}

function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function dateOfWeekDay(weekStart: Date, dow: number) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dow);
  return d;
}

/** יוצר שורות כל שעה עגולה לפי טווח [from, to) */
function hourlyRows(from: number, to: number): number[] {
  const rows: number[] = [];
  for (let h = from; h < to; h++) rows.push(h * 60);
  return rows;
}

/* ─────────────── Component ─────────────── */

export default function AdminHome() {
  const [weekStart, setWeekStart] = useState(() => startOfWeekLocal());
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  // NEW: הגדרות מערכת
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // טעינת הגדרות פעם אחת (או בכל כניסה לדף)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoadingSettings(true);
        const r = await fetch("/api/settings", { cache: "no-store" });
        const j = await r.json();
        if (!ignore && j?.ok && j.data) {
          setSettings({
            hours_from: j.data.hours_from ?? 7,
            hours_to: j.data.hours_to ?? 20,
            tz: j.data.tz ?? "Asia/Jerusalem",
          });
        } else if (!ignore) {
          setSettings({ hours_from: 7, hours_to: 20, tz: "Asia/Jerusalem" });
        }
      } catch {
        if (!ignore) setSettings({ hours_from: 7, hours_to: 20, tz: "Asia/Jerusalem" });
      } finally {
        if (!ignore) setLoadingSettings(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ymd = toYMD(weekStart);
      const res = await fetch(`/api/admin/slots?weekStart=${ymd}`, { cache: "no-store" });
      const json = await res.json();
      setSlots(json.slots || []);
    } catch {
      setError("שגיאה בטעינת המשבצות");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  // day -> startMin -> Slot (ממופים רק לשעות שלמות)
  const matrix = useMemo(() => {
    const m = new Map<number, Map<number, AdminSlot>>();
    for (const s of slots) {
      const d = new Date(s.starts_at);
      const dow = d.getDay();
      const startMin = minutesOfDay(d);
      if (startMin % 60 !== 0) continue; // רק שעות עגולות
      if (!m.has(dow)) m.set(dow, new Map());
      const dayMap = m.get(dow)!;
      if (!dayMap.has(startMin)) dayMap.set(startMin, s);
    }
    return m;
  }, [slots]);

  // NEW: שורות לפי ההגדרות (נפילה ל-7..20 אם אין)
  const rowStarts = useMemo(() => {
    const from = settings?.hours_from ?? 7;
    const to = settings?.hours_to ?? 20;
    return hourlyRows(from, to);
  }, [settings]);

  function prevWeek() { const x = new Date(weekStart); x.setDate(x.getDate() - 7); setWeekStart(x); }
  function nextWeek() { const x = new Date(weekStart); x.setDate(x.getDate() + 7); setWeekStart(x); }
  function goToday() { setWeekStart(startOfWeekLocal(new Date())); }

  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const headerRange = `${fmtDateFull(weekStart)} – ${fmtDateFull(weekEnd)}`;

  // פונקציה לתצוגת שעה לפי ה-TZ שבהגדרות
  const timeZone = settings?.tz ?? "Asia/Jerusalem";
  const fmtTimeTZ = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
      }),
    [timeZone]
  );

  /* ── פעולות ───────────────── */

  async function toggle(slot: AdminSlot) {
    const url = slot.is_booked ? "/api/admin/release-slot" : "/api/admin/block-slot";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId: slot.id }),
    });
    const json = await res.json();
    if (!json.ok) {
      setToast(json.error || "שגיאה");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    setSlots(prev => prev.map(s => (s.id === slot.id ? { ...s, is_booked: !slot.is_booked } : s)));
    setToast(slot.is_booked ? "שוחרר" : "נחסם");
    setTimeout(() => setToast(""), 1200);
  }

  async function blockDay(ymd: string, dow: number) {
    const res = await fetch("/api/admin/block-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: ymd }),
    });
    const json = await res.json();
    if (!json.ok) {
      setToast(json.error || "שגיאה");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    setSlots(prev =>
      prev.map(s => (toYMD(new Date(s.starts_at)) === ymd ? { ...s, is_booked: true } : s))
    );
    setToast(`נחסמו ${json.count ?? ""} משבצות ביום ${dayLabels[dow]}`);
    setTimeout(() => setToast(""), 1200);
  }

  async function releaseDay(ymd: string, dow: number) {
    const res = await fetch("/api/admin/release-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: ymd }),
    });
    const json = await res.json();
    if (!json.ok) {
      setToast(json.error || "שגיאה");
      setTimeout(() => setToast(""), 2500);
      return;
    }
    setSlots(prev =>
      prev.map(s => (toYMD(new Date(s.starts_at)) === ymd ? { ...s, is_booked: false } : s))
    );
    setToast(`שוחררו ${json.count ?? ""} משבצות ביום ${dayLabels[dow]}`);
    setTimeout(() => setToast(""), 1200);
  }

  /* ─────────────── UI ─────────────── */

  const isLoading = loading || loadingSettings;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6" dir="rtl">
      {/* כותרת ניווט שבועי */}
      <div className="flex justify-end mb-4">
  <Link
    href="/admin/settings"
    className="rounded border px-4 py-2 hover:bg-gray-50"
  >
     הגדרת שעות←
  </Link>
</div>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 shadow-sm">
        <button onClick={prevWeek} className="rounded border px-3 py-2 hover:bg-gray-50">‹ שבוע קודם</button>
        <button onClick={goToday} className="rounded border px-3 py-2 hover:bg-gray-50">לשבוע הנוכחי</button>
        <button onClick={nextWeek} className="rounded border px-3 py-2 hover:bg-gray-50">שבוע הבא ›</button>
        <div className="mx-3 text-sm text-gray-500">|</div>
        <div className="font-medium">שבוע: <span className="tabular-nums">{headerRange}</span></div>
        {settings && (
          <div className="ml-auto text-xs text-gray-500">
            טווח תצוגה: {settings.hours_from}:00–{settings.hours_to}:00 · TZ: {settings.tz}
          </div>
        )}
      </div>

      {/* טבלת מערכת שעות */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 rounded-2xl bg-gray-100" />
          <div className="h-[440px] rounded-2xl border bg-white p-4 shadow-sm" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
          <div className="mb-2 text-lg font-medium">אופס…</div>
          <div className="mb-4 text-gray-600">{error}</div>
          <button onClick={load} className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800">נסי שוב</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white p-3 shadow-sm">
          <table className="min-w-[860px] w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="text-right text-gray-700">
                <th className="w-24 border-b p-2">שעה</th>
                {Array.from({ length: 7 }).map((_, dow) => {
                  const d = dateOfWeekDay(weekStart, dow);
                  const ymd = toYMD(d);
                  return (
                    <th key={dow} className="border-b p-2 align-top">
                      <div className="font-medium text-gray-700">{dayLabels[dow]}</div>
                      <div className="text-xs text-gray-500 tabular-nums">{fmtDateShort(d)}</div>
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <button
                          onClick={() => blockDay(ymd, dow)}
                          className="rounded bg-red-100 border border-red-200 text-red-800 text-[11px] px-2 py-0.5 hover:bg-red-200"
                        >
                          חסום
                        </button>
                        <button
                          onClick={() => releaseDay(ymd, dow)}
                          className="rounded bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] px-2 py-0.5 hover:bg-emerald-200"
                        >
                          שחרר
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {rowStarts.map((startMin) => {
                const hh = String(Math.floor(startMin / 60)).padStart(2, "0");
                const mm = String(startMin % 60).padStart(2, "0");
                return (
                  <tr key={startMin} className="border-t">
                    {/* עמודת השעה */}
                    <td className="p-2 text-center tabular-nums text-gray-600">{hh}:{mm}</td>

                    {/* תאי הימים */}
                    {Array.from({ length: 7 }).map((_, dow) => {
                      const slot = matrix.get(dow)?.get(startMin) || null;
                      return (
                        <td key={dow} className="p-2 align-top">
                          {slot ? (
                            <button
                              onClick={() => toggle(slot)}
                              className={`block w-full rounded-lg border px-2 py-2 text-center tabular-nums transition
                                ${slot.is_booked
                                  ? "bg-red-100 border-red-200 text-red-900 hover:bg-red-200"
                                  : "bg-emerald-100 border-emerald-200 text-emerald-900 hover:bg-emerald-200"}`}
                              title={`${fmtTimeTZ(slot.starts_at)}–${fmtTimeTZ(slot.ends_at)}`}
                              aria-label={slot.is_booked ? "תפוס" : "פנוי"}
                            >
                              {fmtTimeTZ(slot.starts_at)}–{fmtTimeTZ(slot.ends_at)}
                              {/* שימי לב: אם השדה הוא ends_at (עם קו תחתון), השתמשי בו: fmtTimeTZ(slot.ends_at) */}
                            </button>
                          ) : (
                            <div className="h-9 rounded-lg border border-dashed border-gray-200" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-4 rounded-xl bg-black px-3 py-2 text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
