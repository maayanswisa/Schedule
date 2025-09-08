import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";
import { sendBookingEmails } from "@/app/lib/mailer";

/* ───────── Types ───────── */
type BookBody = {
  slotId: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  note?: string | null;
};

type SlotRow = {
  starts_at: string;
  ends_at: string;
  is_booked: boolean;
};

type PgErrorLike = {
  code?: string;     // לדוגמה "23505" על כפילות
  message: string;
};

/* ───────── Validators ───────── */
function isValidEmail(s: string) {
  return /.+@.+\..+/.test(s);
}
function isValidPhone(s: string) {
  const t = String(s || "").replace(/\s|-/g, "");
  return /^[+()0-9]{6,}$/.test(t);
}

/* ───────── Handler ───────── */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<BookBody>;
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
      .single<SlotRow>();

    if (slotErr || !slotRow) {
      return NextResponse.json({ ok: false, error: "משבצת לא נמצאה" }, { status: 404 });
    }

    // הזמנה אטומית בפונקציה (מונעת כפילות)
    const { data, error } = await supabaseServer.rpc("book_slot", {
      p_slot_id: slotId,
      p_student_name: studentName,
      p_student_email: studentEmail,
      p_student_phone: studentPhone,
      p_note: note ?? null,
    });

    if (error) {
      const err = error as PgErrorLike;
      if (err.code === "23505") {
        // כפילות ייחודיות — המשבצת כבר נתפסה
        return NextResponse.json({ ok: false, error: "המשבצת כבר תפוסה" }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }

    if (!data) {
      // book_slot החזירה false -> המשבצת כבר תפוסה
      return NextResponse.json({ ok: false, error: "המשבצת כבר תפוסה" }, { status: 409 });
    }

    // שליחת מיילים (לא חוסם)
    sendBookingEmails({
      studentName,
      studentEmail,
      studentPhone,
      startsAtISO: slotRow.starts_at,
      endsAtISO: slotRow.ends_at,
      note: note ?? undefined,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "שגיאת שרת";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
