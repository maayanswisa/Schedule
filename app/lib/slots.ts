// כלי עזר ליצירת משבצות שבועיות דמו בצד השרת
// ברירת מחדל: שיעור 60 ד׳, בופר 10 ד׳ בין שיעורים


const MS_IN_MIN = 60 * 1000;


function toUTCISO(date: Date) {
return new Date(date.getTime() - date.getTimezoneOffset() * MS_IN_MIN).toISOString();
}


function setTimeLocal(d: Date, hours: number, minutes: number) {
const copy = new Date(d);
copy.setHours(hours, minutes, 0, 0);
return copy;
}


export type WorkingHours = Record<number, Array<{ start: string; end: string }>>;
// מיפוי ימים -> חלונות שעות עבודה. מספרי ימים: 0-ש׳, 1-א׳, ... 6-שבת


export const workingHours: WorkingHours = {
  0: [{ start: "14:00", end: "20:00" }],    // Sunday
  1: [{ start: "14:00", end: "20:45" }], // Monday
  2: [{ start: "14:00", end: "20:00" }], // Tuesday
  3: [{ start: "14:00", end: "20:00" }], // Wednesday
  4: [{ start: "14:00", end: "18:00" }], // Thursday
  5: [],                // Friday
  6: [],                // Saturday
};


// שימי לב: ב-JavaScript, Sunday=0, Monday=1, ... Saturday=6.
// אם את מעדיפה א׳-ש׳, נרנדר את הכותרות בהתאם.


export function generateSlotsForRange(
startDate: Date,
days: number,
lessonMinutes = 60,
bufferMinutes = 0
) {
const slots: { id: string; startsAt: string; endsAt: string; isBooked: boolean }[] = [];


for (let i = 0; i < days; i++) {
const day = new Date(startDate);
day.setDate(day.getDate() + i);


const dow = day.getDay();
const windows = workingHours[dow] || [];


for (const win of windows) {
const [sh, sm] = win.start.split(":").map(Number);
const [eh, em] = win.end.split(":").map(Number);


let cursor = setTimeLocal(day, sh, sm);
const end = setTimeLocal(day, eh, em);


while (cursor < end) {
const next = new Date(cursor.getTime() + lessonMinutes * MS_IN_MIN);
if (next > end) break;
const id = `${cursor.getTime()}-${lessonMinutes}`;
slots.push({
id,
startsAt: toUTCISO(cursor),
endsAt: toUTCISO(next),
isBooked: false,
});
// מוסיפים בופר לפני המשבצת הבאה
cursor = new Date(next.getTime() + bufferMinutes * MS_IN_MIN);
}
}
}


return slots;
}