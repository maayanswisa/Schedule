"use client";

import { useState } from "react";
import type { Slot } from "@/app/types"; // אם אין types.ts, ראו הערה למטה

type Props = {
  open: boolean;
  slot: Slot | null;
  onClose: () => void;
  onBooked: (slotId: string) => void;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function BookingModal({ open, slot, onClose, onBooked }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); // אופציונלי
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // לא מציירים כלום אם לא פתוח או שאין משבצת
  if (!open || !slot) return null;

  // מוודא ל-TS שאין null
  const s: Slot = slot;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!name.trim()) {
      setErr("שם מלא הוא שדה חובה");
      return;
    }
    if (email && !/.+@.+\..+/.test(email)) {
      setErr("אימייל לא תקין");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: s.id,
          studentName: name.trim(),
          studentEmail: email.trim() || "",
          note: note.trim() || "",
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setErr(json.error || "שגיאה בשליחה");
        setSubmitting(false);
        return;
      }
      onBooked(s.id);
      onClose();
    } catch {
      setErr("שגיאת רשת");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl" dir="rtl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">שיבוץ שיעור</h2>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm hover:bg-gray-100">
            סגור
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          <div>
            <b>תאריך:</b> {fmtDate(s.startsAt)}
          </div>
          <div>
            <b>שעה:</b> {fmtTime(s.startsAt)}–{fmtTime(s.endsAt)}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
               שם מלא*   
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
            />
          </label>

          <label className="block text-sm">
               אימייל לאישור*   
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              placeholder="student@example.com"
              type="email"
            />
          </label>

          <label className="block text-sm">
            הערה (לא חובה)
            <textarea
              className="mt-1 w-full rounded border px-3 py-2"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="כל דבר שכדאי לדעת לפני השיעור…"
            />
          </label>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded border px-3 py-2">
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

/**
 * אם אין לך "@/app/types" עם Slot, אפשר למחוק את שורת ה-import ולפתוח את הטיפוס המקומי:
 *
 * type Slot = {
 *   id: string;
 *   startsAt: string; // ISO UTC
 *   endsAt: string;   // ISO UTC
 *   isBooked: boolean;
 * };
 */
