import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";
import { generateSlotsForWeek, startOfWeek } from "@/app/lib/workingHours";

async function runSeed(weekStartParam?: string | null, lesson = 60, buffer = 0) {
  const weekStart = weekStartParam
    ? new Date(weekStartParam + "T00:00:00")
    : startOfWeek();

  const items = generateSlotsForWeek(weekStart, lesson, buffer);

  const { error } = await supabaseServer.from("slots").upsert(
    items.map((x) => ({
      starts_at: x.starts_at,
      ends_at: x.ends_at,
      is_booked: false,
    })),
    { onConflict: "starts_at,ends_at", ignoreDuplicates: true }
  );

  if (error) throw new Error(error.message);

  return { ok: true, inserted: items.length, weekStart: weekStart.toISOString() };
}

// בדיקה נוחה בדפדפן: GET /api/dev/seed-week?weekStart=YYYY-MM-DD&lesson=60&buffer=10
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart");
    const lesson = Number(searchParams.get("lesson") ?? 60);
    const buffer = Number(searchParams.get("buffer") ?? 0);
    const result = await runSeed(weekStart, lesson, buffer);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "seed failed" }, { status: 500 });
  }
}

// לשימוש מכפתור/POSTMAN: POST /api/dev/seed-week
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("weekStart");
    const lesson = Number(searchParams.get("lesson") ?? 60);
    const buffer = Number(searchParams.get("buffer") ?? 0);
    const result = await runSeed(weekStart, lesson, buffer);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "seed failed" }, { status: 500 });
  }
}
