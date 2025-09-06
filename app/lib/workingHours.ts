export const workingHours: Record<number, Array<{ start: string; end: string }>> = {
  0: [{ start: "14:00", end: "20:00" }],    // Sunday
  1: [{ start: "14:00", end: "20:45" }], // Monday
  2: [{ start: "14:00", end: "20:00" }], // Tuesday
  3: [{ start: "14:00", end: "20:00" }], // Wednesday
  4: [{ start: "14:00", end: "18:00" }], // Thursday
  5: [{ start: "14:00", end: "18:00" }],               // Friday
  6: [{ start: "14:00", end: "18:00" }],               // Saturday
};

const MS = 60 * 1000;

function setHM(d: Date, h: number, m: number) {
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
}

export function generateSlotsForWeek(
  weekStart: Date,
  lessonMinutes = 60,
  bufferMinutes = 0
) {
  const slots: Array<{ starts_at: string; ends_at: string }> = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dow = day.getDay();
    const windows = workingHours[dow] || [];
    for (const w of windows) {
      const [sh, sm] = w.start.split(":").map(Number);
      const [eh, em] = w.end.split(":").map(Number);
      let cur = setHM(day, sh, sm);
      const end = setHM(day, eh, em);
      while (cur < end) {
        const next = new Date(cur.getTime() + lessonMinutes * MS);
        if (next > end) break;
        // נשמור ב-UTC (ISO)
        slots.push({ starts_at: cur.toISOString(), ends_at: next.toISOString() });
        cur = new Date(next.getTime() + bufferMinutes * MS);
      }
    }
  }
  return slots;
}

export function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay(); // Sunday=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
