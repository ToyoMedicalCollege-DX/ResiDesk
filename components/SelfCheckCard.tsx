"use client";

import { useMemo, useState } from "react";
import type { CheckMonth, Student } from "@/lib/types";
import {
  computeTotalScore,
  currentYearMonth,
  emptyCheckMonth,
  formatShortDate,
  formatYearMonth,
  scaleBand,
  scaleLabel,
  totalScoreBand,
  totalScoreFromMonth,
  yearMonthFromIso,
} from "@/lib/scoring";

function Gauge({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const band = totalScoreBand(score);
  return (
    <div className="relative h-[88px] w-[88px]">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#F0E4D8" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={band.color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-xl font-bold text-t1">{score}</span>
      </div>
    </div>
  );
}

function fallbackMonths(student: Student): CheckMonth[] {
  if (student.checkMonths.length > 0) return student.checkMonths;
  const latestAt =
    student.checks.phq.history.at(-1)?.at ??
    student.checks.gad.history.at(-1)?.at ??
    student.checks.psqi.history.at(-1)?.at ??
    null;
  const yearMonth = yearMonthFromIso(latestAt) ?? currentYearMonth();
  const month = emptyCheckMonth(yearMonth);
  (["phq", "gad", "psqi"] as const).forEach((scale) => {
    month.scales[scale] = {
      score: student.checks[scale].latest,
      max: student.checks[scale].max,
      completedAt: student.checks[scale].history.at(-1)?.at ?? null,
      answers: student.checks[scale].latestAnswers,
    };
  });
  month.totalScore = computeTotalScore({
    phq: month.scales.phq.score,
    gad: month.scales.gad.score,
    psqi: month.scales.psqi.score,
  });
  return month.totalScore == null &&
    month.scales.phq.score == null &&
    month.scales.gad.score == null &&
    month.scales.psqi.score == null
    ? []
    : [month];
}

export default function SelfCheckCard({ student }: { student: Student }) {
  const storedMonths = useMemo(() => fallbackMonths(student), [student]);
  const thisMonth = currentYearMonth();
  const options = useMemo(() => {
    const yms = new Set(storedMonths.map((m) => m.yearMonth));
    yms.add(thisMonth);
    return [...yms].sort((a, b) => b.localeCompare(a));
  }, [storedMonths, thisMonth]);
  const defaultMonth =
    storedMonths[0]?.yearMonth ?? options[0] ?? thisMonth;
  const [selected, setSelected] = useState(defaultMonth);
  const yearMonth = options.includes(selected) ? selected : defaultMonth;
  const month = storedMonths.find((m) => m.yearMonth === yearMonth) ?? emptyCheckMonth(yearMonth);
  const total = totalScoreFromMonth(month);
  const band = total != null ? totalScoreBand(total) : null;
  const prev = storedMonths.find((m) => m.yearMonth < yearMonth);
  const prevTotal = prev ? totalScoreFromMonth(prev) : null;
  const delta = total != null && prevTotal != null ? total - prevTotal : null;
  const doneAt = (["phq", "gad", "psqi"] as const)
    .map((key) => month.scales[key].completedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);

  return (
    <section className="flex h-full flex-col rounded-2xl border border-stroke bg-white p-4 shadow-card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-t1">セルフチェック（参考情報）</h2>
          <p className="text-[11px] text-t3">診断結果ではありません。月に1回の結果です。</p>
        </div>
        <label className="shrink-0 text-[10px] text-t3">
          実施月
          <select
            value={yearMonth}
            onChange={(e) => setSelected(e.target.value)}
            className="mt-0.5 block rounded-lg border border-stroke bg-white px-2 py-1 text-xs font-semibold text-t1"
          >
            {options.map((ym) => (
              <option key={ym} value={ym}>
                {formatYearMonth(ym)}
                {storedMonths.some((m) => m.yearMonth === ym) ? "" : "（未実施）"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-3 flex items-center gap-4">
        {total != null ? <Gauge score={total} /> : <div className="text-sm text-t3">未実施</div>}
        <div>
          <p className="text-xs text-t3">総合スコア</p>
          <p className="text-sm font-semibold text-t1">{band ? band.label : "—"}</p>
          <p className="mt-0.5 text-[11px] text-t3">
            {doneAt ? `${formatShortDate(doneAt)} 実施` : "この月は未実施"}
            {delta != null && (
              <span className={`ml-2 font-semibold ${delta >= 0 ? "text-good" : "text-caution"}`}>
                前月より {delta > 0 ? "+" : ""}
                {delta}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {(["phq", "gad", "psqi"] as const).map((key) => {
          const scale = month.scales[key];
          const meta = scaleLabel(key);
          const latest = scale.score;
          const b = latest != null ? scaleBand(key, latest) : null;
          return (
            <div key={key} className="rounded-xl bg-bg px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="min-w-[88px]">
                  <p className="text-xs font-semibold text-t1">{meta.name}</p>
                  <p className="text-[10px] text-t3">{meta.axis}</p>
                </div>
                <div className="flex-1 text-sm">
                  <span className="font-semibold">
                    {latest != null ? `${latest}/${scale.max}` : "—"}
                  </span>
                  {b && (
                    <span className="ml-2 text-xs font-semibold" style={{ color: b.color }}>
                      {b.label}
                    </span>
                  )}
                  {latest == null && <span className="ml-2 text-[11px] text-t3">未実施</span>}
                </div>
              </div>
              {scale.answers.length > 0 ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-semibold text-accent">
                    各設問の回答を見る
                  </summary>
                  <ol className="mt-2 space-y-1.5">
                    {scale.answers.map((a) => (
                      <li
                        key={`${yearMonth}-${key}-${a.questionId}`}
                        className={`rounded-lg px-2 py-1.5 text-[11px] ${
                          a.flagged ? "bg-[#FDECEC] text-danger" : "bg-white text-t2"
                        }`}
                      >
                        <p className="font-medium text-t1">
                          Q{a.questionNo} {a.text}
                        </p>
                        <p className="mt-0.5">回答：{a.answerLabel}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              ) : (
                latest != null && (
                  <p className="mt-1 text-[10px] text-t3">設問ごとの回答はまだありません</p>
                )
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
