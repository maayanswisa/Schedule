"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function LoginClient() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const sp = useSearchParams();
  const router = useRouter();
  const next = sp.get("next") || "/admin";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!json.ok) return setErr(json.error || "שגיאה");
    router.replace(next);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        type="password"
        className="w-full rounded border px-3 py-2"
        placeholder="סיסמה"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        dir="rtl"
      />
      {err && <div className="text-red-600 text-sm">{err}</div>}
      <button className="rounded bg-black text-white px-3 py-2">התחבר</button>
    </form>
  );
}
