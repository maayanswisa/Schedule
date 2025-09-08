import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";

type CreateSlotBody = {
  startLocal: string;       // למשל '2025-10-01T14:30'
  durationMin?: number;     // ברירת מחדל: 60
};

type SlotInsert = {
  starts_at: string;        // ISO UTC
  ends_at: string;          // ISO UTC
  is_booked: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CreateSlotBody>;

    const startLocal = body?.startLocal;
    const durationMin = Number(body?.durationMin ?? 60);

    if (!startLocal) {
      return NextResponse.json({ ok: false, error: "חסר startLocal" }, { status: 400 });
    }
    if (Number.isNaN(durationMin) || durationMin <= 0) {
      return NextResponse.json({ ok: false, error: "durationMin לא תקין" }, { status: 400 });
    }

    // מפענח כמקומי בשרת ומומר ל-UTC ב-ISO
    const start = new Date(startLocal);
    const end = new Date(start.getTime() + durationMin * 60 * 1000);

    const payload: SlotInsert = {
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      is_booked: false,
    };

    const { error } = await supabaseServer
      .from("slots")
      .upsert(payload, { onConflict: "starts_at,ends_at", ignoreDuplicates: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
