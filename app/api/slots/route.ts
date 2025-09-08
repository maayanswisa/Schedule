import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";

/** עוזר: תחילת שבוע (ראשון) ב-00:00 מקומי של השרת */
function startOfWeekLocal(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay(); // Sunday=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function toISODate(d: Date) {
  // ISO ללא זמן (YYYY-MM-DD) ואז נרכיב טווחי זמן
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/* ───────── Types ───────── */
type SlotRow = {
  id: string;
  starts_at: string; // ISO
  ends_at: string;   // ISO
  is_booked: boolean;
};

type PublicSlot = {
  id: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  isBooked: boolean;
};

type PublicSlotsResponse =
  | { ok: true; data: PublicSlot[] }
  | { ok: false; error: string };

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStartStr = searchParams.get("weekStart"); // YYYY-MM-DD אופציונלי
    const weekStart = weekStartStr
      ? new Date(`${weekStartStr}T00:00:00`)
      : startOfWeekLocal();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7); // עד (בלעדי) שבוע קדימה

    // הופכים לטווחי ISO מלאים (UTC) כדי להשוות מול timestamptz
    const fromIso = `${toISODate(weekStart)}T00:00:00.000Z`;
    const toIso = `${toISODate(weekEnd)}T00:00:00.000Z`;

    const { data, error } = await supabaseServer
  .from("slots")
  .select("id, starts_at, ends_at, is_booked")
  .gte("starts_at", fromIso)
  .lt("starts_at", toIso)
  .order("starts_at", { ascending: true })
  .returns<SlotRow[]>(); // ← כאן הטיפוס הנכון

if (error) {
  return NextResponse.json(
    { ok: false, error: error.message } as const,
    { status: 500 }
  );
}

const rows: SlotRow[] = data ?? [];
const mapped: PublicSlot[] = rows.map((s) => ({
  id: s.id,
  startsAt: s.starts_at,
  endsAt: s.ends_at,
  isBooked: Boolean(s.is_booked),
}));

    return NextResponse.json(
      { ok: true, data: mapped } satisfies PublicSlotsResponse
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json(
      { ok: false, error: msg } satisfies PublicSlotsResponse,
      { status: 500 }
    );
  }
}
