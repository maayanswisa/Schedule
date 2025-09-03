import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";
import { startOfWeek } from "@/app/lib/workingHours";

type SlotRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  is_booked: boolean;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStartParam = searchParams.get("weekStart");
  const weekStart = weekStartParam ? new Date(weekStartParam + "T00:00:00") : startOfWeek();

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const { data, error } = await supabaseServer
    .from("slots")
    .select("id, starts_at, ends_at, is_booked")
    .gte("starts_at", weekStart.toISOString())
    .lt("starts_at", weekEnd.toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as SlotRow[];
  const slots = rows.map((s: SlotRow) => ({
    id: s.id,
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    isBooked: s.is_booked,
  }));

  return NextResponse.json({ ok: true, weekStart: weekStart.toISOString(), slots });
}
