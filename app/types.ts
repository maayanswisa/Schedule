export type Slot = {
id: string;
startsAt: string; // ISO string (UTC)
endsAt: string; // ISO string (UTC)
isBooked: boolean;
};

// app/types.ts
export type AppSettings = {
  tz: string;
  hours_from: number;
  hours_to: number;
};

export type CreateSlotBody = {
  starts_at: string; // ISO
  ends_at: string;   // ISO
};

export type SeedWeeksBody = {
  weekStart: string; // ISO date (YYYY-MM-DD או ISO מלא)
  weeks: number;
};

export type BookBody = {
  slotId: string;
  student_name: string;
  student_email?: string | null;
  note?: string | null;
};

// עוזר לשגיאות
export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
