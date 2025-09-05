import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY!;
const FROM = process.env.MAIL_FROM!;        // למשל: 'Maayan Tutor <onboarding@resend.dev>'
const OWNER = process.env.MAIL_TO_OWNER!;    // המייל שלך לקבלת העותק

const resend = new Resend(apiKey);

// פורמט זמן ידידותי בעברית, TZ ישראל
function fmt(dtISO: string) {
  const d = new Date(dtISO);
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  }).format(d);
}

// למניעת הזרקת HTML
function escapeHtml(s?: string | null) {
  if (!s) return "";
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendTestEmail(to?: string) {
  const recipient = to ?? OWNER;
  const subject = "בדיקת מייל – אתר שיעורים";
  const html = `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif">
      <h2>שלום!</h2>
      <p>זהו מייל בדיקה שנשלח דרך Resend מהשרת של Next.js.</p>
    </div>
  `;
  return resend.emails.send({ from: FROM, to: recipient, subject, html });
}

export type BookingMail = {
  studentName: string;
  studentEmail: string;      // חובה (עודכן)
  studentPhone?: string;     // אופציונלי במיילר (אצלך זה חובה ב-API)
  startsAtISO: string;
  endsAtISO: string;
  note?: string | null;
};

// מייל אישור לתלמיד + עותק אלייך (בעותק אלייך מוצג גם מספר הטלפון)
export async function sendBookingEmails(data: BookingMail) {
  const { studentName, studentEmail, studentPhone, startsAtISO, endsAtISO, note } = data;

  const subject = `אישור שיעור – ${fmt(startsAtISO)}`;

  // תוכן לתלמיד (לא מציגים את הפלאפון של עצמו – אפשרי להוסיף אם תרצי)
  const studentHtml = `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif; line-height:1.6">
      <h2 style="margin:0 0 12px">אישור שיעור</h2>
      <p style="margin:0 0 8px">היי ${escapeHtml(studentName)},</p>
      <p style="margin:0 0 8px">השיעור נקבע ל: <b>${escapeHtml(fmt(startsAtISO))} – ${escapeHtml(fmt(endsAtISO))}</b>.</p>
      ${note ? `<p style="margin:0 0 8px">הערה: ${escapeHtml(note)}</p>` : ""}
      <hr style="margin:16px 0" />
      <p style="margin:0 0 8px">אם צריך לשנות/לבטל – פשוט להשיב למייל זה.</p>
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
      <p style="margin:0 0 8px"><b>זמן:</b> ${escapeHtml(fmt(startsAtISO))} – ${escapeHtml(fmt(endsAtISO))}</p>
      ${note ? `<p style="margin:0 0 8px"><b>הערה:</b> ${escapeHtml(note)}</p>` : ""}
      <p style="margin-top:16px">אם צריך לשנות/לבטל – פשוט להשיב למייל זה.</p>
      <p style="margin:0; color:#666">נשלח אוטומטית מהאתר של מעיין</p>
    </div>
  `;

  const tasks: Promise<any>[] = [
    resend.emails.send({ from: FROM, to: studentEmail, subject, html: studentHtml }),
    resend.emails.send({ from: FROM, to: OWNER, subject: `📩 (עותק) ${subject}`, html: ownerHtml }),
  ];

  // לא מפילים את ה-API אם המייל נכשל
  try {
    await Promise.allSettled(tasks);
  } catch (e) {
    console.error("Email send failed", e);
  }
}
