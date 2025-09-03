import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";

/** חסימת משבצת (סימון כתפוסה) ע"י אדמין */
export async function POST(req: Request) {
  try {
    const { slotId } = await req.json();
    if (!slotId) {
      return NextResponse.json({ ok: false, error: "חסר slotId" }, { status: 400 });
    }

    // מסמנים כתפוס. לא נוגעים ב-bookings (אין צורך ליצור רשומה להזמנה כדי "לחסום")
    const { data, error } = await supabaseServer
      .from("slots")
      .update({ is_booked: true })
      .eq("id", slotId)
      .select("id, is_booked")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "משבצת לא נמצאה" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, isBooked: true });
  } catch {
    return NextResponse.json({ ok: false, error: "שגיאת שרת" }, { status: 500 });
  }
}
