"use client";

import { useAuth } from "@/lib/auth";
import StaffAdmin from "@/components/StaffAdmin";

export default function SettingsPage() {
  const { session } = useAuth();

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 xl:p-6">
      <h1 className="text-xl font-bold text-t1">教員アカウント設定</h1>
      <section className="rounded-2xl border border-stroke bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold text-t1">教員プロフィール</h2>
        <dl className="mt-3 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-t3">名前</dt>
          <dd className="font-medium">{session?.name}</dd>
          <dt className="text-t3">ロール</dt>
          <dd>{session?.roleLabel}</dd>
          <dt className="text-t3">担当学科</dt>
          <dd>
            {session?.role === "admin"
              ? "全学科（管理者）"
              : session?.departments.length
                ? session.departments.join("、")
                : "未割当"}
          </dd>
        </dl>
      </section>
      {session?.role === "admin" && session.id ? (
        <StaffAdmin selfId={session.id} />
      ) : (
        <section className="rounded-2xl border border-stroke bg-white p-5 shadow-card">
          <h2 className="text-sm font-bold text-t1">教員ユーザー</h2>
          <p className="mt-2 text-sm text-t3">
            教員の登録・削除・権限変更は管理者のみ行えます。学科教員は担当学科の学生データだけを閲覧できます。
          </p>
        </section>
      )}
    </div>
  );
}
