import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";


export async function POST(req: Request) {
const body = await req.json().catch(() => ({}));
const slotId = String(body?.slotId || "");
if (!slotId) return NextResponse.json({ ok: false, error: "חסר slotId" }, { status: 400 });


// מוחקים הזמנה (אם קיימת) ומסמנים המשבצת כפנויה
const { error: delErr } = await supabaseServer.from("bookings").delete().eq("slot_id", slotId);
if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });


const { error: updErr } = await supabaseServer.from("slots").update({ is_booked: false }).eq("id", slotId);
if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });


return NextResponse.json({ ok: true });
}