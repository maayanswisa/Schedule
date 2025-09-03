"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import BookingModal from "@/components/BookingModal";
import type { Slot } from "@/app/types";

const dayLabels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/** תחילת שבוע (א׳) בשעון מקומי */
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
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" });
}
function minutesOfDay(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}
function dateOfWeekDay(weekStart: Date, dow: number) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dow);
  return d;
}

/** שורות קבועות: 07:00 → 21:00 (סוף לא כולל), בקפיצות שעה */
function hourlyRows_7_to_21(): number[] {
  const rows: number[] = [];
  for (let h = 7; h < 21; h++) rows.push(h * 60); // 07:00..20:00
  return rows;
}

export default function WeekGrid() {
  const [weekStart, setWeekStart] = useState(() => startOfWeekLocal());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Slot | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ymd = toYMD(weekStart);
      const res = await fetch(`/api/slots?weekStart=${ymd}`, { cache: "no-store" });
      const json = await res.json();
      setSlots(json.slots || []);
    } catch {
      setError("תקלה בטעינת המשבצות");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  /** מפה מהירה: day -> startMin (שעה עגולה) -> Slot שמתאים */
  const matrix = useMemo(() => {
    const m = new Map<number, Map<number, Slot>>();
    for (const s of slots) {
      const d = new Date(s.startsAt);
      const dow = d.getDay();
      const startMin = minutesOfDay(d);
      // נכניס רק אם מתחיל בשעה עגולה (דקות = 0)
      if (startMin % 60 !== 0) continue;
      if (!m.has(dow)) m.set(dow, new Map());
      const dayMap = m.get(dow)!;
      // אם יש כמה, נשאיר את הראשון (או העדכני – לא קריטי)
      if (!dayMap.has(startMin)) dayMap.set(startMin, s);
    }
    return m;
  }, [slots]);

  const rowStarts = useMemo(() => hourlyRows_7_to_21(), []);

  function prevWeek() {
    const x = new Date(weekStart);
    x.setDate(x.getDate() - 7);
    setWeekStart(x);
  }
  function nextWeek() {
    const x = new Date(weekStart);
    x.setDate(x.getDate() + 7);
    setWeekStart(x);
  }
  function goToday() {
    setWeekStart(startOfWeekLocal(new Date()));
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const headerRange = `${fmtDateFull(weekStart)} – ${fmtDateFull(weekEnd)}`;

  if (loading)
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 rounded-2xl bg-gray-100" />
        <div className="h-[440px] rounded-2xl border bg-white p-4 shadow-sm" />
      </div>
    );

  if (error)
    return (
      <div className="rounded-2xl border bg-white p-6 text-center shadow-sm" dir="rtl">
        <div className="mb-2 text-lg font-medium">אופס…</div>
        <div className="mb-4 text-gray-600">{error}</div>
        <button onClick={load} className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800">
          נסי שוב
        </button>
      </div>
    );

  return (
    <div className="relative space-y-4" dir="rtl">
      {/* כותרת ניווט שבועי */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="rounded border px-3 py-2 hover:bg-gray-50">‹ שבוע קודם</button>
          <button onClick={goToday} className="rounded border px-3 py-2 hover:bg-gray-50">לשבוע הנוכחי</button>
          <button onClick={nextWeek} className="rounded border px-3 py-2 hover:bg-gray-50">שבוע הבא ›</button>
        </div>
        <div className="mx-3 text-sm text-gray-500">|</div>
        <div className="font-medium">שבוע: <span className="tabular-nums">{headerRange}</span></div>
      </div>

      {/* טבלת מערכת שעות – בלי עמודת "שיעור" */}
      <div className="overflow-x-auto rounded-2xl border bg-white p-3 shadow-sm">
        <table className="min-w-[860px] w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="text-right text-gray-700">
              <th className="w-24 border-b p-2">שעה</th>
              {Array.from({ length: 7 }).map((_, dow) => {
                const d = dateOfWeekDay(weekStart, dow);
                return (
                  <th key={dow} className="border-b p-2">
                    <div className="font-medium text-gray-700">{dayLabels[dow]}</div>
                    <div className="text-xs text-gray-500 tabular-nums">{fmtDateShort(d)}</div>
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
                  {/* עמודת שעה בלבד */}
                  <td className="p-2 text-center tabular-nums text-gray-600">{hh}:{mm}</td>

                  {/* 7 הימים */}
                  {Array.from({ length: 7 }).map((_, dow) => {
                    const slot = matrix.get(dow)?.get(startMin) || null;
                    return (
                      <td key={dow} className="p-2 align-top">
                        {slot ? (
                          <button
                            disabled={slot.isBooked}
                            onClick={() => setActive(slot)}
                            className={`block w-full rounded-lg border px-2 py-2 text-center tabular-nums transition
                              ${slot.isBooked
                                ? "cursor-not-allowed bg-red-100 border-red-200 text-red-900"
                                : "bg-emerald-100 border-emerald-200 text-emerald-900 hover:bg-emerald-200"}`}
                            title={`${fmtTime(slot.startsAt)}–${fmtTime(slot.endsAt)}`}
                            aria-label={
                              slot.isBooked
                                ? `תפוס ${fmtTime(slot.startsAt)}–${fmtTime(slot.endsAt)}`
                                : `פנוי ${fmtTime(slot.startsAt)}–${fmtTime(slot.endsAt)}`
                            }
                          >
                            {fmtTime(slot.startsAt)}–{fmtTime(slot.endsAt)}{" "}
                            <span className="font-semibold">{slot.isBooked ? "תפוס" : "פנוי"}</span>
                          </button>
                        ) : (
                          // תא ריק – אין משבצת שמתחילה בשעה עגולה זו
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

      {/* מודל הזמנה */}
      <BookingModal
        open={!!active}
        slot={active}
        onClose={() => setActive(null)}
        onBooked={(slotId) => {
          setSlots(prev => prev.map(s => (s.id === slotId ? { ...s, isBooked: true } : s)));
        }}
      />
    </div>
  );
}
