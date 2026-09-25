"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import PasswordField from "@/components/PasswordField";

export default function SetPasswordPage() {
  const { session, ready, logout } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!session.mustChangePassword) {
      router.replace("/students");
    }
  }, [ready, session, router]);

  if (!ready || !session?.mustChangePassword) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-sm text-t3">読み込み中…</div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-6">
      <div className="w-full max-w-[420px] rounded-3xl border border-stroke bg-white p-8 shadow-card">
        <p className="text-2xl font-bold text-t1">パスワード設定</p>
        <p className="mt-2 text-sm text-t2">
          初回ログインです。初期パスワードから、自分のパスワードに変更してください。
        </p>
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/me/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, confirm }),
              });
              const json = (await res.json()) as { error?: string };
              if (!res.ok) throw new Error(json.error ?? "更新に失敗しました");
              const supabase = createClient();
              await supabase.auth.refreshSession();
              router.replace("/students");
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "更新に失敗しました");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-xs font-medium text-t2">
            新しいパスワード（6文字以上）
            <PasswordField
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
          </label>
          <label className="block text-xs font-medium text-t2">
            新しいパスワード（確認）
            <PasswordField
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "保存中…" : "パスワードを設定して始める"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            void logout().then(() => router.replace("/login"));
          }}
          className="mt-4 w-full text-center text-xs text-t3 hover:text-t1"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
