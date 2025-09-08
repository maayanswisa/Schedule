import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function Page() {
  return (
    <main dir="rtl" className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">התחברות מנהל</h1>
      <Suspense fallback={<div>טוען…</div>}>
        <LoginClient />
      </Suspense>
    </main>
  );
}
