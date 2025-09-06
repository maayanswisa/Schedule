"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import BookingModal from "../components/BookingModal";

/* ---- Types ---- */
type Slot = {
  id: string;
  startsAt: string;
  endsAt: string;
  isBooked: boolean;
};

type AppSettings = {
  hours_from: number;
  hours_to: number;
  tz: string;
};

const dayLabels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

/* ---- Helpers ---- */
function startOfWeekLocal(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
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
function hourlyRows(from: number, to: number): number[] {
  const rows: number[] = [];
  for (let h = from; h < to; h++) rows.push(h * 60);
  return rows;
}

/* ---- Component ---- */
export default function PublicSchedule() {
  const [weekStart, setWeekStart] = useState(() => startOfWeekLocal());

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const matrix = useMemo(() => {
    const m = new Map<number, Map<number, Slot>>();
    for (const s of slots) {
      const d = new Date(s.startsAt);
      const dow = d.getDay();
      const startMin = minutesOfDay(d);
      if (startMin % 60 !== 0) continue;
      if (!m.has(dow)) m.set(dow, new Map());
      m.get(dow)!.set(startMin, s);
    }
    return m;
  }, [slots]);

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
    <main
      className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50"
      dir="rtl"
    >
      <div className="mx-auto max-w-6xl p-6 lg:p-8 space-y-6">
        {/* כותרת */}
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-500 to-teal-800 bg-clip-text text-transparent">
              הזמן ללמוד הוא עכשיו – תפסו את המקום שלכם
            </span>
          </h1>
          <p  className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              
              לומדים חכם – מצליחים מהר🎓
            </p>
        </header>

        {/* ניווט שבועי */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-100/70 bg-white/90 p-3 shadow-sm backdrop-blur">
          <button
            onClick={prevWeek}
            className="rounded-xl border px-3 py-2 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition shadow-sm"
          >
            ‹ שבוע קודם
          </button>
          <button
            onClick={goToday}
            className="rounded-xl border px-3 py-2 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition shadow-sm"
          >
            שבוע נוכחי
          </button>
          <button
            onClick={nextWeek}
            className="rounded-xl border px-3 py-2 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition shadow-sm"
          >
            שבוע הבא ›
          </button>

          <div className="mx-3 hidden sm:block text-sm text-gray-300 select-none">|</div>

          <div className="font-medium text-gray-800">
            שבוע: <span className="tabular-nums">{headerRange}</span>
          </div>

          {settings && (
            <div className="ml-auto text-xs text-gray-500">
              טווח תצוגה: {settings.hours_from}:00–{settings.hours_to}:00
            </div>
          )}
        </div>

        {/* טבלה */}
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-12 rounded-2xl bg-white/60 ring-1 ring-black/5" />
            <div className="h-[460px] rounded-2xl bg-white/60 ring-1 ring-black/5" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
            <div className="mb-2 text-lg font-medium">אופס…</div>
            <div className="mb-4 text-gray-600">{error}</div>
            <button
              onClick={loadSlots}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99] transition"
            >
              נסו שוב
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white/95 shadow-lg ring-1 ring-black/5 p-3">
            <table className="min-w-[860px] w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="text-right text-gray-700">
                  <th className="w-24 border-b p-2 sticky top-0 bg-white/90 backdrop-blur text-gray-600">
                    שעה
                  </th>
                  {Array.from({ length: 7 }).map((_, dow) => {
                    const d = dateOfWeekDay(weekStart, dow);
                    return (
                      <th
                        key={dow}
                        className="border-b p-2 align-top sticky top-0 bg-white/90 backdrop-blur"
                      >
                        <div className="font-semibold text-gray-800">{dayLabels[dow]}</div>
                        <div className="text-xs text-gray-500 tabular-nums">{fmtDateShort(d)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

<tbody>
  {rowStarts.map((startMin, i) => {
    const hh = String(Math.floor(startMin / 60)).padStart(2, "0");
    const mm = String(startMin % 60).padStart(2, "0");
    const stripe = i % 2 === 1 ? "bg-gray-50/40" : "";
    return (
      <tr key={startMin} className={`border-t ${stripe}`}>
        {/* עמודת השעה */}
        <td className="p-2 text-center tabular-nums text-gray-600 align-middle h-12">
          {hh}:{mm}
        </td>

        {/* תאי הימים */}
        {Array.from({ length: 7 }).map((_, dow) => {
          const slot = matrix.get(dow)?.get(startMin) || null;
          const isFree = !!slot && !slot.isBooked;

          return (
            <td key={dow} className="p-2 align-top">
{slot ? (
  <button
    disabled={!isFree}
    onClick={() => { if (isFree) { setSelected(slot); setModalOpen(true); } }}
    title={`${fmtTimeTZ(slot.startsAt)}–${fmtTimeTZ(slot.endsAt)}`}
    aria-label={isFree ? "פנוי" : "תפוס"}
    className={`relative block w-full rounded-xl border text-center tabular-nums transition shadow-sm h-13
      flex items-center justify-center px-3
      ${
        isFree
          ? "bg-emerald-100/90 border-emerald-200 text-emerald-900 hover:bg-emerald-200 hover:shadow"
          : "bg-red-100/90 border-red-200 text-red-900 cursor-not-allowed"
      }`}
  >
    <span className="font-medium">
      {fmtTimeTZ(slot.startsAt)}–{fmtTimeTZ(slot.endsAt)}
    </span>

    {/* באדג' בפינה – לא מפריע לשעה */}
    {!isFree && (
      <span className="absolute bottom-1 left-1 text-[10px] leading-none rounded-full bg-red-200/85 px-11 py-[2px] pointer-events-none">
        תפוס
      </span>
    )}
  </button>
) : (
  <div className="h-12 rounded-xl border border-dashed border-gray-200 hover:bg-gray-50/60 transition" />
)}

            </td>
          );
        })}
      </tr>
    );
  })}
</tbody>

            </table>

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
          onBooked={() => { loadSlots(); }}
          tz={tz}
        />
      </div>
    </main>
  );
}
