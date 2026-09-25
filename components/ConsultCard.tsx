"use client";

import { useState } from "react";
import type { ConsultMessage } from "@/lib/types";
import { formatLastLogin } from "@/lib/scoring";
import ConsultModal from "@/components/ConsultModal";

function SuggestionBadge({ label, kind }: { label: string; kind: string }) {
  return (
    <span
      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        kind === "support" ? "bg-[#FDECEC] text-danger" : "bg-white/80 text-accent"
      }`}
    >
      {label}
    </span>
  );
}

export default function ConsultCard({ messages }: { messages: ConsultMessage[] }) {
  const [open, setOpen] = useState(false);
  const recent = messages.slice(-4).reverse();

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-stroke bg-white p-4 shadow-card">
      <div className="mb-2 shrink-0">
        <h2 className="text-sm font-bold text-t1">チャット相談内容</h2>
        <p className="text-[11px] text-caution">機微情報です。画面キャプチャや学外共有はしないでください。</p>
      </div>
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-auto">
        {recent.length === 0 && <li className="text-sm text-t3">直近の相談はありません</li>}
        {recent.map((m) => {
          const isUser = m.role === "user";
          return (
            <li
              key={m.id}
              className={`rounded-xl px-3 py-1.5 ${isUser ? "bg-bg" : "bg-accent-lt"}`}
            >
              <p className="text-[10px] text-t3">
                {isUser ? "学生" : "AI"} · {formatLastLogin(m.at)}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm text-t1">{m.content}</p>
              {m.suggestion && <SuggestionBadge label={m.suggestion.label} kind={m.suggestion.kind} />}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 shrink-0 text-left text-xs font-semibold text-accent hover:underline"
      >
        他の相談内容を見る
      </button>
      {open && <ConsultModal messages={messages} onClose={() => setOpen(false)} />}
    </section>
  );
}
