"use client";

import { X } from "lucide-react";
import type { ConsultMessage } from "@/lib/types";
import { formatLastLogin } from "@/lib/scoring";

export default function ConsultModal({
  messages,
  onClose,
}: {
  messages: ConsultMessage[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-t1/30 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consult-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-white shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stroke px-5 py-3">
          <div>
            <h2 id="consult-title" className="text-sm font-bold text-t1">
              相談の履歴
            </h2>
            <p className="text-[11px] text-t3">AI返信は参考です。診断ではありません。</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-t3 hover:bg-bg" aria-label="閉じる">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3 overflow-auto p-5">
          {messages.length === 0 && <p className="text-sm text-t3">履歴がありません</p>}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-bg text-t1" : "ml-auto bg-accent-lt text-t2"
              }`}
            >
              <p className="text-[10px] text-t3">
                {m.role === "user" ? "学生" : "AI（折りたたみ可）"} · {formatLastLogin(m.at)}
              </p>
              <p className="mt-1">{m.content}</p>
              {m.suggestion && (
                <p
                  className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    m.suggestion.kind === "support"
                      ? "bg-[#FDECEC] text-danger"
                      : "bg-accent-lt text-accent"
                  }`}
                >
                  {m.suggestion.label}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
