import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";
import { generateSlotsForWeek, startOfWeek } from "@/app/lib/workingHours";

type SlotInsert = {
  starts_at: string;
  ends_at: string;
  is_booked: boolean;
};

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const weekStartParam = searchParams.get("weekStart"); // YYYY-MM-DD
    const weeks = Number(searchParams.get("weeks") ?? 4);
    const lesson = Number(searchParams.get("lesson") ?? 60);
    const buffer = Number(searchParams.get("buffer") ?? 0);

    if (Number.isNaN(weeks) || weeks <= 0) {
      return NextResponse.json({ ok: false, error: "weeks לא תקין" }, { status: 400 });
    }
    if (Number.isNaN(lesson) || lesson <= 0) {
      return NextResponse.json({ ok: false, error: "lesson לא תקין" }, { status: 400 });
    }
    if (Number.isNaN(buffer) || buffer < 0) {
      return NextResponse.json({ ok: false, error: "buffer לא תקין" }, { status: 400 });
    }

    // נקודת בסיס לשבוע הראשון
    const base = weekStartParam
      ? new Date(`${weekStartParam}T00:00:00`)
      : startOfWeek();

    const all: SlotInsert[] = [];

    for (let i = 0; i < weeks; i++) {
      const ws = new Date(base);
      ws.setDate(base.getDate() + i * 7);

      // generateSlotsForWeek אמור להחזיר { starts_at, ends_at } ב-ISO (UTC או לוקלי, לפי המימוש שלך)
      const items = generateSlotsForWeek(ws, lesson, buffer).map((x) => ({
        ...x,
        is_booked: false,
      }));
      all.push(...items);
    }

    const { error } = await supabaseServer
      .from("slots")
      .upsert(all, { onConflict: "starts_at,ends_at", ignoreDuplicates: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inserted: all.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "seed failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
