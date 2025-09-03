import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";


export async function POST(req: Request) {
try {
const body = await req.json();
const startLocal: string = body?.startLocal; // למשל '2025-10-01T14:30'
const durationMin: number = Number(body?.durationMin ?? 60);


if (!startLocal) return NextResponse.json({ ok: false, error: "חסר startLocal" }, { status: 400 });


// ממירים זמן מקומי ל-ISO (UTC) ומחשבים סוף לפי משך
const start = new Date(startLocal); // מפוענח כמקומי בדפדפן/שרת
const end = new Date(start.getTime() + durationMin * 60 * 1000);


const payload = {
starts_at: start.toISOString(),
ends_at: end.toISOString(),
is_booked: false,
};


const { error } = await supabaseServer
.from("slots")
.upsert(payload, { onConflict: "starts_at,ends_at", ignoreDuplicates: true });


if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });


return NextResponse.json({ ok: true });
} catch (e: any) {
return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
}
}