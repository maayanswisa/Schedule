import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";

/** משחרר את כל המשבצות של יום נתון (לפי זמן מקומי) */
export async function POST(req: Request) {
  try {
    const { date } = await req.json(); // YYYY-MM-DD
    if (!date) {
      return NextResponse.json({ ok: false, error: "חסר date" }, { status: 400 });
    }

    const startLocal = new Date(`${date}T00:00:00`);
    const endLocal = new Date(startLocal);
    endLocal.setDate(endLocal.getDate() + 1);

    const { data, error } = await supabaseServer
      .from("slots")
      .update({ is_booked: false })
      .gte("starts_at", startLocal.toISOString())
      .lt("starts_at", endLocal.toISOString())
      .select("id"); // בלי options

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: data?.length ?? 0 });
  } catch {
    return NextResponse.json({ ok: false, error: "שגיאת שרת" }, { status: 500 });
  }
}
