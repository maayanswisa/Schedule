import { NextResponse } from "next/server";
import { sendTestEmail } from "@/app/lib/mailer";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const to = typeof body.to === "string" ? body.to : undefined;
    const res = await sendTestEmail(to);
    if ((res as any)?.error) {
      return NextResponse.json({ ok: false, error: (res as any).error }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "send failed" }, { status: 500 });
  }
}
