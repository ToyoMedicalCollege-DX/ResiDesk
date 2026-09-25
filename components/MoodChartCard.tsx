"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { MoodLog } from "@/lib/types";
import {
  currentYearMonth,
  formatShortDate,
  formatYearMonth,
  moodBarColor,
  moodLabel,
  yearMonthFromIso,
} from "@/lib/scoring";

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysInMonth(yearMonth: string): string[] {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return [];
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => `${yearMonth}-${String(i + 1).padStart(2, "0")}`);
}

function lastWeekDates(now = new Date()): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    dates.push(isoDate(d));
  }
  return dates;
}

export default function MoodChartCard({ logs }: { logs: MoodLog[] }) {
  const byDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);
  const thisMonth = currentYearMonth();
  const monthOptions = useMemo(() => {
    const set = new Set<string>([thisMonth]);
    for (const log of logs) {
      const ym = yearMonthFromIso(`${log.date}T12:00:00`);
      if (ym) set.add(ym);
    }
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [logs, thisMonth]);

  const [mode, setMode] = useState<"week" | "month">("week");
  const [yearMonth, setYearMonth] = useState(thisMonth);

  const dates = mode === "week" ? lastWeekDates() : daysInMonth(yearMonth);
  const slice = dates.map((date) => byDate.get(date) ?? { date, score: null, pressureAlert: null });
  const barMax = mode === "week" ? 72 : 56;

  return (
    <section className="rounded-2xl border border-stroke bg-white p-4 shadow-card">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-t1">今日の体調</h2>
          <p className="text-[11px] text-t3">数字は気分 1（最低）〜 5（最高）。未記録はグレー。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-bg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMode("week")}
              className={`rounded-md px-2.5 py-1 font-medium ${
                mode === "week" ? "bg-white text-t1 shadow-sm" : "text-t3"
              }`}
            >
              直近1週間
            </button>
            <button
              type="button"
              onClick={() => setMode("month")}
              className={`rounded-md px-2.5 py-1 font-medium ${
                mode === "month" ? "bg-white text-t1 shadow-sm" : "text-t3"
              }`}
            >
              月ごと
            </button>
          </div>
          {mode === "month" && (
            <select
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="rounded-lg border border-stroke bg-white px-2 py-1 text-xs font-semibold text-t1"
            >
              {monthOptions.map((ym) => (
                <option key={ym} value={ym}>
                  {formatYearMonth(ym)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className={`flex items-end ${mode === "week" ? "gap-1.5" : "gap-[2px]"}`}>
        {slice.map((log) => {
          const barH = log.score == null ? 8 : Math.max(10, (log.score / 5) * barMax);
          const alert =
            (log.score != null && log.score <= 2) || log.pressureAlert === "caution";
          const label = log.score != null ? moodLabel(log.score) : "未記録";
          return (
            <div key={log.date} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
              {alert && <AlertTriangle size={11} className="text-caution" aria-label="注意" />}
              <span
                className="text-[10px] font-bold leading-none"
                style={{ color: log.score == null ? "#A89080" : moodBarColor(log.score) }}
              >
                {log.score ?? "—"}
              </span>
              {(mode === "week" || log.score != null) && (
                <span className="text-[9px] leading-none text-t3">{label}</span>
              )}
              <div
                title={`${formatShortDate(log.date)} ${log.score ?? "未記録"} ${label}`}
                className={`rounded-t-md ${mode === "week" ? "w-7" : "w-[70%] max-w-[14px]"}`}
                style={{
                  height: barH,
                  background: log.score == null ? "#E8DDD2" : moodBarColor(log.score),
                  opacity: log.score == null ? 0.7 : 1,
                }}
              />
              <span className="text-[9px] leading-none text-t3">
                {mode === "week" ? formatShortDate(log.date) : String(Number(log.date.slice(-2)))}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
