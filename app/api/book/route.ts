import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";
import { sendBookingEmails } from "@/app/lib/mailer";

function isValidEmail(s: string) {
  return /.+@.+\..+/.test(s);
}
function isValidPhone(s: string) {
  const t = String(s || "").replace(/\s|-/g, "");
  // כללי: ספרות/+, סוגריים, לפחות 6 תווים
  return /^[+()0-9]{6,}$/.test(t);
  // לאומי (ישראל) מחמיר:
  // return /^(?:\+972|0)5\d{8}$/.test(t.replace(/[()]/g, ""));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slotId, studentName, studentEmail, studentPhone, note } = body ?? {};

    // שדות חובה
    if (!slotId || !studentName || !studentEmail || !studentPhone) {
      return NextResponse.json(
        { ok: false, error: "שדות חובה חסרים (slotId, studentName, studentEmail, studentPhone)" },
        { status: 400 }
      );
    }
    // ולידציות בסיסיות
    if (!isValidEmail(studentEmail)) {
      return NextResponse.json({ ok: false, error: "אימייל לא תקין" }, { status: 400 });
    }
    if (!isValidPhone(studentPhone)) {
      return NextResponse.json({ ok: false, error: "מספר פלאפון לא תקין" }, { status: 400 });
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
    // נדרש ש-RPC book_slot יקבל גם p_student_phone וישמור אותו ב-bookings.student_phone
    const { data, error } = await supabaseServer.rpc("book_slot", {
      p_slot_id: slotId,
      p_student_name: studentName,
      p_student_email: studentEmail,
      p_student_phone: studentPhone,
      p_note: note ?? null,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "המשבצת כבר תפוסה" }, { status: 409 });
    }

    // שליחת מיילים (לא חוסם)
    sendBookingEmails({
      studentName,
      studentEmail,
      studentPhone,           // יופיע בעותק למנהלת
      startsAtISO: slotRow.starts_at,
      endsAtISO: slotRow.ends_at,
      note,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "שגיאת שרת" }, { status: 500 });
  }
}
