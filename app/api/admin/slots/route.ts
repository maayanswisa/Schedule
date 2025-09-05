import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";
import { startOfWeek } from "@/app/lib/workingHours";

type BookingBrief = {
  slot_id: string;
  student_name: string;
  student_email: string | null;
  note: string | null;
  created_at: string;
};

type SlotRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  is_booked: boolean;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStartParam = searchParams.get("weekStart");
  const weekStart = weekStartParam
    ? new Date(weekStartParam + "T00:00:00Z")
    : startOfWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  // 1) מביאים את כל המשבצות בשבוע
  const { data: slots, error: slotsErr } = await supabaseServer
    .from("slots")
    .select("id, starts_at, ends_at, is_booked")
    .gte("starts_at", weekStart.toISOString())
    .lt("starts_at", weekEnd.toISOString())
    .order("starts_at", { ascending: true });

  if (slotsErr) {
    console.error("admin/slots slotsErr:", slotsErr);
    return NextResponse.json({ ok: false, error: slotsErr.message }, { status: 500 });
  }

  const slotList = (slots ?? []) as SlotRow[];
  const slotIds = slotList.map(s => s.id);

  // 2) אם אין משבצות – מחזירים ריק
  if (slotIds.length === 0) {
    return NextResponse.json({
      ok: true,
      weekStart: weekStart.toISOString(),
      slots: [],
    });
  }

  // 3) מביאים את כל ההזמנות של המשבצות האלו (מהחדש לישן)
  const { data: bookings, error: bookingsErr } = await supabaseServer
    .from("bookings")
    .select("slot_id, student_name, student_email, note, created_at")
    .in("slot_id", slotIds)
    .order("created_at", { ascending: false });

  if (bookingsErr) {
    console.error("admin/slots bookingsErr:", bookingsErr);
    return NextResponse.json({ ok: false, error: bookingsErr.message }, { status: 500 });
  }

  const allBookings = (bookings ?? []) as BookingBrief[];

  // 4) לוקחים לכל slot את ההזמנה האחרונה (הראשונה במיון יורד)
  const latestBySlot: Record<string, { student_name: string; student_email: string | null; note: string | null }[]> = {};
  for (const b of allBookings) {
    if (!latestBySlot[b.slot_id]) {
      latestBySlot[b.slot_id] = [{ student_name: b.student_name, student_email: b.student_email, note: b.note }];
    }
  }

  // 5) מחברים ומחזירים בפורמט שה-UI מצפה לו
  const result = slotList.map(s => ({
    ...s,
    bookings: latestBySlot[s.id] ?? [], // אם אין – זה יגרום ל"(חסום)"
  }));

  return NextResponse.json({
    ok: true,
    weekStart: weekStart.toISOString(),
    slots: result,
  });
}
