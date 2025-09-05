"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import BookingModal from "../components/BookingModal";
import Link from "next/link";

// --- Types (מתאימים לראוט הציבורי /api/slots) ---
type Slot = {
  id: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  isBooked: boolean;
  
};

type AppSettings = {
  hours_from: number; // 0..23
  hours_to: number;   // 1..24 (מציגים [from,to))
  tz: string;         // למשל 'Asia/Jerusalem'
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

export default function PublicSchedule() {
  const [weekStart, setWeekStart] = useState(() => startOfWeekLocal());

  // הגדרות מערכת
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // סלוטים מה-API הציבורי
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // הזמנה
  const [selected, setSelected] = useState<Slot | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // --- load settings ---
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingSettings(true);
        const r = await fetch("/api/settings", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        if (j?.ok && j.data) {
          setSettings({
            hours_from: j.data.hours_from ?? 7,
            hours_to: j.data.hours_to ?? 20,
            tz: j.data.tz ?? "Asia/Jerusalem",
          });
        } else {
          setSettings({ hours_from: 7, hours_to: 20, tz: "Asia/Jerusalem" });
        }
      } catch {
        if (alive) setSettings({ hours_from: 7, hours_to: 20, tz: "Asia/Jerusalem" });
      } finally {
        if (alive) setLoadingSettings(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // --- load slots for week ---
  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    setError(null);
    try {
      const ymd = toYMD(weekStart);
      const res = await fetch(`/api/slots?weekStart=${ymd}`, { cache: "no-store" });
      const json = await res.json();
      const data = Array.isArray(json?.data) ? (json.data as Slot[]) : [];
      setSlots(data);
    } catch {
      setError("שגיאה בטעינת המשבצות");
    } finally {
      setLoadingSlots(false);
    }
  }, [weekStart]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // day -> startMin -> Slot (שעות עגולות בלבד)
  const matrix = useMemo(() => {
    const m = new Map<number, Map<number, Slot>>();
    for (const s of slots) {
      const d = new Date(s.startsAt);
      const dow = d.getDay();
      const startMin = minutesOfDay(d);
      if (startMin % 60 !== 0) continue; // רק שעות עגולות
      if (!m.has(dow)) m.set(dow, new Map());
      m.get(dow)!.set(startMin, s);
    }
    return m;
  }, [slots]);

  // שורות לפי ההגדרות
  const rowStarts = useMemo(() => {
    const from = settings?.hours_from ?? 7;
    const to = settings?.hours_to ?? 20;
    return hourlyRows(from, to);
  }, [settings]);

  // ניווט שבוע
  function prevWeek() { const x = new Date(weekStart); x.setDate(x.getDate() - 7); setWeekStart(x); }
  function nextWeek() { const x = new Date(weekStart); x.setDate(x.getDate() + 7); setWeekStart(x); }
  function goToday() { setWeekStart(startOfWeekLocal(new Date())); }

  // כותרת טווח
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const headerRange = `${fmtDateFull(weekStart)} – ${fmtDateFull(weekEnd)}`;

  // עיצוב שעה/תאריך לפי TZ
  const tz = settings?.tz ?? "Asia/Jerusalem";
  const fmtTimeTZ = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: tz,
      }),
    [tz]
  );

  const isLoading = loadingSettings || loadingSlots;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6" dir="rtl">
      {/* כותרת ראשית */}
      <header>
        <h1 className="text-2xl font-semibold">לוח שיעורים – מורה פרטית</h1>
        <p className="text-gray-600">שיבוץ שיעור בלחיצה על משבצת פנויה</p>
      </header>

      {/* כותרת ניווט שבועי – אותו עיצוב כמו אדמין, בלי כפתורי חסימה */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 shadow-sm">
        <button onClick={prevWeek} className="rounded border px-3 py-2 hover:bg-gray-50">‹ שבוע קודם</button>
        <button onClick={goToday} className="rounded border px-3 py-2 hover:bg-gray-50">שבוע נוכחי</button>
        <button onClick={nextWeek} className="rounded border px-3 py-2 hover:bg-gray-50">שבוע הבא ›</button>
        <div className="mx-3 text-sm text-gray-500">|</div>
        <div className="font-medium">שבוע: <span className="tabular-nums">{headerRange}</span></div>
        {settings && (
          <div className="ml-auto text-xs text-gray-500">
            טווח תצוגה: {settings.hours_from}:00–{settings.hours_to}:00 
          </div>
        )}
      </div>



      {/* טבלת מערכת שעות בעיצוב זהה */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-12 rounded-2xl bg-gray-100" />
          <div className="h-[440px] rounded-2xl border bg-white p-4 shadow-sm" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
          <div className="mb-2 text-lg font-medium">אופס…</div>
          <div className="mb-4 text-gray-600">{error}</div>
          <button onClick={loadSlots} className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800">נסו שוב</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white p-3 shadow-sm">
          <table className="min-w-[860px] w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="text-right text-gray-700">
                <th className="w-24 border-b p-2">שעה</th>
                {Array.from({ length: 7 }).map((_, dow) => {
                  const d = dateOfWeekDay(weekStart, dow);
                  return (
                    <th key={dow} className="border-b p-2 align-top">
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
                    {/* עמודת השעה */}
                    <td className="p-2 text-center tabular-nums text-gray-600 align-middle h-12">{hh}:{mm}</td>

                    {/* תאי הימים */}
                    {Array.from({ length: 7 }).map((_, dow) => {
                      const slot = matrix.get(dow)?.get(startMin) || null;
                      const isFree = !!slot && !slot.isBooked;
                      return (
                        <td key={dow} className="p-2 align-top">
                          {slot ? (
                            <button
                              disabled={!isFree}
                              
                              onClick={() => { if (isFree) { setSelected(slot) ; setModalOpen(true); } }}
                              
                              className={`block w-full rounded-lg border px-2 py-2 text-center tabular-nums transition
                                ${
                                  isFree
                                    ? "bg-emerald-100 border-emerald-200 text-emerald-900 hover:bg-emerald-200" 
                                    : "bg-red-100 border-red-200 text-red-900 cursor-not-allowed"
                                }`}
                                
                              title={`${fmtTimeTZ(slot.startsAt)}–${fmtTimeTZ(slot.endsAt)}`}
                              
                              aria-label={isFree ? "פנוי" : "תפוס"}
                              
                            >
                              {fmtTimeTZ(slot.startsAt)}–{fmtTimeTZ(slot.endsAt)}
                              <br/>
                              {!isFree && <span className="ml-1 text-[11px]">תפוס</span>}
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

          {/* מצב ריק */}
          {rowStarts.length > 0 && slots.length === 0 && (
            <div className="p-3 text-xs text-gray-500">אין משבצות לשבוע הזה.</div>
          )}
        </div>
      )}

      {/* מודל ההזמנה */}
      <BookingModal
        open={modalOpen}
        slot={selected}
        onClose={() => setModalOpen(false)}
        onBooked={() => {
          // רענון סלוטים אחרי הזמנה
          loadSlots();
        }}
        tz={tz}
      />
    </main>
  );
}
