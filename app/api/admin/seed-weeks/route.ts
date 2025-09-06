import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";
import { generateSlotsForWeek, startOfWeek } from "@/app/lib/workingHours";


export async function POST(req: Request) {
try {
const { searchParams } = new URL(req.url);
const weekStartParam = searchParams.get("weekStart");
const weeks = Number(searchParams.get("weeks") ?? 4);
const lesson = Number(searchParams.get("lesson") ?? 60);
const buffer = Number(searchParams.get("buffer") ?? 0);


const base = weekStartParam ? new Date(weekStartParam + "T00:00:00") : startOfWeek();
const all: Array<{ starts_at: string; ends_at: string; is_booked: boolean }> = [];


for (let i = 0; i < weeks; i++) {
const ws = new Date(base);
ws.setDate(base.getDate() + i * 7);
const items = generateSlotsForWeek(ws, lesson, buffer).map((x) => ({ ...x, is_booked: false }));
all.push(...items);
}


const { error } = await supabaseServer
.from("slots")
.upsert(all, { onConflict: "starts_at,ends_at", ignoreDuplicates: true });


if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });


return NextResponse.json({ ok: true, inserted: all.length });
} catch (e: any) {
return NextResponse.json({ ok: false, error: e?.message || "seed failed" }, { status: 500 });
}
}