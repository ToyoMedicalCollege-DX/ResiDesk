"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Suspense } from "react";
import PasswordField from "@/components/PasswordField";

function LoginForm() {
  const { login, session, ready, configured } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    search.get("error") === "not_staff" ? "学生アカウントでは教員画面に入れません。" : null
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) {
      router.replace(session.mustChangePassword ? "/set-password" : "/students");
    }
  }, [ready, session, router]);

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6">
      <div className="w-full max-w-[420px] rounded-3xl border border-stroke bg-white p-8 shadow-card">
        <p className="text-2xl font-bold text-t1">ResiDesk</p>
        <p className="mt-1 text-sm text-t3">教員ダッシュボード</p>
        <p className="mt-4 text-xs leading-relaxed text-t2 break-keep">
          学生の記録は参考情報です。医療診断・治療判断には使いません。学生アカウントでは入れません。
        </p>
        {!configured && (
          <p className="mt-4 rounded-xl bg-[#FFF4E5] px-3 py-2 text-xs text-caution">
            .env.local に学生アプリと同じ NEXT_PUBLIC_SUPABASE_URL / ANON_KEY を設定してください。
          </p>
        )}
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const msg = await login(staffId, password);
            setBusy(false);
            if (msg) setError(msg);
            else {
              const me = await fetch("/api/me", { cache: "no-store" }).then((r) => r.json()) as {
                mustChangePassword?: boolean;
              };
              router.replace(me.mustChangePassword ? "/set-password" : "/students");
            }
          }}
        >
          <label className="block text-xs font-medium text-t2">
            社員番号
            <input
              type="text"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              autoComplete="username"
              inputMode="text"
              className="mt-1 w-full rounded-xl border border-stroke px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-t2">
            パスワード
            <PasswordField
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy || !configured}
            className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "ログイン中…" : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-bg text-sm text-t3">
          読み込み中…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
