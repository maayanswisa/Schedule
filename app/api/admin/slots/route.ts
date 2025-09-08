import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";
import { startOfWeek } from "@/app/lib/workingHours";

type BookingBrief = {
  slot_id: string;
  student_name: string;
  student_email: string | null;
  note: string | null;
  created_at: string; // ISO
};

type SlotRow = {
  id: string;
  starts_at: string; // ISO
  ends_at: string;   // ISO
  is_booked: boolean;
};

type SlotsResponse = {
  ok: true;
  weekStart: string;
  slots: Array<SlotRow & { bookings: Array<Pick<BookingBrief, "student_name" | "student_email" | "note">> }>;
} | { ok: false; error: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStartParam = searchParams.get("weekStart");

  const weekStart = weekStartParam
    ? new Date(`${weekStartParam}T00:00:00Z`)
    : startOfWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  // 1) כל המשבצות בשבוע
  const { data: slots, error: slotsErr } = await supabaseServer
    .from("slots")
    .select("id, starts_at, ends_at, is_booked")
    .gte("starts_at", weekStart.toISOString())
    .lt("starts_at", weekEnd.toISOString())
    .order("starts_at", { ascending: true });

  if (slotsErr) {
    return NextResponse.json(
      { ok: false, error: slotsErr.message } satisfies SlotsResponse,
      { status: 500 }
    );
  }

  const slotList: SlotRow[] = (slots ?? []) as SlotRow[];
  const slotIds = slotList.map((s) => s.id);

  // 2) אין משבצות – מחזירים ריק
  if (slotIds.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        weekStart: weekStart.toISOString(),
        slots: [],
      } satisfies SlotsResponse
    );
  }

  // 3) כל ההזמנות של המשבצות (מהחדש לישן)
  const { data: bookings, error: bookingsErr } = await supabaseServer
    .from("bookings")
    .select("slot_id, student_name, student_email, note, created_at")
    .in("slot_id", slotIds)
    .order("created_at", { ascending: false });

  if (bookingsErr) {
    return NextResponse.json(
      { ok: false, error: bookingsErr.message } satisfies SlotsResponse,
      { status: 500 }
    );
  }

  const allBookings: BookingBrief[] = (bookings ?? []) as BookingBrief[];

  // 4) לכל slot שומרים את ההזמנה האחרונה בלבד
  const latestBySlot = new Map<
    string,
    Array<Pick<BookingBrief, "student_name" | "student_email" | "note">>
  >();

  for (const b of allBookings) {
    if (!latestBySlot.has(b.slot_id)) {
      latestBySlot.set(b.slot_id, [
        {
          student_name: b.student_name,
          student_email: b.student_email,
          note: b.note,
        },
      ]);
    }
  }

  // 5) מאחדים לתוצאה שה־UI מצפה לה
  const result = slotList.map((s) => ({
    ...s,
    bookings: latestBySlot.get(s.id) ?? [],
  }));

  return NextResponse.json(
    {
      ok: true,
      weekStart: weekStart.toISOString(),
      slots: result,
    } satisfies SlotsResponse
  );
}
