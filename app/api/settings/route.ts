import { NextResponse } from "next/server";
import { supabaseServer } from "@/app/lib/supabaseServer";
import { cookies } from "next/headers";

// אופציונלי: רשימת TZ שכיחה
const ALLOWED_TZ = new Set([
  "Asia/Jerusalem",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
]);

function sanitizeTz(tz?: unknown): string {
  const t = typeof tz === "string" && tz.trim() ? tz.trim() : "Asia/Jerusalem";
  if (ALLOWED_TZ.has(t)) return t;
  if (/^[A-Za-z]+(?:[_-][A-Za-z]+)*(?:\/[A-Za-z]+(?:[_-][A-Za-z]+)*)+$/.test(t)) return t;
  return "Asia/Jerusalem";
}

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("app_settings")
      .select("hours_from, hours_to, tz")
      .eq("id", 1)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: error?.message || "Settings not found" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = (await cookies()).get("admin")?.value === "true";
    if (!isAdmin) return NextResponse.json({ ok: false, error: "לא מורשה" }, { status: 401 });

    const body = await req.json();
    const hf = Number(body?.hours_from);
    const ht = Number(body?.hours_to);
    const tz = sanitizeTz(body?.tz);

    const valid =
      Number.isInteger(hf) && Number.isInteger(ht) &&
      hf >= 0 && hf <= 23 && ht >= 1 && ht <= 24 && hf < ht;

    if (!valid) {
      return NextResponse.json({ ok: false, error: "טווח שעות לא תקין" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error } = await supabaseServer
      .from("app_settings")
      .update({ hours_from: hf, hours_to: ht, tz, updated_at: now })
      .eq("id", 1);

    if (error) {
      // כאן אפשר גם console.error(error) ללוג פנימי
      return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

