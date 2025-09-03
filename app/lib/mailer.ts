import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY!;
const FROM = process.env.MAIL_FROM!;
const OWNER = process.env.MAIL_TO_OWNER!;

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
  studentEmail?: string | null;
  startsAtISO: string;
  endsAtISO: string;
  note?: string | null;
};

// מייל אישור לתלמיד + עותק אלייך
export async function sendBookingEmails(data: BookingMail) {
  const { studentName, studentEmail, startsAtISO, endsAtISO, note } = data;

  const subject = `אישור שיעור – ${fmt(startsAtISO)}`;
  const html = `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif">
      <h2>אישור שיעור</h2>
      <p>היי ${studentName},</p>
      <p>השיעור נקבע ל: <b>${fmt(startsAtISO)} – ${fmt(endsAtISO)}</b>.</p>
      ${note ? `<p>הערה: ${note}</p>` : ""}
      <hr />
      <p>אם צריך לשנות/לבטל – פשוט להשיב למייל זה.</p>
      <p style="color:#666">נשלח אוטומטית מהאתר של מעיין</p>
    </div>
  `;

  const tasks: Promise<any>[] = [];
  if (studentEmail) {
    tasks.push(resend.emails.send({ from: FROM, to: studentEmail, subject, html }));
  }
  tasks.push(resend.emails.send({ from: FROM, to: OWNER, subject: `📩 (עותק) ${subject}`, html }));

  // לא מפילים את ה-API אם המייל נכשל
  try {
    await Promise.all(tasks);
  } catch (e) {
    console.error("Email send failed", e);
  }
}
