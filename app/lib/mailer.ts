import { Resend } from "resend";

/* ───────── Env ───────── */
const apiKey = process.env.RESEND_API_KEY!;
const FROM = process.env.MAIL_FROM!;        // למשל: 'Maayan Tutor <onboarding@resend.dev>'
const OWNER = process.env.MAIL_TO_OWNER!;    // המייל שלך לקבלת העותק

// אפשר לשקול בדיקה רכה במקום non-null assertion:
if (!apiKey || !FROM || !OWNER) {
  // עדיף לוג ברור בזמן ריצה מאשר קריסה שקטה
  console.warn("Mailer env missing: RESEND_API_KEY/MAIL_FROM/MAIL_TO_OWNER");
}

const resend = new Resend(apiKey);

/* ───────── Types ───────── */
// המינימום המבני שחשוב לנו מתשובת Resend
export type CreateEmailResponse = {
  data: { id: string } | null;
  error: { message: string } | null;
};

export type BookingMail = {
  studentName: string;
  studentEmail: string;      // חובה
  studentPhone?: string;     // אופציונלי במיילר (אצלך חובה ב-API)
  startsAtISO: string;
  endsAtISO: string;
  note?: string | null;
};

function fmtRangeShort(startsAtISO: string, endsAtISO: string): string {
  const s = new Date(startsAtISO);
  const e = new Date(endsAtISO);

  const tz = "Asia/Jerusalem";
  const dateFmt: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: tz,
  };
  const timeFmt: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
    hour12: false,
  };

  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();

  const dateStr = new Intl.DateTimeFormat("he-IL", dateFmt).format(s);
  const startTime = new Intl.DateTimeFormat("he-IL", timeFmt).format(s);
  const endTime = new Intl.DateTimeFormat("he-IL", timeFmt).format(e);

  if (sameDay) {
    // דוגמה: יום ראשון, 14 בספטמבר 2025 17:00–18:00
    return `${dateStr} ${startTime}–${endTime}`;
  } else {
    // אם חוצה תאריך: יום א', 14 בספט׳ 2025 23:30 – יום ב', 15 בספט׳ 2025 00:30
    const endDateStr = new Intl.DateTimeFormat("he-IL", dateFmt).format(e);
    return `${dateStr} ${startTime} – ${endDateStr} ${endTime}`;
  }
}


// למניעת הזרקת HTML
function escapeHtml(s?: string | null): string {
  if (!s) return "";
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ───────── API ───────── */
export async function sendTestEmail(to?: string): Promise<CreateEmailResponse> {
  const recipient = to ?? OWNER;
  const subject = "בדיקת מייל – אתר שיעורים";
  const html = `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif">
      <h2>שלום!</h2>
      <p>זהו מייל בדיקה שנשלח דרך Resend מהשרת של Next.js.</p>
    </div>
  `;

  // Resend מחזיר אובייקט עם { data, error }
  const res = await resend.emails.send({ from: FROM, to: recipient, subject, html });
  return {
    data: (res as CreateEmailResponse).data ?? null,
    error: (res as CreateEmailResponse).error ?? null,
  };
}

// מייל אישור לתלמיד + עותק אלייך (בעותק אלייך מוצג גם מספר הטלפון)
export async function sendBookingEmails(data: BookingMail): Promise<void> {
  const { studentName, studentEmail, studentPhone, startsAtISO, endsAtISO, note } = data;

  const subject = `אישור שיעור – ${fmt(startsAtISO)}`;

  // תוכן לתלמיד
  const studentHtml = `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif; line-height:1.6">
      <h2 style="margin:0 0 12px">אישור שיעור</h2>
      <p style="margin:0 0 8px">היי ${escapeHtml(studentName)},</p>
      <p style="margin:0 0 8px">השיעור נקבע ל: <b>${escapeHtml(fmtRangeShort(startsAtISO, endsAtISO))}</b>.</p>
      ${note ? `<p style="margin:0 0 8px">הערה: ${escapeHtml(note)}</p>` : ""}
      <hr style="margin:16px 0" />
      <p style="margin-top:16px">לא ניתן לשנות/לבטל דרך המייל הזה. </p>
      <p style="margin-top:16px">כדי לשנות/לבטל - נא לשלוח הודעת ווטצאפ. 0526460735 </p>
      <p style="margin:0; color:#666">נשלח אוטומטית מהאתר של מעיין</p>
    </div>
  `;

  // עותק למנהלת (אלייך) – כולל פרטי קשר
  const ownerHtml = `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif; line-height:1.6">
      <h3 style="margin:0 0 12px">אישור שיעור (עותק למנהלת)</h3>
      <p style="margin:0 0 8px"><b>שם תלמיד/ה:</b> ${escapeHtml(studentName)}</p>
      <p style="margin:0 0 8px"><b>אימייל:</b> ${escapeHtml(studentEmail)}</p>
      ${studentPhone ? `<p style="margin:0 0 8px"><b>מספר טלפון:</b> ${escapeHtml(studentPhone)}</p>` : ""}
      <p style="margin:0 0 8px">השיעור נקבע ל: <b>${escapeHtml(fmtRangeShort(startsAtISO, endsAtISO))}</b>.</p>
      ${note ? `<p style="margin:0 0 8px"><b>הערה:</b> ${escapeHtml(note)}</p>` : ""}
      <p style="margin-top:16px">לא ניתן לשנות/לבטל דרך המייל הזה. </p>
      <p style="margin-top:16px">כדי לשנות/לבטל - נא לשלוח הודעת ווטצאפ. 0526460735 </p>
      <p style="margin:0; color:#666">נשלח אוטומטית מהאתר של מעיין</p>
    </div>
  `;

  const tasks: Array<Promise<CreateEmailResponse>> = [
    resend.emails.send({ from: FROM, to: studentEmail, subject, html: studentHtml }) as Promise<CreateEmailResponse>,
    resend.emails.send({ from: FROM, to: OWNER, subject: `📩 (עותק) ${subject}`, html: ownerHtml }) as Promise<CreateEmailResponse>,
  ];

  // לא מפילים את ה-API אם המייל נכשל
  try {
    const results = await Promise.allSettled(tasks);
    // אם חשוב לך לוג על כשלון:
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.error) {
        console.warn("Email send reported error:", r.value.error.message);
      } else if (r.status === "rejected") {
        console.warn("Email send rejected:", r.reason);
      }
    }
  } catch (e: unknown) {
    console.error("Email send failed", e);
  }
}
