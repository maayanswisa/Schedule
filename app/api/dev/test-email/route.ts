import { NextResponse } from "next/server";
import { sendTestEmail } from "@/app/lib/mailer";

type TestEmailBody = {
  to?: string;
};

// Type guard: בודק אם לאובייקט יש שדה error שהוא מחרוזת לא-ריקה
function hasErrorField(x: unknown): x is { error: string } {
  return (
    typeof x === "object" &&
    x !== null &&
    "error" in x &&
    typeof (x as { error: unknown }).error === "string" &&
    (x as { error: string }).error.length > 0
  );
}

export async function POST(request: Request) {
  try {
    let body: TestEmailBody = {};
    try {
      body = (await request.json()) as TestEmailBody;
    } catch {
      body = {};
    }

    const to = typeof body.to === "string" ? body.to : undefined;

    const res = await sendTestEmail(to);

    if (hasErrorField(res)) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "send failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
