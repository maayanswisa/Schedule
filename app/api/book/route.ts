import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";
import { sendBookingEmails } from "@/app/lib/mailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slotId, studentName, studentEmail, note } = body ?? {};

    if (!slotId || !studentName) {
      return NextResponse.json({ ok: false, error: "חסר slotId או studentName" }, { status: 400 });
    }

    // מושכים את המשבצת כדי לדעת זמנים למייל
    const { data: slotRow, error: slotErr } = await supabaseServer
      .from("slots")
      .select("starts_at, ends_at, is_booked")
      .eq("id", slotId)
      .single();

    if (slotErr || !slotRow) {
      return NextResponse.json({ ok: false, error: "משבצת לא נמצאה" }, { status: 404 });
    }

    // הזמנה אטומית בפונקציה (מונעת כפילות)
    const { data, error } = await supabaseServer.rpc("book_slot", {
      p_slot_id: slotId,
      p_student_name: studentName,
      p_student_email: studentEmail ?? null,
      p_note: note ?? null,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "המשבצת כבר תפוסה" }, { status: 409 });
    }

    // שליחת מיילים (לא חוסם את התגובה אם ייכשל)
    sendBookingEmails({
      studentName,
      studentEmail,
      startsAtISO: slotRow.starts_at,
      endsAtISO: slotRow.ends_at,
      note,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "שגיאת שרת" }, { status: 500 });
  }
}
