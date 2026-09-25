"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useStaffData } from "@/lib/staff-data";
import type { Student } from "@/lib/types";

export default function DeleteStudentButton({ student }: { student: Student }) {
  const { session } = useAuth();
  const { refresh } = useStaffData();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session?.role !== "admin") return null;

  const matched = confirmId.trim() === student.studentId;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setConfirmId("");
          setError(null);
        }}
        className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-[#FDECEC]"
      >
        学生を削除
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-stroke bg-white p-5 shadow-card">
            <p className="text-sm font-bold text-t1">学生を削除しますか？</p>
            <p className="mt-2 text-xs leading-relaxed text-t2">
              {student.name}（学籍番号 {student.studentId}）のアカウントと、体調・セルフチェック・相談・トレーニング・窓口クリックなど関連データをすべて削除します。この操作は元に戻せません。
            </p>
            <label className="mt-3 block text-xs text-t3">
              確認のため学籍番号を入力
              <input
                value={confirmId}
                onChange={(e) => setConfirmId(e.target.value)}
                placeholder={student.studentId}
                className="mt-1 w-full rounded-xl border border-stroke px-3 py-2 text-sm text-t1 outline-none ring-accent/30 focus:ring-2"
              />
            </label>
            {error && <p className="mt-2 text-xs text-danger">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-stroke px-3 py-2 text-xs text-t2"
              >
                やめる
              </button>
              <button
                type="button"
                disabled={busy || !matched}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
                    const json = (await res.json()) as { error?: string };
                    if (!res.ok) throw new Error(json.error ?? "削除に失敗しました");
                    await refresh();
                    router.replace("/students");
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "削除に失敗しました");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="rounded-xl bg-danger px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                {busy ? "削除中…" : "完全に削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
