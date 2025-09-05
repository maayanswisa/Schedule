"use client";

import { useCallback, useEffect, useState } from "react";
import type { Slot } from "@/app/types";

type Props = {
  open: boolean;
  slot: Slot | null;
  onClose: () => void;
  onBooked: (slotId: string) => void;
  tz?: string; // היה חובה -> עכשיו אופציונלי
};

function fmtTime(iso: string, tz: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: tz });
}
function fmtDate(iso: string, tz: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz });
}

function isValidEmail(s: string) {
  return /.+@.+\..+/.test(s);
}
function isValidPhone(s: string) {
  const t = s.replace(/\s|-/g, "");
  return /^[0-9]{10}$/.test(t);
}

export default function BookingModal({ open, slot, onClose, onBooked,  tz = "Asia/Jerusalem" }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName("");
    setEmail("");
    setPhone("");
    setNote("");
    setErr(null);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (open) resetForm();
  }, [open, slot?.id, resetForm]);

  function handleClose() {
    resetForm();
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!name.trim()) return setErr("שם מלא הוא שדה חובה");
    if (!phone.trim()) return setErr("מספר פלאפון הוא שדה חובה");
    if (!isValidPhone(phone.trim())) return setErr("מספר פלאפון לא תקין (10 ספרות)");
    if (!email.trim()) return setErr("אימייל הוא שדה חובה");
    if (!isValidEmail(email.trim())) return setErr("אימייל לא תקין");
    if (!slot) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          studentName: name.trim(),
          studentEmail: email.trim(),
          studentPhone: phone.trim(),
          note: note.trim() || "",
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setErr(json.error || "שגיאה בשליחה");
        return;
      }
      const bookedId = slot.id;
      resetForm();
      onBooked(bookedId);
      onClose();
    } catch {
      setErr("שגיאת רשת");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !slot) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        key={slot.id ?? "closed"}
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
        dir="rtl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">שיבוץ שיעור</h2>
          <button onClick={handleClose} className="rounded px-2 py-1 text-sm hover:bg-gray-100">
            סגור
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          <div><b>תאריך:</b> {fmtDate(slot.startsAt, tz)}</div>
          <div><b>שעה:</b> {fmtTime(slot.startsAt, tz)}–{fmtTime(slot.endsAt, tz)}</div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm" htmlFor="student_name">
            שם מלא*
            <input
              id="student_name"
              className="mt-1 w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
            />
          </label>

          <label className="block text-sm" htmlFor="student_phone">
            מספר פלאפון*
            <input
              id="student_phone"
              className="mt-1 w-full rounded border px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              inputMode="tel"
              type="tel"
              placeholder="0521234567"
            />
          </label>

          <label className="block text-sm" htmlFor="student_email">
            אימייל לאישור*
            <input
              id="student_email"
              className="mt-1 w-full rounded border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              type="email"
              placeholder="student@example.com"
            />
          </label>

          <label className="block text-sm" htmlFor="student_note">
            הערה (אופציונלי)
            <textarea
              id="student_note"
              className="mt-1 w-full rounded border px-3 py-2"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="העדפות, נושאים לשיעור וכו׳"
            />
          </label>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={handleClose} className="rounded border px-3 py-2">
              ביטול
            </button>
            <button
              disabled={submitting}
              className="rounded bg-emerald-600 px-3 py-2 text-white disabled:opacity-50"
            >
              {submitting ? "שולח…" : "שבצי"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
