import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";
import { generateSlotsForWeek } from "@/app/lib/workingHours";

type SeedOneWeekBody = {
  weekStart: string; // YYYY-MM-DD
  lesson?: number;   // דקות, ברירת מחדל 60
  buffer?: number;   // דקות, ברירת מחדל 0
};

type SlotInsert = {
  starts_at: string;
  ends_at: string;
  is_booked: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SeedOneWeekBody>;

    const weekStart = body.weekStart;
    const lesson = Number(body.lesson ?? 60);
    const buffer = Number(body.buffer ?? 0);

    if (!weekStart) {
      return NextResponse.json({ ok: false, error: "weekStart נדרש" }, { status: 400 });
    }
    if (Number.isNaN(lesson) || lesson <= 0) {
      return NextResponse.json({ ok: false, error: "lesson לא תקין" }, { status: 400 });
    }
    if (Number.isNaN(buffer) || buffer < 0) {
      return NextResponse.json({ ok: false, error: "buffer לא תקין" }, { status: 400 });
    }

    const ws = new Date(`${weekStart}T00:00:00`);
    const items: SlotInsert[] = generateSlotsForWeek(ws, lesson, buffer).map((x) => ({
      ...x,
      is_booked: false,
    }));

    const { error } = await supabaseServer
      .from("slots")
      .upsert(items, { onConflict: "starts_at,ends_at", ignoreDuplicates: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inserted: items.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "seed failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
