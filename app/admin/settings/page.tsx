"use client";

import React, { useEffect, useState } from "react";

type AppSettings = {
  hours_from: number; // 0..23
  hours_to: number;   // 1..24
  tz: string;
};

type ApiSettingsResponse =
  | { ok: true; data: AppSettings }
  | { ok: false; error?: string };

const ALLOWED_TZ = [
  "Asia/Jerusalem",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
];

export default function AdminSettingsPage() {
  const [form, setForm] = useState<AppSettings>({
    tz: "Asia/Jerusalem",
    hours_from: 7,
    hours_to: 20,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch("/api/settings", { cache: "no-store" });
        const j = (await r.json()) as ApiSettingsResponse;
        if (!cancel && j.ok) {
          setForm(j.data);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);


  function onChangeNumber(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const n = Number(value);
    setForm((prev) => ({ ...prev, [name]: Number.isNaN(n) ? 0 : n }));
  }
  function onChangeSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!j.ok) {
        setErr(j.error ?? "שמירה נכשלה");
      } else {
        setMsg("נשמר בהצלחה");
      }
    } catch {
      setErr("שמירה נכשלה");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 2000);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl p-6" dir="rtl">
        <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6" dir="rtl">
      <h1 className="text-xl font-semibold">הגדרות מערכת</h1>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-sm text-gray-600">אזור זמן (TZ)</label>
          <select
            name="tz"
            value={form.tz}
            onChange={onChangeSelect}
            className="w-full rounded border px-3 py-2"
          >
            {ALLOWED_TZ.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-gray-600">שעה מ־</label>
            <input
              name="hours_from"
              type="number"
              min={0}
              max={23}
              value={form.hours_from}
              onChange={onChangeNumber}
              className="w-full rounded border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">שעה עד</label>
            <input
              name="hours_to"
              type="number"
              min={1}
              max={24}
              value={form.hours_to}
              onChange={onChangeNumber}
              className="w-full rounded border px-3 py-2"
            />
          </div>
        </div>

        <button
          disabled={saving}
          className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {saving ? "שומר…" : "שמור"}
        </button>

        {msg && <div className="text-emerald-700 text-sm">{msg}</div>}
        {err && <div className="text-red-700 text-sm">{err}</div>}
      </form>
    </main>
  );
}
