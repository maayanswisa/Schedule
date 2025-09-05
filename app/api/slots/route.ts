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
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStartStr = searchParams.get("weekStart"); // YYYY-MM-DD אופציונלי
    const weekStart = weekStartStr ? new Date(weekStartStr + "T00:00:00") : startOfWeekLocal();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7); // עד (בלעדי) שבוע קדימה

    // הופכים לטווחי ISO מלאים (UTC) כדי להשוות מול timestamptz
    const fromIso = toISODate(weekStart) + "T00:00:00.000Z";
    const toIso   = toISODate(weekEnd)   + "T00:00:00.000Z";

    // ⚠️ שם הטבלה: לפי הקוד שלך השדות הם starts_at/ends_at/is_booked, נניח שהטבלה היא 'slots'
    const { data, error } = await supabaseServer
      .from("slots")
      .select("id, starts_at, ends_at, is_booked")
      .gte("starts_at", fromIso)
      .lt("starts_at", toIso)
      .order("starts_at", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // החזרה בפורמט שהדף הציבורי מצפה לו (camelCase)
    const mapped = (data ?? []).map((s: any) => ({
      id: s.id,
      startsAt: s.starts_at,
      endsAt: s.ends_at,
      isBooked: !!s.is_booked,
    }));

    return NextResponse.json({ ok: true, data: mapped });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
